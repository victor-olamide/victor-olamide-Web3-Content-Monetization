/**
 * Analytics Aggregation Model
 * Stores aggregated analytics data for efficient querying
 */

const mongoose = require('mongoose');

const analyticsAggregationSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
      index: true,
    },
    granularity: {
      type: String,
      enum: ['hourly', 'daily', 'weekly', 'monthly'],
      required: true,
      index: true,
    },
    metrics: {
      // User metrics
      totalUsers: { type: Number, default: 0 },
      newUsers: { type: Number, default: 0 },
      activeUsers: { type: Number, default: 0 },
      returningUsers: { type: Number, default: 0 },

      // Content metrics
      totalContent: { type: Number, default: 0 },
      newContent: { type: Number, default: 0 },
      contentViews: { type: Number, default: 0 },
      uniqueContentViews: { type: Number, default: 0 },
      contentLikes: { type: Number, default: 0 },
      contentShares: { type: Number, default: 0 },
      contentPurchases: { type: Number, default: 0 },

      // Transaction metrics
      totalTransactions: { type: Number, default: 0 },
      transactionVolume: { type: Number, default: 0 },
      platformFees: { type: Number, default: 0 },
      creatorRevenue: { type: Number, default: 0 },

      // Engagement metrics
      totalSessions: { type: Number, default: 0 },
      avgSessionDuration: { type: Number, default: 0 },
      pageViews: { type: Number, default: 0 },
      uniqueVisitors: { type: Number, default: 0 },
      bounceRate: { type: Number, default: 0 },

      // Platform metrics
      apiCalls: { type: Number, default: 0 },
      errorRate: { type: Number, default: 0 },
      avgResponseTime: { type: Number, default: 0 },

      // Geographic metrics
      topCountries: [{
        country: String,
        count: Number,
      }],
      topCities: [{
        city: String,
        count: Number,
      }],

      // Device metrics
      deviceBreakdown: {
        desktop: { type: Number, default: 0 },
        mobile: { type: Number, default: 0 },
        tablet: { type: Number, default: 0 },
      },

      // Content type breakdown
      contentTypeBreakdown: mongoose.Schema.Types.Mixed,

      // Revenue by content type
      revenueByContentType: mongoose.Schema.Types.Mixed,
    },

    dimensions: {
      // Breakdown by various dimensions
      byContentType: mongoose.Schema.Types.Mixed,
      byUserRole: mongoose.Schema.Types.Mixed,
      byDeviceType: mongoose.Schema.Types.Mixed,
      byCountry: mongoose.Schema.Types.Mixed,
      byHour: mongoose.Schema.Types.Mixed, // For hourly granularity
    },

    metadata: {
      processedAt: { type: Date, default: Date.now },
      eventCount: { type: Number, default: 0 },
      processingTime: { type: Number, default: 0 }, // in milliseconds
      dataQuality: {
        completeness: { type: Number, default: 0 }, // 0-100
        accuracy: { type: Number, default: 0 }, // 0-100
      },
    },
  },
  {
    timestamps: true,
    collection: 'analyticsAggregations',
  }
);

// Compound indexes for efficient querying
analyticsAggregationSchema.index({ date: 1, granularity: 1 }, { unique: true });
analyticsAggregationSchema.index({ granularity: 1, date: -1 });

// TTL index for data retention (2 years for daily, 5 years for monthly)
analyticsAggregationSchema.pre('save', function(next) {
  if (this.granularity === 'daily') {
    this.collection.collectionName = 'analyticsAggregations';
    // TTL will be set at collection level
  }
  next();
});

/**
 * Get aggregated data for date range
 */
analyticsAggregationSchema.statics.getAggregatedData = async function (
  startDate,
  endDate,
  granularity = 'daily'
) {
  return await this.find({
    date: { $gte: startDate, $lte: endDate },
    granularity,
  }).sort({ date: 1 });
};

