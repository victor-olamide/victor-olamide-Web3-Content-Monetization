const mongoose = require('mongoose');

/**
 * CDN Cache Entry model - tracks cached content in CDN
 */
const cdnCacheEntrySchema = new mongoose.Schema({
  contentId: { type: Number, required: true },
  contentType: { type: String, enum: ['video', 'audio', 'image', 'document'], required: true },
  storageType: { type: String, enum: ['ipfs', 'gaia'], required: true },
  originalUrl: { type: String, required: true }, // Original IPFS/Gaia URL
  cdnUrl: { type: String, required: true }, // CDN URL
  cacheKey: { type: String, required: true, unique: true }, // Unique cache identifier

  // Cache metadata
  fileSize: { type: Number },
  mimeType: { type: String },
  checksum: { type: String }, // SHA256 hash of content

  // Cache status
  status: {
    type: String,
    enum: ['pending', 'cached', 'purged', 'failed'],
    default: 'pending'
  },
  cachedAt: { type: Date },
  expiresAt: { type: Date },
  lastAccessed: { type: Date },

  // CDN provider information
  provider: { type: String, enum: ['cloudflare', 'cloudfront', 'fastly', 'akamai'], required: true },
  providerId: { type: String }, // Provider-specific identifier

  // Performance metrics
  hitCount: { type: Number, default: 0 },
  missCount: { type: Number, default: 0 },
  bytesServed: { type: Number, default: 0 },

  // Geographic distribution
  regions: [{ type: String }], // CDN regions where content is cached
  geoStats: {
    type: Map,
    of: {
      hits: { type: Number, default: 0 },
      bytes: { type: Number, default: 0 }
    }
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes for efficient queries
cdnCacheEntrySchema.index({ contentId: 1 });
cdnCacheEntrySchema.index({ cacheKey: 1 }, { unique: true });
cdnCacheEntrySchema.index({ status: 1, expiresAt: -1 });
cdnCacheEntrySchema.index({ provider: 1, status: 1 });
cdnCacheEntrySchema.index({ lastAccessed: -1 });
cdnCacheEntrySchema.index({ contentType: 1, status: 1 });

/**
 * CDN Purge Request model - tracks cache purge operations
 */
const cdnPurgeRequestSchema = new mongoose.Schema({
  purgeId: { type: String, required: true, unique: true },
  type: { type: String, enum: ['single', 'batch', 'wildcard'], required: true },

  // Purge targets
  urls: [{ type: String }], // URLs to purge
  cacheKeys: [{ type: String }], // Cache keys to purge
  patterns: [{ type: String }], // Wildcard patterns

  // Purge metadata
  reason: { type: String, enum: ['content_update', 'manual', 'scheduled', 'error'], default: 'manual' },
  requestedBy: { type: String }, // User/system that requested purge
  contentIds: [{ type: Number }], // Related content IDs

  // Status and results
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'partial'],
    default: 'pending'
  },
  startedAt: { type: Date },
  completedAt: { type: Date },
  duration: { type: Number }, // Duration in milliseconds

  // Provider responses
  provider: { type: String, enum: ['cloudflare', 'cloudfront', 'fastly', 'akamai'], required: true },
  providerResponse: { type: mongoose.Schema.Types.Mixed },

  // Results
  successCount: { type: Number, default: 0 },
  failureCount: { type: Number, default: 0 },
  errors: [{ type: String }],

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes
cdnPurgeRequestSchema.index({ purgeId: 1 }, { unique: true });
cdnPurgeRequestSchema.index({ status: 1, createdAt: -1 });
cdnPurgeRequestSchema.index({ provider: 1, status: 1 });
cdnPurgeRequestSchema.index({ requestedBy: 1 });

/**
 * CDN Analytics model - tracks CDN performance and usage metrics
 */
const cdnAnalyticsSchema = new mongoose.Schema({
  analyticsId: { type: String, required: true, unique: true },
  provider: { type: String, enum: ['cloudflare', 'cloudfront', 'fastly', 'akamai'], required: true },

  // Time period
  period: { type: String, enum: ['hourly', 'daily', 'weekly', 'monthly'], required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },

  // Traffic metrics
  requests: { type: Number, default: 0 },
  bytesServed: { type: Number, default: 0 },
  cacheHits: { type: Number, default: 0 },
  cacheMisses: { type: Number, default: 0 },

  // Performance metrics
  avgResponseTime: { type: Number }, // Average response time in milliseconds
  p95ResponseTime: { type: Number }, // 95th percentile response time
  errorRate: { type: Number }, // Error rate as percentage

  // Geographic breakdown
  geoBreakdown: {
    type: Map,
    of: {
      requests: { type: Number, default: 0 },
      bytes: { type: Number, default: 0 },
      avgResponseTime: { type: Number }
    }
  },

  // Content type breakdown
  contentTypeBreakdown: {
    type: Map,
    of: {
      requests: { type: Number, default: 0 },
      bytes: { type: Number, default: 0 }
    }
  },

  // Status code breakdown
  statusCodes: {
    type: Map,
    of: Number
  },

  // Raw provider data (for debugging)
  rawData: { type: mongoose.Schema.Types.Mixed },

  createdAt: { type: Date, default: Date.now }
});

// Indexes
cdnAnalyticsSchema.index({ provider: 1, period: 1, startTime: -1 });
cdnAnalyticsSchema.index({ analyticsId: 1 }, { unique: true });
cdnAnalyticsSchema.index({ startTime: -1, endTime: -1 });

/**
 * CDN Health Check model - tracks CDN availability and performance
 */
const cdnHealthCheckSchema = new mongoose.Schema({
  checkId: { type: String, required: true, unique: true },
  provider: { type: String, enum: ['cloudflare', 'cloudfront', 'fastly', 'akamai'], required: true },

  // Check details
  endpoint: { type: String, required: true }, // CDN endpoint being checked
  checkType: { type: String, enum: ['connectivity', 'performance', 'content'], default: 'connectivity' },

  // Results
  status: {
    type: String,
    enum: ['healthy', 'degraded', 'unhealthy', 'unknown'],
    required: true
  },
  responseTime: { type: Number }, // Response time in milliseconds
  statusCode: { type: Number },
  error: { type: String },

  // Health metrics
  uptime: { type: Number }, // Uptime percentage for the period
  avgResponseTime: { type: Number },
  errorCount: { type: Number, default: 0 },

  // Geographic checks
  region: { type: String },
  regionStatus: {
    type: String,
    enum: ['healthy', 'degraded', 'unhealthy'],
    default: 'healthy'
  },

  checkedAt: { type: Date, default: Date.now },
  nextCheck: { type: Date }
});

// Indexes
cdnHealthCheckSchema.index({ provider: 1, checkedAt: -1 });
cdnHealthCheckSchema.index({ status: 1, checkedAt: -1 });
cdnHealthCheckSchema.index({ checkId: 1 }, { unique: true });
cdnHealthCheckSchema.index({ nextCheck: 1 });

// Pre-save middleware to update timestamps
cdnCacheEntrySchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

cdnPurgeRequestSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Static methods for CDN Cache Entry
cdnCacheEntrySchema.statics.findExpired = function() {
  return this.find({
    status: 'cached',
    expiresAt: { $lt: new Date() }
  });
};

cdnCacheEntrySchema.statics.findByContentId = function(contentId) {
  return this.findOne({ contentId });
};

cdnCacheEntrySchema.statics.updateAccessStats = function(cacheKey, bytesServed, region) {
  const update = {
    $inc: {
      hitCount: 1,
      bytesServed: bytesServed || 0
    },
    $set: { lastAccessed: new Date() }
  };

  if (region) {
    update.$inc = update.$inc || {};
    update.$inc[`geoStats.${region}.hits`] = 1;
    update.$inc[`geoStats.${region}.bytes`] = bytesServed || 0;
  }

  return this.updateOne({ cacheKey }, update);
};

module.exports = {
  CdnCacheEntry: mongoose.model('CdnCacheEntry', cdnCacheEntrySchema),
  CdnPurgeRequest: mongoose.model('CdnPurgeRequest', cdnPurgeRequestSchema),
  CdnAnalytics: mongoose.model('CdnAnalytics', cdnAnalyticsSchema),
  CdnHealthCheck: mongoose.model('CdnHealthCheck', cdnHealthCheckSchema)
};