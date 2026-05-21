const logger = require('../utils/logger');
const Refund = require('../models/Refund');
const { autoProcessRefundsForRemovedContent } = require('./refundService');

/**
 * Scheduler for automatic refund processing
 * Periodically approves pending refunds for removed content
 */

let schedulerInstance = null;
let initialTimeout = null;
let isRunning = false;

/**
 * Initialize the refund scheduler
 * @param {number} intervalMs - Interval in milliseconds (default: 3600000 = 1 hour)
 */
function initializeScheduler(intervalMs = 3600000) {
  if (schedulerInstance) {
    logger.warn('Refund scheduler already initialized');
    return;
  }

  console.log(`Initializing refund scheduler with interval: ${intervalMs}ms`);
  
  // Run immediately on startup (with delay to ensure DB connection)
  const timeoutId = setTimeout(async () => {
    await processRefunds();
  }, 5000);
  initialTimeout = timeoutId;

  // Schedule recurring processing
  schedulerInstance = setInterval(async () => {
    await processRefunds();
  }, intervalMs);

  isRunning = true;
  logger.info('Refund scheduler initialized');
}

/**
 * Process refunds and handle errors gracefully
 */
async function processRefunds() {
  try {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Starting refund processing...`);

    const result = await autoProcessRefundsForRemovedContent();

    if (result.success) {
      console.log(`[${timestamp}] Refund processing complete:`, result.results);
    } else {
      console.error(`[${timestamp}] Refund processing failed:`, result.message);
    }
  } catch (error) {
    logger.error('Refund processing error', { err: error });
  }
}

/**
 * Stop the refund scheduler
 */
function stopScheduler() {
  if (schedulerInstance) {
    clearInterval(schedulerInstance);
    schedulerInstance = null;
  }
  if (initialTimeout) {
    clearTimeout(initialTimeout);
    initialTimeout = null;
  }
  isRunning = false;
  logger.info('Refund scheduler stopped');
}

/**
 * Get scheduler status with interval tracking information
 * @returns {Object} Scheduler status with interval details
 */
function getSchedulerStatus() {
  return {
    isRunning,
    schedulerActive: schedulerInstance !== null,
    initialTimeoutActive: initialTimeout !== null,
    lastRun: null,
    nextRun: null
  };
}

/**
 * Get pending refund statistics
 */
async function getPendingRefundStats() {
  try {
    const pending = await Refund.find({ status: 'pending' });
    const approved = await Refund.find({ status: 'approved' });
    const processing = await Refund.find({ status: 'processing' });

    const pendingAmount = pending.reduce((sum, r) => sum + r.refundAmount, 0);
    const processingAmount = processing.reduce((sum, r) => sum + r.refundAmount, 0);

    return {
      pending: {
        count: pending.length,
        amount: pendingAmount,
        byReason: {
          'content-removed': pending.filter(r => r.reason === 'content-removed').length,
          'manual-request': pending.filter(r => r.reason === 'manual-request').length,
          'partial': pending.filter(r => r.reason === 'partial').length,
          'dispute': pending.filter(r => r.reason === 'dispute').length
        }
      },
      approved: {
        count: approved.length
      },
      processing: {
        count: processing.length,
        amount: processingAmount
      }
    };
  } catch (error) {
    logger.error('Error fetching refund statistics', { err: error });
    return null;
  }
}

/**
 * Manually trigger refund processing (admin use)
 */
async function triggerManualProcessing() {
  logger.info('Manually triggering refund processing...');
  return await processRefunds();
}

/**
 * Get health status of refund system
 */
async function getHealthStatus() {
  try {
    const stats = await getPendingRefundStats();
    
    let status = 'healthy';
    if (stats.pending.count > 100) {
      status = 'warning'; // Too many pending
    }
    if (stats.pending.count > 500) {
      status = 'unhealthy'; // Critical number of pending
    }

    return {
      status,
      schedulerRunning: isRunning,
      stats,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = {
  initializeScheduler,
  stopScheduler,
  getSchedulerStatus,
  processRefunds,
  getPendingRefundStats,
  triggerManualProcessing,
  getHealthStatus
};
