// Tier Caching Service
// Provides caching functionality for subscription tier operations

const NodeCache = require('node-cache');
const logger = require('./subscriptionTierLogger');

class TierCache {
  constructor(ttlSeconds = 300) { // 5 minutes default TTL
    this.cache = new NodeCache({
      stdTTL: ttlSeconds,
      checkperiod: ttlSeconds * 0.2,
      useClones: false
    });

    this.logger = new logger('TierCache');
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.cache.on('set', (key, value) => {
      this.logger.logTierFetched(key, 'cached', { action: 'set' });
    });

    this.cache.on('del', (key, value) => {
      this.logger.logTierFetched(key, 'cache-evicted', { action: 'delete' });
    });

    this.cache.on('expired', (key, value) => {
      this.logger.logTierFetched(key, 'cache-expired', { action: 'expired' });
    });
  }

  /**
   * Get cached value
   * @param {string} key - Cache key
   * @returns {*} Cached value or undefined
   */
  get(key) {
    const value = this.cache.get(key);
    if (value !== undefined) {
      this.logger.logTierFetched(key, 'cache-hit');
    } else {
      this.logger.logTierFetched(key, 'cache-miss');
    }
    return value;
  }

  /**
   * Set cache value
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} ttl - Time to live in seconds (optional)
   */
  set(key, value, ttl) {
    this.cache.set(key, value, ttl);
  }

  /**
   * Delete cache entry
   * @param {string} key - Cache key
   */
  del(key) {
    this.cache.del(key);
  }

  /**
   * Clear all cache entries
   */
  flushAll() {
    this.cache.flushAll();
    this.logger.logTierFetched('all', 'cache-flushed');
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  getStats() {
    return this.cache.getStats();
  }

  /**
   * Cache tier data
   * @param {string} tierId - Tier ID
   * @param {Object} tierData - Tier data
   */
  cacheTier(tierId, tierData) {
    const key = `tier:${tierId}`;
    this.set(key, tierData);
  }

  /**
   * Get cached tier data
   * @param {string} tierId - Tier ID
   * @returns {Object} Cached tier data
   */
  getCachedTier(tierId) {
    const key = `tier:${tierId}`;
    return this.get(key);
  }

  /**
   * Invalidate tier cache
   * @param {string} tierId - Tier ID
   */
  invalidateTier(tierId) {
    const key = `tier:${tierId}`;
    this.del(key);
  }

  /**
   * Cache creator tiers
   * @param {string} creatorId - Creator ID
   * @param {Array} tiers - Array of tier data
   */
  cacheCreatorTiers(creatorId, tiers) {
    const key = `creator:${creatorId}:tiers`;
    this.set(key, tiers);
  }

  /**
   * Get cached creator tiers
   * @param {string} creatorId - Creator ID
   * @returns {Array} Cached tiers array
   */
  getCachedCreatorTiers(creatorId) {
    const key = `creator:${creatorId}:tiers`;
    return this.get(key);
  }

  /**
   * Invalidate creator tiers cache
   * @param {string} creatorId - Creator ID
   */
  invalidateCreatorTiers(creatorId) {
    const key = `creator:${creatorId}:tiers`;
    this.del(key);
  }

  /**
   * Cache tier hierarchy
   * @param {string} creatorId - Creator ID
   * @param {Object} hierarchy - Tier hierarchy data
   */
  cacheTierHierarchy(creatorId, hierarchy) {
    const key = `creator:${creatorId}:hierarchy`;
    this.set(key, hierarchy);
  }

  /**
   * Get cached tier hierarchy
   * @param {string} creatorId - Creator ID
   * @returns {Object} Cached hierarchy
   */
  getCachedTierHierarchy(creatorId) {
    const key = `creator:${creatorId}:hierarchy`;
    return this.get(key);
  }

  /**
   * Invalidate tier hierarchy cache
   * @param {string} creatorId - Creator ID
   */
  invalidateTierHierarchy(creatorId) {
    const key = `creator:${creatorId}:hierarchy`;
    this.del(key);
  }

  /**
   * Cache tier metrics
   * @param {string} tierId - Tier ID
   * @param {Object} metrics - Metrics data
   */
  cacheTierMetrics(tierId, metrics) {
    const key = `tier:${tierId}:metrics`;
    this.set(key, metrics, 600); // 10 minutes TTL for metrics
  }

  /**
   * Get cached tier metrics
   * @param {string} tierId - Tier ID
   * @returns {Object} Cached metrics
   */
  getCachedTierMetrics(tierId) {
    const key = `tier:${tierId}:metrics`;
    return this.get(key);
  }

  /**
   * Invalidate tier metrics cache
   * @param {string} tierId - Tier ID
   */
  invalidateTierMetrics(tierId) {
    const key = `tier:${tierId}:metrics`;
    this.del(key);
  }

  /**
   * Cache creator analytics
   * @param {string} creatorId - Creator ID
   * @param {Object} analytics - Analytics data
   */
  cacheCreatorAnalytics(creatorId, analytics) {
    const key = `creator:${creatorId}:analytics`;
    this.set(key, analytics, 600); // 10 minutes TTL for analytics
  }

  /**
   * Get cached creator analytics
   * @param {string} creatorId - Creator ID
   * @returns {Object} Cached analytics
   */
  getCachedCreatorAnalytics(creatorId) {
    const key = `creator:${creatorId}:analytics`;
    return this.get(key);
  }

  /**
   * Invalidate creator analytics cache
   * @param {string} creatorId - Creator ID
   */
  invalidateCreatorAnalytics(creatorId) {
    const key = `creator:${creatorId}:analytics`;
    this.del(key);
  }

  /**
   * Invalidate all creator-related caches
   * @param {string} creatorId - Creator ID
   */
  invalidateCreatorCache(creatorId) {
    this.invalidateCreatorTiers(creatorId);
    this.invalidateTierHierarchy(creatorId);
    this.invalidateCreatorAnalytics(creatorId);
  }

  /**
   * Invalidate all tier-related caches
   * @param {string} tierId - Tier ID
   */
  invalidateTierCache(tierId) {
    this.invalidateTier(tierId);
    this.invalidateTierMetrics(tierId);
  }
}

module.exports = TierCache;
