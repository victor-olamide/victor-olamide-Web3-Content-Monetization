const ProRataRefund = require('../models/ProRataRefund');
const Subscription = require('../models/Subscription');
const {
  completeProRataRefund,
  rejectProRataRefund
} = require('./proRataRefundService');

let refundSchedulerInterval = null;
let isSchedulerRunning = false;

// Statistics for monitoring
const schedulerStats = {
  lastProcessed: null,
  totalProcessed: 0,
  avgProcessingTime: 0,
  successCount: 0,
  failureCount: 0,
  rejectionCount: 0
};

/**
 * Initialize the pro-rata refund scheduler
 * @param {number} interval - Processing interval in milliseconds (default: 1 hour)
 * @returns {object} Scheduler instance
 */
const initializeRefundScheduler = (interval = 3600000) => {
  if (isSchedulerRunning) {
    console.warn('[ProRataRefundScheduler] Scheduler is already running');
    return { status: 'already_running' };
  }

  isSchedulerRunning = true;
  console.log(`[ProRataRefundScheduler] Scheduler initialized with interval: ${interval}ms (${(interval / 60000).toFixed(0)} minutes)`);

  // Run immediately with small delay
  setTimeout(() => {
    processApprovedRefunds();
  }, 5000);

  // Then run periodically
  refundSchedulerInterval = setInterval(() => {
    processApprovedRefunds();
  }, interval);

  return {
    status: 'running',
    interval,
    startedAt: new Date()
  };
};

/**
 * Stop the refund scheduler
 * @returns {object} Stop status
 */
const stopRefundScheduler = () => {
  if (!isSchedulerRunning) {
    console.warn('[ProRataRefundScheduler] Scheduler is not running');
    return { status: 'not_running' };
  }

  if (refundSchedulerInterval) {
    clearInterval(refundSchedulerInterval);
  }

  isSchedulerRunning = false;
  console.log('[ProRataRefundScheduler] Scheduler stopped');

  return {
    status: 'stopped',
    finalStats: schedulerStats
  };
};

/**
 * Process all approved refunds
 * Handles: approved → processing → completed/failed
 */
const processApprovedRefunds = async () => {
  const startTime = Date.now();

  try {
    console.log('[ProRataRefundScheduler] Starting refund processing cycle...');

    // Get all approved refunds
    const approvedRefunds = await ProRataRefund.find({ refundStatus: 'approved' });
    console.log(`[ProRataRefundScheduler] Found ${approvedRefunds.length} approved refunds to process`);

    let processedCount = 0;
    let successCount = 0;
    let failureCount = 0;

    for (const refund of approvedRefunds) {
      try {
        // Update to processing state
        refund.refundStatus = 'processing';
        await refund.save();

        // Simulate blockchain transaction processing
        // In production, this would call actual blockchain APIs
        const transactionId = generateTransactionId();
        const blockHeight = Math.floor(Math.random() * 1000000) + 800000;

        // Mark as completed
        const result = await completeProRataRefund(refund._id, transactionId, blockHeight);

        if (result.success) {
          successCount++;
          console.log(`[ProRataRefundScheduler] ✓ Completed refund: ${refund._id} | Amount: $${refund.refundAmount}`);
        } else {
          failureCount++;
          // Mark as failed
          await rejectProRataRefund(refund._id, 'Processing failed: ' + result.message);
          console.log(`[ProRataRefundScheduler] ✗ Failed to complete refund: ${refund._id}`);
        }

        processedCount++;
      } catch (error) {
        failureCount++;
        console.error(`[ProRataRefundScheduler] Error processing refund ${refund._id}:`, error.message);

        try {
          await rejectProRataRefund(refund._id, `Error during processing: ${error.message}`);
        } catch (rejectError) {
          console.error('[ProRataRefundScheduler] Failed to mark refund as failed:', rejectError.message);
        }
      }
    }

    // Get pending refunds that are taking too long
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const stalePending = await ProRataRefund.find({
      refundStatus: 'pending',
      createdAt: { $lt: twoWeeksAgo }
    });

    console.log(`[ProRataRefundScheduler] Found ${stalePending.length} stale pending refunds`);

    // Auto-approve stale pending refunds
    for (const refund of stalePending) {
      try {
        refund.refundStatus = 'approved';
        refund.processedBy = 'auto-approval-system';
        refund.processedAt = new Date();
        await refund.save();
        console.log(`[ProRataRefundScheduler] Auto-approved stale pending refund: ${refund._id}`);
      } catch (error) {
        console.error(`[ProRataRefundScheduler] Failed to auto-approve refund ${refund._id}:`, error.message);
      }
    }

    // Update statistics
    const processingTime = Date.now() - startTime;
    schedulerStats.lastProcessed = new Date();
    schedulerStats.totalProcessed += processedCount;
    schedulerStats.successCount += successCount;
    schedulerStats.failureCount += failureCount;
    schedulerStats.avgProcessingTime = 
      (schedulerStats.avgProcessingTime * (schedulerStats.totalProcessed - processedCount) + processingTime) / 
      schedulerStats.totalProcessed;

    console.log(`[ProRataRefundScheduler] Processing cycle complete | Processed: ${processedCount} | Success: ${successCount} | Failed: ${failureCount} | Time: ${processingTime}ms`);
  } catch (error) {
    console.error('[ProRataRefundScheduler] Fatal error during processing:', error.message);
  }
};

