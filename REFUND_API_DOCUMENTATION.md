# Content Removal and Refund API Documentation

## Overview
This document describes the API endpoints for managing content removal and refunds in the Stacks Content Monetization platform.

## Base Path
All endpoints are prefixed with `/api`

## Content Removal

### Remove Content
**Endpoint:** `POST /content/:contentId/remove`

**Description:** Allows creators to remove their content from the platform and automatically initiate refunds for recent purchasers.

**Authentication:** Required
- Header: `x-creator-address` - The Stacks address of the creator

**Parameters:**
- `contentId` (path): The ID of the content to remove
- `reason` (body, optional): Reason for removal (default: "Creator requested removal")

**Request Body:**
```json
{
  "reason": "Content no longer available"
}
```

**Response (200 OK):**
```json
{
  "message": "Content removed successfully",
  "content": {
    "contentId": 1,
    "isRemoved": true,
    "removedAt": "2026-02-08T10:30:00.000Z",
    "removalReason": "Content no longer available"
  },
  "transactionId": "0x123abc...",
  "refunds": {
    "totalPurchases": 5,
    "refundsInitiated": 4,
    "results": [
      {
        "purchaseId": "507f1f77bcf86cd799439011",
        "user": "SP2...",
        "success": true,
        "message": "Refund initiated successfully"
      }
    ]
  }
}
```

**Error Responses:**
- `401 Unauthorized` - No creator address provided
- `403 Forbidden` - Caller is not the content creator
- `404 Not Found` - Content not found
- `500 Internal Server Error` - Contract removal failed or database error

---

### Get Content Refund Status
**Endpoint:** `GET /content/:contentId/refunds`

**Description:** Retrieve refund status and history for a specific content piece.

**Authentication:** Required
- Header: `x-creator-address` - The Stacks address of the creator

**Response (200 OK):**
```json
{
  "contentId": 1,
  "totalRefunds": 3,
  "refunds": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "purchaseId": "507f1f77bcf86cd799439012",
      "contentId": 1,
      "user": "SP2...",
      "originalPurchaseAmount": 100,
      "refundAmount": 100,
      "reason": "content-removed",
      "status": "pending",
      "createdAt": "2026-02-08T10:25:00.000Z"
    }
  ]
}
```

---

## Refund Management

### Get User Refund History
**Endpoint:** `GET /refunds/user/:address`

**Description:** Retrieve all refunds for a specific user.

**Parameters:**
- `address` (path): The Stacks address of the user

**Response (200 OK):**
```json
{
  "user": "SP2...",
  "totalRefunds": 2,
  "refunds": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "contentId": 1,
      "refundAmount": 100,
      "status": "completed",
      "reason": "content-removed",
      "createdAt": "2026-02-08T10:25:00.000Z"
    }
  ]
}
```

---

### Get User Refund History for Specific Content
**Endpoint:** `GET /refunds/user/:address/content/:contentId`

**Description:** Get refund history for a specific user and content combination.

**Response (200 OK):**
```json
{
  "user": "SP2...",
  "contentId": 1,
  "totalRefunds": 1,
  "refunds": [...]
}
```

---

### Get Creator's Pending Refunds
**Endpoint:** `GET /refunds/creator/:address`

**Description:** Get all refunds for a creator, grouped by status.

**Parameters:**
- `address` (path): The Stacks address of the creator

**Response (200 OK):**
```json
{
  "creator": "SP1...",
  "total": 10,
  "byStatus": {
    "pending": 3,
    "approved": 2,
    "processing": 1,
    "completed": 3,
    "rejected": 1
  },
  "refunds": [...]
}
```

---

### Get Specific Refund Details
**Endpoint:** `GET /refunds/:id`

**Description:** Retrieve details for a specific refund record.

**Parameters:**
- `id` (path): The MongoDB ObjectId of the refund

