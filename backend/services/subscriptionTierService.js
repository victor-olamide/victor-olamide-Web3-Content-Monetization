// Subscription Tier Service
// Manages creation, updates, and lifecycle of subscription tiers

const SubscriptionTier = require('../models/SubscriptionTier');
const Subscription = require('../models/Subscription');
const TierLogger = require('../utils/subscriptionTierLogger');

const logger = new TierLogger('SubscriptionTierService');

/**
 * Create a new subscription tier for a creator
 * @param {string} creatorId - Creator ID
 * @param {Object} tierData - Tier data
 * @returns {Object} Created tier
 */
const createSubscriptionTier = async (creatorId, tierData) => {
  try {
    if (!creatorId || !tierData) {
      logger.logValidationFailure('createSubscriptionTier', 'Missing required parameters');
      return { success: false, error: 'Creator ID and tier data are required' };
    }

    if (!tierData.name || !tierData.description || tierData.price === undefined) {
      logger.logValidationFailure('createSubscriptionTier', 'Missing tier data fields');
      return { success: false, error: 'Tier name, description, and price are required' };
    }

    // Check for duplicate tier names for this creator
    const duplicateTier = await SubscriptionTier.findOne({
      creatorId,
      name: tierData.name
    });

    if (duplicateTier) {
      logger.logDuplicateTierName(creatorId, tierData.name);
      return { success: false, error: 'A tier with this name already exists for this creator' };
    }

    // Get the count of existing tiers for this creator to set position
    const existingTiers = await SubscriptionTier.find({ creatorId }).select('position');
    const position = existingTiers.length > 0 
      ? Math.max(...existingTiers.map(t => t.position)) + 1 
      : 0;

    const tier = new SubscriptionTier({
      creatorId,
      ...tierData,
      position: tierData.position !== undefined ? tierData.position : position
    });

    await tier.save();
    logger.logTierCreated(tier._id, creatorId, tierData);
    return { success: true, tier };
  } catch (error) {
    logger.logError('createSubscriptionTier', creatorId, error);
    return { success: false, error: error.message };
  }
};

/**
 * Get all subscription tiers for a creator
 * @param {string} creatorId - Creator ID
 * @param {Object} options - Filter options
 * @returns {Array} Array of tiers
 */
const getCreatorTiers = async (creatorId, options = {}) => {
  try {
    if (!creatorId) {
      logger.logValidationFailure('getCreatorTiers', 'Missing creator ID');
      return { success: false, error: 'Creator ID is required' };
    }

    const {
      includeInactive = false,
      onlyVisible = true,
      sortBy = 'position',
      ascending = true
    } = options;

    let query = { creatorId };

    if (!includeInactive) {
      query.isActive = true;
    }

    if (onlyVisible) {
      query.isVisible = true;
    }

    const sortOption = {};
    sortOption[sortBy] = ascending ? 1 : -1;

    const tiers = await SubscriptionTier.find(query).sort(sortOption).lean();

    logger.logCreatorTiersFetched(creatorId, tiers.length, options);
    return {
      success: true,
      count: tiers.length,
      tiers
    };
  } catch (error) {
    logger.logError('getCreatorTiers', creatorId, error);
    return { success: false, error: error.message };
  }
};

/**
 * Get a specific tier by ID
 * @param {string} tierId - Tier ID
 * @returns {Object} Tier document
 */
const getTierById = async (tierId) => {
  try {
    if (!tierId) {
      logger.logValidationFailure('getTierById', 'Missing tier ID');
      return { success: false, error: 'Tier ID is required' };
    }

    const tier = await SubscriptionTier.findById(tierId);
    
    if (!tier) {
      logger.logError('getTierById', tierId, new Error('Tier not found'));
      return { success: false, error: 'Tier not found' };
    }

    logger.logTierFetched(tierId, 'direct');
    return { success: true, tier };
  } catch (error) {
    logger.logError('getTierById', tierId, error);
    return { success: false, error: error.message };
  }
};

/**
 * Update a subscription tier
 * @param {string} tierId - Tier ID to update
 * @param {Object} updateData - Data to update
 * @returns {Object} Updated tier
 */
