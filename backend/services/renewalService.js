const Subscription = require('../models/Subscription');
const SubscriptionRenewal = require('../models/SubscriptionRenewal');
const Content = require('../models/Content');
const { calculatePlatformFee } = require('./contractService');

/**
 * Validate renewal eligibility parameters
 * @param {Object} subscription - Subscription document
 * @returns {Object} { valid: boolean, error?: string }
 */
function validateRenewalEligibility(subscription) {
  if (!subscription) {
    return { valid: false, error: 'Subscription not found' };
  }

  if (!subscription.autoRenewal) {
    return { valid: false, error: 'Subscription has auto-renewal disabled' };
  }

  if (subscription.renewalStatus === 'renewal-failed') {
    return { valid: false, error: 'Subscription has failed renewals, requires manual intervention' };
  }

  if (subscription.cancelledAt) {
    return { valid: false, error: 'Subscription has been cancelled' };
  }

  return { valid: true };
}

/**
 * Check if subscription is within grace period
 * @param {Object} subscription - Subscription document
 * @returns {boolean}
 */
function isInGracePeriod(subscription) {
  if (!subscription.graceExpiresAt) {
    return false;
  }

  const now = new Date();
  return now <= subscription.graceExpiresAt;
}

/**
 * Calculate renewal eligibility and grace period
 * @param {Object} subscription - Subscription document
 * @returns {Object}
 */
function calculateRenewalStatus(subscription) {
  const now = new Date();
  const expiryDate = new Date(subscription.expiry);
  const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));

  let status = 'active';
  let daysRemaining = daysUntilExpiry;

  if (daysUntilExpiry < 0) {
    // Subscription has expired
    if (isInGracePeriod(subscription)) {
      status = 'grace-period';
    } else {
      status = 'expired';
    }
  } else if (daysUntilExpiry <= 3) {
    status = 'expiring-soon';
  }

  return {
    status,
    daysRemaining,
    inGracePeriod: isInGracePeriod(subscription),
    expiresAt: expiryDate
  };
}

/**
 * Initiate subscription renewal
 * @param {string} subscriptionId - MongoDB ObjectId of subscription
 * @param {string} renewalType - 'automatic', 'manual', or 'grace-period-recovery'
 * @returns {Promise<Object>}
 */
