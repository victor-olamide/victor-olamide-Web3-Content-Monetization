/**
 * Subscription Renewal Scheduler
 *
 * Manages automatic subscription renewal processing:
 * - Daily execution of renewal checks
 * - Processing subscriptions due for renewal
 * - Grace period management for expired subscriptions
 * - Integration with renewal service for payment processing
 */

const logger = require('../utils/logger');
const {
  getSubscriptionsDueForRenewal,
  getExpiredSubscriptionsGraceEnded,
  applyGracePeriod,
  processAutomaticRenewal
} = require('./renewalService');
const Subscription = require('../models/Subscription');

/**
 * Renewal scheduler for automatic subscription renewal processing
 */

let schedulerInstance = null;
let initialTimeout = null;
let isRunning = false;

/**
 * Initialize the renewal scheduler
 * @param {number} intervalMs - Interval in milliseconds (default: 3600000 = 1 hour)
 */
function initializeRenewalScheduler(intervalMs = null) {
  if (schedulerInstance) {
    logger.warn('Renewal scheduler already initialized');
    return;
  }

  const effectiveIntervalMs = intervalMs || parseInt(process.env.RENEWAL_SCHEDULER_INTERVAL_MS, 10) || 86400000;
  logger.info('Initializing renewal scheduler', { intervalMs: effectiveIntervalMs });
  
  // Run immediately on startup (with delay to ensure DB connection)
  const timeoutId = setTimeout(async () => {
    await processRenewals();
  }, 5000);
  initialTimeout = timeoutId;

  // Schedule recurring processing daily by default
  schedulerInstance = setInterval(async () => {
    await processRenewals();
  }, effectiveIntervalMs);

  isRunning = true;
  logger.info('Renewal scheduler initialized');
}

/**
 * Main renewal processing function
 */
