# Tiered Rate Limiting - Implementation Checklist

## Pre-Implementation

- [ ] Review [TIERED_RATE_LIMITING.md](./TIERED_RATE_LIMITING.md) documentation
- [ ] Understand the architecture and components
- [ ] Review existing subscription system
- [ ] Backup database before migration
- [ ] Plan deployment timeline

## Core Implementation

### 1. Database Setup
- [ ] Ensure MongoDB is running and accessible
- [ ] Create TierChangeLog collection (auto-created by Mongoose)
- [ ] Run index creation script:
```javascript
const { createRateLimitingIndexes } = require('./backend/db/createRateLimitingIndexes');
await createRateLimitingIndexes();
```

### 2. Dependencies
- [ ] Ensure `node-cache` is installed: `npm install node-cache`
- [ ] Verify all required packages are present in package.json

### 3. Environment Variables (if needed)
```bash
RATE_LIMIT_CACHE_TTL=600          # Cache TTL in seconds
RATE_LIMIT_DEFAULT_TIER=free      # Default tier for unknown users
RATE_LIMIT_ENABLED=true           # Enable/disable rate limiting
RATE_LIMIT_STRICT_MODE=false      # Enable stricter limits
```

## Integration Steps

### Step 1: Setup Rate Limiting Middleware

**File:** `backend/server.js` or main Express app file

```javascript
// Import middleware
const { subscriptionRateLimiter } = require('./middleware/subscriptionRateLimiter');
const rateLimitAdjustmentRoutes = require('./routes/rateLimitAdjustmentRoutes');

// Add middleware to all /api routes (or specific routes)
app.use('/api', subscriptionRateLimiter);

// Add rate limit management routes
app.use('/api/rate-limits', rateLimitAdjustmentRoutes);
```

### Step 2: Setup Subscription Event Hooks

**File:** `backend/routes/subscriptionRoutes.js` or subscription controller

```javascript
const {
  subscriptionCreatedMiddleware,
  subscriptionUpgradedMiddleware,
  subscriptionDowngradedMiddleware,
  subscriptionCancelledMiddleware,
  subscriptionRenewalFailedMiddleware
} = require('../middleware/subscriptionChangeMiddleware');

// Hook into subscription endpoints
router.post('/subscriptions', subscriptionCreatedMiddleware(), controller.create);
router.put('/subscriptions/:id/upgrade', subscriptionUpgradedMiddleware(), controller.upgrade);
router.put('/subscriptions/:id/downgrade', subscriptionDowngradedMiddleware(), controller.downgrade);
router.delete('/subscriptions/:id', subscriptionCancelledMiddleware(), controller.cancel);
```

### Step 3: Verify Configuration

**File:** `backend/config/rateLimitConfig.js`

Verify tier configurations match your subscription model:
```javascript
const TIER_LEVELS = {
  FREE: 'free',      // Maps to your free tier
  BASIC: 'basic',    // Maps to your basic tier
  PREMIUM: 'premium', // Maps to your premium tier
  // ... etc
};
```

### Step 4: Test Basic Functionality

```bash
# Run unit tests
npm test -- backend/tests/rateLimiting.test.js

# Test endpoints manually
curl http://localhost:3000/api/rate-limits/available-tiers
curl http://localhost:3000/api/rate-limits/user-tier?userId=test_user_id
```

### Step 5: Monitor Initial Deployment

- [ ] Check logs for any errors
- [ ] Verify rate limit headers are being sent
- [ ] Test tier upgrade/downgrade flow
- [ ] Monitor violation rates

## Validation Checklist

### Request/Response Headers
- [ ] `X-RateLimit-Tier` header is present
- [ ] `X-RateLimit-Limit` shows correct limit
- [ ] `X-RateLimit-Remaining` decrements correctly
- [ ] `X-RateLimit-Reset` shows correct timestamp
- [ ] `Retry-After` header present in 429 responses

### Database
- [ ] TierChangeLog records are being created
- [ ] RateLimitStore records are being updated
- [ ] Indexes are created and being used
- [ ] No database errors in logs

### Cache
- [ ] Cache is being populated
- [ ] Cache hits reducing database queries
- [ ] Cache invalidation working on tier changes
- [ ] Cache memory usage is reasonable

### API Endpoints
- [ ] GET `/api/rate-limits/available-tiers` - Works
- [ ] GET `/api/rate-limits/user-tier` - Returns correct tier
- [ ] GET `/api/rate-limits/status` - Shows current status
- [ ] POST `/api/rate-limits/tier-change` - Records changes
- [ ] GET `/api/rate-limits/tier-history` - Returns history
- [ ] GET `/api/rate-limits/tier-statistics` - Returns stats

## Performance Tuning

### Optimize Database Queries
``` javascript
// Check if indexes are being used
db.explain().find({ user: 1, cancelledAt: null })

// Monitor query performance
// Look for "executionStages": "COLLSCAN" (indicates missing index)
```

### Cache Optimization
```javascript
const { setCacheTTL, getCacheStats } = require('./services/tierCacheService');

// Adjust TTL based on subscription frequency
setCacheTTL(600); // 10 minutes
setCacheTTL(300); // 5 minutes for more frequent changes

// Monitor cache health
const stats = getCacheStats();
console.log(`Cache hit rate: ${stats.stats.hits / (stats.stats.hits + stats.stats.misses)}`);
```

