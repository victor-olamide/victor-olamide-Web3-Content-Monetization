# Transaction History API Reference

## Overview

Complete API reference for transaction history endpoints. All endpoints require wallet authentication via `X-Session-Id` header.

## Base URL

```
/api/transactions
```

## Authentication

All endpoints require the following header:

```
X-Session-Id: <session-id-from-localStorage>
```

## Response Format

All responses follow this structure:

```json
{
  "success": true,
  "data": {...},
  "message": "Optional message",
  "pagination": {
    "skip": 0,
    "limit": 20,
    "total": 100,
    "hasMore": true
  }
}
```

## Endpoints

### GET /api/transactions/history

Get paginated transaction history with optional filters.

**Query Parameters:**
- `skip` (optional): Number of transactions to skip (default: 0, min: 0)
- `limit` (optional): Number of transactions to return (default: 20, min: 1, max: 500)
- `status` (optional): Filter by status (confirmed|pending|failed|cancelled)
- `type` (optional): Filter by transaction type
- `category` (optional): Filter by category (income|expense|fee|reward)
- `sortBy` (optional): Sort order (date-asc|date-desc|amount-asc|amount-desc, default: date-desc)
- `startDate` (optional): ISO format start date for range query
- `endDate` (optional): ISO format end date for range query

**Example Request:**
```bash
curl -H "X-Session-Id: abc123" \
  "https://api.example.com/api/transactions/history?skip=0&limit=20&status=confirmed&sortBy=date-desc"
```

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "userAddress": "SP1234567890ABCDEF",
      "transactionType": "purchase",
      "amount": 10.5,
      "amountUsd": 52.50,
      "status": "confirmed",
      "description": "Content purchase",
      "category": "expense",
      "txHash": "abcd1234efgh5678ijkl9012mnop3456qrst5678uvwx9012yz",
      "blockHeight": 123456,
      "confirmations": 12,
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T11:00:00Z"
    }
  ],
  "pagination": {
    "skip": 0,
    "limit": 20,
    "total": 150,
    "hasMore": true
  }
}
```

---

### GET /api/transactions/summary

Get aggregated transaction statistics and summaries.

**Query Parameters:** None

**Example Request:**
```bash
curl -H "X-Session-Id: abc123" \
  "https://api.example.com/api/transactions/summary"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "totalAmount": 150.75,
    "totalUsd": 753.75,
    "byType": {
      "purchase": 100.0,
      "fee": 50.75
    },
    "byCategory": {
      "expense": 150.75,
      "income": 0
    }
  }
}
```

---

### GET /api/transactions/stats

Get user transaction statistics for dashboard display.

**Query Parameters:** None

**Example Request:**
```bash
curl -H "X-Session-Id: abc123" \
  "https://api.example.com/api/transactions/stats"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "totalTransactions": 45,
    "confirmedTransactions": 42,
    "pendingTransactions": 2,
    "failedTransactions": 1,
    "totalAmount": 250.5,
    "totalUsd": 1252.50,
    "averageAmount": 5.57,
    "lastTransactionDate": "2024-01-20T14:30:00Z"
  }
}
```

---

### GET /api/transactions/pending

Get all pending (unconfirmed) transactions.

**Query Parameters:**
- `skip` (optional): Number to skip (default: 0)
- `limit` (optional): Number to return (default: 20, max: 500)

**Example Request:**
```bash
curl -H "X-Session-Id: abc123" \
  "https://api.example.com/api/transactions/pending?limit=10"
```

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "transactionType": "subscription",
      "amount": 5.0,
      "status": "pending",
      "confirmations": 3,
      "createdAt": "2024-01-20T14:30:00Z"
    }
  ],
  "pagination": {
    "total": 2,
    "hasMore": false
  }
}
```

---

### GET /api/transactions/by-type/:type

Get transactions filtered by type.

**Path Parameters:**
- `type`: Transaction type (purchase|subscription|refund|payout|transfer|deposit|withdrawal|renewal|upgrade|downgrade|fee|tip|reward)

**Query Parameters:**
- `skip` (optional): Number to skip (default: 0)
- `limit` (optional): Number to return (default: 20, max: 500)

**Example Request:**
```bash
curl -H "X-Session-Id: abc123" \
  "https://api.example.com/api/transactions/by-type/purchase?limit=50"
```

---

### GET /api/transactions/by-category/:category

Get transactions filtered by category.

**Path Parameters:**
- `category`: Category (income|expense|fee|reward)

**Query Parameters:**
- `skip` (optional): Number to skip (default: 0)
- `limit` (optional): Number to return (default: 20, max: 500)

**Example Request:**
```bash
curl -H "X-Session-Id: abc123" \
  "https://api.example.com/api/transactions/by-category/income"
```

---

### GET /api/transactions/date-range

