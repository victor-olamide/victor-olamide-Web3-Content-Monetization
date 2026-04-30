# Content-Gate Deployment & Testing Checklist

## Pre-Deployment Verification

### Environment Setup
- [ ] STACKS_NETWORK is set to 'testnet' or 'mainnet'
- [ ] STACKS_API_URL is correct for selected network
- [ ] STACKS_PRIVATE_KEY is set (never commit to repository)
- [ ] MONGODB_URI is configured and accessible
- [ ] .env.content-gate file created from .env.content-gate.example
- [ ] All required npm dependencies installed: `npm install`

### Contract Source Verification
- [ ] Contract file exists: `contracts/content-gate.clar`
- [ ] Contract is not empty (has content)
- [ ] Key functions present:
  - [ ] set-gating-rule
  - [ ] delete-gating-rule
  - [ ] verify-access
  - [ ] verify-nft-access
  - [ ] get-gating-rule
  - [ ] get-gating-type
  - [ ] get-required-token
- [ ] Contract traits are correctly defined:
  - [ ] SIP-010 trait for FT verification
  - [ ] SIP-009 trait for NFT verification

### Blockchain Connectivity
- [ ] Stacks API is reachable: `curl https://stacks-node-api.testnet.stacks.co/extended/v1/status`
- [ ] API returns valid JSON response
- [ ] Network is responding normally
- [ ] Account has STX balance for deployment fee (minimum 0.0001 STX)

### Database Connectivity
- [ ] MongoDB is running and accessible
- [ ] Database name is correct: `content-monetization`
- [ ] GatingRule collection can be accessed
- [ ] Database has no connectivity issues

### Service Files Verification
- [ ] `backend/services/contentGateService.js` exists and is readable
- [ ] `backend/services/contentGateTransactionIndexer.js` exists
- [ ] `backend/middleware/contentGateVerificationMiddleware.js` exists
- [ ] `backend/routes/gatingRoutes.js` is updated with new routes
- [ ] `backend/services/accessService.js` includes contentGateService import
- [ ] `backend/server.js` includes indexer startup and shutdown

### Verification Script Run
- [ ] Run: `node blockchain/scripts/verify-cg-deployment.js`
- [ ] All critical checks pass (no red X marks)
- [ ] No connection errors reported
- [ ] Script confirms ready for deployment

## Deployment Phase

### Contract Deployment
- [ ] Run: `node blockchain/scripts/deploy-cg-testnet.js`
- [ ] Transaction created successfully
- [ ] Transaction broadcasted to testnet
- [ ] Transaction ID is displayed
- [ ] Polling starts for confirmation
- [ ] Deployment completes within 30 minutes
- [ ] Deployment info saved to: `deployments/cg-testnet-deployment.json`
- [ ] File contains:
  - [ ] contractId
  - [ ] transactionId
  - [ ] blockHeight
  - [ ] timestamp

### Deployment Info Recording
- [ ] Contract ID from deployment output: `ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.content-gate`
- [ ] Transaction ID: `0x...`
- [ ] Block height confirmed
- [ ] Update .env with: `CONTENT_GATE_ADDRESS=<sender-address>`

### Backend Configuration Update
- [ ] Update CONTENT_GATE_ADDRESS in .env
- [ ] Verify STACKS_NETWORK in .env matches deployment
- [ ] Verify STACKS_API_URL in .env is correct
- [ ] CG_INDEXER_INTERVAL_MS set (default: 30000)
- [ ] All env variables are readable by backend

### Backend Service Start
- [ ] Start server: `node backend/server.js`
- [ ] Server binds to port 5000 (or configured PORT)
- [ ] Database connection successful
- [ ] Content-gate indexer starts without errors
- [ ] PPV indexer starts without errors
- [ ] All routes registered successfully
- [ ] No startup errors in console

## Functional Testing

### API Endpoint Tests

#### GET /api/gating/:contentId
- [ ] Test with valid contentId: `curl http://localhost:5000/api/gating/1`
- [ ] Response status is 200 or 404 (expected)
- [ ] Response contains contentId
- [ ] Response has success: true
- [ ] Test with invalid contentId (non-existent)
- [ ] Appropriate error response returned
- [ ] Response time < 1000ms