async function processRenewals() {
  try {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Starting renewal processing...`);

    // Step 1: Handle expired subscriptions with grace period ended
    await handleGracePeriodsEnded();

    // Step 2: Process subscriptions due for renewal
    await processSubscriptionRenewals();

    // Step 3: Check and apply grace periods to expired subscriptions
    await applyGracePeriods();

    console.log(`[${timestamp}] Renewal processing complete`);
  } catch (error) {
    logger.error('Renewal processing error', { err: error });
  }
}

/**
 * Handle subscriptions with grace period ended
 */
async function handleGracePeriodsEnded() {
  try {
    const subscriptions = await getExpiredSubscriptionsGraceEnded();
    
    if (subscriptions.length === 0) {
      return;
    }

    console.log(`Processing ${subscriptions.length} subscriptions with expired grace periods`);

    for (const subscription of subscriptions) {
      try {
        subscription.renewalStatus = 'expired';
        subscription.updatedAt = new Date();
        await subscription.save();
        console.log(`Marked subscription ${subscription._id} as expired (grace ended)`);
      } catch (error) {
        console.error(`Error marking subscription ${subscription._id} as expired:`, error);
      }
    }
  } catch (error) {
    logger.error('Error handling grace period expirations', { err: error });
  }
}

/**
 * Process subscriptions due for renewal
 */
async function processSubscriptionRenewals() {
  try {
    // Get subscriptions expiring within 3 days
    const subscriptions = await getSubscriptionsDueForRenewal(3);
    
    if (subscriptions.length === 0) {
      return;
    }

    console.log(`Processing ${subscriptions.length} subscriptions due for renewal`);

    const results = {
      processed: 0,
      failed: 0,
      errors: []
    };

    for (const subscription of subscriptions) {
      try {
        // Skip if already renewal pending
        if (subscription.renewalStatus === 'renewal-pending') {
          continue;
        }

        const result = await processAutomaticRenewal(subscription);
        if (result.success) {
          results.processed++;
          console.log(`Automatically renewed subscription ${subscription._id} with tx ${result.transactionId}`);
        } else {
          results.failed++;
          results.errors.push({
            subscriptionId: subscription._id,
            error: result.message
          });
          console.error(`Failed to automatically renew subscription ${subscription._id}:`, result.message);
        }
      } catch (error) {
        results.failed++;
        results.errors.push({
          subscriptionId: subscription._id,
          error: error.message
        });
        console.error(`Error processing subscription ${subscription._id}:`, error);
      }
    }

    console.log(`Automatic renewal processing results: ${results.processed} processed, ${results.failed} failed`);
  } catch (error) {
    logger.error('Error processing renewal subscriptions', { err: error });
  }
}

/**
 * Apply grace periods to expired subscriptions
 */
async function applyGracePeriods() {
  try {
    const now = new Date();
    
    // Find subscriptions that expired and don't have grace period yet
    const subscriptions = await Subscription.find({
      $and: [
        { expiry: { $lt: now } },
        { $or: [
          { graceExpiresAt: null },
          { graceExpiresAt: { $lt: now } }
        ]},
        { autoRenewal: true },
        { cancelledAt: null },
        { renewalStatus: { $ne: 'expired' } }
      ]
    });

    if (subscriptions.length === 0) {
      return;
    }

    console.log(`Applying grace periods to ${subscriptions.length} subscriptions`);

    for (const subscription of subscriptions) {
      try {
        const result = await applyGracePeriod(subscription._id);
        if (result.success) {
          console.log(`Applied grace period to subscription ${subscription._id}`);
        }
      } catch (error) {
        console.error(`Error applying grace period to subscription ${subscription._id}:`, error);
      }
    }
  } catch (error) {
    logger.error('Error applying grace periods', { err: error });
  }
}

/**
 * Stop the renewal scheduler
 */
function stopRenewalScheduler() {
  if (schedulerInstance) {
    clearInterval(schedulerInstance);
    schedulerInstance = null;
  }
  if (initialTimeout) {
    clearTimeout(initialTimeout);
    initialTimeout = null;
  }
  isRunning = false;
  logger.info('Renewal scheduler stopped');
}

/**
 * Get scheduler status with interval tracking information
 * @returns {Object} Scheduler status with interval details
 */
function getRenewalSchedulerStatus() {
  return {
    isRunning,
    schedulerActive: schedulerInstance !== null,
    initialTimeoutActive: initialTimeout !== null,
    timestamp: new Date().toISOString()
  };
}

/**
 * Manually trigger renewal processing
 */
async function triggerRenewalProcessing() {
  logger.info('Manually triggering renewal processing...');
  return await processRenewals();
}

/**
 * Get renewal processing statistics
 */
async function getRenewalStats() {
  try {
    const subscriptions = await Subscription.find({});
    
    const stats = {
      total: subscriptions.length,
      active: subscriptions.filter(s => s.renewalStatus === 'active').length,
      expiringsSoon: subscriptions.filter(s => s.renewalStatus === 'expiring-soon').length,
      inGracePeriod: subscriptions.filter(s => s.graceExpiresAt && new Date() < s.graceExpiresAt).length,
      expired: subscriptions.filter(s => s.renewalStatus === 'expired').length,
      renewalPending: subscriptions.filter(s => s.renewalStatus === 'renewal-pending').length,
      renewalFailed: subscriptions.filter(s => s.renewalStatus === 'renewal-failed').length,
      autoRenewalEnabled: subscriptions.filter(s => s.autoRenewal === true).length,
      cancelled: subscriptions.filter(s => s.cancelledAt !== null).length
    };

    return {
      timestamp: new Date().toISOString(),
      stats
    };
  } catch (error) {
    logger.error('Error getting renewal stats', { err: error });
    return { error: error.message };
  }
}

module.exports = {
  initializeRenewalScheduler,
  stopRenewalScheduler,
  getRenewalSchedulerStatus,
  processRenewals,
  getRenewalStats,
  triggerRenewalProcessing
};