### Rate Limit Tuning
```javascript
// Adjust tier limits in config/rateLimitConfig.js
const RATE_LIMIT_TIERS = {
  [TIER_LEVELS.FREE]: {
    maxRequests: 100,  // Adjust based on usage
    windowMs: 15 * 60 * 1000,
    // ...
  }
};
```

## Monitoring Setup

### Enable Metrics Collection
```javascript
const { generateReport } = require('./services/rateLimitMetrics');

// Generate daily reports
setInterval(async () => {
  const report = await generateReport({ timeframe: 'day' });
  console.log('Daily Metrics Report:', report);
  // Send to monitoring service
}, 24 * 60 * 60 * 1000);

// Or on-demand
router.get('/admin/metrics', async (req, res) => {
  const report = await generateReport({ timeframe: 'day' });
  res.json(report);
});
```

### Setup Alerts
```javascript
const { getSystemHealth } = require('./services/rateLimitMetrics');

// Check system health periodically
setInterval(async () => {
  const health = await getSystemHealth();
  
  health.alerts.forEach(alert => {
    if (alert.severity === 'critical') {
      sendAlert(alert); // Your alert mechanism
    }
  });
}, 60 * 1000); // Check every minute
```

## Troubleshooting

### Issue: Middleware not applying rate limits
**Solution**: Verify middleware is registered before routes
```javascript
// Correct order
app.use('/api', subscriptionRateLimiter); // Middleware first
app.use('/api', routes); // Routes second
```

### Issue: Database connection errors
**Solution**: Check MongoDB connection
```javascript
// Add logging to diagnose
const testConnection = await RateLimitStore.findOne({});
console.log('DB Connection OK:', !!testConnection.collection);
```

### Issue: Cache not working
**Solution**: Check NodeCache is installed and working
```javascript
const { tierCache, getCacheStats } = require('./services/tierCacheService');
const stats = getCacheStats();
console.log('Cache keys:', stats.keyCount);
```

### Issue: Tier not updating after subscription change
**Solution**: Verify middleware hooks are called
```javascript
// Add logging to subscription controller
console.log('Before tier change:', req.subscription);
// ... subscription change logic ...
console.log('After tier change:', req.subscription);
```

## Rollback Plan

If issues occur, rollback carefully:

### 1. Disable rate limiting
```javascript
// Comment out in Express app
// app.use('/api', subscriptionRateLimiter);
```

### 2. Clear cache
```javascript
const { clearTierCache } = require('./services/tierCacheService');
await clearTierCache();
```

### 3. Reset rate limit counters (if needed)
```javascript
const { resetRateLimit } = require('./services/rateLimitService');
await resetRateLimit('wallet:0x...');
```

### 4. Drop indexes (if needed)
```javascript
const { dropRateLimitingIndexes } = require('./db/createRateLimitingIndexes');
await dropRateLimitingIndexes();
```

## Post-Implementation

- [ ] Document any custom tier configurations
- [ ] Add monitoring to operations dashboard
- [ ] Create runbooks for common issues
- [ ] Train team on new endpoints and features
- [ ] Set up alerting thresholds
- [ ] Schedule regular metrics reviews
- [ ] Plan for future enhancements

## File Checklist

Implementation should include these files:

**Utilities:**
- [x] backend/utils/subscriptionTierMapper.js
- [x] backend/utils/rateLimitValidationUtils.js
- [x] backend/utils/rateLimitErrorHandler.js

**Services:**
- [x] backend/services/subscriptionAwareRateLimitService.js
- [x] backend/services/tierCacheService.js
- [x] backend/services/tierChangeHandler.js
- [x] backend/services/rateLimitMetrics.js

**Middleware:**
- [x] backend/middleware/subscriptionRateLimiter.js
- [x] backend/middleware/subscriptionChangeMiddleware.js

**Routes:**
- [x] backend/routes/rateLimitAdjustmentRoutes.js

**Models:**
- [x] backend/models/TierChangeLog.js
- [x] backend/models/RateLimitStore.js (should exist)
- [x] backend/models/Subscription.js (should exist)
- [x] backend/models/SubscriptionTier.js (should exist)

**Database:**
- [x] backend/db/createRateLimitingIndexes.js

**Config:**
- [x] backend/config/rateLimitConfig.js (should exist)

**Documentation:**
- [x] backend/docs/TIERED_RATE_LIMITING.md
- [x] This file (IMPLEMENTATION_CHECKLIST.md)

**Tests:**
- [x] backend/tests/rateLimiting.test.js

## Support & Questions

- Reference: [TIERED_RATE_LIMITING.md](./TIERED_RATE_LIMITING.md)
- Look for example usage in test files
- Check middleware implementations for patterns
- Review route handlers for endpoint examples

## Success Criteria

✅ Implementation is complete when:
1. All 15 commits are merged
2. Database indexes are created and performing well
3. Rate limiting headers appear in API responses
4. Tier changes are recorded in TierChangeLog
5. Users see correct tier-specific limits
6. Errors include tier-specific messages
7. Metrics are being collected
8. Cache is reducing database load
9. Unit tests pass
10. No errors in production logs
