/**
 * Analytics Configuration
 * Settings and configuration for analytics data aggregation
 */

const analyticsConfig = {
  // Data collection settings
  collection: {
    enabled: true,
    sampleRate: 1.0, // 1.0 = 100% of events, 0.1 = 10% of events
    maxBatchSize: 1000,
    flushInterval: 30000, // 30 seconds
  },

  // Aggregation settings
  aggregation: {
    enabled: true,
    schedules: {
      hourly: {
        enabled: true,
        cronExpression: '0 * * * *', // Every hour at minute 0
        retentionDays: 7,
      },
      daily: {
        enabled: true,
        cronExpression: '0 2 * * *', // Daily at 2 AM
        retentionDays: 90,
      },
      weekly: {
        enabled: true,
        cronExpression: '0 3 * * 0', // Weekly on Sunday at 3 AM
        retentionDays: 365,
      },
      monthly: {
        enabled: true,
        cronExpression: '0 4 1 * *', // Monthly on 1st at 4 AM
        retentionDays: 1825, // 5 years
      },
    },
  },

  // Data retention policies
  retention: {
    rawEvents: {
      days: 90,
      autoDelete: true,
    },
    hourlyAggregations: {
      days: 7,
      autoDelete: true,
    },
    dailyAggregations: {
      days: 90,
      autoDelete: true,
    },
    weeklyAggregations: {
      days: 365,
      autoDelete: true,
    },
    monthlyAggregations: {
      days: 1825, // 5 years
      autoDelete: false, // Manual review required
    },
  },

  // Performance settings
  performance: {
    maxConcurrentAggregations: 3,
    aggregationTimeout: 300000, // 5 minutes
    memoryLimit: '512MB',
    enableCompression: true,
  },

  // Privacy and compliance
  privacy: {
    anonymizeIPs: true,
    dataRetentionCompliance: true,
    gdprCompliant: true,
    allowDataExport: true,
    allowDataDeletion: true,
  },

  // Real-time processing
  realTime: {
    enabled: true,
    updateInterval: 30000, // 30 seconds
    criticalEvents: [
      'USER_REGISTRATION',
      'CONTENT_PURCHASE',
      'TRANSACTION',
      'ADMIN_ACTION',
    ],
  },

  // Analytics features
  features: {
    userBehaviorTracking: true,
    contentPerformanceTracking: true,
    revenueAnalytics: true,
    geographicAnalytics: true,
    deviceAnalytics: true,
    conversionTracking: true,
    cohortAnalysis: false, // Future feature
    predictiveAnalytics: false, // Future feature
  },

  // Alert thresholds
  alerts: {
    errorRateThreshold: 0.05, // 5% error rate
    performanceDegradationThreshold: 0.2, // 20% degradation
    dataLossThreshold: 0.01, // 1% data loss
    enableEmailAlerts: true,
    enableSlackAlerts: false,
  },

  // Export settings
  export: {
    formats: ['json', 'csv', 'xlsx'],
    maxRecordsPerExport: 100000,
    compressionEnabled: true,
    retentionPeriod: 7, // days
  },

  // Database settings
  database: {
    connectionPoolSize: 10,
    queryTimeout: 30000,
    enableQueryLogging: process.env.NODE_ENV === 'development',
    indexes: {
      autoCreate: true,
      optimizeOnStartup: true,
    },
  },

  // Cache settings
  cache: {
    enabled: true,
    ttl: 3600, // 1 hour
    maxSize: '100MB',
    redisUrl: process.env.REDIS_URL,
  },

  // Monitoring and logging
  monitoring: {
    enabled: true,
    metricsInterval: 60000, // 1 minute
    logLevel: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    enablePerformanceMonitoring: true,
  },
};

module.exports = analyticsConfig;
