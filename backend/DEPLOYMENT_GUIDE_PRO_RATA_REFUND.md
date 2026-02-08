# Pro-Rata Refund Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the pro-rata refund system to production environments.

## Pre-Deployment Checklist

### System Requirements
- [ ] Node.js 14+ installed
- [ ] MongoDB 4.4+ running
- [ ] 2GB+ available disk space
- [ ] Network connectivity to blockchain nodes
- [ ] Backup of current database created

### Code Review
- [ ] All pro-rata refund code reviewed
- [ ] Tests passing (unit and integration)
- [ ] No merge conflicts
- [ ] Branch: `issue-53-pro-rata-refunds` ready

### Database
- [ ] Backup current database
- [ ] Migration scripts tested on staging
- [ ] Database user has required permissions
- [ ] Indexes created and optimized

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
git checkout issue-53-pro-rata-refunds
git pull origin issue-53-pro-rata-refunds
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

#### Create ProRataRefund Collection

MongoDB will auto-create the collection when first document is inserted, but explicitly create it with indexes:

```javascript
// Run in MongoDB shell or tool
db.createCollection("proratarefunds");

// Create indexes
db.proratarefunds.createIndex({ "subscriptionId": 1 });
db.proratarefunds.createIndex({ "userId": 1 });
db.proratarefunds.createIndex({ "creatorId": 1 });
db.proratarefunds.createIndex({ "refundStatus": 1 });
db.proratarefunds.createIndex({ "createdAt": 1 });
db.proratarefunds.createIndex({ "subscriptionId": 1, "refundStatus": 1 });
db.proratarefunds.createIndex({ "creatorId": 1, "refundStatus": 1 });
db.proratarefunds.createIndex({ "userId": 1, "createdAt": -1 });
db.proratarefunds.createIndex({ "transactionId": 1 }, { sparse: true });
```

#### Update Subscription Collection

Add missing fields to existing subscriptions:

```javascript
// Run in MongoDB shell
db.subscriptions.updateMany(
  { refundEligible: { $exists: false } },
  {
    $set: {
      refundEligible: true,
      refundWindowDays: 30,
      isRefundApplied: false
    }
  }
);

// Create index on refundEligible field
db.subscriptions.createIndex({ "refundEligible": 1 });
```

#### Verify Database State

```javascript
// Check collection exists
db.getCollectionNames(); // Should include "proratarefunds"

// Check indexes
db.proratarefunds.getIndexes();

// Sample document count
db.proratarefunds.countDocuments();
```

### Step 4: Environment Configuration

Create or update `.env` file in backend directory:

```env
# Existing variables
NODE_ENV=production
DB_URI=mongodb://[user]:[password]@[host]:[port]/web3db
PORT=5000

# Pro-Rata Refund Scheduler Configuration
PRO_RATA_REFUND_SCHEDULE_INTERVAL=3600000
# Interval in milliseconds between scheduler runs (default: 3600000 = 1 hour)

# Refund Processing
PRO_RATA_REFUND_AUTO_APPROVE_DAYS=14
# Days before auto-approving stale pending refunds (default: 14)

# Blockchain Configuration
BLOCKCHAIN_PROVIDER_URL=https://mainnet.infura.io/v3/YOUR_KEY
BLOCKCHAIN_NETWORK=mainnet

# Logging
LOG_LEVEL=info
SENTRY_DSN=https://[key]@sentry.io/[project]

# Email Notifications
SENDGRID_API_KEY=your_api_key
REFUND_NOTIFICATION_EMAIL=finance@example.com

# Admin Settings
ADMIN_WEBHOOK_URL=https://admin.example.com/webhooks/refunds
```

### Step 5: Update Application Entry Point

Verify `backend/index.js` includes pro-rata refund scheduler:

```javascript
// Check imports
const { initializeRefundScheduler, stopRefundScheduler } = require('./services/proRataRefundScheduler');
const proRataRefundRoutes = require('./routes/proRataRefundRoutes');

// Check scheduler initialization
initializeRefundScheduler();

// Check routes mounting
app.use('/api/refunds', proRataRefundRoutes);

// Check /api/status endpoint includes proRataRefunds
```

### Step 6: Run Tests

#### Unit Tests
```bash
npm test backend/tests/proRataRefund.test.js
```

Expected output:
- ✅ All calculateProRataRefund tests pass
- ✅ All checkRefundEligibility tests pass
- ✅ All approval workflow tests pass
- ✅ All query function tests pass

#### Integration Tests
```bash
npm test backend/tests/proRataRefundIntegration.test.js
```

Expected output:
- ✅ All 13 endpoint tests pass
- ✅ All workflow tests pass
- ✅ All error handling tests pass

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

# Check pro-rata refund scheduler is running
curl http://staging.example.com/api/refunds/pro-rata/statistics

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

# Check pro-rata refund module status
curl http://production.example.com/api/status | jq '.proRataRefunds'

# Verify scheduler is initialized
curl http://production.example.com/api/refunds/pro-rata/statistics

