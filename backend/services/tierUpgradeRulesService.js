// Tier Upgrade Rules Service
// Manages subscription tier upgrade/downgrade logic and validation

const SubscriptionTier = require('../models/SubscriptionTier');
const Subscription = require('../models/Subscription');
const TierLogger = require('../utils/subscriptionTierLogger');

const logger = new TierLogger('TierUpgradeRulesService');

/**
 * Validate if a tier upgrade is allowed
 * @param {string} currentTierId - Current tier ID
 * @param {string} targetTierId - Target tier ID
 * @param {string} userId - User ID
 * @returns {Object} Validation result
 */
const validateTierUpgrade = async (currentTierId, targetTierId, userId) => {
  try {
    if (!currentTierId || !targetTierId || !userId) {
      logger.logValidationFailure('validateTierUpgrade', 'Missing required parameters');
      return {
        success: false,
        error: 'Current tier ID, target tier ID, and user ID are required'
      };
    }

    // Get both tiers
    const [currentTier, targetTier] = await Promise.all([
      SubscriptionTier.findById(currentTierId),
      SubscriptionTier.findById(targetTierId)
    ]);

    if (!currentTier || !targetTier) {
      logger.logError('validateTierUpgrade', `${currentTierId}/${targetTierId}`, new Error('One or both tiers not found'));
      return { success: false, error: 'One or both tiers not found' };
    }

    // Check if tiers belong to the same creator
    if (currentTier.creatorId.toString() !== targetTier.creatorId.toString()) {
      return {
        success: false,
        error: 'Cannot upgrade between tiers from different creators'
      };
    }

    // Check if target tier is active and visible
    if (!targetTier.isActive || !targetTier.isVisible) {
      return {
        success: false,
        error: 'Target tier is not available for subscription'
      };
    }

    // Check if target tier is at capacity
    if (targetTier.isFull) {
      return {
        success: false,
        error: 'Target tier is at maximum capacity'
      };
    }

    // Check if user is already subscribed to target tier
    const existingSubscription = await Subscription.findOne({
      userId,
      subscriptionTierId: targetTierId,
      cancelledAt: null
    });

    if (existingSubscription) {
      return {
        success: false,
        error: 'User is already subscribed to the target tier'
      };
    }

    // Calculate upgrade pricing
    const upgradeDetails = calculateUpgradePricing(currentTier, targetTier);

    logger.logTierFetched(`${currentTierId} -> ${targetTierId}`, 'upgrade-validation');
    return {
      success: true,
      valid: true,
      upgradeDetails
    };
  } catch (error) {
    logger.logError('validateTierUpgrade', `${currentTierId}/${targetTierId}`, error);
    return { success: false, error: error.message };
  }
};

/**
 * Calculate pricing for tier upgrade/downgrade
 * @param {Object} currentTier - Current tier
 * @param {Object} targetTier - Target tier
 * @returns {Object} Pricing details
 */
const calculateUpgradePricing = (currentTier, targetTier) => {
  const isUpgrade = targetTier.price > currentTier.price;
  const priceDifference = targetTier.price - currentTier.price;

  let proratedAmount = 0;
  let discountAmount = 0;
  let finalAmount = 0;

  if (isUpgrade) {
    // Apply upgrade discount if available
    discountAmount = (priceDifference * (targetTier.upgradeDiscount || 0)) / 100;
    proratedAmount = priceDifference - discountAmount;
    finalAmount = proratedAmount;
  } else {
    // Downgrade - may have credits or different billing
    finalAmount = 0; // Downgrades typically take effect at next billing cycle
  }

  return {
    isUpgrade,
    currentPrice: currentTier.price,
    targetPrice: targetTier.price,
    priceDifference,
    proratedAmount,
    discountAmount,
    discountPercent: targetTier.upgradeDiscount || 0,
    finalAmount,
    billingCycle: targetTier.billingCycle,
    currency: targetTier.currency
  };
};

/**
 * Get available upgrade paths for a user
 * @param {string} userId - User ID
 * @param {string} creatorId - Creator ID
 * @returns {Object} Available upgrades
 */
const getAvailableUpgrades = async (userId, creatorId) => {
  try {
    if (!userId || !creatorId) {
      logger.logValidationFailure('getAvailableUpgrades', 'Missing required parameters');
      return { success: false, error: 'User ID and creator ID are required' };
    }

    // Get user's current active subscription for this creator
    const currentSubscription = await Subscription.findOne({
      userId,
      creatorId,
      cancelledAt: null
    }).populate('subscriptionTierId');

    if (!currentSubscription) {
      return {
        success: true,
        hasSubscription: false,
        message: 'User has no active subscription for this creator'
      };
    }

    const currentTier = currentSubscription.subscriptionTierId;

    // Get all available tiers for this creator
    const availableTiers = await SubscriptionTier.find({
      creatorId,
      isActive: true,
      isVisible: true,
      _id: { $ne: currentTier._id } // Exclude current tier
    }).sort({ position: 1 });

    // Validate each potential upgrade
    const upgradeOptions = [];
    const downgradeOptions = [];

    for (const tier of availableTiers) {
      const validation = await validateTierUpgrade(currentTier._id, tier._id, userId);

      if (validation.success && validation.valid) {
        const option = {
          tierId: tier._id,
          name: tier.name,
          description: tier.description,
          pricing: validation.upgradeDetails,
          benefits: tier.benefits.filter(b => b.included),
          isPopular: tier.isPopular,
          subscriberCount: tier.subscriberCount
        };

        if (validation.upgradeDetails.isUpgrade) {
          upgradeOptions.push(option);
        } else {
          downgradeOptions.push(option);
        }
      }
    }

    // Sort by price
    upgradeOptions.sort((a, b) => a.pricing.targetPrice - b.pricing.targetPrice);
    downgradeOptions.sort((a, b) => b.pricing.targetPrice - a.pricing.targetPrice);

    return {
      success: true,
      hasSubscription: true,
      currentTier: {
        id: currentTier._id,
        name: currentTier.name,
        price: currentTier.price,
        billingCycle: currentTier.billingCycle
      },
      upgradeOptions,
      downgradeOptions,
      totalUpgrades: upgradeOptions.length,
      totalDowngrades: downgradeOptions.length
    };
  } catch (error) {
    logger.logError('getAvailableUpgrades', `${userId}/${creatorId}`, error);
    return { success: false, error: error.message };
  }
};

