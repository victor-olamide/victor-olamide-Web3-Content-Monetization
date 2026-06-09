const logger = require('../utils/logger');
const Subscription = require('../models/Subscription');
const SubscriptionTier = require('../models/SubscriptionTier');
const royaltyService = require('./royaltyService');
const { calculateRenewalStatus } = require('./renewalService');
const {
  calculateExpiryDate,
  buildSubscriptionDocument,
  buildActiveSubscriptionQuery
} = require('../utils/subscriptionPurchaseHelpers');

/**
 * Create a new subscription purchase record.
 */
const purchaseSubscription = async (payload) => {
  try {
    const {
      user,
      creator,
      tierId,
      subscriptionTierId = null,
      tierName = null,
      tierPrice = null,
      tierBenefits = [],
      amount,
      expiry,
      transactionId,
      autoRenewal = true,
      gracePeriodDays = 7,
      currency = 'USD',
      email = null
    } = payload;

    if (!user || !creator || tierId === undefined || !amount || !transactionId) {
      throw new Error('Missing required subscription purchase fields: user, creator, tierId, amount, transactionId');
    }

    const resolvedExpiry = calculateExpiryDate(expiry);
    const nextRenewalDate = new Date(resolvedExpiry);

    const platformFee = await royaltyService.calculatePlatformFee(amount);
    const creatorAmount = royaltyService.calculateCreatorAmount(amount, platformFee);

    const subscriptionData = buildSubscriptionDocument(
      {
        user,
        creator,
        tierId,
        subscriptionTierId,
        tierName,
        tierPrice,
        tierBenefits,
        amount,
        platformFee,
        creatorAmount,
        expiry: resolvedExpiry,
        transactionId,
        autoRenewal,
        gracePeriodDays,
        currency,
        email
      },
      resolvedExpiry,
      nextRenewalDate
    );

    if (subscriptionTierId && !tierName) {
      const tier = await SubscriptionTier.findById(subscriptionTierId).lean();
      if (tier) {
        subscriptionData.tierName = subscriptionData.tierName || tier.name;
        subscriptionData.tierPrice = subscriptionData.tierPrice || tier.price;
        subscriptionData.tierBenefits = subscriptionData.tierBenefits.length > 0 ? subscriptionData.tierBenefits : tier.benefits || [];
      }
    }

    const existing = await Subscription.findOne({ transactionId });
    if (existing) {
      throw new Error('A subscription with this transaction ID already exists');
    }

    const subscription = new Subscription(subscriptionData);
    await subscription.save();

    try {
      await royaltyService.distributeSubscriptionRoyalties(subscription);
    } catch (error) {
      logger.error('Failed to distribute royalties for subscription purchase', { transactionId, error: error.message });
    }

    return subscription;
  } catch (error) {
    logger.error('Subscription purchase failed', { error: error.message });
    throw error;
  }
};

/**
 * Get active subscriptions for a user.
 */
const getActiveSubscriptionsForUser = async (user, includeInactive = false) => {
  try {
    const query = buildActiveSubscriptionQuery(user, includeInactive);
    const subscriptions = await Subscription.find(query).sort({ expiry: 1 }).lean();
    return subscriptions.map((sub) => ({
      ...sub,
      renewalState: calculateRenewalStatus(sub)
    }));
  } catch (error) {
    logger.error('Failed to get active subscriptions for user', { user, error: error.message });
    throw new Error(`Failed to retrieve subscriptions: ${error.message}`);
  }
};

module.exports = {
  purchaseSubscription,
  getActiveSubscriptionsForUser
};
