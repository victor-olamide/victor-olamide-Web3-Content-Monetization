# Blockchain Transaction Verification Service

Confirms on-chain transactions (subscription payments, PPV purchases) before granting access by polling the Stacks API.

## Architecture

```
blockchainVerification.js   ← core service
stacksApiService.js         ← Stacks API client (with retry + backoff)
txConfirmationGate.js       ← Express middleware
blockchainVerificationRoutes.js ← REST API
TransactionVerification.js  ← Mongoose model (persists results)
verificationCacheEvictionJob.js ← background cache cleanup
```

## How It Works

1. A purchase or subscription transaction is submitted on-chain by the frontend.
2. The backend receives the `txId` and calls `verifyTransactionStatus(txId, minConfirmations)`.
3. The service polls the Stacks API (`/extended/v1/tx/:txId`) with exponential backoff.
4. Once `confirmations >= minConfirmations`, a read-only contract call confirms on-chain state (`has-access` / `is-subscribed`).
5. The result is cached in-memory (TTL: 5 min) and persisted to MongoDB.
6. Access is granted or denied based on the combined result.

## REST API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/blockchain/tx/:txId` | Check single transaction status |
| POST | `/api/blockchain/tx/batch` | Batch verify up to 50 transactions |
| GET | `/api/blockchain/tx/:txId/type` | Detect purchase vs subscription |
| GET | `/api/blockchain/purchase/:userAddress/:contentId` | Verify PPV purchase |
| POST | `/api/blockchain/purchase/batch` | Batch verify purchases |
| GET | `/api/blockchain/subscription/:userAddress/:creatorAddress/:tierId` | Verify subscription |
| POST | `/api/blockchain/access` | Determine access (purchase + subscription) |
| GET | `/api/blockchain/history` | Query persisted verification records |
| GET | `/api/blockchain/cache/stats` | Cache statistics |
| DELETE | `/api/blockchain/cache` | Evict expired cache entries |
| GET | `/api/blockchain/metrics` | Verification metrics |

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `STACKS_NETWORK` | `testnet` | `mainnet` or `testnet` |
| `STACKS_API_URL` | derived from network | Override Stacks API base URL |
| `CONTRACT_ADDRESS` | `ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM` | Deployed contract address |
| `BLOCKCHAIN_MIN_CONFIRMATIONS` | `1` | Minimum confirmations for access |
| `BLOCKCHAIN_CACHE_TTL_MS` | `300000` | Cache TTL in ms |
| `BLOCKCHAIN_API_RETRY_ATTEMPTS` | `3` | Retry attempts on transient errors |
| `BLOCKCHAIN_POLL_TIMEOUT_MS` | `300000` | Polling timeout in ms |

## Middleware Usage

Apply `txConfirmationGate` to any route that requires a confirmed on-chain transaction:

```js
const { txConfirmationGate } = require('../middleware/txConfirmationGate');

router.post('/purchases', txConfirmationGate, async (req, res) => {
  // req.txVerification contains the verified transaction details
});
```

The middleware reads `txId` from `req.body`, `req.query`, or `req.params`.