const updateSubscriptionTier = async (tierId, updateData) => {
  try {
    if (!tierId || !updateData) {
      logger.logValidationFailure('updateSubscriptionTier', 'Missing required parameters');
      return { success: false, error: 'Tier ID and update data are required' };
    }

    const tier = await SubscriptionTier.findByIdAndUpdate(
      tierId,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!tier) {
      logger.logError('updateSubscriptionTier', tierId, new Error('Tier not found'));
      return { success: false, error: 'Tier not found' };
    }

    logger.logTierUpdated(tierId, updateData);
    return { success: true, tier };
  } catch (error) {
    logger.logError('updateSubscriptionTier', tierId, error);
    return { success: false, error: error.message };
  }
};

/**
 * Delete a subscription tier
 * @param {string} tierId - Tier ID to delete
 * @param {boolean} hardDelete - Whether to permanently delete or soft delete
 * @returns {Object} Result
 */
const deleteSubscriptionTier = async (tierId, hardDelete = false) => {
  try {
    if (!tierId) {
      logger.logValidationFailure('deleteSubscriptionTier', 'Missing tier ID');
      return { success: false, error: 'Tier ID is required' };
    }

    // Check if tier has active subscribers
    const activeSubscribers = await Subscription.countDocuments({
      subscriptionTierId: tierId,
      cancelledAt: null
    });

    if (activeSubscribers > 0 && !hardDelete) {
      logger.logError('deleteSubscriptionTier', tierId, new Error(`Tier has ${activeSubscribers} active subscribers`));
      return {
        success: false,
        error: `Cannot delete tier with ${activeSubscribers} active subscribers. Archive the tier instead.`
      };
    }

    if (hardDelete) {
      await SubscriptionTier.findByIdAndDelete(tierId);
      logger.logTierDeleted(tierId, true);
    } else {
      // Soft delete by deactivating and hiding
      await SubscriptionTier.findByIdAndUpdate(tierId, {
        isActive: false,
        isVisible: false,
        visibility: 'hidden',
        updatedAt: new Date()
      });
      logger.logTierDeleted(tierId, false);
    }

    return { success: true, message: 'Tier deleted successfully' };
  } catch (error) {
    logger.logError('deleteSubscriptionTier', tierId, error);
    return { success: false, error: error.message };
  }
};

/**
 * Get tier comparison between two tiers
 * @param {string} tierId1 - First tier ID
 * @param {string} tierId2 - Second tier ID
 * @returns {Object} Comparison data
 */
const compareTiers = async (tierId1, tierId2) => {
  try {
    if (!tierId1 || !tierId2) {
      logger.logValidationFailure('compareTiers', 'Missing tier IDs');
      return { success: false, error: 'Both tier IDs are required' };
    }

    const tier1 = await SubscriptionTier.findById(tierId1);
    const tier2 = await SubscriptionTier.findById(tierId2);

    if (!tier1 || !tier2) {
      logger.logError('compareTiers', `${tierId1}/${tierId2}`, new Error('One or both tiers not found'));
      return { success: false, error: 'One or both tiers not found' };
    }

    const comparison = {
      tier1: {
        id: tier1._id,
        name: tier1.name,
        price: tier1.price,
        benefits: tier1.benefits.filter(b => b.included).map(b => b.feature)
      },
      tier2: {
        id: tier2._id,
        name: tier2.name,
        price: tier2.price,
        benefits: tier2.benefits.filter(b => b.included).map(b => b.feature)
      },
      tier1Exclusive: [],
      tier2Exclusive: [],
      commonFeatures: [],
      priceDifference: tier2.price - tier1.price
    };

    // Calculate exclusive and common features
    comparison.tier1.benefits.forEach(feature => {
      if (comparison.tier2.benefits.includes(feature)) {
        comparison.commonFeatures.push(feature);
      } else {
        comparison.tier1Exclusive.push(feature);
      }
    });

    comparison.tier2.benefits.forEach(feature => {
      if (!comparison.tier1.benefits.includes(feature)) {
        comparison.tier2Exclusive.push(feature);
      }
    });

    logger.logTierFetched(`${tierId1} vs ${tierId2}`, 'comparison');
    return { success: true, comparison };
  } catch (error) {
    logger.logError('compareTiers', `${tierId1}/${tierId2}`, error);
    return { success: false, error: error.message };
  }
};

