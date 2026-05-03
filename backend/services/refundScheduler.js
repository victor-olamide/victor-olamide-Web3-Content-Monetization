const Refund = require('../models/Refund');
const { autoProcessRefundsForRemovedContent } = require('./refundService');

/**
 * Scheduler for automatic refund processing
 * Periodically approves pending refunds for removed content
 */

let schedulerInstance = null;
let isRunning = false;

/**
 * Initialize the refund scheduler
 * @param {number} intervalMs - Interval in milliseconds (default: 3600000 = 1 hour)
 */
function initializeScheduler(intervalMs = 3600000) {
  if (schedulerInstance) {
    console.warn('Refund scheduler already initialized');
    return;
  }

  console.log(`Initializing refund scheduler with interval: ${intervalMs}ms`);
  
  // Run immediately on startup (with delay to ensure DB connection)
  setTimeout(async () => {
    await processRefunds();
  }, 5000);

  // Schedule recurring processing
  schedulerInstance = setInterval(async () => {
    await processRefunds();
  }, intervalMs);

  isRunning = true;
  console.log('Refund scheduler initialized');
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
    console.error('Refund processing error:', error);
  }
}

/**
 * Stop the refund scheduler
 */
function stopScheduler() {
  if (schedulerInstance) {
    clearInterval(schedulerInstance);
    schedulerInstance = null;
    isRunning = false;
    console.log('Refund scheduler stopped');
  }
}

/**
 * Get scheduler status
 */
function getSchedulerStatus() {
  return {
    isRunning,
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
    console.error('Error fetching refund statistics:', error);
    return null;
  }
}

/**
 * Manually trigger refund processing (admin use)
 */
async function triggerManualProcessing() {
  console.log('Manually triggering refund processing...');
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