#### GET /api/gating/
- [ ] Test: `curl http://localhost:5000/api/gating/`
- [ ] Response status is 200
- [ ] Response contains array of rules
- [ ] Response has count field
- [ ] Response has success: true

#### POST /api/gating/verify
- [ ] Test with valid contentId and userAddress
- [ ] Response contains verified field (true/false)
- [ ] Response contains reason field
- [ ] Response has success: true
- [ ] Test with missing contentId (should error)
- [ ] Test with missing userAddress (should error)
- [ ] Response time < 2000ms

#### GET /api/gating/:contentId/status
- [ ] Test: `curl http://localhost:5000/api/gating/1/status`
- [ ] Response status is 200
- [ ] Response contains hasGating field
- [ ] Response contains gatingRule (or null)
- [ ] Response has success: true

#### GET /api/gating/metrics/all
- [ ] Test: `curl http://localhost:5000/api/gating/metrics/all`
- [ ] Response contains metrics object
- [ ] Metrics include cacheSize
- [ ] Metrics include cacheStats
- [ ] Metrics include serviceMetrics

### Caching Behavior Tests
- [ ] Call same endpoint twice (gating rule retrieval)
- [ ] Check metrics: cacheHits should increase on second call
- [ ] Call with different contentId
- [ ] cacheSize should increase
- [ ] Wait for cache TTL (10 minutes)
- [ ] Cache is cleared after TTL
- [ ] invalidateGatingRuleCache works correctly

### Transaction Indexer Tests
- [ ] Indexer starts without errors
- [ ] Indexer status shows isRunning: true
- [ ] Indexer blocks metrics increase over time
- [ ] Indexer transactions are tracked
- [ ] Error count remains 0 during test

### Access Control Tests

#### FT Gating Verification
- [ ] Set FT gating rule for test content
- [ ] User with sufficient token balance:
  - [ ] Should be able to access content
  - [ ] Response shows verified: true
  - [ ] Reason includes 'token_balance_verified'
- [ ] User without tokens:
  - [ ] Should be denied access
  - [ ] Response shows verified: false
  - [ ] Reason indicates insufficient balance

#### NFT Gating Verification
- [ ] Set NFT gating rule for test content
- [ ] User with NFT:
  - [ ] Should be able to access content
  - [ ] Response shows verified: true
  - [ ] Type indicates 'NFT'
- [ ] User without NFT:
  - [ ] Should be denied access
  - [ ] Response shows verified: false
  - [ ] Reason indicates no NFT ownership

### Database Sync Tests
- [ ] Create test gating rule in database
- [ ] Verify rule appears in API response
- [ ] Update rule threshold
- [ ] Changes reflect in API
- [ ] Mark rule as inactive
- [ ] Verify access is denied
- [ ] Delete rule
- [ ] Verify rule no longer appears

## Error Handling Tests

### Invalid Input Tests
- [ ] Send request with invalid contentId format
- [ ] Send request with invalid userAddress
- [ ] Send request with missing required fields
- [ ] Send request with empty strings
- [ ] Send request with null values
- [ ] All should return appropriate error responses

### Network Error Simulation
- [ ] Stop MongoDB temporarily
- [ ] Try API calls (should handle gracefully)
- [ ] Restart MongoDB
- [ ] Services recover automatically
- [ ] No data loss occurs

### Contract Call Failures
- [ ] If smart contract call fails
- [ ] Fallback to database rules works
- [ ] Error is logged appropriately
- [ ] Service continues operating

## Security Tests

### Access Control
- [ ] Only content creator can set gating rules (on-chain)
- [ ] Non-creators cannot modify rules
- [ ] Access verification is enforced consistently
- [ ] Cached results expire appropriately

### Data Validation
- [ ] Token contract addresses are validated
- [ ] Thresholds are positive integers
- [ ] User addresses are valid Stacks addresses
- [ ] Content IDs are valid

### Cache Security
- [ ] Cached results expire (TTL enforcement)
- [ ] Cache is cleared on rule changes
- [ ] No sensitive data in cache keys
- [ ] Cache size limits prevent memory issues

## Performance Tests

