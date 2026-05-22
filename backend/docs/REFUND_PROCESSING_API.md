# Refund Processing API

## Overview

The refund processing API handles pro-rata refunds for cancelled subscriptions. It uses `refundService.js` and the `ProRataRefund` model to calculate refund amounts based on unused subscription time, and triggers on-chain refunds via the Stacks blockchain where applicable.

---

## Endpoints

### POST /api/refunds

Cancel a subscription and initiate a pro-rata refund.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `subscriptionId` | string | Yes | MongoDB ObjectId of the subscription |
| `reason` | string | No | Cancellation reason (default: `"User requested cancellation"`) |
| `cancellationDate` | string (ISO date) | No | Effective cancellation date (default: now) |
| `refundMethod` | string | No | `blockchain` \| `platform_credit` \| `manual` (default: `blockchain`) |
| `initiatedBy` | string | No | `user` or `admin` (default: `user`) |
| `subscriberPrincipal` | string | No | Stacks principal of subscriber (required for on-chain trigger) |
| `creatorPrincipal` | string | No | Stacks principal of creator (required for on-chain trigger) |
| `tierId` | number | No | Subscription tier ID (required for on-chain trigger) |

**On-chain trigger conditions:**
- `refundMethod` is `blockchain`
- `PLATFORM_PRIVATE_KEY` env var is set
- `subscriberPrincipal`, `creatorPrincipal`, and `tierId` are provided

**Response (201):**
```json
{
  "success": true,
  "message": "Subscription cancellation processed successfully",
  "subscription": { "_id": "...", "cancelledAt": "..." },
  "refund": { "_id": "...", "refundAmount": 80, "refundStatus": "pending" },
  "onChain": {
    "success": true,
    "transactionId": "0xabc...",
    "message": "On-chain refund triggered successfully"
  }
}
```

---

### POST /api/refunds/:id/trigger-onchain

Manually trigger an on-chain refund for an approved `ProRataRefund` record.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `subscriberPrincipal` | string | Yes | Stacks principal of subscriber |
| `creatorPrincipal` | string | Yes | Stacks principal of creator |
| `tierId` | number | Yes | Subscription tier ID |

**Response (200):**
```json
{
  "success": true,
  "transactionId": "0xabc...",
  "message": "On-chain refund triggered successfully"
}
```

---

### GET /api/refunds/pro-rata/:id

Get a specific `ProRataRefund` record by ID.

---

### GET /api/refunds/pro-rata/subscription/:subscriptionId

Get the `ProRataRefund` record for a specific subscription.

---

### GET /api/refunds/user/:address

Get all refunds for a user wallet address.

---

### GET /api/refunds/creator/:address

Get all refunds for a creator wallet address, grouped by status.

---

### GET /api/refunds/:id

Get a specific `Refund` record by ID.

---

### POST /api/refunds/:id/approve

Approve a pending refund.

**Body:** `{ "approvedBy": "admin-address" }`

---

### POST /api/refunds/:id/complete

Mark a refund as completed after on-chain confirmation.

**Body:** `{ "txId": "0xabc..." }`

---

### POST /api/refunds/:id/reject

Reject a pending refund.

**Body:** `{ "notes": "reason for rejection" }`

---

## Pro-Rata Calculation

Refund amount is calculated proportionally to unused subscription days:

```
refundAmount = (unusedDays / totalDays) * originalAmount
```

Eligibility requires:
- `subscription.refundEligible === true`
- Cancellation is within `subscription.refundWindowDays` (default: 30 days)

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PLATFORM_PRIVATE_KEY` | Platform private key for signing on-chain refund transactions |
| `CONTRACT_ADDRESS` | Stacks contract address for the subscription contract |