/**
 * Get tier hierarchy for creator
 * @param {string} creatorId - Creator ID
 * @returns {Object} Tier hierarchy with pricing and features
 */
const getTierHierarchy = async (creatorId) => {
  try {
    if (!creatorId) {
      logger.logValidationFailure('getTierHierarchy', 'Missing creator ID');
      return { success: false, error: 'Creator ID is required' };
    }

    const tiers = await SubscriptionTier.find({ 
      creatorId, 
      isActive: true,
      isVisible: true 
    }).sort({ position: 1 }).lean();

    const hierarchy = {
      creatorId,
      tiers: tiers.map(tier => ({
        id: tier._id,
        position: tier.position,
        name: tier.name,
        description: tier.description,
        price: tier.price,
        isPopular: tier.isPopular,
        accessLevel: tier.accessLevel,
        benefits: tier.benefits.filter(b => b.included),
        trialDays: tier.trialDays,
        subscribers: tier.subscriberCount,
        availableSlots: tier.availableSlots,
        isFull: tier.isFull
      })),
      minPrice: tiers.length > 0 ? Math.min(...tiers.map(t => t.price)) : 0,
      maxPrice: tiers.length > 0 ? Math.max(...tiers.map(t => t.price)) : 0,
      totalSubscribers: tiers.reduce((sum, t) => sum + t.subscriberCount, 0),
      totalRevenue: tiers.reduce((sum, t) => sum + t.revenueTotal, 0)
    };

    logger.logHierarchyRetrieved(creatorId, tiers.length, hierarchy.totalRevenue);
    return { success: true, hierarchy };
  } catch (error) {
    logger.logError('getTierHierarchy', creatorId, error);
    return { success: false, error: error.message };
  }
};

/**
 * Get tier suggestions based on subscriber data
 * @param {string} creatorId - Creator ID
 * @returns {Object} Suggestions for tier optimization
 */
const getTierSuggestions = async (creatorId) => {
  try {
    if (!creatorId) {
      logger.logValidationFailure('getTierSuggestions', 'Missing creator ID');
      return { success: false, error: 'Creator ID is required' };
    }

    const tiers = await SubscriptionTier.find({ creatorId });
    const suggestions = {
      optimizeTiers: [],
      addTier: null,
      removeTier: null
    };

    if (tiers.length === 0) {
      suggestions.addTier = 'Consider creating your first subscription tier';
    } else if (tiers.length === 1) {
      suggestions.addTier = 'Consider creating a premium tier for higher-paying subscribers';
    } else if (tiers.length >= 4) {
      suggestions.optimizeTiers.push('Consider consolidating tiers - too many may confuse subscribers');
    }

    // Analyze tier performance
    tiers.forEach(tier => {
      if (tier.isFull) {
        suggestions.optimizeTiers.push(`Tier "${tier.name}" is at capacity - consider increasing subscriber limit`);
      }
      if (tier.subscriberCount === 0 && tier.createdAt < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) {
        suggestions.removeTier = `Consider removing tier "${tier.name}" - no subscribers after 30 days`;
      }
    });

    logger.logTierFetched(`suggestions-${creatorId}`, 'suggestions');
    return { success: true, suggestions };
  } catch (error) {
    logger.logError('getTierSuggestions', creatorId, error);
    return { success: false, error: error.message };
  }
};

/**
 * Record a purchase for a tier
 * @param {string} tierId - Tier ID
 * @param {number} amount - Purchase amount
 * @returns {Object} Update result
 */
