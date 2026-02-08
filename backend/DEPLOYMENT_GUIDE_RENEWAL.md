# Subscription Renewal Deployment Guide

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Configuration](#environment-configuration)
3. [Database Migration](#database-migration)
4. [Service Initialization](#service-initialization)
5. [Blockchain Integration](#blockchain-integration)
6. [Testing & Validation](#testing--validation)
7. [Monitoring & Troubleshooting](#monitoring--troubleshooting)
8. [Rollback Procedures](#rollback-procedures)

---

## Pre-Deployment Checklist

Before deploying the subscription renewal system, verify:

- [ ] All dependencies installed (`npm install`)
- [ ] Environment variables configured (see below)
- [ ] Database backups created
- [ ] Test suite passes (`npm test`)
- [ ] Code review completed
- [ ] Security audit passed
- [ ] Performance testing completed
- [ ] Staging environment tested
- [ ] Stakeholder approval obtained
- [ ] Rollback plan documented

---

## Environment Configuration

Add the following environment variables to `.env`:

```bash
# Renewal Scheduler Configuration
RENEWAL_SCHEDULE_INTERVAL=3600000              # Interval in ms (1 hour default)
RENEWAL_GRACE_PERIOD_DAYS=7                   # Default grace period in days
RENEWAL_MAX_RETRIES=3                         # Maximum retry attempts
RENEWAL_RETRY_INTERVAL=86400000               # Retry interval in ms (24 hours)
RENEWAL_WINDOW_DAYS=3                         # Days before expiry to initiate renewal

# Blockchain Configuration
CONTRACT_ADDRESS=SP2ZRX0K27ZD46DRFQR84GG8G8CCQXWXNSE4XL2V1M  # Subscription contract
CONTRACT_NAME=subscription                     # Contract name on blockchain
SIGNER_PRIVATE_KEY=<your-private-key>         # Signer for renewal transactions

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/stacks_monetization
MONGODB_RENEWAL_COLLECTION=subscription_renewals

# Email Notification (Optional)
RENEWAL_NOTIFICATION_EMAIL=true
EMAIL_SERVICE_PROVIDER=sendgrid
SENDGRID_API_KEY=<your-sendgrid-key>

# Monitoring & Logging
RENEWAL_LOG_LEVEL=info                        # debug, info, warn, error
RENEWAL_METRICS_ENABLED=true
RENEWAL_METRICS_INTERVAL=300000               # Metrics collection interval (5 min)

# Feature Flags
ENABLE_AUTOMATIC_RENEWAL=true
ENABLE_GRACE_PERIOD=true
ENABLE_RETRY_ON_FAILURE=true
ENABLE_RENEWAL_NOTIFICATIONS=true
```

### Configuration Priority

Environment variables are read in this order:
1. `.env` file
2. System environment variables
3. Default values (hardcoded)

---

## Database Migration

### Step 1: Backup Current Database

```bash
# Backup MongoDB
mongodump --uri "mongodb://localhost:27017/stacks_monetization" \
          --out ./backups/pre-renewal-migration-$(date +%Y%m%d-%H%M%S)

echo "Backup created successfully"
```

### Step 2: Schema Updates

The renewal system requires updates to the `subscriptions` collection:

```javascript
// Add new fields to existing subscriptions
db.subscriptions.updateMany(
  {},
  {
    $set: {
      renewalStatus: "active",
      autoRenewal: true,
      gracePeriodDays: 7,
      graceExpiresAt: null,
      renewalAttempts: 0,
      lastRenewalAttempt: null,
      nextRenewalDate: null,
      renewalTxId: null,
      cancelledAt: null,
      cancelReason: null
    }
  }
);

// Create indexes for better performance
db.subscriptions.createIndex({ renewalStatus: 1 });
db.subscriptions.createIndex({ expiryDate: 1, autoRenewal: 1 });
db.subscriptions.createIndex({ graceExpiresAt: 1 });
db.subscriptions.createIndex({ user: 1, renewalStatus: 1 });

// Create SubscriptionRenewal collection with indexes
db.createCollection("subscription_renewals");
db.subscription_renewals.createIndex({ subscriptionId: 1 });
db.subscription_renewals.createIndex({ status: 1 });
db.subscription_renewals.createIndex({ createdAt: -1 });
db.subscription_renewals.createIndex({ user: 1, status: 1 });
db.subscription_renewals.createIndex({ nextRetryDate: 1 });
db.subscription_renewals.createIndex({ transactionId: 1 });
```

### Step 3: Run Migration Script

```bash
# Navigate to backend directory
cd backend

# Run migration (if migration script exists)
node scripts/migrate-renewals.js

# Verify migration
npm run verify-migration

# Check collection counts
echo "Subscriptions: $(mongo stacks_monetization --eval 'db.subscriptions.count()')"
echo "Renewals: $(mongo stacks_monetization --eval 'db.subscription_renewals.count()')"
```

### Step 4: Data Validation

Verify migration completed successfully:

```javascript
// Check subscription schema
db.subscriptions.find().limit(1).pretty()

// Verify indexes
db.subscriptions.getIndexes()

// Check for any migration errors
db.migration_logs.find({ type: "renewal_migration" }).sort({ timestamp: -1 })
```

---

## Service Initialization

### Step 1: Update Application Entry Point

The `index.js` has been updated to initialize the renewal scheduler. Verify initialization:

```javascript
// In backend/index.js, confirm these lines exist:
const { initializeRenewalScheduler } = require('./services/renewalScheduler');

const renewalScheduleInterval = parseInt(process.env.RENEWAL_SCHEDULE_INTERVAL) || 3600000;
initializeRenewalScheduler(renewalScheduleInterval);
```

### Step 2: Start Application

```bash
# Install dependencies if needed
npm install

# Start in development mode
npm start

# Or start with PM2 for production
pm2 start index.js --name "stacks-monetization" --watch

# Verify scheduler initialized
npm run check-scheduler-status
```

### Step 3: Verify Initialization Logs

Check application logs for scheduler initialization:

```bash
# Look for these log messages
tail -f logs/application.log | grep -i renewal

# Expected output:
# [INFO] Renewal scheduler initialized with interval: 3600000ms
# [INFO] Processing subscriptions due for renewal
# [INFO] Renewal scheduler running
```

### Step 4: Health Check

```bash
# Query health endpoint
curl http://localhost:5000/api/status

# Expected response includes:
{
  "renewals": {
    "lastProcessed": "2024-10-20T14:30:00Z",
    "totalProcessed": 0,
    "pendingCount": 0,
    "status": "running"
  }
}
```

---

## Blockchain Integration

### Step 1: Deploy Renewal Contracts

Ensure subscription renewal smart contracts are deployed:

```bash
cd blockchain

# Deploy to testnet
npm run deploy:testnet -- --contract subscription

# Deploy to mainnet (production only)
npm run deploy:mainnet -- --contract subscription

# Verify deployment
npm run verify-deployment -- --contract subscription
```

### Step 2: Configure Contract Address

Update `.env` with deployed contract address:

```bash
# From deployment output, set:
CONTRACT_ADDRESS=SP<contract-address-from-deployment>
```

### Step 3: Test Blockchain Operations

```bash
# Test renewal transaction
npm run test:renewal-blockchain

# Test grace period transaction
npm run test:grace-period-blockchain

# Test cancellation transaction
npm run test:cancel-blockchain
```

### Step 4: Verify Contract Functions

```bash
# Query contract to verify functions exist
npm run verify-contract-functions -- --contract subscription

# Expected functions:
# - register-renewal
# - renew-subscription
# - apply-grace-period
# - cancel-subscription
# - get-subscription
# - is-in-grace-period
```

---

## Testing & Validation

### Step 1: Unit Tests

```bash
# Run unit tests
npm test -- backend/tests/subscriptionRenewal.test.js

# Expected output:
# ✓ validateRenewalEligibility
# ✓ isInGracePeriod
# ✓ calculateRenewalStatus
# ... (50+ tests)
# Tests: 50 passed, 0 failed
```

### Step 2: Integration Tests

```bash
# Run integration tests
npm test -- backend/tests/subscriptionRenewalIntegration.test.js

# Start test server first
npm run start:test &

# Expected output:
# ✓ GET /subscriptions/:user
# ✓ POST /subscriptions/:id/renew
# ✓ POST /renewal/:renewalId/complete
# ... (20+ integration tests)
# Tests: 20 passed, 0 failed
```

### Step 3: End-to-End Testing

```bash
# Run E2E test scenario
npm run test:e2e -- --scenario subscription-renewal

# Simulates complete renewal workflow:
# 1. Create subscription
# 2. Wait until renewal window
# 3. Verify auto-renewal initiated
# 4. Simulate payment
# 5. Verify renewal completed
# 6. Check subscription extended
```

### Step 4: Load Testing

```bash
# Simulate concurrent renewals
npm run test:load -- --subscriptions 100 --concurrent 10

# Expected metrics:
# - Throughput: >50 renewals/minute
# - P95 Latency: <500ms
# - Error Rate: <0.1%
```

### Step 5: Grace Period Testing

```bash
# Test grace period scenarios
npm run test:grace-period

# Scenarios:
# 1. Grace period application
# 2. Access during grace period
# 3. Renewal during grace period
# 4. Grace period expiration
# 5. Denied access after grace period
```

---

## Monitoring & Troubleshooting

### Step 1: Setup Monitoring

```bash
# Enable renewal metrics dashboard
npm run enable-monitoring

# Configure alerts
npm run setup-alerts -- \
  --high-failure-rate 10% \
  --payment-delay 5m \
  --renewal-lag 30m
```

### Step 2: Key Metrics to Monitor

```
Metric                    Target      Alarm
─────────────────────────────────────────────────
Renewal Success Rate      >95%        <90%
Processing Time           <5s         >10s
Pending Renewals          <100        >500
Grace Period Usage        <20%        >50%
Retry Failure Rate        <5%         >10%
Scheduler Lag             <1min       >5min
```

### Step 3: Check Scheduler Health

```bash
# View renewal scheduler status
curl http://localhost:5000/api/status | jq '.renewals'

# Expected response:
{
  "status": "running",
  "lastProcessed": "2024-10-20T15:30:00Z",
  "nextRun": "2024-10-20T16:30:00Z",
  "totalProcessed": 1245,
  "avgProcessingTime": "2.3s",
  "pendingCount": 5,
  "failedCount": 2
}
```

### Step 4: View Renewal Logs

```bash
# Tail renewal-specific logs
tail -f logs/renewals.log

# Filter by status
grep "COMPLETED" logs/renewals.log | wc -l
grep "FAILED" logs/renewals.log | wc -l

# Check specific renewal
grep "renewal-123" logs/renewals.log
```

### Step 5: Database Monitoring

```bash
# Check collection sizes
db.subscription_renewals.stats()

# Monitor slow queries
db.setProfilingLevel(1, { slowms: 100 })

# View top renewals
db.subscription_renewals.aggregate([
  { $group: { _id: "$status", count: { $sum: 1 } } },
  { $sort: { count: -1 } }
])
```

### Troubleshooting Guide

#### Issue: Scheduler Not Running

```bash
# Check if scheduler initialized
grep "Renewal scheduler initialized" logs/application.log

# Check for errors
grep -i "error\|exception" logs/renewals.log | head -20

# Restart scheduler
curl -X POST http://localhost:5000/api/renewals/restart
```

#### Issue: High Failure Rate

```bash
# Check blockchain connectivity
npm run test:blockchain-connection

# Check payment processing
curl http://localhost:5000/api/renewals/diagnostics | jq '.payment'

# Verify contract deployment
npm run verify-deployment -- --contract subscription
```

#### Issue: Slow Renewal Processing

```bash
# Check database performance
db.subscription_renewals.find().explain("executionStats")

# Check index usage
db.subscriptions.find({ expiryDate: { $lt: new Date() } }).explain("executionStats")

# Optimize slow queries
npm run optimize-renewal-queries
```

#### Issue: Grace Period Not Applied

```bash
# Check grace period logic
npm run test:grace-period --verbose

# Verify subscription status
db.subscriptions.find({ _id: ObjectId("sub-123") })

# Check renewal records
db.subscription_renewals.find({ subscriptionId: ObjectId("sub-123") }).sort({ createdAt: -1 })
```

---

## Rollback Procedures

### Step 1: Pre-Rollback Verification

If issues occur post-deployment:

```bash
# Check system status
npm run health-check

# Verify backup exists
ls -lh backups/ | grep renewal

# Note current state
npm run capture-state > backups/current-state-$(date +%Y%m%d-%H%M%S).json
```

### Step 2: Stop Services

```bash
# Stop the scheduler
npm run stop-scheduler

# Stop the application
pm2 stop stacks-monetization

# Verify stopped
pm2 status
```

### Step 3: Database Rollback

```bash
# List available backups
ls -la backups/ | grep pre-renewal

# Restore from backup
mongorestore --uri "mongodb://localhost:27017/stacks_monetization" \
             --drop \
             ./backups/pre-renewal-migration-<date>

# Verify restore
mongo stacks_monetization --eval 'db.subscriptions.count()'
```

### Step 4: Code Rollback

```bash
# Revert to previous version
git checkout HEAD~1

# Or use git log to find specific commit
git log --oneline | grep -i renewal
git checkout <commit-before-renewal>

# Reinstall dependencies
npm install

# Verify rollback
npm run verify-deployment
```

### Step 5: Restart Services

```bash
# Start with previous version
npm start

# Or with PM2
pm2 restart stacks-monetization

# Verify status
curl http://localhost:5000/api/status

# Check logs for any errors
tail -f logs/application.log | head -50
```

### Step 6: Post-Rollback Validation

```bash
# Run smoke tests
npm run test:smoke

# Check subscription functionality
npm run test:subscription-basic

# Verify data integrity
npm run verify-data-integrity

# Monitor for 30 minutes
npm run monitor --duration 1800
```

---

## Deployment Summary

### Deployment Phases

**Phase 1: Preparation (30 min)**
- Database backup
- Schema updates
- Service configuration

**Phase 2: Deployment (15 min)**
- Code deployment
- Scheduler initialization
- Health verification

**Phase 3: Validation (30 min)**
- Unit test execution
- Integration test execution
- Manual test cases

**Phase 4: Monitoring (Ongoing)**
- Real-time metrics
- Error tracking
- Performance monitoring

### Success Criteria

✅ All unit tests pass
✅ All integration tests pass
✅ Scheduler running and processing renewals
✅ No critical errors in logs
✅ API endpoints responding correctly
✅ Database operations normal
✅ Blockchain transactions successful

### Support Contacts

**Deployment Issues**: devops@example.com
**Database Issues**: dba@example.com
**Blockchain Issues**: blockchain-team@example.com
**Application Issues**: engineering@example.com

---

## Post-Deployment Tasks

1. **Monitor System**: Watch metrics for 24 hours
2. **Notify Users**: Send renewal communication to subscribers
3. **Update Documentation**: Document any configuration changes
4. **Schedule Audit**: Review renewal metrics weekly
5. **Plan Optimization**: Identify areas for performance improvement

---

## Appendix: Useful Commands

```bash
# View renewal scheduler status
curl http://localhost:5000/api/status | jq '.renewals'

# Manually trigger renewal processing
curl -X POST http://localhost:5000/api/renewals/process

# Get renewal statistics
curl http://localhost:5000/api/renewals/stats

# View pending renewals
curl http://localhost:5000/api/subscriptions/pending/all

# Restart scheduler
curl -X POST http://localhost:5000/api/renewals/restart

# View application logs
pm2 logs stacks-monetization

# Database shell
mongo stacks_monetization

# Run specific test file
npm test -- backend/tests/subscriptionRenewal.test.js

# Run tests with coverage
npm test -- --coverage backend/tests/subscriptionRenewal.test.js
```