Get transactions within a date range.

**Query Parameters:**
- `startDate` (required): ISO format date (YYYY-MM-DD or ISO 8601)
- `endDate` (required): ISO format date (YYYY-MM-DD or ISO 8601)
- `skip` (optional): Number to skip (default: 0)
- `limit` (optional): Number to return (default: 20, max: 500)
- **Max date range**: 365 days

**Example Request:**
```bash
curl -H "X-Session-Id: abc123" \
  "https://api.example.com/api/transactions/date-range?startDate=2024-01-01&endDate=2024-01-31"
```

---

### GET /api/transactions/monthly/:year/:month

Get monthly transaction summary.

**Path Parameters:**
- `year` (required): Year (e.g., 2024)
- `month` (required): Month (1-12)

**Example Request:**
```bash
curl -H "X-Session-Id: abc123" \
  "https://api.example.com/api/transactions/monthly/2024/01"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "year": 2024,
    "month": 1,
    "totalAmount": 500.0,
    "totalUsd": 2500.0,
    "transactionCount": 25,
    "transactions": [...]
  }
}
```

---

### GET /api/transactions/balance-over-time

Get historical balance for chart visualization.

**Query Parameters:**
- `days` (optional): Number of days to retrieve (default: 30, min: 1, max: 365)

**Example Request:**
```bash
curl -H "X-Session-Id: abc123" \
  "https://api.example.com/api/transactions/balance-over-time?days=30"
```

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "date": "2024-01-01T00:00:00Z",
      "balance": 100.0,
      "transactions": 2
    },
    {
      "date": "2024-01-02T00:00:00Z",
      "balance": 105.5,
      "transactions": 1
    }
  ]
}
```

---

### GET /api/transactions/:txId

Get a single transaction by database ID.

**Path Parameters:**
- `txId` (required): MongoDB ObjectId (24 hex characters)

**Example Request:**
```bash
curl -H "X-Session-Id: abc123" \
  "https://api.example.com/api/transactions/507f1f77bcf86cd799439011"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "userAddress": "SP1234567890ABCDEF",
    "transactionType": "purchase",
    "amount": 10.5,
    "amountUsd": 52.50,
    "stxPrice": 5.0,
    "txHash": "abcd1234...",
    "status": "confirmed",
    "blockHeight": 123456,
    "blockTime": "2024-01-15T10:30:00Z",
    "confirmations": 12,
    "description": "Content purchase",
    "category": "expense",
    "metadata": {},
    "taxRelevant": true,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T11:00:00Z"
  }
}
```

---

### GET /api/transactions/hash/:txHash

Get a transaction by blockchain hash.

**Path Parameters:**
- `txHash` (required): Stacks transaction hash (64 hex characters)

**Example Request:**
```bash
curl -H "X-Session-Id: abc123" \
  "https://api.example.com/api/transactions/hash/abcd1234efgh5678ijkl9012mnop3456qrst5678uvwx9012yz"
```

---

### POST /api/transactions

Record a new transaction.

**Request Body:**
```json
{
  "transactionType": "purchase",
  "amount": 10.5,
  "amountUsd": 52.50,
  "stxPrice": 5.0,
  "description": "Content purchase",
  "category": "expense",
  "txHash": "abcd1234...",
  "blockHeight": 123456,
  "status": "pending",
  "relatedContentId": "content123",
  "relatedAddress": "SP...",
  "metadata": {},
  "taxRelevant": true
}
```

**Required Fields:**
- `transactionType`: One of 13 types
- `amount`: Number (0 - 1,000,000)
- `amountUsd`: Number
- `stxPrice`: Number
- `description`: String (< 500 chars)
- `category`: One of income|expense|fee|reward

**Optional Fields:**
- `txHash`: 64 hex characters
- `blockHeight`: Number
- `status`: Default 'pending'
- `relatedContentId`: String
- `relatedAddress`: String
- `metadata`: JSON object
- `taxRelevant`: Boolean

**Example Request:**
```bash
curl -X POST -H "X-Session-Id: abc123" \
  -H "Content-Type: application/json" \
  -d '{
    "transactionType": "purchase",
    "amount": 10.5,
    "amountUsd": 52.50,
    "stxPrice": 5.0,
    "description": "Content purchase",
    "category": "expense"
  }' \
  https://api.example.com/api/transactions
```

---

### PUT /api/transactions/:txHash/status

Update transaction status (e.g., when confirmed on blockchain).

**Path Parameters:**
- `txHash` (required): Transaction hash

**Request Body:**
```json
{
  "status": "confirmed",
  "blockHeight": 123456,
  "blockTime": "2024-01-15T10:30:00Z",
  "confirmations": 6
}
```

**Required Fields:**
- `status`: One of confirmed|failed|cancelled

**Optional Fields:**
- `blockHeight`: Number
- `blockTime`: ISO format date
- `confirmations`: Number

**Example Request:**
```bash
curl -X PUT -H "X-Session-Id: abc123" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "confirmed",
    "blockHeight": 123456,
    "confirmations": 6
  }' \
  https://api.example.com/api/transactions/hash123/status