const recordTierPurchase = async (tierId, amount) => {
  try {
    if (!tierId || amount === undefined) {
      logger.logValidationFailure('recordTierPurchase', 'Missing required parameters');
      return { success: false, error: 'Tier ID and amount are required' };
    }

    const tier = await SubscriptionTier.findByIdAndUpdate(
      tierId,
      {
        $inc: { subscriberCount: 1, revenueTotal: amount },
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!tier) {
      logger.logError('recordTierPurchase', tierId, new Error('Tier not found'));
      return { success: false, error: 'Tier not found' };
    }

    logger.logPurchaseRecorded(tierId, amount);
    return { success: true, tier };
  } catch (error) {
    logger.logError('recordTierPurchase', tierId, error);
    return { success: false, error: error.message };
  }
};

/**
 * Record a cancellation for a tier
 * @param {string} tierId - Tier ID
 * @returns {Object} Update result
 */
const recordTierCancellation = async (tierId) => {
  try {
    if (!tierId) {
      logger.logValidationFailure('recordTierCancellation', 'Missing tier ID');
      return { success: false, error: 'Tier ID is required' };
    }

    const tier = await SubscriptionTier.findByIdAndUpdate(
      tierId,
      {
        $inc: { subscriberCount: Math.max(-1, -tier.subscriberCount) },
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!tier) {
      logger.logError('recordTierCancellation', tierId, new Error('Tier not found'));
      return { success: false, error: 'Tier not found' };
    }

    logger.logCancellationRecorded(tierId);
    return { success: true, tier };
  } catch (error) {
    logger.logError('recordTierCancellation', tierId, error);
    return { success: false, error: error.message };
  }
};

/**
 * Bulk update tier positions for reordering
 * @param {string} creatorId - Creator ID
 * @param {Array} tierPositions - Array of { tierId, position }
 * @returns {Object} Update result
 */
const reorderTiers = async (creatorId, tierPositions) => {
  try {
    if (!creatorId || !Array.isArray(tierPositions)) {
      logger.logValidationFailure('reorderTiers', 'Missing required parameters');
      return { success: false, error: 'Creator ID and tier positions array are required' };
    }

    const updates = await Promise.all(
      tierPositions.map(({ tierId, position }) =>
        SubscriptionTier.findByIdAndUpdate(
          tierId,
          { position, updatedAt: new Date() },
          { new: true }
        )
      )
    );

    const successfulUpdates = updates.filter(u => u !== null).length;
    logger.logTiersReordered(creatorId, successfulUpdates);

    return {
      success: true,
      updated: successfulUpdates,
      tiers: updates.filter(u => u !== null)
    };
  } catch (error) {
    logger.logError('reorderTiers', creatorId, error);
    return { success: false, error: error.message };
  }
};

/**
 * Get tier statistics for creator
 * @param {string} creatorId - Creator ID
 * @returns {Object} Statistics
 */
const getTierStatistics = async (creatorId) => {
  try {
    if (!creatorId) {
      logger.logValidationFailure('getTierStatistics', 'Missing creator ID');
      return { success: false, error: 'Creator ID is required' };
    }

    const tiers = await SubscriptionTier.find({ creatorId });

    if (tiers.length === 0) {
      logger.logStatisticsRetrieved(creatorId, { totalTiers: 0 });
      return {
        success: true,
        statistics: {
          totalTiers: 0,
          activeTiers: 0,
          totalSubscribers: 0,
          totalRevenue: 0,
          averagePrice: 0,
          averageChurn: 0
        }
      };
    }

    const statistics = {
      totalTiers: tiers.length,
      activeTiers: tiers.filter(t => t.isActive).length,
      totalSubscribers: tiers.reduce((sum, t) => sum + t.subscriberCount, 0),
      totalRevenue: tiers.reduce((sum, t) => sum + t.revenueTotal, 0),
      averagePrice: tiers.reduce((sum, t) => sum + t.price, 0) / tiers.length,
      averageChurn: tiers.reduce((sum, t) => sum + t.averageChurn, 0) / tiers.length,
      byPosition: {},
      populariTiers: tiers.filter(t => t.isPopular).length,
      fullTiers: tiers.filter(t => t.isFull).length
    };

    // Group by position
    tiers.forEach(tier => {
      statistics.byPosition[tier.position] = {
        name: tier.name,
        price: tier.price,
        subscribers: tier.subscriberCount,
        revenue: tier.revenueTotal
      };
    });

    logger.logStatisticsRetrieved(creatorId, statistics);
    return { success: true, statistics };
  } catch (error) {
    logger.logError('getTierStatistics', creatorId, error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  createSubscriptionTier,
  getCreatorTiers,
  getTierById,
  updateSubscriptionTier,
  deleteSubscriptionTier,
  compareTiers,
  getTierHierarchy,
  getTierSuggestions,
  recordTierPurchase,
  recordTierCancellation,
  reorderTiers,
  getTierStatistics
};
