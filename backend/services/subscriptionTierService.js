// Subscription Tier Service
// Manages creation, updates, and lifecycle of subscription tiers

const SubscriptionTier = require('../models/SubscriptionTier');
const Subscription = require('../models/Subscription');

/**
 * Create a new subscription tier for a creator
 * @param {string} creatorId - Creator ID
 * @param {Object} tierData - Tier data
 * @returns {Object} Created tier
 */
const createSubscriptionTier = async (creatorId, tierData) => {
  if (!creatorId || !tierData) {
    throw new Error('Creator ID and tier data are required');
  }

  if (!tierData.name || !tierData.description || tierData.price === undefined) {
    throw new Error('Tier name, description, and price are required');
  }

  try {
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
    return { success: true, tier };
  } catch (error) {
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
  if (!creatorId) {
    throw new Error('Creator ID is required');
  }

  try {
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

    return {
      success: true,
      count: tiers.length,
      tiers
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Get a specific tier by ID
 * @param {string} tierId - Tier ID
 * @returns {Object} Tier document
 */
const getTierById = async (tierId) => {
  if (!tierId) {
    throw new Error('Tier ID is required');
  }

  try {
    const tier = await SubscriptionTier.findById(tierId);
    
    if (!tier) {
      return { success: false, error: 'Tier not found' };
    }

    return { success: true, tier };
  } catch (error) {
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
  if (!tierId || !updateData) {
    throw new Error('Tier ID and update data are required');
  }

  try {
    const tier = await SubscriptionTier.findByIdAndUpdate(
      tierId,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!tier) {
      return { success: false, error: 'Tier not found' };
    }

    return { success: true, tier };
  } catch (error) {
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
  if (!tierId) {
    throw new Error('Tier ID is required');
  }

  try {
    // Check if tier has active subscribers
    const activeSubscribers = await Subscription.countDocuments({
      subscriptionTierId: tierId,
      cancelledAt: null
    });

    if (activeSubscribers > 0 && !hardDelete) {
      return {
        success: false,
        error: `Cannot delete tier with ${activeSubscribers} active subscribers. Archive the tier instead.`
      };
    }

    if (hardDelete) {
      await SubscriptionTier.findByIdAndDelete(tierId);
    } else {
      // Soft delete by deactivating and hiding
      await SubscriptionTier.findByIdAndUpdate(tierId, {
        isActive: false,
        isVisible: false,
        visibility: 'hidden',
        updatedAt: new Date()
      });
    }

    return { success: true, message: 'Tier deleted successfully' };
  } catch (error) {
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
  if (!tierId1 || !tierId2) {
    throw new Error('Both tier IDs are required');
  }

  try {
    const tier1 = await SubscriptionTier.findById(tierId1);
    const tier2 = await SubscriptionTier.findById(tierId2);

    if (!tier1 || !tier2) {
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

    return { success: true, comparison };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Get tier hierarchy for creator
 * @param {string} creatorId - Creator ID
 * @returns {Object} Tier hierarchy with pricing and features
 */
const getTierHierarchy = async (creatorId) => {
  if (!creatorId) {
    throw new Error('Creator ID is required');
  }

  try {
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

    return { success: true, hierarchy };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Get tier suggestions based on subscriber data
 * @param {string} creatorId - Creator ID
 * @returns {Object} Suggestions for tier optimization
 */
const getTierSuggestions = async (creatorId) => {
  if (!creatorId) {
    throw new Error('Creator ID is required');
  }

  try {
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

    return { success: true, suggestions };
  } catch (error) {
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
  if (!tierId || amount === undefined) {
    throw new Error('Tier ID and amount are required');
  }

  try {
    const tier = await SubscriptionTier.findByIdAndUpdate(
      tierId,
      {
        $inc: { subscriberCount: 1, revenueTotal: amount },
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!tier) {
      return { success: false, error: 'Tier not found' };
    }

    return { success: true, tier };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Record a cancellation for a tier
 * @param {string} tierId - Tier ID
 * @returns {Object} Update result
 */
const recordTierCancellation = async (tierId) => {
  if (!tierId) {
    throw new Error('Tier ID is required');
  }

  try {
    const tier = await SubscriptionTier.findByIdAndUpdate(
      tierId,
      {
        $inc: { subscriberCount: Math.max(-1, -tier.subscriberCount) },
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!tier) {
      return { success: false, error: 'Tier not found' };
    }

    return { success: true, tier };
  } catch (error) {
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
  if (!creatorId || !Array.isArray(tierPositions)) {
    throw new Error('Creator ID and tier positions array are required');
  }

  try {
    const updates = await Promise.all(
      tierPositions.map(({ tierId, position }) =>
        SubscriptionTier.findByIdAndUpdate(
          tierId,
          { position, updatedAt: new Date() },
          { new: true }
        )
      )
    );

    return {
      success: true,
      updated: updates.filter(u => u !== null).length,
      tiers: updates.filter(u => u !== null)
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Get tier statistics for creator
 * @param {string} creatorId - Creator ID
 * @returns {Object} Statistics
 */
const getTierStatistics = async (creatorId) => {
  if (!creatorId) {
    throw new Error('Creator ID is required');
  }

  try {
    const tiers = await SubscriptionTier.find({ creatorId });

    if (tiers.length === 0) {
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

    return { success: true, statistics };
  } catch (error) {
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
