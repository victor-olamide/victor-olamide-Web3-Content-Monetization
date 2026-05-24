# Pay-Per-View Integration Testing & Deployment Checklist

## Pre-Deployment Checklist

### ✅ Environment Setup
- [ ] Node.js 16+ installed (`node --version`)
- [ ] npm/yarn installed (`npm --version`)
- [ ] Git configured (`git config --global user.name`)
- [ ] MongoDB running locally or connection string available
- [ ] Stacks testnet wallet created with test STX
- [ ] `.env` file created with required variables
- [ ] All dependencies installed (`npm install` in backend/)

### ✅ Contract Validation
- [ ] `contracts/pay-per-view.clar` syntax validated
- [ ] Contract deployment script reviewed (`blockchain/scripts/deploy-ppv-testnet.js`)
- [ ] Deployment configuration validated (`deployments/ppv-testnet.config.yaml`)
- [ ] Network configuration verified (testnet/mainnet)

### ✅ Code Review
- [ ] `backend/services/payPerViewService.js` reviewed
- [ ] `backend/middleware/ppvVerificationMiddleware.js` reviewed
- [ ] `backend/controllers/ppvContentController.js` reviewed
- [ ] `backend/routes/purchaseRoutes.js` integration verified
- [ ] `backend/routes/ppvContentRoutes.js` reviewed
- [ ] Database models support PPV fields

### ✅ Documentation
- [ ] `docs/PAY_PER_VIEW_INTEGRATION.md` read
- [ ] `.env.ppv.example` reviewed
- [ ] Deployment guide understood
- [ ] API endpoints documented

## Deployment Checklist

### ✅ Pre-Deployment Tests
```bash
# Verify environment
node blockchain/scripts/verify-ppv-deployment.js

# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Run E2E tests for PPV
npm run test:e2e -- integration-tests/e2e/pay-per-view.test.js
```

All tests should pass with status code 0.

### ✅ Contract Deployment

```bash
# 1. Verify sufficient testnet STX (minimum 0.2 STX)
# 2. Set STACKS_PRIVATE_KEY in .env
# 3. Run deployment script
node blockchain/scripts/deploy-ppv-testnet.js

# Expected output:
# ✓ Contract deployed successfully!
# ✓ Deployment info saved to deployments/ppv-testnet-deployment.json
```

### ✅ Post-Deployment Configuration

- [ ] Contract ID saved from deployment output
- [ ] Update `.env` with deployed contract address
- [ ] Verify `deployments/ppv-testnet-deployment.json` created
- [ ] Review deployment info for accuracy
- [ ] Test Stacks API connectivity

### ✅ Backend Service Verification

```bash
# Start backend (separate terminal)
npm start

# Verify services are loaded
# Check logs for: "Pay-per-view service initialized"
```

### ✅ API Endpoint Testing

#### 1. Check Purchase Status
```bash
curl "http://localhost:3000/purchases/status?contentId=1&userAddress=ST2F4BK4GZH6SSPFTX33ES2G2CCJJIFDN2RYPPYY1"

# Expected: 200 OK with purchase status
```

#### 2. Get Metrics
```bash
curl "http://localhost:3000/purchases/ppv-metrics"

# Expected: 200 OK with metrics object
```

#### 3. Register Content
```bash
curl -X POST "http://localhost:3000/ppv/content" \
  -H "Content-Type: application/json" \
  -d '{
    "contentId": "1",
    "title": "Test Content",
    "description": "Test PPV content",
    "price": 5000000,
    "creator": "ST2F4BK4GZH6SSPFTX33ES2G2CCJJIFDN2RYPPYY1"
  }'

# Expected: 201 Created with content object
```

#### 4. Get Content Details
```bash
curl "http://localhost:3000/ppv/content/1"

# Expected: 200 OK with content and pricing details
```

#### 5. List PPV Content
```bash
curl "http://localhost:3000/ppv/content"

# Expected: 200 OK with content list
```

#### 6. Get Content Analytics
```bash
curl "http://localhost:3000/ppv/content/1/analytics"

# Expected: 200 OK with sales analytics
```

## Functional Testing

### ✅ Purchase Verification Flow

1. **Create a purchase on testnet:**
   - Use Stacks wallet to send transaction to contract
   - Wait for confirmation
   - Note transaction ID

2. **Verify on backend:**
   ```bash
   curl -X POST "http://localhost:3000/purchases/verify-ppv" \
     -H "Content-Type: application/json" \
     -d '{
       "contentId": 1,
       "userAddress": "ST2F4BK4GZH6SSPFTX33ES2G2CCJJIFDN2RYPPYY1",
       "txId": "<transaction-id>"
     }'
   ```

3. **Expected result:**
   - Status 200 OK
   - Verification successful
   - Purchase record created in database

### ✅ Access Control Testing

1. **Test access with verified purchase:**
   ```bash
   curl -X POST "http://localhost:3000/purchases/grant-access" \
     -H "Content-Type: application/json" \
     -d '{
       "contentId": 1,
       "userAddress": "ST2F4BK4GZH6SSPFTX33ES2G2CCJJIFDN2RYPPYY1"
     }'
   ```