### Response Time Tests
- [ ] /api/gating/:contentId responds < 500ms (cached)
- [ ] /api/gating/verify responds < 2000ms (first call)
- [ ] /api/gating/verify responds < 500ms (cached)
- [ ] /api/gating/metrics/all responds < 1000ms
- [ ] Metrics increase as expected

### Load Tests
- [ ] Send 100 concurrent verification requests
- [ ] System handles without errors
- [ ] Response times remain under 5 seconds
- [ ] No memory leaks detected
- [ ] Database connections remain stable

### Cache Efficiency
- [ ] With caching enabled: 90%+ hit rate on repeated queries
- [ ] Without caching: Significantly slower response times
- [ ] Cache size stays within configured limits
- [ ] TTL prevents stale data

## Integration Tests

### Run Test Suite
- [ ] Execute: `npm run test -- integration-tests/e2e/content-gate.test.js`
- [ ] All tests pass (or mark expected failures)
- [ ] Test coverage > 80%
- [ ] No memory leaks in tests

### Test Scenarios Covered
- [ ] Service layer functionality
- [ ] Middleware verification logic
- [ ] API route handling
- [ ] Database CRUD operations
- [ ] Transaction indexer behavior
- [ ] Caching mechanism
- [ ] Error handling
- [ ] Access control logic

## Monitoring & Metrics

### Metrics Collection
- [ ] Metrics endpoint is accessible: `curl http://localhost:5000/metrics`
- [ ] Prometheus format is valid
- [ ] Metrics include HTTP request duration
- [ ] Metrics include custom gating metrics

### Health Checks
- [ ] Health endpoint: `curl http://localhost:5000/health`
- [ ] Database health: `curl http://localhost:5000/health/database`
- [ ] Database status: `curl http://localhost:5000/health/database/status`
- [ ] All return expected data

### Log Verification
- [ ] No ERROR level logs (except expected scenarios)
- [ ] INFO logs show service initialization
- [ ] WARN logs are minimal and documented
- [ ] DEBUG logs can be enabled for troubleshooting

## Documentation Review

### Deployment Documentation
- [ ] CONTENT_GATE_INTEGRATION.md is complete
- [ ] Instructions are clear and tested
- [ ] Examples are accurate
- [ ] Troubleshooting section covers common issues

### Configuration Documentation
- [ ] .env.content-gate.example has all variables
- [ ] Variables are documented
- [ ] Examples are provided
- [ ] Required vs optional is clear

### API Documentation
- [ ] All endpoints are documented
- [ ] Request/response examples are provided
- [ ] Error codes are explained
- [ ] Examples work when tested

## Rollback Readiness

### Backup Verification
- [ ] Database backup created before deployment
- [ ] Previous version of backend is available
- [ ] Rollback procedure is documented
- [ ] Team knows how to execute rollback

### Rollback Testing
- [ ] Tested database restoration from backup
- [ ] Tested reverting to previous code
- [ ] Tested disabling on-chain verification
- [ ] Verified services restart correctly

## Production Readiness (If Applicable)

### Pre-Mainnet Deployment
- [ ] All testnet tests pass
- [ ] Load testing completed (1000+ req/sec)
- [ ] Security audit completed
- [ ] Private keys properly managed
- [ ] Monitoring and alerts configured
- [ ] Incident response plan documented
- [ ] Team training completed

### Mainnet Deployment
- [ ] Deployment window scheduled
- [ ] Deployment steps documented and rehearsed
- [ ] Rollback plan is ready
- [ ] On-call support is arranged
- [ ] Communication plan to users is prepared

## Sign-Off

- [ ] Prepared by: _________________ Date: _______
- [ ] Reviewed by: _________________ Date: _______
- [ ] Approved by: _________________ Date: _______

## Notes

```
[Space for deployment notes, issues encountered, solutions applied]


```

## Post-Deployment Tasks

- [ ] Update documentation with actual deployment details
- [ ] Notify team of successful deployment
- [ ] Monitor metrics and logs for first 24 hours
- [ ] Create incident response runbook
- [ ] Schedule post-deployment review meeting
- [ ] Document lessons learned
- [ ] Update deployment timeline for future reference
