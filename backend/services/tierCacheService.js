/**
 * Tier Lookup Cache Service
 * 
 * Provides in-memory caching for subscription tier lookups
 * to reduce database queries and improve performance.
 * 
 * @module services/tierCacheService
 */

const NodeCache = require('node-cache');
const { getUserRateLimitTier, getUsersRateLimitTiers } = require('../utils/subscriptionTierMapper');
const { DEFAULTS } = require('../config/rateLimitConfig');

// Initialize cache with 10-minute standard TTL
const tierCache = new NodeCache({ stdTTL: 600, checkperiod: 120 });

const CACHE_KEYS = {
  USER_TIER: 'user_tier:',
  USER_CREATOR_TIER: 'user_creator_tier:',
  BULK_TIERS: 'bulk_tiers:',
  CREATOR_TIERS: 'creator_tiers:'
};

/**
 * Get cached user tier with fallback to database
 * @param {string} userId - User ID
 * @param {string} creatorId - Creator ID (optional)
 * @param {Object} options - Cache options
 * @returns {Promise<string>} User's rate limit tier
 */
async function getUserTierCached(userId, creatorId = null, options = {}) {
  try {
    const { ttl = 600, forceRefresh = false } = options;

    // Generate cache key
    const cacheKey = creatorId 
      ? `${CACHE_KEYS.USER_CREATOR_TIER}${userId}:${creatorId}`
      : `${CACHE_KEYS.USER_TIER}${userId}`;

    // Check cache first (unless forced refresh)
    if (!forceRefresh) {
      const cached = tierCache.get(cacheKey);
      if (cached !== undefined) {
        return cached;
      }
    }

    // Fetch from database
    const tier = await getUserRateLimitTier(userId, creatorId);

    // Store in cache
    tierCache.set(cacheKey, tier, ttl);

    return tier;
  } catch (error) {
    console.error('Error getting cached user tier:', error.message);
    return DEFAULTS.defaultTier;
  }
}

/**
 * Get cached tiers for multiple users
 * @param {Array<string>} userIds - Array of user IDs
 * @param {Object} options - Cache options
 * @returns {Promise<Map>} Map of userId to rate limit tier
 */
async function getUsersTiersCached(userIds, options = {}) {
  try {
    const { ttl = 600, forceRefresh = false } = options;
    const tierMap = new Map();
    const uncachedUserIds = [];

    // Check cache for existing entries
    if (!forceRefresh) {
      userIds.forEach(userId => {
        const cached = tierCache.get(`${CACHE_KEYS.USER_TIER}${userId}`);
        if (cached !== undefined) {
          tierMap.set(userId, cached);
        } else {
          uncachedUserIds.push(userId);
        }
      });
    } else {
      uncachedUserIds.push(...userIds);
    }

    // Fetch uncached users from database
    if (uncachedUserIds.length > 0) {
      const dbTiers = await getUsersRateLimitTiers(uncachedUserIds);
      
      dbTiers.forEach((tier, userId) => {
        tierMap.set(userId, tier);
        tierCache.set(`${CACHE_KEYS.USER_TIER}${userId}`, tier, ttl);
      });
    }

    // Fill in any missing users with default tier
    userIds.forEach(userId => {
      if (!tierMap.has(userId)) {
        tierMap.set(userId, DEFAULTS.defaultTier);
      }
    });

    return tierMap;
  } catch (error) {
    console.error('Error getting cached users tiers:', error.message);
    const fallback = new Map();
    userIds.forEach(id => fallback.set(id, DEFAULTS.defaultTier));
    return fallback;
  }
}

/**
 * Invalidate cache for a user
 * @param {string} userId - User ID to invalidate
 * @param {string} creatorId - Creator ID (optional)
 */
function invalidateUserTier(userId, creatorId = null) {
  try {
    if (creatorId) {
      const key = `${CACHE_KEYS.USER_CREATOR_TIER}${userId}:${creatorId}`;
      tierCache.del(key);
    } else {
      const key = `${CACHE_KEYS.USER_TIER}${userId}`;
      tierCache.del(key);
    }
  } catch (error) {
    console.error('Error invalidating user tier cache:', error.message);
  }
}

/**
 * Invalidate cache for multiple users
 * @param {Array<string>} userIds - User IDs to invalidate
 */
function invalidateUsersTiers(userIds) {
  try {
    userIds.forEach(userId => {
      const key = `${CACHE_KEYS.USER_TIER}${userId}`;
      tierCache.del(key);
    });
  } catch (error) {
    console.error('Error invalidating users tiers cache:', error.message);
  }
}

/**
 * Clear all tier cache
 */
function clearTierCache() {
  try {
    tierCache.flushAll();
    console.log('Tier cache cleared');
  } catch (error) {
    console.error('Error clearing tier cache:', error.message);
  }
}

/**
 * Get cache statistics
 * @returns {Object} Cache stats including keys count and memory usage
 */
function getCacheStats() {
  try {
    return {
      keys: tierCache.keys(),
      keyCount: tierCache.keys().length,
      stats: tierCache.getStats()
    };
  } catch (error) {
    console.error('Error getting cache stats:', error.message);
    return {
      keys: [],
      keyCount: 0,
      stats: {}
    };
  }
}

/**
 * Set custom cache TTL
 * @param {number} ttlSeconds - TTL in seconds
 */
function setCacheTTL(ttlSeconds) {
  try {
    tierCache.options.stdTTL = ttlSeconds;
    console.log(`Tier cache TTL set to ${ttlSeconds} seconds`);
  } catch (error) {
    console.error('Error setting cache TTL:', error.message);
  }
}

/**
 * Warm up cache with frequently accessed users
 * @param {Array<string>} userIds - User IDs to pre-cache
 */
async function warmupCache(userIds) {
  try {
    console.log(`Warming up tier cache for ${userIds.length} users...`);
    const start = Date.now();
    
    await getUsersTiersCached(userIds);
    
    const duration = Date.now() - start;
    console.log(`✓ Cache warmup completed in ${duration}ms`);
  } catch (error) {
    console.error('Error warming up cache:', error.message);
  }
}

/**
 * Monitor cache health and performance
 * @returns {Object} Health report
 */
function getCacheHealth() {
  try {
    const stats = getCacheStats();
    return {
      healthy: stats.keyCount > 0,
      cachedUsers: stats.keyCount,
      stats: stats.stats,
      memoryEstimate: `${JSON.stringify(stats.keys).length} bytes`
    };
  } catch (error) {
    console.error('Error checking cache health:', error.message);
    return {
      healthy: false,
      error: error.message
    };
  }
}

module.exports = {
  getUserTierCached,
  getUsersTiersCached,
  invalidateUserTier,
  invalidateUsersTiers,
  clearTierCache,
  getCacheStats,
  setCacheTTL,
  warmupCache,
  getCacheHealth,
  tierCache
};