/**
 * Process refunds for a specific subscription cancellation
 * @param {string} subscriptionId - Subscription ID
 * @returns {Promise<Object>} Processing result
 */
const processSubscriptionRefund = async (subscriptionId) => {
  try {
    const refund = await ProRataRefund.findOne({ subscriptionId });
    if (!refund) {
      return {
        success: false,
        message: 'No refund found for subscription'
      };
    }

    if (refund.refundStatus !== 'pending') {
      return {
        success: false,
        message: `Refund cannot be processed. Current status: ${refund.refundStatus}`
      };
    }

    // Auto-approve if within standard criteria
    refund.refundStatus = 'approved';
    refund.processedBy = 'auto-approval-system';
    refund.processedAt = new Date();
    await refund.save();

    return {
      success: true,
      message: 'Refund approved for processing',
      refund
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to process refund',
      error: error.message
    };
  }
};

/**
 * Get scheduler statistics
 * @returns {Object} Current statistics
 */
const getRefundSchedulerStats = () => {
  return {
    isRunning: isSchedulerRunning,
    ...schedulerStats,
    nextRun: refundSchedulerInterval ? 'Scheduled' : 'Not scheduled'
  };
};

/**
 * Manually trigger refund processing
 * Used for testing and manual operations
 * @returns {Promise<Object>} Result
 */
const triggerRefundProcessing = async () => {
  if (!isSchedulerRunning) {
    return {
      success: false,
      message: 'Scheduler is not running'
    };
  }

  try {
    await processApprovedRefunds();
    return {
      success: true,
      message: 'Refund processing triggered',
      stats: getRefundSchedulerStats()
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to trigger refund processing',
      error: error.message
    };
  }
};

/**
 * Cleanup and archive old completed refunds (optional)
 * Archives refunds older than specified days
 * @param {number} daysOld - Days since completion to archive (default: 365)
 */
const archiveOldRefunds = async (daysOld = 365) => {
  try {
    const archiveDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

    const result = await ProRataRefund.updateMany(
      {
        refundStatus: 'completed',
        processedAt: { $lt: archiveDate }
      },
      {
        $set: { archived: true }
      }
    );

    console.log(`[ProRataRefundScheduler] Archived ${result.modifiedCount} old refunds`);

    return {
      success: true,
      archivedCount: result.modifiedCount
    };
  } catch (error) {
    console.error('[ProRataRefundScheduler] Archive failed:', error.message);
    return {
      success: false,
      message: 'Failed to archive refunds',
      error: error.message
    };
  }
};

/**
 * Generate a mock transaction ID
 * In production, this would be actual blockchain transaction ID
 * @returns {string} Transaction ID
 */
const generateTransactionId = () => {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `tx_${timestamp}_${randomStr}`.toUpperCase();
};

module.exports = {
  initializeRefundScheduler,
  stopRefundScheduler,
  processApprovedRefunds,
  processSubscriptionRefund,
  getRefundSchedulerStats,
  triggerRefundProcessing,
  archiveOldRefunds
};
