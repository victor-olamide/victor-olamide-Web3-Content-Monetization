# Tiered Rate Limiting Implementation Guide

## Overview

This document describes the implementation of tiered rate limiting based on user subscription levels. The system dynamically adjusts API rate limits based on the user's subscription tier (free, basic, premium, enterprise, admin).

## Features

- **Subscription-aware rate limiting**: Rate limits are determined by user's subscription tier
- **Tier-based configurations**: Each tier has different limits for requests, burst rates, and concurrent connections
- **Automatic tier resolution**: System automatically resolves user tier from database when needed
- **Efficient caching**: In-memory caching reduces database queries
- **Audit trail**: Complete history of tier changes with TierChangeLog model
- **Error handling**: Tier-specific error messages and recovery suggestions
- **Database optimization**: Compound indexes for efficient lookups

## Architecture

### Components

1. **Config Layer** (`rateLimitConfig.js`)
   - Defines tier levels and their configurations
   - Specifies endpoint-specific overrides
   - Centralized configuration management

2. **Utilities** 
   - `subscriptionTierMapper.js`: Maps subscription tiers to rate limit tiers
   - `rateLimitValidationUtils.js`: Validates tier changes and requests
   - `rateLimitErrorHandler.js`: Centralized error handling

3. **Services**
   - `subscriptionAwareRateLimitService.js`: Database-backed tier resolution
   - `tierCacheService.js`: In-memory caching for performance
   - `tierChangeHandler.js`: Handles subscription tier transitions
   - `rateLimitService.js`: Core rate limit checking logic

4. **Middleware**
   - `subscriptionRateLimiter.js`: Main rate limiting middleware
   - `subscriptionChangeMiddleware.js`: Hooks into subscription events

5. **Routes**
   - `rateLimitAdjustmentRoutes.js`: API endpoints for rate limit management

6. **Models**
   - `RateLimitStore.js`: Tracks rate limit counters per user
   - `TierChangeLog.js`: Audit trail for tier changes
   - `Subscription.js`: User subscription data
   - `SubscriptionTier.js`: Creator's tier definitions

## Tier Limits

### Default Configuration

```javascript
FREE:      100 req/15min,  20 burst/min,   1000/day,    5 concurrent
BASIC:     500 req/15min,  50 burst/min,   5000/day,   10 concurrent
PREMIUM:  2000 req/15min, 200 burst/min,  20000/day,   25 concurrent
ENTERPRISE: 10k req/15min, 1k burst/min, 100k/day,     50 concurrent
ADMIN:    50k req/15min,  5k burst/min, 500k/day,    100 concurrent
```

### Endpoint Overrides

- `/api/content`: 1.5x multiplier (higher limits)
- `/api/purchases`: 0.5x multiplier (stricter limits)
- `/api/wallet`: 0.5x multiplier (security-focused)
- `/api/analytics`: 2.0x multiplier (read-heavy)

## Usage

### Integration with Existing Code

1. **Install middleware in Express app:**

```javascript
const { subscriptionRateLimiter } = require('./middleware/subscriptionRateLimiter');
app.use('/api/v1', subscriptionRateLimiter);
```

2. **Hook subscription events:**

```javascript
const {
  subscriptionCreatedMiddleware,
  subscriptionUpgradedMiddleware,
  subscriptionDowngradedMiddleware
} = require('./middleware/subscriptionChangeMiddleware');

// Add to subscription routes
router.post('/subscriptions', subscriptionCreatedMiddleware(), subscriptionController.create);
router.put('/subscriptions/:id/upgrade', subscriptionUpgradedMiddleware(), subscriptionController.upgrade);
```

3. **Create database indexes (run once during deployment):**

```javascript
const { createRateLimitingIndexes } = require('./db/createRateLimitingIndexes');
await createRateLimitingIndexes();
```

### API Endpoints

#### Get User's Current Tier
```
GET /api/rate-limits/user-tier
Response: { userId, rateLimitTier }
```

#### Check Rate Limit Status
```
GET /api/rate-limits/status?key=wallet:0x...&endpoint=/api/content
Response: { key, status: { tier, limits, current, remaining } }
```

#### Reset User Rate Limits (Admin)
```
POST /api/rate-limits/reset
Body: { userId }
```

#### Record Tier Change
```
POST /api/rate-limits/tier-change
Body: {
  userId,
  oldSubscriptionTier: "free",
  newSubscriptionTier: "premium",
  oldRateLimitTier: "free",
  newRateLimitTier: "premium",
  reason: "upgrade_request"
}
```

#### Get Tier Change History
```
GET /api/rate-limits/tier-history?userId=user123&limit=50&offset=0
Response: { userId, count, history: [{ ... }] }
```

#### Get Global Statistics
```
GET /api/rate-limits/tier-statistics?startDate=...&endDate=...
Response: { statistics: { totalChanges, upgrades, downgrades, ... } }
```

## How It Works

### Request Flow

1. **Request arrives** at Express app
2. **subscriptionRateLimiter middleware** activates:
   - Extracts user ID from auth/session
   - Queries subscription database OR uses cache
   - Maps subscription tier to rate limit tier
   - Checks rate limits in RateLimitStore
3. **Rate limit check**:
   - Validates against window, burst, daily, and concurrent limits
   - If exceeded, returns 429 with retry-after header
   - If allowed, increments counters and passes request through
4. **Response sent** with rate limit headers:
   - `X-RateLimit-Tier`: User's tier
   - `X-RateLimit-Limit`: Max requests
   - `X-RateLimit-Remaining`: Requests left
   - `X-RateLimit-Reset`: Unix timestamp when limit resets

