# Content-Gate Integration & Deployment Guide

## Overview

Content-Gate is a Stacks smart contract that enforces NFT and token-based access control for gated content. Users must hold specific tokens (SIP-010) or NFTs (SIP-009) to access content. This guide covers deployment, integration, and testing.

## Architecture

### Smart Contract (Clarity)

**File:** `contracts/content-gate.clar`

**Key Functions:**
- `set-gating-rule`: Creator sets gating requirement (token/NFT address and threshold)
- `delete-gating-rule`: Creator removes gating requirement
- `verify-access`: Verify user has required tokens (FT)
- `verify-nft-access`: Verify user owns required NFT
- `get-gating-rule`: Read gating rule for content

**Gating Types:**
- Type 0: Fungible Token (SIP-010) - Users must hold minimum balance
- Type 1: Non-Fungible Token (SIP-009) - Users must own at least one NFT

### Backend Services

#### contentGateService.js
- Reads gating rules from smart contract
- Verifies user access (FT balance or NFT ownership)
- Implements caching (10-minute TTL by default)
- Metrics tracking

#### contentGateVerificationMiddleware.js
- Express middleware for access verification
- Integrates with contentGateService
- Provides status checking endpoints
- 5-minute verification cache

#### contentGateTransactionIndexer.js
- Monitors blockchain for gating rule changes
- Syncs on-chain events to database
- Maintains block height tracking
- Configurable polling interval (30 seconds default)

#### accessService.js (Enhanced)
- Integrated with contentGateService
- Checks on-chain rules before database rules
- Access hierarchy: Creator > Purchase > Subscription > On-chain Gate > DB Gate

### API Routes

#### GET /api/gating/:contentId
Retrieve gating rule for specific content.
```bash
curl http://localhost:5000/api/gating/1
```

**Response:**
```json
{
  "contentId": 1,
  "source": "on-chain",
  "rule": {
    "type": "FT",
    "tokenContract": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.mock-token",
    "threshold": 1000000
  },
  "success": true
}
```

#### POST /api/gating/verify
Verify user access for gated content.
```bash
curl -X POST http://localhost:5000/api/gating/verify \
  -H "Content-Type: application/json" \
  -d '{
    "contentId": 1,
    "userAddress": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
  }'
```

**Response:**
```json
{
  "contentId": 1,
  "userAddress": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
  "verified": true,
  "reason": "token_balance_verified",
  "type": "FT",
  "success": true
}
```

#### GET /api/gating/:contentId/status
Check gating status (whether gating is enabled and requirements).
```bash
curl http://localhost:5000/api/gating/1/status
```

#### GET /api/gating/metrics/all
Get service metrics and cache statistics.
```bash
curl http://localhost:5000/api/gating/metrics/all
```

## Pre-Deployment Checklist

### 1. Environment Setup

```bash
# Copy configuration template
cp .env.content-gate.example .env.content-gate

# Edit configuration
nano .env.content-gate
```

**Required Variables:**
```env
STACKS_NETWORK=testnet
STACKS_API_URL=https://stacks-node-api.testnet.stacks.co
STACKS_PRIVATE_KEY=<your-private-key>
MONGODB_URI=mongodb://localhost:27017/content-monetization
```

### 2. Verify Pre-Deployment

```bash
# Run verification script
node blockchain/scripts/verify-cg-deployment.js
```

This checks:
- ✓ Environment variables
- ✓ Contract source file
- ✓ Blockchain connectivity
- ✓ Database connectivity
- ✓ Service files
- ✓ Server configuration

### 3. Dependencies

```bash
# Ensure all dependencies are installed
npm install

# Required packages:
# - @stacks/transactions
# - @stacks/network
# - @stacks/auth
# - mongodb / mongoose
# - express
# - axios
# - node-cache
```

## Deployment Steps

### Step 1: Deploy Contract to Testnet

```bash
export STACKS_NETWORK=testnet
export STACKS_PRIVATE_KEY=<your-private-key>

node blockchain/scripts/deploy-cg-testnet.js
```