```

---

### PUT /api/transactions/:txHash/confirmations

Update blockchain confirmation count.

**Path Parameters:**
- `txHash` (required): Transaction hash

**Request Body:**
```json
{
  "confirmations": 8,
  "blockHeight": 123457
}
```

**Required Fields:**
- `confirmations`: Number (0-100+)

**Optional Fields:**
- `blockHeight`: Number

---

### GET /api/transactions/export/tax/:year

Export transactions for tax reporting.

**Path Parameters:**
- `year` (required): Year (2000-current year)

**Example Request:**
```bash
curl -H "X-Session-Id: abc123" \
  "https://api.example.com/api/transactions/export/tax/2024"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "year": 2024,
    "income": {
      "total": 500.0,
      "usd": 2500.0,
      "transactions": [...]
    },
    "expenses": {
      "total": 300.0,
      "usd": 1500.0,
      "transactions": [...]
    },
    "fees": {
      "total": 50.0,
      "usd": 250.0,
      "transactions": [...]
    }
  }
}
```

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Invalid pagination parameters",
  "errors": ["limit must be between 1 and 500"]
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Unauthorized: Invalid or missing session ID"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Forbidden: User cannot access this transaction"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Transaction not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Internal server error"
}
```

## Rate Limiting

- **Default**: 100 requests per minute per user
- **Burst**: 50 requests per 10 seconds
- Rate limit headers included in responses:
  - `X-RateLimit-Limit`: 100
  - `X-RateLimit-Remaining`: 95
  - `X-RateLimit-Reset`: 1705410600

## Pagination

All list endpoints support pagination:

```json
{
  "pagination": {
    "skip": 0,
    "limit": 20,
    "total": 150,
    "hasMore": true
  }
}
```

**Calculation:**
- `hasMore = (skip + limit) < total`
- Next page: `skip += limit`
- Previous page: `skip = Math.max(0, skip - limit)`

## Filtering

### Status Filter
```
status=confirmed|pending|failed|cancelled
```

### Type Filter
```
type=purchase|subscription|refund|payout|transfer|deposit|withdrawal|renewal|upgrade|downgrade|fee|tip|reward
```

### Category Filter
```
category=income|expense|fee|reward
```

## Sorting

### Sort By Parameter
```
sortBy=date-asc      # Oldest first
sortBy=date-desc     # Newest first (default)
sortBy=amount-asc    # Lowest amount first
sortBy=amount-desc   # Highest amount first
```

## Examples

### Get last 10 transactions
```bash
curl -H "X-Session-Id: abc123" \
  "https://api.example.com/api/transactions/history?limit=10"
```

### Get all purchases from January 2024
```bash
curl -H "X-Session-Id: abc123" \
  "https://api.example.com/api/transactions/history?type=purchase&startDate=2024-01-01&endDate=2024-01-31"
```

### Get pending transactions sorted by amount (highest first)
```bash
curl -H "X-Session-Id: abc123" \
  "https://api.example.com/api/transactions/history?status=pending&sortBy=amount-desc"
```

### Get income transactions for tax reporting
```bash
curl -H "X-Session-Id: abc123" \
  "https://api.example.com/api/transactions/by-category/income?limit=500"
```

### Get balance history for last 7 days
```bash
curl -H "X-Session-Id: abc123" \
  "https://api.example.com/api/transactions/balance-over-time?days=7"
```

## SDK Integration

### JavaScript/TypeScript
```typescript
import * as transactionApi from './utils/transactionApi';

// Get history
const response = await transactionApi.getTransactionHistory({
  skip: 0,
  limit: 20,
  status: 'confirmed'
});

// Record transaction
await transactionApi.recordTransaction({
  transactionType: 'purchase',
  amount: 10.5,
  amountUsd: 52.50,
  stxPrice: 5.0,
  description: 'Content purchase',
  category: 'expense'
});
```

## Best Practices

1. **Always include X-Session-Id header** on all requests
2. **Use appropriate pagination** to avoid large response sizes
3. **Cache summaries and stats** with auto-refresh intervals
4. **Validate date ranges** before API calls
5. **Handle rate limiting** with exponential backoff
6. **Verify transaction hashes** match blockchain records
7. **Export tax data** annually for compliance
8. **Monitor confirmation counts** for pending transactions

## Changelog

### v1.0.0 (Current)
- Initial release with 14 endpoints
- Full transaction lifecycle support
- Tax reporting export
- Balance history tracking
- Blockchain confirmation monitoring