### Tier Change Flow

1. **Subscription updated** (upgrade, downgrade, cancel, etc.)
2. **subscriptionChangeMiddleware** hooks the event:
   - Validates tier transition
   - Records change in TierChangeLog
   - Updates RateLimitStore with new tier
   - Invalidates cache for user
   - Sends notification to user
3. **User's following requests** use new tier limits immediately

### Caching Strategy

- **User tier cached** for 10 minutes (configurable)
- **Cache invalidated** on subscription change
- **Cache warmup** available for batch operations
- **Health monitoring** provides cache statistics

## Performance Considerations

### Database Optimization
- Compound indexes on (user+creator+status) for subscription lookups
- Indexes on RateLimitStore key+tier for fast lookups
- TTL indexes for automatic cleanup of old rate limit records

### Caching Layer
- In-memory tier cache reduces DB queries by ~80%
- Configurable TTL for cache expiration
- Batch caching for multiple users

### Query Patterns
```javascript
// Fast cached lookup (after first query)
const tier = await getUserTierCached(userId);

// Batch lookup with partial cache hits
const tiers = await getUsersTiersCached(userIds);

// Force refresh (cache bypass)
const freshTier = await getUserTierCached(userId, null, { forceRefresh: true });
```

## Error Handling

### Rate Limit Exceeded (429)
```json
{
  "error": "Rate limit exceeded",
  "errorCode": "WINDOW_LIMIT_EXCEEDED",
  "message": "You have exceeded the free tier request limit...",
  "retryAfter": 60,
  "limits": { "maxRequests": 100, "windowMs": 900000, ... },
  "current": { "windowRequests": 100, ... }
}
```

### Validation Error (400)
```json
{
  "error": "Validation failed",
  "errorCode": "VALIDATION_ERROR",
  "details": {
    "errors": ["userId is required", "Invalid tier: xyz"],
    "errorCount": 2
  }
}
```

### Tier-Specific Messages
- **Free tier**: Encourages upgrade ("upgrade your subscription")
- **Basic tier**: Suggests premium ("Consider upgrading")
- **Premium tier**: Directs to support ("Contact support")
- **Enterprise tier**: Escalates ("Contact support immediately")

## Monitoring & Analytics

### Available Statistics
```javascript
// Per-user statistics
const stats = await TierChangeLog.getUserStats(userId);
// Returns: { totalChanges, upgrades, downgrades, lastChangeAt }

// Global statistics
const global = await TierChangeLog.getGlobalStats({ startDate, endDate });
// Returns: { totalChanges, totalUpgrades, totalDowngrades, upgradeRate }

// Recent upgraders
const recent = await TierChangeLog.getRecentUpgraders(minutesAgo);
// Returns: [userId1, userId2, ...]

// Cache health
const health = getCacheHealth();
// Returns: { healthy, cachedUsers, stats, memoryEstimate }
```

### Alerts to Track
- Sudden spike in rate limit violations
- Cache hit/miss ratio dropping
- Upgrade/downgrade rate changes
- Renewal failures trending up

## Troubleshooting

### Issue: User has wrong tier
**Solution**: Invalidate cache and check subscription:
```javascript
invalidateUserTier(userId);
const tier = await getUserRateLimitTier(userId); // Fresh from DB
```

### Issue: Rate limits not updating after subscription change
**Solution**: Check if subscription change middleware is hooked:
```javascript
// Verify middleware is active
router.post('/upgrade', subscriptionUpgradedMiddleware(), handler);

// Manually trigger update
await handleTierChange({
  userId, oldSubscriptionTier, newSubscriptionTier, ...
});
```

### Issue: Database queries taking too long
**Solution**: Ensure indexes are created:
```javascript
const { createRateLimitingIndexes } = require('./db/createRateLimitingIndexes');
await createRateLimitingIndexes();
```

### Issue: High memory usage
**Solution**: Reduce cache TTL and clear periodically:
```javascript
setCacheTTL(300); // 5 minutes instead of 10
clearTierCache(); // Clear all cached tiers
```

## Testing

Run unit tests:
```bash
npm test -- backend/tests/rateLimiting.test.js
```

Test specific flows:
```javascript
// Test tier upgrade
const oldTier = mapSubscriptionToRateLimit('free');
const newTier = mapSubscriptionToRateLimit('premium');
const comparison = compareTierLevels(oldTier, newTier);
assert(comparison.isUpgrade);

// Test validation
const validation = validateTierChangeData({
  userId: 'user123',
  oldSubscriptionTier: 'free',
  newSubscriptionTier: 'premium',
  oldRateLimitTier: 'free',
  newRateLimitTier: 'premium'
});
assert(validation.valid);
```

## Future Enhancements

1. **Dynamic tier limits**: Allow creators to customize tier limits
2. **Rate limit bursting**: Allow exceeding burst after consuming lower
3. **Cost-based limits**: Different limits based on operation cost
4. **Time-based promotions**: Temporary tier upgrades during campaigns
5. **Usage analytics**: Detailed per-endpoint usage tracking
6. **Predictive blocking**: ML-based anomaly detection
7. **Custom rate limit rules**: Per-user custom configurations

## References

- [Rate Limiting Best Practices](https://cloud.google.com/architecture/rate-limiting-strategies-techniques)
- [Subscription Tier Model](./docs/subscriptions.md)
- [API Documentation](./docs/api.md)