**Response (200 OK):**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "purchaseId": "507f1f77bcf86cd799439012",
  "contentId": 1,
  "user": "SP2...",
  "creator": "SP1...",
  "originalPurchaseAmount": 100,
  "refundAmount": 100,
  "reason": "content-removed",
  "status": "pending",
  "txId": null,
  "approvedBy": null,
  "approvedAt": null,
  "processedAt": null,
  "notes": null,
  "createdAt": "2026-02-08T10:25:00.000Z",
  "updatedAt": "2026-02-08T10:25:00.000Z"
}
```

**Error Response:**
- `404 Not Found` - Refund not found

---

### Approve Refund
**Endpoint:** `POST /refunds/:id/approve`

**Description:** Approve a pending refund (typically by creator or admin).

**Parameters:**
- `id` (path): The MongoDB ObjectId of the refund

**Request Body:**
```json
{
  "approvedBy": "SP1..."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "refund": {
    "_id": "507f1f77bcf86cd799439011",
    "status": "approved",
    "approvedBy": "SP1...",
    "approvedAt": "2026-02-08T10:30:00.000Z"
  },
  "message": "Refund approved successfully"
}
```

**Error Response:**
- `400 Bad Request` - Missing approvedBy field or refund already processed
- `404 Not Found` - Refund not found

---

### Complete Refund
**Endpoint:** `POST /refunds/:id/complete`

**Description:** Mark refund as completed after on-chain confirmation.

**Parameters:**
- `id` (path): The MongoDB ObjectId of the refund

**Request Body:**
```json
{
  "txId": "0x123abc..."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "refund": {
    "_id": "507f1f77bcf86cd799439011",
    "status": "completed",
    "txId": "0x123abc...",
    "processedAt": "2026-02-08T10:35:00.000Z"
  },
  "message": "Refund completed successfully"
}
```

**Error Response:**
- `400 Bad Request` - Missing txId field or refund not approved
- `404 Not Found` - Refund not found

---

### Reject Refund
**Endpoint:** `POST /refunds/:id/reject`

**Description:** Reject a pending refund with optional notes.

**Parameters:**
- `id` (path): The MongoDB ObjectId of the refund

**Request Body:**
```json
{
  "notes": "User already had temporary access"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "refund": {
    "_id": "507f1f77bcf86cd799439011",
    "status": "rejected",
    "notes": "User already had temporary access"
  },
  "message": "Refund rejected"
}
```

---

### Auto-Process Refunds for Removed Content
**Endpoint:** `POST /refunds/auto-process/removed-content`

**Description:** Automatically approve all pending refunds for removed content. Can be called by a cron job or admin.

**Response (200 OK):**
```json
{
  "success": true,
  "results": {
    "processed": 10,
    "approved": 10,
    "failed": 0,
    "errors": []
  },
  "message": "Auto-processing complete. Approved 10 refunds, 0 failed."
}
```

---

### Get Refund Summary Statistics
**Endpoint:** `GET /refunds/status/summary`

**Description:** Get overall refund statistics grouped by status and reason.

**Response (200 OK):**
```json
{
  "total": 50,
  "byStatus": {
    "pending": 5,
    "approved": 8,
    "processing": 2,
    "completed": 30,
    "rejected": 5
  },
  "byReason": {
    "content-removed": 35,
    "manual-request": 10,
    "partial": 3,
    "dispute": 2
  },
  "totalAmount": 5000
}
```

---

## Data Models

### Content Model
```javascript
{
  contentId: Number,
  title: String,
  description: String,
  contentType: String, // 'video', 'article', 'image', 'music'
  price: Number,
  creator: String, // Stacks address
  url: String, // IPFS or Gaia URL
  storageType: String, // 'ipfs', 'gaia'
  isRemoved: Boolean, // default: false
  removedAt: Date, // null if not removed
  removalReason: String, // Reason for removal
  refundable: Boolean, // default: true
  refundWindowDays: Number, // default: 30
  createdAt: Date
}
```

### Purchase Model
```javascript
{
  contentId: Number,
  user: String, // Stacks address
  creator: String, // Stacks address
  txId: String, // Unique blockchain transaction ID
  amount: Number,
  platformFee: Number,
  creatorAmount: Number,
  refundStatus: String, // 'none', 'pending', 'processing', 'completed', 'failed'
  refundAmount: Number, // Amount refunded
  refundTxId: String, // On-chain refund transaction ID
  refundedAt: Date,
  timestamp: Date
}
```

### Refund Model
```javascript
{
  purchaseId: ObjectId, // Reference to Purchase
  contentId: Number,
  user: String, // Stacks address
  creator: String, // Stacks address
  originalPurchaseAmount: Number,
  refundAmount: Number,
  reason: String, // 'content-removed', 'manual-request', 'partial', 'dispute'
  status: String, // 'pending', 'approved', 'rejected', 'processing', 'completed', 'failed'
  txId: String, // On-chain transaction ID
  approvedBy: String, // Address of approver
  approvedAt: Date,
  processedAt: Date,
  notes: String,
  createdAt: Date,
  updatedAt: Date
}
```

---

## Error Codes and Messages

| Status | Code | Message | Description |
|--------|------|---------|-------------|
| 400 | Bad Request | Missing required fields | Request body missing required parameters |
| 401 | Unauthorized | Authentication required | Creator address or user address not provided |
| 403 | Forbidden | Access denied | Caller is not authorized for the operation |
| 404 | Not Found | Content/Refund not found | Requested resource doesn't exist |
| 409 | Conflict | Content already exists | Attempting to create duplicate content |
| 410 | Gone | Content has been removed | Content is no longer available |
| 500 | Internal Server Error | Failed to remove content | Blockchain or database error |

---

## Refund Window and Eligibility

- **Default refund window:** 30 days from purchase
- **Configurable per content:** Set `refundWindowDays` when creating content
- **Non-refundable content:** Set `refundable: false` to disable refunds
- **Automatic refunds:** Content removal automatically initiates refunds for eligible purchases
- **Manual refunds:** Creators can manually request refunds within the window

---

## Smart Contract Integration

### Clarity Contract Functions

**add-content(contentId, price, uri)**
- Registers new content on-chain

**remove-content(contentId)**
- Removes content from contract
- Can only be called by content creator or contract owner

**purchase-content(contentId)**
- Records on-chain purchase and transfers funds

**refund-user(contentId, user)**
- Processes on-chain refund to user
- Only callable by content creator

---

## Best Practices

1. **Always validate creator address** before allowing content removal
2. **Use the auto-process endpoint** periodically to approve pending content-removal refunds
3. **Track refund status** to ensure all refunds are completed within acceptable timeframes
4. **Monitor summary statistics** to identify refund patterns and potential issues
5. **Keep refund window reasonable** (recommended 14-30 days)
6. **Test refund logic** before deploying to production