/**
 * Process a tier upgrade
 * @param {string} userId - User ID
 * @param {string} currentTierId - Current tier ID
 * @param {string} targetTierId - Target tier ID
 * @param {Object} paymentDetails - Payment information
 * @returns {Object} Upgrade result
 */
const processTierUpgrade = async (userId, currentTierId, targetTierId, paymentDetails = {}) => {
  try {
    // First validate the upgrade
    const validation = await validateTierUpgrade(currentTierId, targetTierId, userId);
    if (!validation.success || !validation.valid) {
      return validation;
    }

    // Get tier details
    const [currentTier, targetTier] = await Promise.all([
      SubscriptionTier.findById(currentTierId),
      SubscriptionTier.findById(targetTierId)
    ]);

    // Find current subscription
    const currentSubscription = await Subscription.findOne({
      userId,
      subscriptionTierId: currentTierId,
      cancelledAt: null
    });

    if (!currentSubscription) {
      return { success: false, error: 'No active subscription found for current tier' };
    }

    // Calculate final amount to charge
    const { finalAmount } = validation.upgradeDetails;

    // Process payment if amount > 0
    if (finalAmount > 0) {
      // Here you would integrate with payment processor
      // For now, we'll assume payment succeeds
      logger.logPurchaseRecorded(targetTierId, finalAmount);
    }

    // Cancel current subscription (effective immediately for upgrades)
    currentSubscription.cancelledAt = new Date();
    currentSubscription.cancellationReason = 'upgraded';
    await currentSubscription.save();

    // Create new subscription
    const newSubscription = new Subscription({
      userId,
      creatorId: targetTier.creatorId,
      subscriptionTierId: targetTierId,
      price: targetTier.price,
      billingCycle: targetTier.billingCycle,
      currency: targetTier.currency,
      status: 'active',
      trialEndsAt: targetTier.trialDays ? new Date(Date.now() + targetTier.trialDays * 24 * 60 * 60 * 1000) : null,
      upgradeFrom: currentTierId,
      upgradeCredit: finalAmount > 0 ? 0 : Math.abs(validation.upgradeDetails.priceDifference)
    });

    await newSubscription.save();

    // Update tier subscriber counts
    await Promise.all([
      SubscriptionTier.findByIdAndUpdate(currentTierId, { $inc: { subscriberCount: -1 } }),
      SubscriptionTier.findByIdAndUpdate(targetTierId, { $inc: { subscriberCount: 1, revenueTotal: finalAmount } })
    ]);

    logger.logTierFetched(`${currentTierId} -> ${targetTierId}`, 'upgrade-processed');

    return {
      success: true,
      message: 'Tier upgrade processed successfully',
      upgrade: {
        fromTier: {
          id: currentTier._id,
          name: currentTier.name,
          price: currentTier.price
        },
        toTier: {
          id: targetTier._id,
          name: targetTier.name,
          price: targetTier.price
        },
        amountCharged: finalAmount,
        newSubscriptionId: newSubscription._id,
        effectiveDate: new Date()
      }
    };
  } catch (error) {
    logger.logError('processTierUpgrade', `${currentTierId}/${targetTierId}`, error);
    return { success: false, error: error.message };
  }
};

/**
 * Get upgrade history for a user
 * @param {string} userId - User ID
 * @param {string} creatorId - Creator ID (optional)
 * @returns {Object} Upgrade history
 */
const getUpgradeHistory = async (userId, creatorId = null) => {
  try {
    if (!userId) {
      logger.logValidationFailure('getUpgradeHistory', 'Missing user ID');
      return { success: false, error: 'User ID is required' };
    }

    const query = { userId, upgradeFrom: { $exists: true } };
    if (creatorId) {
      query.creatorId = creatorId;
    }

    const upgradeHistory = await Subscription.find(query)
      .populate('subscriptionTierId')
      .populate('upgradeFrom', 'name price')
      .sort({ createdAt: -1 })
      .select('createdAt subscriptionTierId upgradeFrom price billingCycle');

    const formattedHistory = upgradeHistory.map(sub => ({
      upgradeId: sub._id,
      upgradeDate: sub.createdAt,
      fromTier: {
        name: sub.upgradeFrom.name,
        price: sub.upgradeFrom.price
      },
      toTier: {
        id: sub.subscriptionTierId._id,
        name: sub.subscriptionTierId.name,
        price: sub.price
      },
      billingCycle: sub.billingCycle
    }));

    return {
      success: true,
      history: formattedHistory,
      totalUpgrades: formattedHistory.length
    };
  } catch (error) {
    logger.logError('getUpgradeHistory', userId, error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  validateTierUpgrade,
  calculateUpgradePricing,
  getAvailableUpgrades,
  processTierUpgrade,
  getUpgradeHistory
};
