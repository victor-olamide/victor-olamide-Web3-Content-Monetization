// Tier Metrics Service
// Provides analytics and performance metrics for subscription tiers

const SubscriptionTier = require('../models/SubscriptionTier');
const Subscription = require('../models/Subscription');
const TierLogger = require('../utils/subscriptionTierLogger');

const logger = new TierLogger('TierMetricsService');

/**
 * Get performance metrics for a specific tier
 * @param {string} tierId - Tier ID
 * @param {Object} options - Date range options
 * @returns {Object} Performance metrics
 */
const getTierPerformanceMetrics = async (tierId, options = {}) => {
  try {
    if (!tierId) {
      logger.logValidationFailure('getTierPerformanceMetrics', 'Missing tier ID');
      return { success: false, error: 'Tier ID is required' };
    }

    const tier = await SubscriptionTier.findById(tierId);
    if (!tier) {
      logger.logError('getTierPerformanceMetrics', tierId, new Error('Tier not found'));
      return { success: false, error: 'Tier not found' };
    }

    // Build date filter
    const dateFilter = {};
    if (options.startDate) {
      dateFilter.$gte = new Date(options.startDate);
    }
    if (options.endDate) {
      dateFilter.$lte = new Date(options.endDate);
    }

    // Get subscription data for this tier
    const subscriptionQuery = { subscriptionTierId: tierId };
    if (Object.keys(dateFilter).length > 0) {
      subscriptionQuery.createdAt = dateFilter;
    }

    const subscriptions = await Subscription.find(subscriptionQuery);
    const activeSubscriptions = subscriptions.filter(s => !s.cancelledAt);

    // Calculate metrics
    const metrics = {
      tierId,
      tierName: tier.name,
      totalSubscribers: tier.subscriberCount,
      activeSubscribers: activeSubscriptions.length,
      totalRevenue: tier.revenueTotal,
      averageRevenuePerSubscriber: tier.subscriberCount > 0 ? tier.revenueTotal / tier.subscriberCount : 0,
      churnRate: tier.averageChurn,
      isFull: tier.isFull,
      availableSlots: tier.availableSlots,
      conversionRate: subscriptions.length > 0 ? (activeSubscriptions.length / subscriptions.length) * 100 : 0,
      period: {
        startDate: options.startDate || null,
        endDate: options.endDate || null
      }
    };

    logger.logTierFetched(tierId, 'metrics');
    return { success: true, metrics };
  } catch (error) {
    logger.logError('getTierPerformanceMetrics', tierId, error);
    return { success: false, error: error.message };
  }
};

/**
 * Get comprehensive analytics for all creator tiers
 * @param {string} creatorId - Creator ID
 * @returns {Object} Creator analytics
 */
const getCreatorTierAnalytics = async (creatorId) => {
  try {
    if (!creatorId) {
      logger.logValidationFailure('getCreatorTierAnalytics', 'Missing creator ID');
      return { success: false, error: 'Creator ID is required' };
    }

    const tiers = await SubscriptionTier.find({ creatorId });

    if (tiers.length === 0) {
      return {
        success: true,
        analytics: {
          totalTiers: 0,
          totalSubscribers: 0,
          totalRevenue: 0,
          averageTierPrice: 0,
          tierPerformance: []
        }
      };
    }

    const analytics = {
      totalTiers: tiers.length,
      totalSubscribers: tiers.reduce((sum, t) => sum + t.subscriberCount, 0),
      totalRevenue: tiers.reduce((sum, t) => sum + t.revenueTotal, 0),
      averageTierPrice: tiers.reduce((sum, t) => sum + t.price, 0) / tiers.length,
      tierPerformance: tiers.map(tier => ({
        tierId: tier._id,
        name: tier.name,
        price: tier.price,
        subscribers: tier.subscriberCount,
        revenue: tier.revenueTotal,
        isPopular: tier.isPopular,
        isFull: tier.isFull,
        churnRate: tier.averageChurn,
        createdAt: tier.createdAt
      }))
    };

    // Sort tier performance by revenue
    analytics.tierPerformance.sort((a, b) => b.revenue - a.revenue);

    logger.logCreatorTiersFetched(creatorId, tiers.length, { analytics: true });
    return { success: true, analytics };
  } catch (error) {
    logger.logError('getCreatorTierAnalytics', creatorId, error);
    return { success: false, error: error.message };
  }
};