/**
 * Get latest aggregated data
 */
analyticsAggregationSchema.statics.getLatestData = async function (granularity = 'daily') {
  return await this.findOne({ granularity }).sort({ date: -1 });
};

/**
 * Aggregate metrics for a specific date and granularity
 */
analyticsAggregationSchema.statics.aggregateMetrics = async function (
  date,
  granularity,
  events
) {
  const aggregation = {
    date,
    granularity,
    metrics: {},
    dimensions: {},
    metadata: {
      processedAt: new Date(),
      eventCount: events.length,
    },
  };

  // Initialize metrics
  const metrics = {
    totalUsers: new Set(),
    newUsers: new Set(),
    activeUsers: new Set(),
    contentViews: 0,
    contentLikes: 0,
    contentShares: 0,
    contentPurchases: 0,
    totalTransactions: 0,
    transactionVolume: 0,
    platformFees: 0,
    creatorRevenue: 0,
    totalSessions: new Set(),
    pageViews: 0,
    uniqueVisitors: new Set(),
    apiCalls: 0,
    topCountries: new Map(),
    topCities: new Map(),
    deviceBreakdown: { desktop: 0, mobile: 0, tablet: 0 },
    contentTypeBreakdown: new Map(),
  };

  // Process events
  for (const event of events) {
    switch (event.eventType) {
      case 'USER_REGISTRATION':
        metrics.newUsers.add(event.userId?.toString());
        break;
      case 'USER_LOGIN':
        metrics.activeUsers.add(event.userId?.toString());
        break;
      case 'CONTENT_VIEW':
        metrics.contentViews++;
        metrics.uniqueVisitors.add(event.userId?.toString());
        break;
      case 'CONTENT_LIKE':
        metrics.contentLikes++;
        break;
      case 'CONTENT_SHARE':
        metrics.contentShares++;
        break;
      case 'CONTENT_PURCHASE':
        metrics.contentPurchases++;
        metrics.transactionVolume += event.metadata?.amount || 0;
        metrics.platformFees += event.metadata?.platformFee || 0;
        break;
      case 'PAGE_VIEW':
        metrics.pageViews++;
        metrics.totalSessions.add(event.sessionId);
        break;
    }

    // Geographic data
    if (event.country) {
      metrics.topCountries.set(
        event.country,
        (metrics.topCountries.get(event.country) || 0) + 1
      );
    }

    if (event.city) {
      metrics.topCities.set(
        event.city,
        (metrics.topCities.get(event.city) || 0) + 1
      );
    }

    // Device data
    if (event.deviceType) {
      metrics.deviceBreakdown[event.deviceType]++;
    }
  }

  // Convert Sets to counts and Maps to arrays
  aggregation.metrics = {
    totalUsers: metrics.totalUsers.size,
    newUsers: metrics.newUsers.size,
    activeUsers: metrics.activeUsers.size,
    contentViews: metrics.contentViews,
    contentLikes: metrics.contentLikes,
    contentShares: metrics.contentShares,
    contentPurchases: metrics.contentPurchases,
    totalTransactions: metrics.totalTransactions,
    transactionVolume: metrics.transactionVolume,
    platformFees: metrics.platformFees,
    creatorRevenue: metrics.transactionVolume - metrics.platformFees,
    totalSessions: metrics.totalSessions.size,
    pageViews: metrics.pageViews,
    uniqueVisitors: metrics.uniqueVisitors.size,
    apiCalls: metrics.apiCalls,
    topCountries: Array.from(metrics.topCountries.entries()).map(([country, count]) => ({
      country,
      count,
    })),
    topCities: Array.from(metrics.topCities.entries()).map(([city, count]) => ({
      city,
      count,
    })),
    deviceBreakdown: metrics.deviceBreakdown,
  };

  return aggregation;
};

module.exports = mongoose.model('AnalyticsAggregation', analyticsAggregationSchema);
