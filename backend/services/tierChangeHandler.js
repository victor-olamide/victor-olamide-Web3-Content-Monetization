/**
 * Tier Upgrade/Change Handler
 * 
 * Handles subscription tier changes and updates rate limit tiers accordingly.
 * Manages cache invalidation, logging, and tier transition logic.
 * 
 * @module services/tierChangeHandler
 */

const { invalidateUserTier } = require('./tierCacheService');
const { updateUserTier } = require('./rateLimitService');
const { mapSubscriptionToRateLimit } = require('../utils/subscriptionTierMapper');
const RateLimitStore = require('../models/RateLimitStore');
const TierChangeLog = require('../models/TierChangeLog');
const { TIER_LEVELS } = require('../config/rateLimitConfig');

/**
 * Handle subscription tier change for a user
 * Records the change, updates rate limit store, invalidates cache
 * @param {Object} changeData - Tier change information
 * @returns {Promise<Object>} Change result
 */
async function handleTierChange(changeData) {
  try {
    const {
      userId,
      walletAddress,
      oldSubscriptionTier,
      newSubscriptionTier,
      oldRateLimitTier,
      newRateLimitTier,
      creatorId = null,
      reason = 'subscription_change',
      metadata = {}
    } = changeData;

    // Validate tier change
    const tierHierarchy = [
      TIER_LEVELS.FREE,
      TIER_LEVELS.BASIC,
      TIER_LEVELS.PREMIUM,
      TIER_LEVELS.ENTERPRISE,
      TIER_LEVELS.ADMIN
    ];

    const oldIndex = tierHierarchy.indexOf(oldRateLimitTier);
    const newIndex = tierHierarchy.indexOf(newRateLimitTier);
    const isUpgrade = newIndex > oldIndex;
    const isDowngrade = newIndex < oldIndex;

    // Record tier change in log
    const changeLog = new TierChangeLog({
      userId,
      walletAddress,
      oldSubscriptionTier,
      newSubscriptionTier,
      oldRateLimitTier,
      newRateLimitTier,
      creatorId,
      isUpgrade,
      isDowngrade,
      reason,
      metadata,
      timestamp: new Date()
    });

    await changeLog.save();

    // Update rate limit store with new tier
    if (walletAddress) {
      const rateLimitKey = `wallet:${walletAddress}`;
      await updateUserTier(rateLimitKey, newRateLimitTier);
    }

    // Invalidate cache
    invalidateUserTier(userId, creatorId);

    // Log the change
    const logMessage = isUpgrade 
      ? `User upgraded: ${oldRateLimitTier} → ${newRateLimitTier}` 
      : isDowngrade 
      ? `User downgraded: ${oldRateLimitTier} → ${newRateLimitTier}` 
      : `User tier changed: ${oldRateLimitTier} → ${newRateLimitTier}`;

    console.log(`[TIER_CHANGE] ${logMessage} | User: ${userId} | Subscription: ${oldSubscriptionTier} → ${newSubscriptionTier}`);

    return {
      success: true,
      changeLogId: changeLog._id,
      isUpgrade,
      isDowngrade,
      message: logMessage
    };

  } catch (error) {
    console.error('Error handling tier change:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Handle batch tier changes
 * @param {Array<Object>} changes - Array of tier change data objects
 * @returns {Promise<Object>} Batch results
 */
async function handleBatchTierChanges(changes) {
  try {
    const results = {
      successful: [],
      failed: [],
      total: changes.length
    };

    for (const change of changes) {
      try {
        const result = await handleTierChange(change);
        if (result.success) {
          results.successful.push(result);
        } else {
          results.failed.push({ change, error: result.error });
        }
      } catch (error) {
        results.failed.push({ change, error: error.message });
      }
    }

    console.log(`Batch tier changes processed: ${results.successful.length} successful, ${results.failed.length} failed`);
    return results;

  } catch (error) {
    console.error('Error handling batch tier changes:', error.message);
    throw error;
  }
}

/**
 * Get tier change history for a user
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Tier change history
 */
async function getUserTierChangeHistory(userId, options = {}) {
  try {
    const { limit = 50, offset = 0, creatorId = null } = options;

    let query = { userId };
    if (creatorId) {
      query.creatorId = creatorId;
    }

    const changes = await TierChangeLog.find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .skip(offset)
      .lean();

    return changes;
  } catch (error) {
    console.error('Error getting tier change history:', error.message);
    return [];
  }
}

/**
 * Get tier upgrade bonuses/incentives
 * Returns temporary rate limit boosts for users who upgraded
 * @param {string} userId - User ID
 * @param {Date} upgradeTime - When the upgrade occurred
 * @returns {Object} Upgrade bonus configuration
 */
function getTierUpgradeBonus(userId, upgradeTime) {
  const now = Date.now();
  const upgradeAgeMs = now - upgradeTime.getTime();
  const oneDay = 24 * 60 * 60 * 1000;

  // Provide bonus multiplier for 24 hours after upgrade
  if (upgradeAgeMs < oneDay) {
    return {
      eligible: true,
      multiplier: 1.25, // 25% bonus
      expiresAt: new Date(upgradeTime.getTime() + oneDay),
      hoursRemaining: 24 - (upgradeAgeMs / (60 * 60 * 1000))
    };
  }

  return {
    eligible: false,
    multiplier: 1.0,
    expiresAt: null,
    hoursRemaining: 0
  };
}

/**
 * Check if upgrade window is still active
 * @param {Date} upgradeTime - When the upgrade occurred
 * @param {number} windowMs - Window duration in milliseconds
 * @returns {boolean}
 */
function isUpgradeWindowActive(upgradeTime, windowMs = 86400000) { // 24 hours default
  const now = Date.now();
  return (now - upgradeTime.getTime()) < windowMs;
}

/**
 * Notify users of tier level status change
 * @param {string} userId - User ID
 * @param {string} oldTier - Previous tier
 * @param {string} newTier - New tier
 * @returns {Promise<void>}
 */
async function notifyTierChange(userId, oldTier, newTier) {
  try {
    // This would integrate with your notification service
    const NotificationService = require('./notificationService');
    
    const tierHierarchy = [
      TIER_LEVELS.FREE,
      TIER_LEVELS.BASIC,
      TIER_LEVELS.PREMIUM,
      TIER_LEVELS.ENTERPRISE,
      TIER_LEVELS.ADMIN
    ];

    const oldIndex = tierHierarchy.indexOf(oldTier);
    const newIndex = tierHierarchy.indexOf(newTier);
    const isUpgrade = newIndex > oldIndex;

    const notificationData = {
      userId,
      type: isUpgrade ? 'tier_upgrade' : 'tier_downgrade',
      title: isUpgrade ? 'Welcome to a Better Plan!' : 'Plan Changed',
      message: isUpgrade 
        ? `You've successfully upgraded from ${oldTier} to ${newTier} tier. Enjoy higher rate limits!`
        : `Your subscription has changed from ${oldTier} to ${newTier} tier.`,
      data: {
        oldTier,
        newTier,
        isUpgrade
      }
    };

    // Send notification (non-blocking)
    NotificationService?.send?.(notificationData).catch(err => {
      console.error('Error sending tier change notification:', err.message);
    });
  } catch (error) {
    console.error('Error in notifyTierChange:', error.message);
  }
}

/**
 * Validate tier transition
 * Checks if a tier change is valid
 * @param {string} fromTier - Current tier
 * @param {string} toTier - Target tier
 * @returns {Object} Validation result
 */
function validateTierTransition(fromTier, toTier) {
  const tierHierarchy = [
    TIER_LEVELS.FREE,
    TIER_LEVELS.BASIC,
    TIER_LEVELS.PREMIUM,
    TIER_LEVELS.ENTERPRISE,
    TIER_LEVELS.ADMIN
  ];

  const fromIndex = tierHierarchy.indexOf(fromTier);
  const toIndex = tierHierarchy.indexOf(toTier);

  if (fromIndex === -1 || toIndex === -1) {
    return {
      valid: false,
      reason: 'Invalid tier specified'
    };
  }

  return {
    valid: true,
    isUpgrade: toIndex > fromIndex,
    isDowngrade: toIndex < fromIndex,
    sameTier: fromIndex === toIndex,
    tierDifference: Math.abs(toIndex - fromIndex)
  };
}

module.exports = {
  handleTierChange,
  handleBatchTierChanges,
  getUserTierChangeHistory,
  getTierUpgradeBonus,
  isUpgradeWindowActive,
  notifyTierChange,
  validateTierTransition
};