async function initiateRenewal(subscriptionId, renewalType = 'automatic') {
  try {
    if (!subscriptionId) {
      throw new Error('Subscription ID is required');
    }

    const validRenewalTypes = ['automatic', 'manual', 'grace-period-recovery'];
    if (!validRenewalTypes.includes(renewalType)) {
      throw new Error(`Invalid renewal type. Allowed: ${validRenewalTypes.join(', ')}`);
    }

    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    // Validate eligibility
    const validation = validateRenewalEligibility(subscription);
    if (!validation.valid && renewalType !== 'grace-period-recovery') {
      throw new Error(validation.error);
    }

    // Calculate platform fee
    let platformFee = 0;
    try {
      platformFee = await calculatePlatformFee(subscription.amount);
    } catch (error) {
      console.warn('Could not calculate platform fee:', error.message);
      platformFee = Math.floor(subscription.amount * 0.025); // Fallback to 2.5%
    }

    const creatorAmount = subscription.amount - platformFee;

    // Create renewal record
    const renewalRecord = new SubscriptionRenewal({
      subscriptionId: subscription._id,
      user: subscription.user,
      creator: subscription.creator,
      tierId: subscription.tierId,
      previousExpiryDate: subscription.expiry,
      newExpiryDate: new Date(subscription.expiry.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days
      renewalAmount: subscription.amount,
      platformFee,
      creatorAmount,
      renewalType,
      graceUsed: renewalType === 'grace-period-recovery'
    });

    const savedRenewal = await renewalRecord.save();

    // Update subscription status
    subscription.renewalStatus = 'renewal-pending';
    subscription.lastRenewalAttempt = new Date();
    subscription.nextRenewalDate = new Date(subscription.expiry.getTime() + 30 * 24 * 60 * 60 * 1000);
    await subscription.save();

    return {
      success: true,
      renewal: savedRenewal,
      message: 'Renewal initiated successfully'
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Process renewal and update subscription expiry
 * @param {string} renewalId - MongoDB ObjectId of renewal record
 * @param {string} txId - Blockchain transaction ID
 * @returns {Promise<Object>}
 */
async function completeRenewal(renewalId, txId) {
  try {
    if (!renewalId || !txId) {
      throw new Error('Renewal ID and transaction ID are required');
    }

    const renewal = await SubscriptionRenewal.findById(renewalId);
    if (!renewal) {
      throw new Error('Renewal record not found');
    }

    if (renewal.status !== 'pending') {
      throw new Error(`Cannot process renewal with status: ${renewal.status}`);
    }

    // Update renewal record
    renewal.status = 'completed';
    renewal.transactionId = txId;
    renewal.processedAt = new Date();
    const updatedRenewal = await renewal.save();

    // Update subscription
    const subscription = await Subscription.findById(renewal.subscriptionId);
    if (subscription) {
      subscription.expiry = renewal.newExpiryDate;
      subscription.renewalStatus = 'active';
      subscription.renewalTxId = txId;
      subscription.renewalAttempts = 0;
      subscription.updatedAt = new Date();
      await subscription.save();
    }

    return {
      success: true,
      renewal: updatedRenewal,
      message: 'Renewal completed successfully'
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Handle failed renewal attempt with retry scheduling
 * @param {string} renewalId - MongoDB ObjectId of renewal record
 * @param {string} failureReason - Reason for failure
 * @returns {Promise<Object>}
 */
async function handleRenewalFailure(renewalId, failureReason) {
  try {
    if (!renewalId) {
      throw new Error('Renewal ID is required');
    }

    const renewal = await SubscriptionRenewal.findById(renewalId);
    if (!renewal) {
      throw new Error('Renewal record not found');
    }

    renewal.attemptNumber = (renewal.attemptNumber || 0) + 1;
    renewal.failureReason = failureReason;

    if (renewal.attemptNumber >= renewal.maxAttempts) {
      renewal.status = 'failed';
      
      // Update subscription status
      const subscription = await Subscription.findById(renewal.subscriptionId);
      if (subscription) {
        subscription.renewalStatus = 'renewal-failed';
        subscription.renewalAttempts = renewal.attemptNumber;
        subscription.updatedAt = new Date();
        await subscription.save();
      }
    } else {
      renewal.status = 'pending';
      // Schedule next retry after 24 hours
      const nextRetry = new Date();
      nextRetry.setHours(nextRetry.getHours() + 24);
      renewal.nextRetryDate = nextRetry;
    }

    const updatedRenewal = await renewal.save();

    return {
      success: true,
      renewal: updatedRenewal,
      willRetry: renewal.attemptNumber < renewal.maxAttempts,
      message: renewal.attemptNumber < renewal.maxAttempts 
        ? `Renewal will retry at ${renewal.nextRetryDate}`
        : 'Renewal failed after maximum attempts'
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Apply grace period to expired subscription
 * @param {string} subscriptionId - MongoDB ObjectId of subscription
 * @returns {Promise<Object>}
 */
async function applyGracePeriod(subscriptionId) {
  try {
    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const gracePeriodDays = subscription.gracePeriodDays || 7;
    const now = new Date();
    const graceExpiresAt = new Date(now.getTime() + gracePeriodDays * 24 * 60 * 60 * 1000);

    subscription.graceExpiresAt = graceExpiresAt;
    subscription.renewalStatus = 'expiring-soon';
    subscription.updatedAt = new Date();
    await subscription.save();

    return {
      success: true,
      subscription,
      gracePeriod: {
        appliedAt: now,
        expiresAt: graceExpiresAt,
        daysRemaining: gracePeriodDays
      },
      message: `Grace period applied. Renewal required by ${graceExpiresAt.toISOString()}`
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Get subscriptions due for renewal
 * @param {number} daysBeforeExpiry - Check subscriptions expiring within this many days
 * @returns {Promise<Array>}
 */
async function getSubscriptionsDueForRenewal(daysBeforeExpiry = 3) {
  try {
    const now = new Date();
    const futureDate = new Date(now.getTime() + daysBeforeExpiry * 24 * 60 * 60 * 1000);

    const subscriptions = await Subscription.find({
      $and: [
        { expiry: { $lte: futureDate } },
        { expiry: { $gt: now } },
        { autoRenewal: true },
        { cancelledAt: null }
      ]
    }).sort({ expiry: 1 });

    return subscriptions;
  } catch (error) {
    console.error('Error fetching subscriptions due for renewal:', error);
    return [];
  }
}

/**
 * Get expired subscriptions in grace period
 * @returns {Promise<Array>}
 */
async function getExpiredSubscriptionsInGracePeriod() {
  try {
    const now = new Date();

    const subscriptions = await Subscription.find({
      $and: [
        { expiry: { $lt: now } },
        { graceExpiresAt: { $gt: now } },
        { autoRenewal: true },
        { cancelledAt: null }
      ]
    }).sort({ graceExpiresAt: 1 });

    return subscriptions;
  } catch (error) {
    console.error('Error fetching expired subscriptions in grace period:', error);
    return [];
  }
}

/**
 * Get expired subscriptions with grace period ended
 * @returns {Promise<Array>}
 */
async function getExpiredSubscriptionsGraceEnded() {
  try {
    const now = new Date();

    const subscriptions = await Subscription.find({
      $and: [
        { expiry: { $lt: now } },
        { graceExpiresAt: { $lt: now } },
        { renewalStatus: { $ne: 'expired' } },
        { cancelledAt: null }
      ]
    });

    return subscriptions;
  } catch (error) {
    console.error('Error fetching grace period ended subscriptions:', error);
    return [];
  }
}

/**
 * Cancel subscription
 * @param {string} subscriptionId - MongoDB ObjectId
 * @param {string} reason - Cancellation reason
 * @returns {Promise<Object>}
 */
async function cancelSubscription(subscriptionId, reason = 'User requested cancellation') {
  try {
    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    subscription.cancelledAt = new Date();
    subscription.cancelReason = reason;
    subscription.renewalStatus = 'expired';
    subscription.autoRenewal = false;
    subscription.updatedAt = new Date();
    await subscription.save();

    return {
      success: true,
      subscription,
      message: 'Subscription cancelled successfully'
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Get renewal history for subscription
 * @param {string} subscriptionId - MongoDB ObjectId
 * @returns {Promise<Array>}
 */
async function getRenewalHistory(subscriptionId) {
  try {
    const renewals = await SubscriptionRenewal.find({
      subscriptionId
    }).sort({ createdAt: -1 });

    return renewals;
  } catch (error) {
    console.error('Error fetching renewal history:', error);
    return [];
  }
}

/**
 * Get user's subscription renewal status
 * @param {string} user - User address
 * @returns {Promise<Object>}
 */
async function getUserSubscriptionStatus(user) {
  try {
    const subscriptions = await Subscription.find({ user });

    const status = {
      user,
      totalSubscriptions: subscriptions.length,
      active: 0,
      expiringSoon: 0,
      inGracePeriod: 0,
      expired: 0,
      renewalPending: 0,
      renewalFailed: 0,
      subscriptions: []
    };

    for (const sub of subscriptions) {
      const renewal = calculateRenewalStatus(sub);
      const subStatus = {
        _id: sub._id,
        creator: sub.creator,
        tierId: sub.tierId,
        status: renewal.status,
        expiresAt: renewal.expiresAt,
        daysRemaining: renewal.daysRemaining,
        inGracePeriod: renewal.inGracePeriod,
        autoRenewal: sub.autoRenewal
      };

      status.subscriptions.push(subStatus);

      // Count statuses
      if (renewal.status === 'active') status.active++;
      if (renewal.status === 'expiring-soon') status.expiringSoon++;
      if (renewal.status === 'grace-period') status.inGracePeriod++;
      if (renewal.status === 'expired') status.expired++;
    }

    // Count from subscription status
    const renewalPending = subscriptions.filter(s => s.renewalStatus === 'renewal-pending').length;
    const renewalFailed = subscriptions.filter(s => s.renewalStatus === 'renewal-failed').length;

    status.renewalPending = renewalPending;
    status.renewalFailed = renewalFailed;

    return status;
  } catch (error) {
    console.error('Error getting user subscription status:', error);
    return { error: error.message };
  }
}

module.exports = {
  validateRenewalEligibility,
  isInGracePeriod,
  calculateRenewalStatus,
  initiateRenewal,
  completeRenewal,
  handleRenewalFailure,
  applyGracePeriod,
  getSubscriptionsDueForRenewal,
  getExpiredSubscriptionsInGracePeriod,
  getExpiredSubscriptionsGraceEnded,
  cancelSubscription,
  getRenewalHistory,
  getUserSubscriptionStatus
};
