/**
 * Subscription Change Middleware
 * 
 * Middleware to hook into subscription change events
 * and trigger rate limit tier updates.
 * 
 * @module middleware/subscriptionChangeMiddleware
 */

const {
  handleTierChange,
  notifyTierChange
} = require('../services/tierChangeHandler');
const {
  invalidateUserTier,
  invalidateUsersTiers
} = require('../services/tierCacheService');
const {
  mapSubscriptionToRateLimit,
  getSubscriptionTierWithRateLimitMapping
} = require('../utils/subscriptionTierMapper');

/**
 * Middleware to handle subscription creation
 * Triggered when user subscribes to a tier
 */
function subscriptionCreatedMiddleware() {
  return async function(req, res, next) {
    try {
      const { subscription, subscriptionTier } = req.body;

      if (!subscription || !subscriptionTier) {
        return next();
      }

      const newRateLimitTier = getSubscriptionTierWithRateLimitMapping(subscriptionTier._id);
      const oldRateLimitTier = 'free';

      // Record the tier change
      await handleTierChange({
        userId: subscription.user,
        walletAddress: subscription.walletAddress,
        oldSubscriptionTier: 'none',
        newSubscriptionTier: subscriptionTier.name,
        oldRateLimitTier,
        newRateLimitTier: await newRateLimitTier,
        reason: 'subscription_change',
        metadata: {
          subscriptionId: subscription._id,
          tierPrice: subscriptionTier.price
        }
      });

      // Invalidate cache
      invalidateUserTier(subscription.user, subscription.creator);

      // Notify user
      await notifyTierChange(subscription.user, oldRateLimitTier, newRateLimitTier);

      next();
    } catch (error) {
      console.error('Error in subscription created middleware:', error.message);
      next();
    }
  };
}

/**
 * Middleware to handle subscription upgrade
 * Triggered when user upgrades to higher tier
 */
function subscriptionUpgradedMiddleware() {
  return async function(req, res, next) {
    try {
      const { 
        userId, 
        creator,
        oldTierId, 
        newTierId, 
        oldTierName, 
        newTierName,
        walletAddress
      } = req.body;

      if (!userId || !newTierId) {
        return next();
      }

      const oldTier = mapSubscriptionToRateLimit(oldTierName || 'free');
      const newTier = mapSubscriptionToRateLimit(newTierName);

      // Only handle if actually different tiers
      if (oldTier === newTier) {
        return next();
      }

      // Record the upgrade
      await handleTierChange({
        userId,
        walletAddress,
        oldSubscriptionTier: oldTierName || 'free',
        newSubscriptionTier: newTierName,
        oldRateLimitTier: oldTier,
        newRateLimitTier: newTier,
        creatorId: creator,
        reason: 'upgrade_request',
        metadata: {
          oldTierId,
          newTierId,
          upgradedAt: new Date()
        }
      });

      // Invalidate cache
      invalidateUserTier(userId, creator);

      // Notify user of upgrade benefits
      await notifyTierChange(userId, oldTier, newTier);

      next();
    } catch (error) {
      console.error('Error in subscription upgraded middleware:', error.message);
      next();
    }
  };
}

/**
 * Middleware to handle subscription downgrade
 */
function subscriptionDowngradedMiddleware() {
  return async function(req, res, next) {
    try {
      const {
        userId,
        creator,
        oldTierName,
        newTierName,
        walletAddress
      } = req.body;

      if (!userId || !newTierName) {
        return next();
      }

      const oldTier = mapSubscriptionToRateLimit(oldTierName);
      const newTier = mapSubscriptionToRateLimit(newTierName);

      if (oldTier === newTier) {
        return next();
      }

      // Record the downgrade
      await handleTierChange({
        userId,
        walletAddress,
        oldSubscriptionTier: oldTierName,
        newSubscriptionTier: newTierName,
        oldRateLimitTier: oldTier,
        newRateLimitTier: newTier,
        creatorId: creator,
        reason: 'downgrade_request',
        metadata: {
          downgradedAt: new Date()
        }
      });

      // Invalidate cache
      invalidateUserTier(userId, creator);

      // Notify user
      await notifyTierChange(userId, oldTier, newTier);

      next();
    } catch (error) {
      console.error('Error in subscription downgraded middleware:', error.message);
      next();
    }
  };
}

/**
 * Middleware to handle subscription cancellation
 */
function subscriptionCancelledMiddleware() {
  return async function(req, res, next) {
    try {
      const {
        userId,
        creator,
        cancelledTierName,
        walletAddress
      } = req.body;

      if (!userId) {
        return next();
      }

      const oldTier = mapSubscriptionToRateLimit(cancelledTierName || 'free');
      const newTier = mapSubscriptionToRateLimit('free');

      if (oldTier !== newTier) {
        // Record the cancellation
        await handleTierChange({
          userId,
          walletAddress,
          oldSubscriptionTier: cancelledTierName || 'free',
          newSubscriptionTier: 'free',
          oldRateLimitTier: oldTier,
          newRateLimitTier: newTier,
          creatorId: creator,
          reason: 'cancellation',
          metadata: {
            cancelledAt: new Date()
          }
        });

        // Invalidate cache
        invalidateUserTier(userId, creator);

        // Notify user
        await notifyTierChange(userId, oldTier, newTier);
      }

      next();
    } catch (error) {
      console.error('Error in subscription cancelled middleware:', error.message);
      next();
    }
  };
}

/**
 * Middleware to handle renewal failures
 * Downgrade user when renewal fails
 */
function subscriptionRenewalFailedMiddleware() {
  return async function(req, res, next) {
    try {
      const {
        userId,
        creator,
        tierName,
        walletAddress
      } = req.body;

      if (!userId || !tierName) {
        return next();
      }

      const oldTier = mapSubscriptionToRateLimit(tierName);
      const newTier = mapSubscriptionToRateLimit('free');

      if (oldTier !== newTier) {
        // Record the renewal failure downgrade
        await handleTierChange({
          userId,
          walletAddress,
          oldSubscriptionTier: tierName,
          newSubscriptionTier: 'free',
          oldRateLimitTier: oldTier,
          newRateLimitTier: newTier,
          creatorId: creator,
          reason: 'renewal_failed',
          metadata: {
            failedAt: new Date()
          }
        });

        // Invalidate cache
        invalidateUserTier(userId, creator);

        // Notify user of downgrade
        await notifyTierChange(userId, oldTier, newTier);
      }

      next();
    } catch (error) {
      console.error('Error in subscription renewal failed middleware:', error.message);
      next();
    }
  };
}

/**
 * Bulk invalidate tier cache for multiple users
 * Useful when making broad tier changes or for scheduled cache refresh
 */
function bulkTierCacheInvalidationMiddleware() {
  return async function(req, res, next) {
    try {
      const { userIds, creatorId } = req.body;

      if (!userIds || !Array.isArray(userIds)) {
        return next();
      }

      if (creatorId) {
        // Invalidate creator-specific tiers
        userIds.forEach(userId => {
          invalidateUserTier(userId, creatorId);
        });
      } else {
        // Invalidate global tiers
        invalidateUsersTiers(userIds);
      }

      console.log(`Tier cache invalidated for ${userIds.length} users`);
      next();
    } catch (error) {
      console.error('Error in bulk cache invalidation:', error.message);
      next();
    }
  };
}

module.exports = {
  subscriptionCreatedMiddleware,
  subscriptionUpgradedMiddleware,
  subscriptionDowngradedMiddleware,
  subscriptionCancelledMiddleware,
  subscriptionRenewalFailedMiddleware,
  bulkTierCacheInvalidationMiddleware
};