**Output:**
```
🚀 Deploying Content-Gate Contract to testnet
...
✓ Contract deployed successfully!
✓ Contract ID: ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.content-gate
✓ Transaction ID: 0x1234...
✓ Block Height: 5678
```

**Deployment info saved to:** `deployments/cg-testnet-deployment.json`

### Step 2: Configure Backend

```bash
# Update .env with deployed contract address
CONTENT_GATE_ADDRESS=ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM

# Start content-gate indexer with custom interval (optional)
CG_INDEXER_INTERVAL_MS=30000
```

### Step 3: Start Backend Services

```bash
# Start backend server
node backend/server.js
```

**Expected output:**
```
Server started { port: 5000, env: 'development' }
✓ Pinning service initialized
✓ Content-gate indexer started { interval: 30000 }
✓ PPV indexer started
```

### Step 4: Verify Integration

```bash
# Test gating routes
curl http://localhost:5000/api/gating/1

# Test verification endpoint
curl -X POST http://localhost:5000/api/gating/verify \
  -H "Content-Type: application/json" \
  -d '{"contentId": 1, "userAddress": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"}'

# Check metrics
curl http://localhost:5000/api/gating/metrics/all
```

## Integration Testing

### Run Integration Tests

```bash
# Run content-gate tests
npm run test -- integration-tests/e2e/content-gate.test.js

# Run with specific config
NODE_ENV=test npm run test -- content-gate.test.js
```

### Test Scenarios

1. **FT Gating Test**
   - Set gating rule requiring 1,000,000 tokens
   - Verify user with sufficient balance has access
   - Verify user without tokens is denied

2. **NFT Gating Test**
   - Set NFT gating rule
   - Verify NFT owner has access
   - Verify non-owner is denied

3. **Cache Validation**
   - Verify cache hits reduce API calls
   - Verify cache TTL works correctly
   - Verify cache invalidation

4. **Indexer Test**
   - Deploy new gating rule on-chain
   - Verify indexer syncs to database
   - Verify metrics are updated

## Database Schema

### GatingRule Model

```javascript
{
  contentId: Number,              // Content identifier
  tokenContract: String,          // Token/NFT contract address
  threshold: Number,              // Minimum balance (FT) or 0 (NFT)
  tokenType: String,              // 'FT' or 'NFT'
  isActive: Boolean,              // Rule is currently active
  createdBy: String,              // Creator address
  createdOnChain: Date,           // When rule was set on-chain
  lastUpdatedOnChain: Date,       // Last update timestamp
  lastTxId: String,               // Last transaction ID
  blockHeight: Number,            // Block where rule was set
  deletedOnChain: Date,           // Deletion timestamp (if deleted)
}
```

## Caching Strategy

### Service-Level Cache (contentGateService)

- **TTL:** 10 minutes (600,000 ms)
- **Purpose:** Cache gating rules from smart contract
- **Key:** Content ID
- **Invalidation:** Manual via `invalidateGatingRuleCache()`

### Middleware Cache (Verification)

- **TTL:** 5 minutes (300,000 ms)
- **Purpose:** Cache access verification results
- **Key:** `gating:contentId:userAddress`
- **Invalidation:** Manual via `invalidateGatingCache()`

### Cache Monitoring

```javascript
// Get cache statistics
const metrics = contentGateMiddleware.getGatingMetrics();
console.log(metrics.cacheStats);
```

## Monitoring & Metrics

### Service Metrics

```bash
curl http://localhost:5000/api/gating/metrics/all
```

**Metrics Include:**
- Rules retrieved
- FT/NFT verifications
- Cache hits/misses
- Indexer status
- Database sync statistics

### Indexer Statistics

```javascript
const stats = contentGateIndexer.getStats();
console.log(stats);
/*
{
  isRunning: true,
  lastBlockHeight: 5678,
  blocksProcessed: 42,
  transactionsProcessed: 15,
  rulesCreated: 5,
  rulesUpdated: 3,
  rulesDeleted: 1,
  errors: 0
}
*/
```