# Monitor logs
tail -f /var/log/web3/backend.log | grep "proRataRefund"
```

### Step 9: Production Monitoring

#### Application Monitoring

Set up monitoring for:
- ✅ API response times (target: <500ms)
- ✅ Error rate (target: <0.1%)
- ✅ Scheduler execution time (monitor in logs)
- ✅ Refund processing success rate (target: >99%)
- ✅ Database query performance
- ✅ Memory usage
- ✅ CPU usage

#### Prometheus Metrics (if applicable)

```bash
# View metrics
curl http://localhost:5000/metrics | grep proratarefund

# Expected metrics:
# - proratarefund_refunds_total
# - proratarefund_refunds_status
# - proratarefund_scheduler_runs_total
# - proratarefund_scheduler_duration_seconds
```

#### Log Monitoring

Monitor logs for:
```bash
# Scheduler execution
tail -f /var/log/web3/backend.log | grep "Scheduler"

# Refund processing errors
tail -f /var/log/web3/backend.log | grep "ERROR"

# Database operations
tail -f /var/log/web3/backend.log | grep "MongoDB"
```

### Step 10: Documentation Updates

Update relevant documentation:

- [ ] Add pro-rata refund section to README.md
- [ ] Update API documentation in frontend docs
- [ ] Create user-facing refund policy documentation
- [ ] Update support/FAQ documentation
- [ ] Document refund approval workflow for admins

---

## Configuration Reference

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PRO_RATA_REFUND_SCHEDULE_INTERVAL` | `3600000` | Scheduler interval (milliseconds) |
| `PRO_RATA_REFUND_AUTO_APPROVE_DAYS` | `14` | Days before auto-approval |
| `REFUND_NOTIFICATION_EMAIL` | `finance@example.com` | Email for notifications |
| `LOG_LEVEL` | `info` | Logging level |

### Database Indexes

| Collection | Index | Purpose |
|-----------|-------|---------|
| proratarefunds | subscriptionId | Quick lookup by subscription |
| proratarefunds | userId | User refund history |
| proratarefunds | creatorId | Creator pending refunds |
| proratarefunds | refundStatus | Status-based queries |
| proratarefunds | transactionId | Transaction lookup |
| subscriptions | refundEligible | Filter refundable subscriptions |

---

## Troubleshooting

### Scheduler Not Running

**Symptoms:** No refund processing happening

**Solution:**
```bash
# Check logs
tail -f /var/log/web3/backend.log | grep "Scheduler"

# Check scheduler status
curl http://localhost:5000/api/status | jq '.proRataRefunds'

# Manually trigger processing
curl -X POST http://localhost:5000/api/refunds/pro-rata/trigger
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

### Missing Indexes

**Symptoms:** Slow queries, high database load

**Solution:**
```javascript
// Re-create all indexes
db.proratarefunds.deleteIndexes();

db.proratarefunds.createIndex({ "subscriptionId": 1 });
db.proratarefunds.createIndex({ "userId": 1 });
db.proratarefunds.createIndex({ "creatorId": 1 });
db.proratarefunds.createIndex({ "refundStatus": 1 });
db.proratarefunds.createIndex({ "createdAt": 1 });
db.proratarefunds.createIndex({ "subscriptionId": 1, "refundStatus": 1 });
db.proratarefunds.createIndex({ "creatorId": 1, "refundStatus": 1 });
db.proratarefunds.createIndex({ "userId": 1, "createdAt": -1 });
db.proratarefunds.createIndex({ "transactionId": 1 }, { sparse: true });
```

### High Refund Processing Latency

**Symptoms:** Refunds taking too long to process

**Solution:**
```bash
# Reduce scheduler interval
export PRO_RATA_REFUND_SCHEDULE_INTERVAL=1800000  # 30 minutes instead of 1 hour

# Monitor processing time
curl http://localhost:5000/api/refunds/pro-rata/statistics | jq '.avgProcessingTime'

# Check pending refunds
curl http://localhost:5000/api/refunds/pro-rata/pending/all
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
git checkout previous-commit-hash

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
- [ ] Check refund scheduler is running correctly
- [ ] Verify database indexes are used efficiently
- [ ] Monitor CPU and memory usage

### Week 1
- [ ] Review refund statistics and metrics
- [ ] Confirm all refund workflows are functioning
- [ ] Get feedback from support team
- [ ] Document any issues encountered

### Month 1
- [ ] Analyze refund data for trends
- [ ] Optimize scheduler interval if needed
- [ ] Review and tune database indexes
- [ ] Plan any required enhancements

---

## Support & Documentation

- **Issue Tracker**: https://github.com/issue-tracker
- **Documentation**: See PRO_RATA_REFUND_API_DOCUMENTATION.md
- **Implementation Details**: See ISSUE_53_IMPLEMENTATION_SUMMARY.md
- **Git Commits**: See branch `issue-53-pro-rata-refunds`

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
✅ Scheduler running
✅ Monitoring active
✅ Documentation updated
✅ Support team trained
```

---

## Contact

For deployment support:
- **DevOps Team**: devops@example.com
- **Database Team**: dba@example.com
- **Engineering Lead**: engineering@example.com
