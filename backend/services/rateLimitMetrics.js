/**
 * Rate Limiting Monitoring and Metrics
 * 
 * Provides comprehensive monitoring and metrics collection
 * for tiered rate limiting system.
 * 
 * @module services/rateLimitMetrics
 */

const TierChangeLog = require('../models/TierChangeLog');
const RateLimitStore = require('../models/RateLimitStore');
const { getCacheHealth } = require('./tierCacheService');

/**
 * Collect rate limiting metrics
 * @param {Object} options - Collection options
 * @returns {Promise<Object>} Metrics object
 */
async function collectMetrics(options = {}) {
  try {
    const {
      timeframe = 'day', // 'hour', 'day', 'week', 'month'
      includeTierStats = true,
      includeCacheStats = true,
      includeViolations = true
    } = options;

    const metrics = {
      timestamp: new Date().toISOString(),
      timeframe,
      data: {}
    };

    // Tier change statistics
    if (includeTierStats) {
      metrics.data.tierStats = await getTierStatistics(timeframe);
    }

    // Rate limit violations
    if (includeViolations) {
      metrics.data.violations = await getViolationMetrics(timeframe);
    }

    // Cache performance
    if (includeCacheStats) {
      metrics.data.cacheHealth = getCacheHealth();
    }

    // Overall system health
    metrics.data.systemHealth = await getSystemHealth();

    return metrics;
  } catch (error) {
    console.error('Error collecting metrics:', error.message);
    return {
      timestamp: new Date().toISOString(),
      error: error.message
    };
  }
}

/**
 * Get tier change statistics for a time period
 * @param {string} timeframe - 'hour', 'day', 'week', 'month'
 * @returns {Promise<Object>} Tier statistics
 */
async function getTierStatistics(timeframe = 'day') {
  try {
    const now = new Date();
    let startDate;

    switch (timeframe) {
      case 'hour':
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'day':
      default:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    const stats = await TierChangeLog.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalChanges: { $sum: 1 },
          upgrades: { $sum: { $cond: ['$isUpgrade', 1, 0] } },
          downgrades: { $sum: { $cond: ['$isDowngrade', 1, 0] } },
          uniqueUsers: { $addToSet: '$userId' },
          tierDistribution: {
            $push: {
              tier: '$newRateLimitTier',
              count: 1
            }
          }
        }
      },
      {
        $project: {
          totalChanges: 1,
          upgrades: 1,
          upgradePct: {
            $multiply: [
              { $divide: ['$upgrades', { $max: ['$totalChanges', 1] }] },
              100
            ]
          },
          downgrades: 1,
          downgradePct: {
            $multiply: [
              { $divide: ['$downgrades', { $max: ['$totalChanges', 1] }] },
              100
            ]
          },
          uniqueUserCount: { $size: '$uniqueUsers' }
        }
      }
    ]);

    return stats[0] || {
      totalChanges: 0,
      upgrades: 0,
      upgradePct: 0,
      downgrades: 0,
      downgradePct: 0,
      uniqueUserCount: 0
    };
  } catch (error) {
    console.error('Error getting tier statistics:', error.message);
    return {};
  }
}

/**
 * Get rate limit violation metrics
 * @param {string} timeframe - Time period for metrics
 * @returns {Promise<Object>} Violation metrics
 */
