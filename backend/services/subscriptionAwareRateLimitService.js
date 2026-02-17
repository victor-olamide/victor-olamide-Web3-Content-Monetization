/**
 * Enhanced Rate Limit Service with Subscription Awareness
 * 
 * Extends the core rate limit service with database-backed
 * user subscription tier resolution.
 * 
 * @module services/subscriptionAwareRateLimitService
 */

const { TIER_LEVELS, DEFAULTS } = require('../config/rateLimitConfig');
const { getUserRateLimitTier, mapSubscriptionToRateLimit } = require('../utils/subscriptionTierMapper');

/**
 * Resolve user's tier from subscription data with fallbacks
 * @param {Object} req - Express request object
 * @returns {Promise<string>} User's rate limit tier
 */
async function resolveUserTierFromSubscription(req) {
  try {
    // First, check for explicit tier override
    if (req.userTier) return req.userTier;
    if (req.session?.tier) return req.session.tier;
    if (req.user?.tier) return req.user.tier;
    if (req.wallet?.tier) return req.wallet.tier;

    // Check if we have a user ID to look up subscription
    const userId = req.userId || req.user?._id || req.session?.userId || req.headers['x-user-id'];
    
    if (userId) {
      const creatorId = req.params?.creatorId || req.query?.creatorId;
      const dbTier = await getUserRateLimitTier(userId, creatorId);
      if (dbTier && dbTier !== TIER_LEVELS.FREE) {
        return dbTier;
      }
    }

    // Check custom header
    const headerTier = req.headers['x-user-tier'];
    if (headerTier && Object.values(TIER_LEVELS).includes(headerTier)) {
      return headerTier;
    }

    // Check subscription data attached by middleware
    if (req.subscription?.tier) {
      return req.subscription.tier;
    }

    return DEFAULTS.defaultTier;
  } catch (error) {
    console.error('Error resolving user tier from subscription:', error.message);
    return DEFAULTS.defaultTier;
  }
}

/**
 * Attach user subscription data to request
 * @param {string} userId - User ID
 * @param {string} creatorId - Creator ID (optional)
 * @returns {Promise<Object>} Subscription data with rate limit tier
 */
async function attachSubscriptionToRequest(userId, creatorId = null) {
  try {
    const Subscription = require('../models/Subscription');
    
    let query = { user: userId };
    if (creatorId) {
      query.creator = creatorId;
    }

    const subscription = await Subscription.findOne({
      ...query,
      cancelledAt: null,
      expiry: { $gt: new Date() }
    }).populate('subscriptionTierId');

    if (!subscription) {
      return {
        hasSubscription: false,
        tier: TIER_LEVELS.FREE,
        userId
      };
    }

    return {
      hasSubscription: true,
      tier: mapSubscriptionToRateLimit(subscription.subscriptionTierId?.name || 'free'),
      subscriptionId: subscription._id,
      subscriptionTierId: subscription.subscriptionTierId?._id,
      tierName: subscription.subscriptionTierId?.name,
      tierPrice: subscription.tierPrice,
      expiryDate: subscription.expiry,
      renewalStatus: subscription.renewalStatus,
      userId
    };
  } catch (error) {
    console.error('Error attaching subscription to request:', error.message);
    return {
      hasSubscription: false,
      tier: TIER_LEVELS.FREE,
      userId
    };
  }
}

/**
 * Batch resolve user tiers from database
 * @param {Array<string>} userIds - Array of user IDs
 * @returns {Promise<Map>} Map of userId to rate limit tier
 */
async function bulkResolveUserTiers(userIds) {
  try {
    const { getUsersRateLimitTiers } = require('../utils/subscriptionTierMapper');
    return await getUsersRateLimitTiers(userIds);
  } catch (error) {
    console.error('Error bulk resolving user tiers:', error.message);
    const fallback = new Map();
    userIds.forEach(id => fallback.set(id, TIER_LEVELS.FREE));
    return fallback;
  }
}

module.exports = {
  resolveUserTierFromSubscription,
  attachSubscriptionToRequest,
  bulkResolveUserTiers
};
