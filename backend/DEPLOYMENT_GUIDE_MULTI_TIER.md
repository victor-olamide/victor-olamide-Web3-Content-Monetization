# Multi-Tier Subscription Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the multi-tier subscription system to production environments.

## Pre-Deployment Checklist

### System Requirements
- [ ] Node.js 14+ installed
- [ ] MongoDB 4.4+ running
- [ ] 2GB+ available disk space
- [ ] Network connectivity
- [ ] Backup of current database created

### Code Review
- [ ] All multi-tier code reviewed
- [ ] Tests passing (unit and integration)
- [ ] No merge conflicts
- [ ] Branch: `issue-54-multi-tier-subscriptions` ready

### Database
- [ ] Backup current database
- [ ] Migration scripts tested on staging
- [ ] Database user has required permissions
- [ ] Indexes optimized

### Configuration
- [ ] Environment variables defined
- [ ] Email templates ready
- [ ] Webhook endpoints configured
- [ ] Monitoring alerts configured

---

## Deployment Steps

### Step 1: Pull Latest Code

```bash
cd /path/to/web3
git fetch origin
git checkout issue-54-multi-tier-subscriptions
git pull origin issue-54-multi-tier-subscriptions
```

### Step 2: Install Dependencies

```bash
cd backend
npm install
```

Verify no security vulnerabilities:
```bash
npm audit
npm audit fix --audit-level=moderate
```

### Step 3: Database Preparation

#### Create SubscriptionTier Collection

MongoDB will auto-create the collection, but explicitly create it with indexes:

```javascript
// Run in MongoDB shell or tool
db.createCollection("subscriptiontiers");

// Create indexes
db.subscriptiontiers.createIndex({ "creatorId": 1 });
db.subscriptiontiers.createIndex({ "creatorId": 1, "isActive": 1 });
db.subscriptiontiers.createIndex({ "creatorId": 1, "position": 1 });
db.subscriptiontiers.createIndex({ "creatorId": 1, "isVisible": 1 });
db.subscriptiontiers.createIndex({ "isPopular": 1, "isActive": 1 });
db.subscriptiontiers.createIndex({ "createdAt": -1 });
db.subscriptiontiers.createIndex({ "revenueTotal": -1 });
```

#### Update Subscription Collection

Add multi-tier fields to existing subscriptions:

```javascript
// Run in MongoDB shell
db.subscriptions.updateMany(
  { subscriptionTierId: { $exists: false } },
  {
    $set: {
      subscriptionTierId: null,
      tierName: null,
      tierPrice: null,
      tierBenefits: []
    }
  }
);
```

#### Verify Database State

```javascript
// Check collection exists
db.getCollectionNames(); // Should include "subscriptiontiers"

// Check indexes
db.subscriptiontiers.getIndexes();

// Sample document count
db.subscriptiontiers.countDocuments();
```

### Step 4: Environment Configuration

Create or update `.env` file in backend directory:

```env
# Existing variables
NODE_ENV=production
DB_URI=mongodb://[user]:[password]@[host]:[port]/web3db
PORT=5000

# Multi-tier subscription configuration
MULTI_TIER_ENABLED=true
DEFAULT_TRIAL_DAYS=7
UPGRADE_DISCOUNT_PERCENTAGE=10

# Pricing and limits
MIN_TIER_PRICE=0.99
MAX_TIER_PRICE=99.99
DEFAULT_MAX_SUBSCRIBERS=1000
MAX_TIERS_PER_CREATOR=10

# Feature flags
ENABLE_TIER_VISIBILITY_CONTROL=true
ENABLE_TIER_WAITLIST=true
ENABLE_TIER_COMPARISON=true

# Logging
LOG_LEVEL=info
SENTRY_DSN=https://[key]@sentry.io/[project]

# Email notifications
SENDGRID_API_KEY=your_api_key
TIER_CHANGE_NOTIFICATION_EMAIL=creator-support@example.com
```

### Step 5: Update Application Entry Point

Verify `backend/index.js` includes multi-tier subscription routes:

```javascript
// Check imports
const subscriptionTierRoutes = require('./routes/subscriptionTierRoutes');

// Check routes mounting
app.use('/api/subscriptions', subscriptionTierRoutes);

// Check routes are before error handlers
```

### Step 6: Run Tests

#### Unit Tests
```bash
npm test backend/tests/subscriptionTier.test.js
```

Expected output:
- ✅ All service function tests pass
- ✅ Data validation tests pass
- ✅ Error handling tests pass

#### Integration Tests
```bash
npm test backend/tests/subscriptionTierIntegration.test.js
```