async function getViolationMetrics(timeframe = 'day') {
  try {
    const now = new Date();
    let startDate;

    switch (timeframe) {
      case 'hour':
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'day':
      default:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    const violations = await RateLimitStore.aggregate([
      {
        $match: {
          lastViolationAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$tier',
          totalViolations: { $sum: '$violations' },
          usersBlocked: {
            $sum: {
              $cond: [{ $ne: ['$blockedUntil', null] }, 1, 0]
            }
          },
          avgViolationsPerUser: { $avg: '$violations' },
          maxViolations: { $max: '$violations' }
        }
      }
    ]);

    return {
      timeframe,
      byTier: violations,
      totalViolations: violations.reduce((sum, v) => sum + v.totalViolations, 0),
      totalUsersBlocked: violations.reduce((sum, v) => sum + v.usersBlocked, 0)
    };
  } catch (error) {
    console.error('Error getting violation metrics:', error.message);
    return {};
  }
}

/**
 * Get system health status
 * @returns {Promise<Object>} Health status
 */
async function getSystemHealth() {
  try {
    const cacheHealth = getCacheHealth();
    
    // Get database record count
    const rateLimitRecords = await RateLimitStore.countDocuments();
    const tierChanges = await TierChangeLog.countDocuments();

    // Calculate metrics
    const recentViolations = await RateLimitStore.countDocuments({
      lastViolationAt: {
        $gte: new Date(Date.now() - 60 * 60 * 1000) // Last hour
      }
    });

    const blockedUsers = await RateLimitStore.countDocuments({
      blockedUntil: { $ne: null, $gt: new Date() }
    });

    return {
      status: 'healthy',
      cache: {
        healthy: cacheHealth.healthy,
        cachedUsers: cacheHealth.cachedUsers
      },
      database: {
        rateLimitRecords,
        tierChanges,
        recentViolations,
        blockedUsers
      },
      alerts: generateHealthAlerts({
        cacheHealth,
        recentViolations,
        blockedUsers,
        rateLimitRecords
      })
    };
  } catch (error) {
    console.error('Error getting system health:', error.message);
    return {
      status: 'error',
      error: error.message
    };
  }
}

/**
 * Generate health alerts based on metrics
 * @param {Object} metrics - Health metrics
 * @returns {Array<Object>} Array of alerts
 */
function generateHealthAlerts(metrics) {
  const alerts = [];

  // Cache health alert
  if (!metrics.cacheHealth.healthy) {
    alerts.push({
      severity: 'warning',
      message: 'Cache is not healthy. Database queries may be slow.',
      metric: 'cache_health',
      timestamp: new Date().toISOString()
    });
  }

  // High violation rate alert
  if (metrics.recentViolations > 100) {
    alerts.push({
      severity: metrics.recentViolations > 500 ? 'critical' : 'warning',
      message: `High rate limit violations detected (${metrics.recentViolations} in last hour)`,
      metric: 'violation_rate',
      count: metrics.recentViolations,
      timestamp: new Date().toISOString()
    });
  }

  // Multiple blocked users alert
  if (metrics.blockedUsers > 10) {
    alerts.push({
      severity: metrics.blockedUsers > 50 ? 'critical' : 'warning',
      message: `Multiple users blocked (${metrics.blockedUsers} users)`,
      metric: 'blocked_users',
      count: metrics.blockedUsers,
      timestamp: new Date().toISOString()
    });
  }

  // Database size alert
  if (metrics.rateLimitRecords > 1000000) {
    alerts.push({
      severity: 'info',
      message: 'Rate limit store is large. Consider archiving old records.',
      metric: 'db_size',
      recordCount: metrics.rateLimitRecords,
      timestamp: new Date().toISOString()
    });
  }

  return alerts;
}

/**
 * Get top users by violations
 * @param {number} limit - Number of users to return
 * @param {string} timeframe - Time period
 * @returns {Promise<Array>} Top violators
 */
async function getTopViolators(limit = 10, timeframe = 'day') {
  try {
    const now = new Date();
    let startDate;

    switch (timeframe) {
      case 'hour':
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'day':
      default:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    return await RateLimitStore.find({
      violations: { $gt: 0 },
      lastViolationAt: { $gte: startDate }
    })
      .sort({ violations: -1 })
      .limit(limit)
      .select('key tier violations lastViolationAt blockedUntil')
      .lean();
  } catch (error) {
    console.error('Error getting top violators:', error.message);
    return [];
  }
}

/**
 * Get upgrade trends
 * @param {string} timeframe - Time period for analysis
 * @param {number} buckets - Number of time buckets
 * @returns {Promise<Array>} Upgrade trend data
 */
async function getUpgradeTrends(timeframe = 'day', buckets = 24) {
  try {
    const now = new Date();
    let startDate, interval;

    if (timeframe === 'hour') {
      startDate = new Date(now.getTime() - 60 * 60 * 1000);
      interval = 60 * 1000; // 1 minute
    } else if (timeframe === 'week') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      interval = (7 * 24 * 60 * 60 * 1000) / buckets;
    } else if (timeframe === 'month') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      interval = (30 * 24 * 60 * 60 * 1000) / buckets;
    } else {
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      interval = (24 * 60 * 60 * 1000) / buckets; // 1 hour
    }

    const trends = await TierChangeLog.aggregate([
      {
        $match: {
          isUpgrade: true,
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d %H:%M',
              date: {
                $subtract: [
                  '$timestamp',
                  {
                    $mod: [
                      { $subtract: ['$timestamp', startDate] },
                      Math.floor(interval)
                    ]
                  }
                ]
              }
            }
          },
          count: { $sum: 1 },
          users: { $addToSet: '$userId' }
        }
      },
      {
        $sort: { _id: 1 }
      },
      {
        $project: {
          timestamp: '$_id',
          upgrades: '$count',
          uniqueUsers: { $size: '$users' },
          _id: 0
        }
      }
    ]);

    return trends;
  } catch (error) {
    console.error('Error getting upgrade trends:', error.message);
    return [];
  }
}

/**
 * Create a metrics report
 * @param {Object} options - Report options
 * @returns {Promise<Object>} Metrics report
 */
async function generateReport(options = {}) {
  try {
    const {
      timeframe = 'day',
      includeTopViolators = true,
      includeTrends = true
    } = options;

    const report = {
      title: `Rate Limiting Metrics Report - ${timeframe.toUpperCase()}`,
      generatedAt: new Date().toISOString(),
      timeframe
    };

    // Collect all metrics
    report.metrics = await collectMetrics({ timeframe });

    // Top violators
    if (includeTopViolators) {
      report.topViolators = await getTopViolators(10, timeframe);
    }

    // Trends
    if (includeTrends) {
      report.trends = await getUpgradeTrends(timeframe);
    }

    return report;
  } catch (error) {
    console.error('Error generating report:', error.message);
    return {
      error: error.message,
      generatedAt: new Date().toISOString()
    };
  }
}

module.exports = {
  collectMetrics,
  getTierStatistics,
  getViolationMetrics,
  getSystemHealth,
  generateHealthAlerts,
  getTopViolators,
  getUpgradeTrends,
  generateReport
};