/**
 * Compare metrics between two tiers
 * @param {string} tierId1 - First tier ID
 * @param {string} tierId2 - Second tier ID
 * @returns {Object} Comparison metrics
 */
const getTierComparisonMetrics = async (tierId1, tierId2) => {
  try {
    if (!tierId1 || !tierId2) {
      logger.logValidationFailure('getTierComparisonMetrics', 'Missing tier IDs');
      return { success: false, error: 'Both tier IDs are required' };
    }

    const [tier1, tier2] = await Promise.all([
      SubscriptionTier.findById(tierId1),
      SubscriptionTier.findById(tierId2)
    ]);

    if (!tier1 || !tier2) {
      logger.logError('getTierComparisonMetrics', `${tierId1}/${tierId2}`, new Error('One or both tiers not found'));
      return { success: false, error: 'One or both tiers not found' };
    }

    const comparison = {
      tier1: {
        id: tier1._id,
        name: tier1.name,
        price: tier1.price,
        subscribers: tier1.subscriberCount,
        revenue: tier1.revenueTotal,
        churnRate: tier1.averageChurn,
        isPopular: tier1.isPopular,
        isFull: tier1.isFull
      },
      tier2: {
        id: tier2._id,
        name: tier2.name,
        price: tier2.price,
        subscribers: tier2.subscriberCount,
        revenue: tier2.revenueTotal,
        churnRate: tier2.averageChurn,
        isPopular: tier2.isPopular,
        isFull: tier2.isFull
      },
      differences: {
        priceDifference: tier2.price - tier1.price,
        subscriberDifference: tier2.subscriberCount - tier1.subscriberCount,
        revenueDifference: tier2.revenueTotal - tier1.revenueTotal,
        churnDifference: tier2.averageChurn - tier1.averageChurn
      }
    };

    return { success: true, comparison };
  } catch (error) {
    logger.logError('getTierComparisonMetrics', `${tierId1}/${tierId2}`, error);
    return { success: false, error: error.message };
  }
};

/**
 * Get trend data for a tier over time
 * @param {string} tierId - Tier ID
 * @param {string} period - Time period (daily, weekly, monthly)
 * @param {number} days - Number of days to look back
 * @returns {Object} Trend data
 */
const getTierTrends = async (tierId, period = 'daily', days = 30) => {
  try {
    if (!tierId) {
      logger.logValidationFailure('getTierTrends', 'Missing tier ID');
      return { success: false, error: 'Tier ID is required' };
    }

    const tier = await SubscriptionTier.findById(tierId);
    if (!tier) {
      logger.logError('getTierTrends', tierId, new Error('Tier not found'));
      return { success: false, error: 'Tier not found' };
    }

    // For now, return basic trend structure
    // In a real implementation, this would aggregate historical data
    const trends = {
      tierId,
      tierName: tier.name,
      period,
      days,
      data: [],
      summary: {
        totalSubscribers: tier.subscriberCount,
        totalRevenue: tier.revenueTotal,
        averageChurn: tier.averageChurn
      }
    };

    // Generate mock trend data for demonstration
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      trends.data.push({
        date: date.toISOString().split('T')[0],
        subscribers: Math.floor(Math.random() * tier.subscriberCount),
        revenue: Math.floor(Math.random() * tier.revenueTotal / days)
      });
    }

    return { success: true, trends };
  } catch (error) {
    logger.logError('getTierTrends', tierId, error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  getTierPerformanceMetrics,
  getCreatorTierAnalytics,
  getTierComparisonMetrics,
  getTierTrends
};
