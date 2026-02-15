const { cleanupExpiredRecords, getGlobalStats } = require('./rateLimitService');
const { DEFAULTS } = require('../config/rateLimitConfig');

/**
 * Rate Limit Cleanup Scheduler
 * 
 * Periodically cleans up expired rate limit records from the database.
 * Runs at a configurable interval (default: 1 hour).
 * 
 * @module services/rateLimitCleanupScheduler
 */

let cleanupInterval = null;
let lastCleanupAt = null;
let lastCleanupCount = 0;
let totalCleanedUp = 0;
let isRunning = false;

/**
 * Run a single cleanup cycle
 * @returns {Promise<number>} Number of records cleaned up
 */
async function runCleanup() {
  if (isRunning) {
    console.log('[RateLimitCleanup] Cleanup already in progress, skipping');
    return 0;
  }

  isRunning = true;
  try {
    console.log('[RateLimitCleanup] Starting cleanup cycle...');
    const deletedCount = await cleanupExpiredRecords();
    lastCleanupAt = new Date();
    lastCleanupCount = deletedCount;
    totalCleanedUp += deletedCount;
    console.log(`[RateLimitCleanup] Cleaned up ${deletedCount} expired records`);
    return deletedCount;
  } catch (error) {
    console.error('[RateLimitCleanup] Error during cleanup:', error.message);
    return 0;
  } finally {
    isRunning = false;
  }
}

/**
 * Initialize the cleanup scheduler
 * @param {number} intervalMs - Cleanup interval in milliseconds (default: 1 hour)
 */
function initializeCleanupScheduler(intervalMs) {
  const interval = intervalMs || DEFAULTS.storeCleanupInterval;

  if (cleanupInterval) {
    clearInterval(cleanupInterval);
  }

  console.log(`[RateLimitCleanup] Initializing scheduler with ${interval / 1000}s interval`);

  // Run initial cleanup after a short delay
  setTimeout(() => runCleanup(), 5000);

  // Schedule periodic cleanup
  cleanupInterval = setInterval(() => runCleanup(), interval);
}

/**
 * Stop the cleanup scheduler
 */
function stopCleanupScheduler() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
    console.log('[RateLimitCleanup] Scheduler stopped');
  }
}

/**
 * Get cleanup scheduler statistics
 * @returns {Object} Scheduler stats
 */
function getCleanupSchedulerStats() {
  return {
    isRunning,
    lastCleanupAt,
    lastCleanupCount,
    totalCleanedUp,
    schedulerActive: cleanupInterval !== null
  };
}

/**
 * Get comprehensive rate limit health status
 * @returns {Promise<Object>} Health status
 */
async function getRateLimitHealth() {
  try {
    const stats = await getGlobalStats();
    const schedulerStats = getCleanupSchedulerStats();

    return {
      status: 'healthy',
      store: stats,
      cleanup: schedulerStats,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      cleanup: getCleanupSchedulerStats(),
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = {
  initializeCleanupScheduler,
  stopCleanupScheduler,
  runCleanup,
  getCleanupSchedulerStats,
  getRateLimitHealth
};
