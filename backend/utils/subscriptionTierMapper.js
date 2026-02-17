/**
 * Subscription Tier to Rate Limit Tier Mapper
 * 
 * Maps subscription tiers to rate limit tiers and provides
 * conversion utilities between subscription and rate limit systems.
 * 
 * @module utils/subscriptionTierMapper
 */

const { TIER_LEVELS } = require('../config/rateLimitConfig');
const SubscriptionTier = require('../models/SubscriptionTier');
const Subscription = require('../models/Subscription');

/**
 * Map subscription tier to rate limit tier
 * @param {string|Object} subscriptionTier - Subscription tier name or object
 * @returns {string} Rate limit tier level
 */
function mapSubscriptionToRateLimit(subscriptionTier) {
  const tierName = typeof subscriptionTier === 'string' 
    ? subscriptionTier.toLowerCase() 
    : subscriptionTier?.name?.toLowerCase();

  // Direct mapping for common subscription tier names
  const tierMapping = {
    'free': TIER_LEVELS.FREE,
    'basic': TIER_LEVELS.BASIC,
    'standard': TIER_LEVELS.BASIC,
    'starter': TIER_LEVELS.BASIC,
    'premium': TIER_LEVELS.PREMIUM,
    'pro': TIER_LEVELS.PREMIUM,
    'expert': TIER_LEVELS.PREMIUM,
    'enterprise': TIER_LEVELS.ENTERPRISE,
    'business': TIER_LEVELS.ENTERPRISE,
    'unlimited': TIER_LEVELS.ENTERPRISE,
    'admin': TIER_LEVELS.ADMIN,
    'superadmin': TIER_LEVELS.ADMIN,
    'staff': TIER_LEVELS.ADMIN,
  };

  return tierMapping[tierName] || TIER_LEVELS.FREE;
}

/**
 * Get subscription tier metadata including rate limit tier equivalence
 * @param {string} subscriptionTierId - Subscription tier MongoDB ID
 * @returns {Promise<Object>} Subscription tier with rate limit mapping
 */
async function getSubscriptionTierWithRateLimitMapping(subscriptionTierId) {
  try {
    const tier = await SubscriptionTier.findById(subscriptionTierId);
    
    if (!tier) {
      return null;
    }

    const rateLimitTier = mapSubscriptionToRateLimit(tier.name);

    return {
      subscriptionTierId: tier._id,
      subscriptionTierName: tier.name,
      subscriptionTierPrice: tier.price,
      rateLimitTier,
      accessLevel: tier.accessLevel || 1,
      description: tier.description,
      contentAccess: tier.contentAccess,
      downloadLimit: tier.downloadLimit
    };
  } catch (error) {
    console.error('Error fetching subscription tier with rate limit mapping:', error.message);
    return null;
  }
}

/**
 * Get user's current subscription tier and map to rate limit tier
 * @param {string} userId - User ID
 * @param {string} creatorId - Creator ID (for multi-creator systems)
 * @returns {Promise<string>} Rate limit tier level
 */
async function getUserRateLimitTier(userId, creatorId = null) {
  try {
    let query = { user: userId };
    if (creatorId) {
      query.creator = creatorId;
    }

    // Get active subscription
    const subscription = await Subscription.findOne({
      ...query,
      cancelledAt: null,
      expiry: { $gt: new Date() }
    }).populate('subscriptionTierId');

    if (!subscription || !subscription.subscriptionTierId) {
      return TIER_LEVELS.FREE;
    }

    return mapSubscriptionToRateLimit(subscription.subscriptionTierId.name);
  } catch (error) {
    console.error('Error getting user rate limit tier:', error.message);
    return TIER_LEVELS.FREE;
  }
}

/**
 * Get multiple users' subscription tiers for bulk operations
 * @param {Array<string>} userIds - Array of user IDs
 * @returns {Promise<Map>} Map of userId to rate limit tier
 */
async function getUsersRateLimitTiers(userIds) {
  try {
    const subscriptions = await Subscription.find({
      user: { $in: userIds },
      cancelledAt: null,
      expiry: { $gt: new Date() }
    }).populate('subscriptionTierId');

    const tierMap = new Map();

    // Initialize all users with free tier
    userIds.forEach(id => tierMap.set(id, TIER_LEVELS.FREE));

    // Override with actual subscription tiers
    subscriptions.forEach(sub => {
      if (sub.subscriptionTierId) {
        const tier = mapSubscriptionToRateLimit(sub.subscriptionTierId.name);
        tierMap.set(sub.user, tier);
      }
    });

    return tierMap;
  } catch (error) {
    console.error('Error getting users rate limit tiers:', error.message);
    const fallbackMap = new Map();
    userIds.forEach(id => fallbackMap.set(id, TIER_LEVELS.FREE));
    return fallbackMap;
  }
}

/**
 * Check if user has subscription and is within rate limit tier
 * @param {string} userId - User ID
 * @param {string} requiredTier - Required minimum tier level
 * @returns {Promise<boolean>} True if user meets tier requirement
 */
async function hasMinimumTier(userId, requiredTier) {
  try {
    const tierHierarchy = [
      TIER_LEVELS.FREE,
      TIER_LEVELS.BASIC,
      TIER_LEVELS.PREMIUM,
      TIER_LEVELS.ENTERPRISE,
      TIER_LEVELS.ADMIN
    ];

    const userTier = await getUserRateLimitTier(userId);
    const userTierIndex = tierHierarchy.indexOf(userTier);
    const requiredTierIndex = tierHierarchy.indexOf(requiredTier);

    return userTierIndex >= requiredTierIndex;
  } catch (error) {
    console.error('Error checking minimum tier:', error.message);
    return false;
  }
}

/**
 * Validate subscription tier name
 * @param {string} tierName - Tier name to validate
 * @returns {boolean}
 */
function isValidSubscriptionTierName(tierName) {
  if (!tierName) return false;
  const validNames = Object.keys({
    'free': true, 'basic': true, 'standard': true, 'starter': true,
    'premium': true, 'pro': true, 'expert': true,
    'enterprise': true, 'business': true, 'unlimited': true,
    'admin': true, 'superadmin': true, 'staff': true
  });
  return validNames.includes(tierName.toLowerCase());
}

/**
 * Get tier information for comparison
 * @param {string} tier1 - First tier
 * @param {string} tier2 - Second tier
 * @returns {Object} Comparison object
 */
function compareTierLevels(tier1, tier2) {
  const tierHierarchy = [
    TIER_LEVELS.FREE,
    TIER_LEVELS.BASIC,
    TIER_LEVELS.PREMIUM,
    TIER_LEVELS.ENTERPRISE,
    TIER_LEVELS.ADMIN
  ];

  const index1 = tierHierarchy.indexOf(tier1);
  const index2 = tierHierarchy.indexOf(tier2);

  return {
    tier1,
    tier2,
    tier1Index: index1,
    tier2Index: index2,
    isUpgrade: index1 < index2,
    isDowngrade: index1 > index2,
    isSameTier: index1 === index2,
    tierDifference: Math.abs(index1 - index2)
  };
}

module.exports = {
  mapSubscriptionToRateLimit,
  getSubscriptionTierWithRateLimitMapping,
  getUserRateLimitTier,
  getUsersRateLimitTiers,
  hasMinimumTier,
  isValidSubscriptionTierName,
  compareTierLevels
};