2. **Test access without purchase:**
   - Use different user address
   - Should return 403 Forbidden

### ✅ Cache Behavior Testing

1. Check initial cache state:
   ```bash
   curl "http://localhost:3000/purchases/ppv-metrics"
   # Note cache hits and misses
   ```

2. Repeat same query multiple times
3. Verify cache hits increase
4. Wait 5+ minutes
5. Cache should reset

## Integration Testing

### ✅ Database Integrity

```bash
# Connect to MongoDB
mongo

# Use stacks_monetization database
use stacks_monetization

# Check purchase documents
db.purchases.find({ verified: true }).limit(5)

# Check content documents
db.contents.find({ ppvEnabled: true }).limit(5)
```

### ✅ Service Indexer Testing

```bash
# Start indexer in background
# Check logs for: "Indexer sync completed"

# Verify indexed purchases
curl "http://localhost:3000/purchases/status?contentId=1&userAddress=ST2F4..."
```

## Load Testing

### ✅ Performance Testing

```bash
# Test cache performance under load
# Run verification endpoint 100 times rapidly
# Monitor: Response times, cache hits, CPU usage

for i in {1..100}; do
  curl "http://localhost:3000/purchases/status?contentId=1&userAddress=ST2F4BK4GZH6SSPFTX33ES2G2CCJJIFDN2RYPPYY1"
done
```

### ✅ Expected Performance

- API response: < 200ms (cached) / < 500ms (first-time)
- Cache hit rate: > 80% for repeated queries
- CPU usage: < 10% during normal operation
- Memory: < 500MB for service

## Security Testing

### ✅ Transaction Verification

- [ ] Unconfirmed transactions rejected
- [ ] Invalid transaction IDs handled
- [ ] Transaction status always verified
- [ ] Signature validation passes

### ✅ Access Control

- [ ] Only verified users can access content
- [ ] On-chain verification required
- [ ] Dual verification (DB + blockchain) works
- [ ] Unauthorized access blocked

### ✅ Input Validation

- [ ] Invalid content IDs rejected
- [ ] Invalid addresses rejected
- [ ] Malformed JSON handled
- [ ] SQL injection prevention verified

## Production Readiness

### ✅ Monitoring Setup

- [ ] Logging configured and verified
- [ ] Error tracking enabled
- [ ] Performance metrics collected
- [ ] Alerts configured

### ✅ Documentation

- [ ] API documentation complete
- [ ] Deployment guide reviewed
- [ ] Troubleshooting guide available
- [ ] Support contacts listed

### ✅ Maintenance

- [ ] Backup strategy defined
- [ ] Database migration plan
- [ ] Rollback procedure documented
- [ ] Update process defined

### ✅ Scaling Considerations

- [ ] Database indexes verified
- [ ] Query performance optimized
- [ ] Cache strategy effective
- [ ] Load balancing ready

## Post-Deployment Verification

### ✅ Day 1

- [ ] Monitor all endpoints for errors
- [ ] Check log files for warnings
- [ ] Verify database growth normal
- [ ] Test cache invalidation

### ✅ Day 7

- [ ] Review performance metrics
- [ ] Check for memory leaks
- [ ] Validate data consistency
- [ ] Test backup/restore procedure

### ✅ Day 30

- [ ] Analyze usage patterns
- [ ] Review and optimize queries
- [ ] Update documentation if needed
- [ ] Plan scaling if required

## Rollback Procedure

If issues occur:

1. **Stop the indexer:**
   ```javascript
   const indexer = require('./backend/services/ppvTransactionIndexer');
   indexer.stopIndexer();
   ```

2. **Disable PPV routes:**
   - Remove PPV routes from server config
   - Restart backend

3. **Revert contract (if needed):**
   - Deploy older contract version
   - Update contract address in env

4. **Restore database:**
   ```bash
   mongorestore --archive=backup.archive --gzip
   ```

## Troubleshooting Guide

### Issue: Contract deployment fails

**Solution:**
1. Check Stacks API is accessible
2. Verify sufficient testnet STX
3. Review contract syntax
4. Check gas limits

### Issue: Verification times out

**Solution:**
1. Check transaction ID is correct
2. Wait for confirmation (10+ blocks)
3. Check Stacks API status
4. Review rate limiting

### Issue: Access verification fails

**Solution:**
1. Verify purchase was made
2. Check on-chain status
3. Clear cache: Update .env CACHE_TTL
4. Review contract state

### Issue: High memory usage

**Solution:**
1. Check cache size growth
2. Implement cache eviction
3. Monitor open connections
4. Review transaction indexer

## Sign-Off

- [ ] All tests passing
- [ ] Documentation complete
- [ ] Monitoring configured
- [ ] Team trained
- [ ] Ready for production

**Deployment Date:** _______________
**Deployed By:** _______________
**Verified By:** _______________

---

**Reference:** Issue #176
**Last Updated:** April 30, 2026