### Health Endpoints

```bash
# Overall system health
curl http://localhost:5000/health

# Database health
curl http://localhost:5000/health/database

# Metrics in Prometheus format
curl http://localhost:5000/metrics
```

## Troubleshooting

### Contract Deployment Fails

1. Check private key is valid:
   ```bash
   node -e "console.log(process.env.STACKS_PRIVATE_KEY)"
   ```

2. Verify testnet connectivity:
   ```bash
   curl https://stacks-node-api.testnet.stacks.co/extended/v1/status
   ```

3. Check account has STX balance for fees

### Access Verification Not Working

1. Verify gating rule is set on-chain:
   ```bash
   curl http://localhost:5000/api/gating/1/status
   ```

2. Check indexer is running:
   ```bash
   curl http://localhost:5000/api/gating/metrics/all
   ```

3. Verify token contract is accessible:
   ```bash
   # Check contract address is valid
   echo $CONTENT_GATE_ADDRESS
   ```

### Database Sync Issues

1. Check MongoDB connection:
   ```bash
   mongosh
   > db.admin().ping()
   ```

2. Verify GatingRule collection exists:
   ```bash
   > db.gatingrules.find({})
   ```

3. Check indexer logs:
   ```bash
   grep "CG-Indexer" backend/logs/*
   ```

## Migration from Database-Only Gating

If you have existing database gating rules:

1. Continue using database rules (backwards compatible)
2. New rules can be set on-chain
3. On-chain rules take precedence
4. Gradually migrate rules to on-chain
5. Deactivate database rules as needed

## Security Considerations

1. **Private Key Management**
   - Never commit STACKS_PRIVATE_KEY
   - Use environment variables
   - Consider hardware wallets for mainnet

2. **Access Control**
   - Only content creators can set gating rules
   - Verify caller is content owner
   - Implement rate limiting

3. **Token Verification**
   - Always verify on-chain for critical access
   - Use contract calls for balance checks
   - Don't trust client-provided balances

4. **Cache Security**
   - Cache expiration prevents stale access
   - Manually invalidate cache on rule changes
   - Monitor cache hit rates

## Performance Optimization

1. **Cache Configuration**
   ```env
   GATING_CACHE_TTL=600000        # 10 minutes
   GATING_VERIFICATION_CACHE_TTL=300000  # 5 minutes
   ```

2. **Indexer Tuning**
   ```env
   CG_INDEXER_INTERVAL_MS=30000   # Poll every 30 seconds
   ```

3. **Batch Verification**
   - Verify multiple users in parallel
   - Use Promise.all() for batch requests

4. **Database Indexing**
   ```javascript
   // Ensure database indexes exist
   db.gatingrules.createIndex({ contentId: 1 })
   db.gatingrules.createIndex({ tokenContract: 1 })
   db.gatingrules.createIndex({ isActive: 1 })
   ```

## Rollback Procedure

If issues occur:

1. Stop backend server:
   ```bash
   pkill -f "node backend/server.js"
   ```

2. Revert contract (if needed):
   - Mark on-chain rule as inactive
   - Restore from database rules only
   - Set `ENABLE_ONCHAIN_VERIFICATION=false`

3. Restart server:
   ```bash
   node backend/server.js
   ```

## Further Reading

- [Clarity Documentation](https://docs.stacks.co/clarity)
- [SIP-009 (NFT Trait)](https://github.com/stacksgov/sips/blob/main/sips/sip-009/sip-009-nft-trait.md)
- [SIP-010 (Token Trait)](https://github.com/stacksgov/sips/blob/main/sips/sip-010/sip-010-fungible-token-trait.md)
- [Stacks API Documentation](https://docs.stacks.co/api)

## Support

For issues or questions:
1. Check deployment verification output
2. Review logs in backend/logs/
3. Test manually with curl/Postman
4. Review integration tests
5. Check GitHub issues
