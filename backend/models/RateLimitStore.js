const mongoose = require('mongoose');

/**
 * Rate Limit Store Schema
 * 
 * Stores rate limit tracking data per user/IP in MongoDB.
 * Supports window-based, burst, and daily rate limiting.
 * 
 * @module models/RateLimitStore
 */
const rateLimitStoreSchema = new mongoose.Schema({
  // Unique key identifying the rate-limited entity (wallet address, IP, or combined)
  key: {
    type: String,
    required: true,
    index: true,
    description: 'Unique identifier for the rate-limited entity'
  },

  // User tier at the time of the request
  tier: {
    type: String,
    required: true,
    enum: ['free', 'basic', 'premium', 'enterprise', 'admin'],
    default: 'free',
    description: 'User subscription tier'
  },

  // Window-based rate limiting
  windowRequests: {
    type: Number,
    default: 0,
    min: 0,
    description: 'Number of requests in the current window'
  },
  windowStart: {
    type: Date,
    default: Date.now,
    description: 'Start time of the current rate limit window'
  },

  // Burst rate limiting
  burstRequests: {
    type: Number,
    default: 0,
    min: 0,
    description: 'Number of requests in the current burst window'
  },
  burstWindowStart: {
    type: Date,
    default: Date.now,
    description: 'Start time of the current burst window'
  },

  // Daily rate limiting
  dailyRequests: {
    type: Number,
    default: 0,
    min: 0,
    description: 'Number of requests today'
  },
  dailyResetAt: {
    type: Date,
    default: () => {
      const tomorrow = new Date();
      tomorrow.setHours(24, 0, 0, 0);
      return tomorrow;
    },
    description: 'When the daily counter resets'
  },

  // Concurrent request tracking
  activeRequests: {
    type: Number,
    default: 0,
    min: 0,
    description: 'Number of currently active concurrent requests'
  },

  // Endpoint-specific tracking
  endpointCounts: {
    type: Map,
    of: Number,
    default: new Map(),
    description: 'Request counts per endpoint'
  },

  // Metadata
  walletAddress: {
    type: String,
    default: null,
    description: 'Associated wallet address if authenticated'
  },
  ipAddress: {
    type: String,
    default: null,
    description: 'Client IP address'
  },
  userAgent: {
    type: String,
    default: null,
    description: 'Client user agent string'
  },

  // Rate limit violation tracking
  violations: {
    type: Number,
    default: 0,
    description: 'Total number of rate limit violations'
  },
  lastViolationAt: {
    type: Date,
    default: null,
    description: 'Timestamp of the last rate limit violation'
  },
  blockedUntil: {
    type: Date,
    default: null,
    description: 'If set, requests are blocked until this time'
  },

  // Timestamps
  lastRequestAt: {
    type: Date,
    default: Date.now,
    description: 'Timestamp of the last request'
  }
}, {
  timestamps: true,
  collection: 'rate_limit_store'
});

// Compound index for efficient lookups
rateLimitStoreSchema.index({ key: 1, tier: 1 });
rateLimitStoreSchema.index({ blockedUntil: 1 }, { expireAfterSeconds: 0 });
rateLimitStoreSchema.index({ lastRequestAt: 1 });
rateLimitStoreSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 }); // Auto-cleanup after 24 hours

/**
 * Check if the current window has expired
 * @param {number} windowMs - Window duration in milliseconds
 * @returns {boolean}
 */
rateLimitStoreSchema.methods.isWindowExpired = function(windowMs) {
  const now = new Date();
  const windowEnd = new Date(this.windowStart.getTime() + windowMs);
  return now >= windowEnd;
};

/**
 * Check if the burst window has expired
 * @param {number} burstWindowMs - Burst window duration in milliseconds
 * @returns {boolean}
 */
rateLimitStoreSchema.methods.isBurstWindowExpired = function(burstWindowMs) {
  const now = new Date();
  const burstEnd = new Date(this.burstWindowStart.getTime() + burstWindowMs);
  return now >= burstEnd;
};

/**
 * Check if the daily limit should be reset
 * @returns {boolean}
 */
rateLimitStoreSchema.methods.shouldResetDaily = function() {
  return new Date() >= this.dailyResetAt;
};

/**
 * Reset the window counter
 */
rateLimitStoreSchema.methods.resetWindow = function() {
  this.windowRequests = 0;
  this.windowStart = new Date();
};

/**
 * Reset the burst counter
 */
rateLimitStoreSchema.methods.resetBurst = function() {
  this.burstRequests = 0;
  this.burstWindowStart = new Date();
};

/**
 * Reset the daily counter
 */
rateLimitStoreSchema.methods.resetDaily = function() {
  this.dailyRequests = 0;
  const tomorrow = new Date();
  tomorrow.setHours(24, 0, 0, 0);
  this.dailyResetAt = tomorrow;
};

/**
 * Record a rate limit violation
 */
rateLimitStoreSchema.methods.recordViolation = function() {
  this.violations += 1;
  this.lastViolationAt = new Date();

  // Progressive blocking: block for longer periods with more violations
  if (this.violations >= 10) {
    // Block for 1 hour after 10+ violations
    this.blockedUntil = new Date(Date.now() + 60 * 60 * 1000);
  } else if (this.violations >= 5) {
    // Block for 15 minutes after 5+ violations
    this.blockedUntil = new Date(Date.now() + 15 * 60 * 1000);
  } else if (this.violations >= 3) {
    // Block for 5 minutes after 3+ violations
    this.blockedUntil = new Date(Date.now() + 5 * 60 * 1000);
  }
};

/**
 * Check if the entity is currently blocked
 * @returns {boolean}
 */
rateLimitStoreSchema.methods.isBlocked = function() {
  if (!this.blockedUntil) return false;
  return new Date() < this.blockedUntil;
};

/**
 * Static method to find or create a rate limit record
 * @param {string} key - Unique key
 * @param {string} tier - User tier
 * @returns {Promise<Document>}
 */
rateLimitStoreSchema.statics.findOrCreate = async function(key, tier = 'free') {
  let record = await this.findOne({ key });
  if (!record) {
    record = new this({ key, tier });
    await record.save();
  } else if (record.tier !== tier) {
    record.tier = tier;
    await record.save();
  }
  return record;
};

/**
 * Static method to clean up expired records
 * @returns {Promise<number>} Number of deleted records
 */
rateLimitStoreSchema.statics.cleanupExpired = async function() {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const result = await this.deleteMany({ lastRequestAt: { $lt: oneDayAgo } });
  return result.deletedCount;
};

/**
 * Static method to get rate limit statistics
 * @returns {Promise<Object>}
 */
rateLimitStoreSchema.statics.getStats = async function() {
  const totalRecords = await this.countDocuments();
  const blockedRecords = await this.countDocuments({ blockedUntil: { $gt: new Date() } });
  const tierCounts = await this.aggregate([
    { $group: { _id: '$tier', count: { $sum: 1 } } }
  ]);

  return {
    totalRecords,
    blockedRecords,
    tierDistribution: tierCounts.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {})
  };
};

const RateLimitStore = mongoose.model('RateLimitStore', rateLimitStoreSchema);

module.exports = RateLimitStore;