Expected output:
- ✅ All 14 endpoint tests pass
- ✅ CRUD operations work
- ✅ Error handling tests pass
- ✅ Validation tests pass

#### Full Test Suite
```bash
npm test
```

All tests must pass before deployment.

### Step 7: Staging Deployment

Deploy to staging environment first:

```bash
# If using deployment script
./deploy.sh staging

# Or manual deployment
npm run build
npm run start:staging
```

#### Staging Verification

```bash
# Health check
curl http://staging.example.com/api/status

# Check multi-tier endpoints
curl http://staging.example.com/api/subscriptions/tiers

# Run smoke tests
npm run test:smoke -- --env=staging
```

#### Load Testing (Optional)

```bash
# Test with load
npm run test:load -- --duration=10m --rate=100

# Expected: No degradation, consistent response times
```

### Step 8: Production Deployment

#### Pre-Production Checklist
- [ ] Staging deployment verified
- [ ] All tests passing in staging
- [ ] Database backup completed
- [ ] Monitoring agents deployed
- [ ] Rollback plan documented
- [ ] Communication sent to stakeholders

#### Deploy to Production

```bash
# Manual deployment
cd backend
npm install --production
npm start

# Or if using PM2
pm2 start index.js --name "web3-backend" --instances max --env production

# Or if using Docker
docker build -t web3-backend:latest .
docker run -d \
  --name web3-backend \
  -p 5000:5000 \
  -e NODE_ENV=production \
  -e DB_URI=$DB_URI \
  --restart unless-stopped \
  web3-backend:latest
```

#### Post-Deployment Verification

```bash
# Verify application is running
curl http://production.example.com/api/status

# Check multi-tier module status
curl http://production.example.com/api/status | jq '.multiTierSubscriptions'

# Verify endpoints are accessible
curl http://production.example.com/api/subscriptions/tiers

# Monitor logs
tail -f /var/log/web3/backend.log | grep -i "tier"
```

### Step 9: Production Monitoring

#### Application Monitoring

Set up monitoring for:
- ✅ API response times (target: <200ms)
- ✅ Error rate (target: <0.1%)
- ✅ Database query performance
- ✅ Tier creation/update success rate (target: >99%)
- ✅ Memory usage
- ✅ CPU usage

#### Prometheus Metrics (if applicable)

```bash
# View metrics
curl http://localhost:5000/metrics | grep multitier

# Expected metrics:
# - multitier_subscriptions_total
# - multitier_tiers_count
# - multitier_api_duration_seconds
# - multitier_tier_subscribers
```

#### Log Monitoring

Monitor logs for:
```bash
# Tier creation logs
tail -f /var/log/web3/backend.log | grep "Created tier"

# Error logs
tail -f /var/log/web3/backend.log | grep "ERROR"

# Database operation logs
tail -f /var/log/web3/backend.log | grep "MongoDB"
```

### Step 10: Documentation Updates

Update relevant documentation:

- [ ] Add multi-tier section to main README.md
- [ ] Update API documentation in frontend docs
- [ ] Create creator guide for tier management
- [ ] Update support/FAQ documentation
- [ ] Document tier management best practices
- [ ] Create admin documentation

---

## Configuration Reference

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MULTI_TIER_ENABLED` | `true` | Enable multi-tier feature |
| `DEFAULT_TRIAL_DAYS` | `7` | Default free trial period |
| `UPGRADE_DISCOUNT_PERCENTAGE` | `10` | Default upgrade discount |
| `MIN_TIER_PRICE` | `0.99` | Minimum tier price |
| `MAX_TIER_PRICE` | `99.99` | Maximum tier price |
| `DEFAULT_MAX_SUBSCRIBERS` | `1000` | Default subscriber limit |
| `MAX_TIERS_PER_CREATOR` | `10` | Maximum tiers per creator |

### Database Indexes

| Collection | Index | Purpose |
|-----------|-------|---------|
| subscriptiontiers | creatorId | Quick creator lookup |
| subscriptiontiers | creatorId, isActive | Active tiers for creator |
| subscriptiontiers | creatorId, position | Ordered tiers |
| subscriptiontiers | isPopular, isActive | Featured tiers |
| subscriptiontiers | createdAt | Chronological queries |

---

## Troubleshooting

### Tier Not Showing

**Symptoms:** Created tier not visible in API responses

**Solution:**
```bash
# Check tier visibility settings
curl http://localhost:5000/api/subscriptions/creators/:creatorId/tiers?includeInactive=true

