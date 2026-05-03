const {
  getSubscriptionsDueForRenewal,
  getExpiredSubscriptionsGraceEnded,
  applyGracePeriod,
  initiateRenewal
} = require('./renewalService');
const Subscription = require('../models/Subscription');

/**
 * Renewal scheduler for automatic subscription renewal processing
 */

let schedulerInstance = null;
let isRunning = false;

/**
 * Initialize the renewal scheduler
 * @param {number} intervalMs - Interval in milliseconds (default: 3600000 = 1 hour)
 */
function initializeRenewalScheduler(intervalMs = 3600000) {
  if (schedulerInstance) {
    console.warn('Renewal scheduler already initialized');
    return;
  }

  console.log(`Initializing renewal scheduler with interval: ${intervalMs}ms`);
  
  // Run immediately on startup (with delay to ensure DB connection)
  setTimeout(async () => {
    await processRenewals();
  }, 5000);

  // Schedule recurring processing
  schedulerInstance = setInterval(async () => {
    await processRenewals();
  }, intervalMs);

  isRunning = true;
  console.log('Renewal scheduler initialized');
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
    console.error('Renewal processing error:', error);
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
    console.error('Error handling grace period expirations:', error);
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
      initiated: 0,
      failed: 0,
      errors: []
    };

    for (const subscription of subscriptions) {
      try {
        // Skip if already renewal pending
        if (subscription.renewalStatus === 'renewal-pending') {
          continue;
        }

        // Initiate renewal
        const result = await initiateRenewal(subscription._id, 'automatic');
        
        if (result.success) {
          results.initiated++;
          console.log(`Initiated renewal for subscription ${subscription._id}`);
        } else {
          results.failed++;
          results.errors.push({
            subscriptionId: subscription._id,
            error: result.message
          });
          console.error(`Failed to initiate renewal for subscription ${subscription._id}:`, result.message);
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

    console.log(`Renewal processing results: ${results.initiated} initiated, ${results.failed} failed`);
  } catch (error) {
    console.error('Error processing renewal subscriptions:', error);
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
    console.error('Error applying grace periods:', error);
  }
}

/**
 * Stop the renewal scheduler
 */
function stopRenewalScheduler() {
  if (schedulerInstance) {
    clearInterval(schedulerInstance);
    schedulerInstance = null;
    isRunning = false;
    console.log('Renewal scheduler stopped');
  }
}

/**
 * Get scheduler status
 */
function getRenewalSchedulerStatus() {
  return {
    isRunning,
    timestamp: new Date().toISOString()
  };
}

/**
 * Manually trigger renewal processing
 */
async function triggerRenewalProcessing() {
  console.log('Manually triggering renewal processing...');
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
    console.error('Error getting renewal stats:', error);
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
