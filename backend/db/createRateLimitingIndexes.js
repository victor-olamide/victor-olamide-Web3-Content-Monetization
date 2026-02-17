/**
 * Database Indexes for Tiered Rate Limiting  
 * 
 * Defines MongoDB indexes for efficient subscription and rate limit queries.
 * These indexes are critical for performance of tier-based lookups.
 * 
 * Run this file once during deployment to ensure indexes are created.
 * 
 * @module db/createRateLimitingIndexes
 */

const Subscription = require('../models/Subscription');
const RateLimitStore = require('../models/RateLimitStore');
const SubscriptionTier = require('../models/SubscriptionTier');

/**
 * Create all required indexes for tiered rate limiting
 * @returns {Promise<Object>} Index creation results
 */
async function createRateLimitingIndexes() {
  const results = {
    subscription: [],
    rateLimitStore: [],
    subscriptionTier: [],
    errors: []
  };

  try {
    // Subscription Indexes
    console.log('Creating Subscription indexes...');
    
    // Index for finding active subscriptions by user and creator
    results.subscription.push({
      name: 'user_creator_active',
      index: await Subscription.collection.createIndex(
        { user: 1, creator: 1, cancelledAt: 1, expiry: 1 },
        { name: 'user_creator_active_expiry' }
      )
    });

    // Index for finding user subscriptions by user only
    results.subscription.push({
      name: 'user_tier_active',
      index: await Subscription.collection.createIndex(
        { user: 1, cancelledAt: 1, expiry: 1 },
        { name: 'user_tier_active_expiry' }
      )
    });

    // Index for finding subscriptions by tier for statistics
    results.subscription.push({
      name: 'tier_expiry',
      index: await Subscription.collection.createIndex(
        { subscriptionTierId: 1, expiry: 1 },
        { name: 'tier_expiry_index' }
      )
    });

    // Index for renewal status queries
    results.subscription.push({
      name: 'renewal_status_next',
      index: await Subscription.collection.createIndex(
        { renewalStatus: 1, nextRenewalDate: 1 },
        { name: 'renewal_status_next_date' }
      )
    });

    console.log('✓ Subscription indexes created');

    // Rate Limit Store Indexes
    console.log('Creating RateLimitStore indexes...');

    // Index for rate limit key lookups with tier
    results.rateLimitStore.push({
      name: 'key_tier',
      index: await RateLimitStore.collection.createIndex(
        { key: 1, tier: 1 },
        { name: 'key_tier_index' }
      )
    });

    // Index for finding blocked entities
    results.rateLimitStore.push({
      name: 'blocked_until',
      index: await RateLimitStore.collection.createIndex(
        { blockedUntil: 1 },
        { name: 'blocked_until_index', expireAfterSeconds: 0 }
      )
    });

    // Index for cleanup - auto-expire old records after 24 hours
    results.rateLimitStore.push({
      name: 'created_at_ttl',
      index: await RateLimitStore.collection.createIndex(
        { createdAt: 1 },
        { name: 'created_at_ttl', expireAfterSeconds: 86400 }
      )
    });

    // Index for wallet address lookups
    results.rateLimitStore.push({
      name: 'wallet_address',
      index: await RateLimitStore.collection.createIndex(
        { walletAddress: 1 },
        { name: 'wallet_address_index' }
      )
    });

    // Index for IP address lookups
    results.rateLimitStore.push({
      name: 'ip_address',
      index: await RateLimitStore.collection.createIndex(
        { ipAddress: 1 },
        { name: 'ip_address_index' }
      )
    });

    // Index for violation tracking
    results.rateLimitStore.push({
      name: 'violations_last_violation',
      index: await RateLimitStore.collection.createIndex(
        { violations: 1, lastViolationAt: -1 },
        { name: 'violations_tracking_index' }
      )
    });

    console.log('✓ RateLimitStore indexes created');

    // Subscription Tier Indexes
    console.log('Creating SubscriptionTier indexes...');

    // Index for finding creator's tiers
    results.subscriptionTier.push({
      name: 'creator_position',
      index: await SubscriptionTier.collection.createIndex(
        { creatorId: 1, position: 1 },
        { name: 'creator_position_index' }
      )
    });

    // Index for finding active tiers
    results.subscriptionTier.push({
      name: 'creator_active_visible',
      index: await SubscriptionTier.collection.createIndex(
        { creatorId: 1, isActive: 1, isVisible: 1 },
        { name: 'creator_active_visible_index' }
      )
    });

    // Index for finding popular tiers
    results.subscriptionTier.push({
      name: 'popular_tiers',
      index: await SubscriptionTier.collection.createIndex(
        { isPopular: 1, creatorId: 1, position: 1 },
        { name: 'popular_tiers_index' }
      )
    });

    // Index for subscriber count queries
    results.subscriptionTier.push({
      name: 'current_subscriber_count',
      index: await SubscriptionTier.collection.createIndex(
        { currentSubscriberCount: 1, maxSubscribers: 1 },
        { name: 'subscriber_count_index' }
      )
    });

    console.log('✓ SubscriptionTier indexes created');

    console.log('\n✅ All indexes created successfully!');
    return results;

  } catch (error) {
    const errorMsg = `Error creating indexes: ${error.message}`;
    console.error('❌', errorMsg);
    results.errors.push(errorMsg);
    throw error;
  }
}

/**
 * Drop all rate limiting related indexes
 * Use only for cleanup/reset
 */
async function dropRateLimitingIndexes() {
  try {
    console.log('Dropping rate limiting indexes...');
    
    await Subscription.collection.dropIndex('user_creator_active_expiry').catch(() => {});
    await Subscription.collection.dropIndex('user_tier_active_expiry').catch(() => {});
    await Subscription.collection.dropIndex('tier_expiry_index').catch(() => {});
    await Subscription.collection.dropIndex('renewal_status_next_date').catch(() => {});

    await RateLimitStore.collection.dropIndex('key_tier_index').catch(() => {});
    await RateLimitStore.collection.dropIndex('blocked_until_index').catch(() => {});
    await RateLimitStore.collection.dropIndex('created_at_ttl').catch(() => {});
    await RateLimitStore.collection.dropIndex('wallet_address_index').catch(() => {});
    await RateLimitStore.collection.dropIndex('ip_address_index').catch(() => {});
    await RateLimitStore.collection.dropIndex('violations_tracking_index').catch(() => {});

    await SubscriptionTier.collection.dropIndex('creator_position_index').catch(() => {});
    await SubscriptionTier.collection.dropIndex('creator_active_visible_index').catch(() => {});
    await SubscriptionTier.collection.dropIndex('popular_tiers_index').catch(() => {});
    await SubscriptionTier.collection.dropIndex('subscriber_count_index').catch(() => {});

    console.log('✅ All indexes dropped successfully!');
  } catch (error) {
    console.error('❌ Error dropping indexes:', error.message);
    throw error;
  }
}

/**
 * Get current index information
 */
async function getRateLimitingIndexInfo() {
  try {
    const subscriptionIndexes = await Subscription.collection.getIndexes();
    const rateLimitStoreIndexes = await RateLimitStore.collection.getIndexes();
    const subscriptionTierIndexes = await SubscriptionTier.collection.getIndexes();

    return {
      subscription: subscriptionIndexes,
      rateLimitStore: rateLimitStoreIndexes,
      subscriptionTier: subscriptionTierIndexes
    };
  } catch (error) {
    console.error('Error getting index info:', error.message);
    throw error;
  }
}

module.exports = {
  createRateLimitingIndexes,
  dropRateLimitingIndexes,
  getRateLimitingIndexInfo
};