# Verify isVisible flag
db.subscriptiontiers.findOne({ _id: ObjectId("...") })

# Update if needed
db.subscriptiontiers.updateOne(
  { _id: ObjectId("...") },
  { $set: { isVisible: true, isActive: true } }
)
```

### Slow Tier Queries

**Symptoms:** Tier API calls take >500ms

**Solution:**
```bash
# Check index usage
db.subscriptiontiers.find({ creatorId: "..." }).explain("executionStats")

# Recreate indexes if needed
db.subscriptiontiers.deleteIndexes();
# Then run index creation script from Step 3
```

### Database Connection Issues

**Symptoms:** Database errors in logs

**Solution:**
```bash
# Verify MongoDB is running
mongo --eval "db.adminCommand('ping')"

# Check connection string
echo $DB_URI

# Verify authentication
mongo -u $DB_USER -p $DB_PASS
```

### Memory Leak Issues

**Symptoms:** Memory usage increases over time

**Solution:**
```bash
# Check for large queries
db.subscriptiontiers.find().limit(100000) # May cause issues

# Implement pagination in code
# Use .limit() and .skip() for large result sets

# Monitor with
ps aux | grep node
```

---

## Rollback Procedure

If deployment fails or issues occur:

### Quick Rollback (< 10 minutes downtime)

```bash
# Stop current process
pm2 stop web3-backend
# or
docker stop web3-backend

# Checkout previous version
git checkout HEAD~1

# Reinstall dependencies
npm install --production

# Restart
pm2 start web3-backend
# or
docker start web3-backend

# Verify
curl http://localhost:5000/api/status
```

### Full Rollback (if database modified)

```bash
# Stop application
pm2 stop web3-backend

# Restore database from backup
mongorestore --archive=backup.archive --gzip --drop

# Checkout previous code
git checkout main

# Reinstall
npm install --production

# Restart
pm2 start web3-backend

# Verify
curl http://localhost:5000/api/status
```

---

## Post-Deployment Tasks

### Day 1
- [ ] Monitor application logs for errors
- [ ] Check tier creation/update success rate
- [ ] Verify database indexes are used efficiently
- [ ] Monitor CPU and memory usage

### Week 1
- [ ] Review tier statistics and metrics
- [ ] Confirm all tier workflows function correctly
- [ ] Get feedback from creators using multi-tier
- [ ] Document any issues encountered

### Month 1
- [ ] Analyze tier adoption metrics
- [ ] Review tier pricing strategies
- [ ] Optimize database indexes if needed
- [ ] Plan any required enhancements

---

## Performance Optimization

### Database Query Optimization

```javascript
// Use lean() for read-only queries
const tiers = await SubscriptionTier.find({ creatorId }).lean();

// Use select() to limit fields
const tiers = await SubscriptionTier.find({ creatorId }).select('name price position');

// Use indexed fields in queries
const tiers = await SubscriptionTier.find({ creatorId: 1, isActive: 1 });
```

### API Response Caching

Consider caching tier hierarchies:
```javascript
// Cache tier hierarchy for 5 minutes
const cacheKey = `tier-hierarchy:${creatorId}`;
const cached = await cache.get(cacheKey);
if (cached) return cached;

// Fetch and cache
const hierarchy = await getTierHierarchy(creatorId);
await cache.set(cacheKey, hierarchy, 300); // 5 minutes
return hierarchy;
```

### Pagination for Large Result Sets

```javascript
// Paginate tier listings
const tiers = await SubscriptionTier.find({ creatorId })
  .skip((page - 1) * limit)
  .limit(limit)
  .lean();
```

---

## Support & Documentation

- **Issue Tracker**: https://github.com/issue-tracker
- **Documentation**: See MULTI_TIER_SUBSCRIPTION_API_DOCUMENTATION.md
- **Implementation Details**: See ISSUE_54_IMPLEMENTATION_SUMMARY.md
- **Git Branch**: `issue-54-multi-tier-subscriptions`

---

## Deployment Checklist Summary

```
Pre-Deployment
✅ Code review complete
✅ Tests passing
✅ Database backup created
✅ Environment variables configured
✅ Monitoring ready

Deployment
✅ Code pulled
✅ Dependencies installed
✅ Database prepared
✅ Tests passed in production env
✅ Staging verified

Post-Deployment
✅ Health checks passing
✅ Multi-tier endpoints working
✅ Monitoring active
✅ Documentation updated
✅ Creator team trained
```

---

## Contact

For deployment support:
- **DevOps Team**: devops@example.com
- **Database Team**: dba@example.com
- **Engineering Lead**: engineering@example.com
