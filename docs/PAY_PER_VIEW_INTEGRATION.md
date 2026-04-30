# Pay-Per-View Contract Deployment & Integration Guide

## Overview

This guide covers the deployment and integration of the `pay-per-view.clar` smart contract to the Stacks testnet and its integration with the backend purchase verification system.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Deployment to Testnet](#deployment-to-testnet)
3. [Backend Integration](#backend-integration)
4. [API Endpoints](#api-endpoints)
5. [Testing](#testing)
6. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

- Node.js 16+ (for backend services)
- npm or yarn
- Git
- Stacks wallet with testnet STX (for deployment)

### Environment Setup

1. **Create/Update `.env` file in project root:**

```bash
# Stacks Configuration
STACKS_NETWORK=testnet
STACKS_API_URL=https://stacks-node-api.testnet.stacks.co
STACKS_PRIVATE_KEY=your_private_key_here

# Contract Configuration
PAY_PER_VIEW_ADDRESS=ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM
PLATFORM_FEE_BASIS_POINTS=250
PLATFORM_WALLET=ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM

# Database Configuration
DB_URI=mongodb://localhost:27017/stacks_monetization
MONGODB_URI=mongodb://localhost:27017/stacks_monetization

# Optional: Cache Configuration
CACHE_TTL=300000
```

2. **Install Dependencies:**

```bash
# Backend dependencies
cd backend
npm install

# Blockchain tools
cd ../blockchain
npm install
```

## Deployment to Testnet

### Step 1: Prepare Testnet Account

1. Get testnet STX from [Stacks Faucet](https://testnet.stacks.co/faucet)
2. Ensure your account has at least 0.2 STX (for deployment costs)
3. Export your private key securely

### Step 2: Deploy Contract

```bash
# From project root
node blockchain/scripts/deploy-ppv-testnet.js
```

**Expected Output:**

```
🚀 Deploying Pay-Per-View Contract to testnet
Network: testnet
API URL: https://stacks-node-api.testnet.stacks.co

✓ Contract source loaded
Creating contract deployment transaction...
✓ Transaction created
  TX ID: <transaction-id>

Broadcasting transaction to testnet...
✓ Transaction broadcasted
  TX ID: <transaction-id>

Polling for transaction confirmation (60 attempts)...
[1/60] Transaction status: pending
...
[5/60] Transaction status: success
✓ Transaction confirmed!

✓ Deployment info saved to: deployments/ppv-testnet-deployment.json

═══════════════════════════════════════════════════════════════════
✓ Contract deployed successfully!
═══════════════════════════════════════════════════════════════════
Contract ID: ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.pay-per-view
Transaction ID: <tx-id>
Block Height: 12345
```

### Step 3: Update Configuration

1. Update `.env` with the deployed contract address:

```bash
PAY_PER_VIEW_ADDRESS=ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM
```

2. Save deployment info:

```bash
cp deployments/ppv-testnet-deployment.json deployments/ppv-testnet-deployment.prod.json
```

## Backend Integration

### Service Layer

The backend integration consists of three main components:

#### 1. Pay-Per-View Service (`backend/services/payPerViewService.js`)

**Key Functions:**

- `checkContentAccess(contentId, userAddress)` - Verify user has access
- `verifyPurchase(contentId, userAddress, txId)` - Verify purchase transaction
- `getContentPricing(contentId)` - Get content price from contract
- `invalidateContentCache(contentId)` - Clear cache for updates

**Example Usage:**

```javascript
const {
  checkContentAccess,
  verifyPurchase,
} = require('./services/payPerViewService');

// Check if user has access
const hasAccess = await checkContentAccess('123', 'ST2F4BK4GZH6SSPFTX33ES2G2CCJJIFDN2RYPPYY1');

// Verify a purchase
const verification = await verifyPurchase(
  '123',
  'ST2F4BK4GZH6SSPFTX33ES2G2CCJJIFDN2RYPPYY1',
  'transaction-id'
);
```

#### 2. Verification Middleware (`backend/middleware/ppvVerificationMiddleware.js`)

**Key Middleware:**

- `verifyOnChainPurchase` - Verify transaction and on-chain access
- `verifyAccessBeforeDelivery` - Dual-check (local + on-chain)
- `checkPurchaseStatus` - GET endpoint for status

**Example Usage:**

```javascript
router.post(
  '/purchases/verify-ppv',
  verifyOnChainPurchase,
  async (req, res) => {
    // Access verification results via req.ppvVerification
    const { verified, txId, confirmations } = req.ppvVerification;
  }
);
```

#### 3. Purchase Routes (`backend/routes/purchaseRoutes.js`)

Updated with PPV endpoints for verification and access control.

### Middleware Stack

```
Request
  ↓
[Input Validation]
  ↓
[Transaction Verification]
  ↓
[On-Chain Access Check]
  ↓
[Business Logic]
  ↓
Response
```

## API Endpoints

### Verify On-Chain Purchase

**POST** `/purchases/verify-ppv`

Verify a purchase transaction on-chain and grant access.

**Request Body:**
```json
{
  "contentId": 1,
  "userAddress": "ST2F4BK4GZH6SSPFTX33ES2G2CCJJIFDN2RYPPYY1",
  "txId": "0xabc123def456..."
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Purchase verified on-chain",
  "verification": {
    "verified": true,
    "txId": "0xabc123def456...",
    "txStatus": "success",
    "confirmations": 10,
    "blockHeight": 12345,
    "hasAccess": true
  }
}
```

**Error Responses:**
- `400` - Missing required fields
- `402` - Payment not confirmed
- `403` - Access not verified on-chain
- `500` - Server error

### Grant Access

**POST** `/purchases/grant-access`

Grant content access after verification.

**Request Body:**
```json
{
  "contentId": 1,
  "userAddress": "ST2F4BK4GZH6SSPFTX33ES2G2CCJJIFDN2RYPPYY1"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Access granted",
  "contentId": 1,
  "userAddress": "ST2F4BK4GZH6SSPFTX33ES2G2CCJJIFDN2RYPPYY1",
  "grantedAt": "2026-04-30T10:30:00.000Z"
}
```

### Check Purchase Status

**GET** `/purchases/status?contentId=1&userAddress=ST2F4BK4GZH6SSPFTX33ES2G2CCJJIFDN2RYPPYY1`

Check if a user has purchased content.

**Response (200):**
```json
{
  "contentId": "1",
  "userAddress": "ST2F4BK4GZH6SSPFTX33ES2G2CCJJIFDN2RYPPYY1",
  "hasPurchase": true,
  "hasOnChainAccess": true,
  "status": "verified",
  "purchaseDate": "2026-04-30T09:00:00.000Z",
  "transactionId": "0xabc123def456...",
  "amount": 5000000
}
```

### Get Service Metrics

**GET** `/purchases/ppv-metrics`

Get PPV service metrics and cache statistics.

**Response (200):**
```json
{
  "metrics": {
    "contentAddedSuccess": 42,
    "contentAddedFailed": 2,
    "purchaseVerifications": 156,
    "accessChecks": 312,
    "cacheHits": 289,
    "cacheMisses": 65,
    "cacheSize": 45
  },
  "timestamp": "2026-04-30T10:45:00.000Z"
}
```

## Testing

### Unit Tests

```bash
# Run unit tests
npm test

# Run with coverage
npm run test:coverage
```

### Integration Tests

```bash
# Run integration tests
npm run test:integration

# Run E2E tests for pay-per-view
npm run test:e2e -- integration-tests/e2e/pay-per-view.test.js
```

### Manual Testing

1. **Deploy contract:**
```bash
node blockchain/scripts/deploy-ppv-testnet.js
```

2. **Test verification endpoint:**
```bash
curl -X POST http://localhost:3000/purchases/verify-ppv \
  -H "Content-Type: application/json" \
  -d '{
    "contentId": 1,
    "userAddress": "ST2F4BK4GZH6SSPFTX33ES2G2CCJJIFDN2RYPPYY1",
    "txId": "<testnet-tx-id>"
  }'
```

3. **Check purchase status:**
```bash
curl "http://localhost:3000/purchases/status?contentId=1&userAddress=ST2F4BK4GZH6SSPFTX33ES2G2CCJJIFDN2RYPPYY1"
```

## Architecture

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend/Client                       │
└─────────────────────────────────────────────────────────────┘
                              ↓
                     (submits purchase tx)
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Stacks Blockchain                         │
│        (pay-per-view smart contract on testnet)             │
└─────────────────────────────────────────────────────────────┘
                              ↓
                     (tx confirmed)
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      Backend Server                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  POST /purchases/verify-ppv                            │ │
│  ├────────────────────────────────────────────────────────┤ │
│  │  1. Verify transaction on Stacks API                   │ │
│  │  2. Check on-chain access via smart contract           │ │
│  │  3. Create/update purchase record in MongoDB           │ │
│  │  4. Return verification result                         │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              ↓
                     (verification complete)
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Content Delivery                          │
│  - User granted access to content
│  - Content streamed to client
│  - Access logged for analytics
└─────────────────────────────────────────────────────────────┘
```

## Security Considerations

1. **Transaction Verification:**
   - All purchases verified on-chain before access granted
   - Transaction confirmation checked
   - Tx status validated (must be "success")

2. **Access Control:**
   - Dual verification: local DB + on-chain
   - Cache invalidation on content updates
   - Audit logging for all access attempts

3. **Error Handling:**
   - Graceful degradation on network errors
   - Retry logic with exponential backoff
   - Comprehensive error messages

4. **Rate Limiting:**
   - API endpoints rate-limited per user
   - Cache TTL prevents excessive on-chain calls
   - Batch verification supported

## Monitoring & Debugging

### Logs

Check application logs for verification events:

```bash
# View recent logs
tail -f /var/log/stacks-monetization.log | grep ppv

# Filter by verification
grep "verifying.*purchase" /var/log/stacks-monetization.log
```

### Metrics

Monitor service metrics:

```bash
curl http://localhost:3000/purchases/ppv-metrics | jq
```

### Troubleshooting

#### Transaction not confirmed

**Symptom:** `Payment not confirmed on-chain`

**Solutions:**
1. Wait for additional confirmations (usually ~10 minutes)
2. Check transaction on [Stacks Explorer](https://explorer.stacks.co/?chain=testnet)
3. Verify transaction ID is correct

#### Access not verified on-chain

**Symptom:** `Access not verified on-chain`

**Solutions:**
1. Ensure smart contract is deployed
2. Verify contract address in `.env`
3. Check contract state on Stacks Explorer
4. Verify on-chain purchase was successful

#### Cache issues

**Symptom:** Stale access status

**Solutions:**
1. Invalidate cache: `curl POST /purchases/ppv-metrics`
2. Check cache TTL in `.env`
3. Restart backend service

## Migration from Old System

To migrate existing purchases to use on-chain verification:

1. Export existing purchase records
2. Create smart contract transactions for each
3. Update records with verification status
4. Run validation checks

See `migration/ppv-migration.js` for automated migration script.

## Support & Resources

- **Documentation:** See `docs/DEPLOYMENT.md`
- **Contract Source:** `contracts/pay-per-view.clar`
- **API Tests:** `integration-tests/e2e/pay-per-view.test.js`
- **Stacks Docs:** https://docs.stacks.co
- **Support:** Email support or open GitHub issue

## Next Steps

1. ✅ Deploy contract to testnet
2. ✅ Configure backend integration
3. ✅ Run integration tests
4. 🔄 Deploy to production (requires mainnet setup)
5. 🔄 Monitor and optimize

---

**Last Updated:** April 30, 2026
**Issue:** #176
**Version:** 1.0.0
