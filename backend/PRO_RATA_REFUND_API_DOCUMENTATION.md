# Pro-Rata Refund API Documentation

## Overview

This document describes the API endpoints for subscription cancellation with pro-rata (proportional) refund calculations. The system automatically calculates refunds based on the unused portion of a subscription.

## Base URL

```
http://localhost:5000/api/refunds
```

## Authentication

All endpoints require standard authentication headers:
```
Authorization: Bearer <token>
```

---

## Core Concepts

### Pro-Rata Refund

A **pro-rata refund** is a proportional refund based on unused subscription time.

**Example:**
- Subscription cost: $30/month
- Days used: 10 days
- Days remaining: 20 days
- Refund: (20/30) × $30 = $20

### Refund Lifecycle

```
Pending → Approved → Processing → Completed
    ↓
  Rejected
```

### Refund Eligibility

Refunds are eligible if:
1. Subscription `refundEligible` is true
2. Cancellation is within `refundWindowDays` (default: 30)
3. Subscription has unused time remaining

---

## Endpoints

### 1. Cancel Subscription with Refund

**POST** `/subscriptions/:subscriptionId/cancel-with-refund`

Cancel a subscription and initiate pro-rata refund.

**Parameters:**
- `subscriptionId` (path) - Subscription ID

**Request Body:**
```json
{
  "reason": "No longer needed",
  "cancellationDate": "2026-02-08T10:30:00Z",
  "refundMethod": "blockchain"
}
```

**Response:**
```json
{
  "message": "Subscription cancelled with refund initiated",
  "success": true,
  "subscription": {
    "_id": "sub-123",
    "status": "cancelled",
    "cancelledAt": "2026-02-08T10:30:00Z"
  },
  "refund": {
    "eligible": true,
    "amount": 20.00,
    "method": "blockchain",
    "refundId": "refund-456",
    "breakdown": {
      "message": "Subscription used for 10 of 30 days (33.3%)",
      "refundMessage": "Refund for 20 unused days: $20.00"
    }
  }
}
```

**Status Codes:**
- `200 OK` - Subscription cancelled successfully
- `400 Bad Request` - Invalid subscription or already cancelled
- `404 Not Found` - Subscription not found
- `500 Internal Server Error` - Server error

---

### 2. Preview Refund Amount

**GET** `/subscriptions/:subscriptionId/refund-preview`

Preview the refund amount without cancelling the subscription.

**Parameters:**
- `subscriptionId` (path) - Subscription ID

**Query Parameters:**
- `cancellationDate` (optional) - Date for refund calculation (ISO 8601)

**Response:**
```json
{
  "subscriptionId": "sub-123",
  "eligibility": {
    "isEligible": true,
    "withinWindow": true,
    "refundEnabled": true,
    "refundWindowDeadline": "2026-03-10T00:00:00Z",
    "daysUntilDeadline": 30,
    "reason": "Eligible for pro-rata refund"
  },
  "refund": {
    "originalAmount": 29.99,
    "refundAmount": 20.00,
    "refundPercentage": 66.7,
    "breakdown": {
      "message": "Subscription used for 10 of 30 days",
      "refundMessage": "Refund for 20 unused days: $20.00"
    },
    "daysUsed": 10,
    "daysRemaining": 20,
    "totalDays": 30
  }
}
```

**Status Codes:**
- `200 OK` - Preview calculated successfully
- `404 Not Found` - Subscription not found
- `500 Internal Server Error` - Server error

---

### 3. Get Refund Details

**GET** `/pro-rata/:refundId`

Retrieve detailed information about a pro-rata refund.

**Parameters:**
- `refundId` (path) - Refund ID

**Response:**
```json
{
  "success": true,
  "refund": {
    "_id": "refund-456",
    "subscriptionId": "sub-123",
    "originalAmount": 29.99,
    "refundAmount": 20.00,
    "refundPercentage": 66.7,
    "refundStatus": "pending",
    "usedDays": 10,
    "unusedDays": 20,
    "totalDays": 30,
    "cancellationDate": "2026-02-08T10:30:00Z",
    "processedAt": null,
    "transactionId": null
  }
}
```

**Status Codes:**
- `200 OK` - Refund details retrieved
- `404 Not Found` - Refund not found
- `500 Internal Server Error` - Server error

---

### 4. Approve Refund

**POST** `/pro-rata/:refundId/approve`

Approve a pending refund for processing.

**Parameters:**
- `refundId` (path) - Refund ID

**Request Body:**
```json
{
  "approvedBy": "admin-user-id"
}
```

**Response:**
```json
{
  "message": "Refund approved successfully",
  "refund": {
    "_id": "refund-456",
    "refundStatus": "approved",
    "refundAmount": 20.00,
    "processedBy": "admin-user-id",
    "processedAt": "2026-02-08T11:00:00Z"
  }
}
```

**Status Codes:**
- `200 OK` - Refund approved
- `400 Bad Request` - Invalid refund status or not found
- `500 Internal Server Error` - Server error

---

### 5. Complete Refund

**POST** `/pro-rata/:refundId/complete`

Mark a refund as completed with blockchain transaction ID.

**Parameters:**
- `refundId` (path) - Refund ID

**Request Body:**
```json
{
  "transactionId": "tx-abc123def456",
  "blockHeight": 850000
}
```

**Response:**
```json
{
  "message": "Refund completed successfully",
  "refund": {
    "_id": "refund-456",
    "refundStatus": "completed",
    "transactionId": "tx-abc123def456",
    "blockHeight": 850000,
    "blockTimestamp": "2026-02-08T11:30:00Z"
  }
}
```

**Status Codes:**
- `200 OK` - Refund completed
- `400 Bad Request` - Missing transaction ID or invalid status
- `404 Not Found` - Refund not found
- `500 Internal Server Error` - Server error

---

### 6. Reject Refund

**POST** `/pro-rata/:refundId/reject`

Reject a pending refund with reason.

**Parameters:**
- `refundId` (path) - Refund ID

**Request Body:**
```json
{
  "reason": "Refund window expired"
}
```

**Response:**
```json
{
  "message": "Refund rejected",
  "refund": {
    "_id": "refund-456",
    "refundStatus": "rejected",
    "failureReason": "Refund window expired",
    "processedAt": "2026-02-08T11:45:00Z"
  }
}
```

**Status Codes:**
- `200 OK` - Refund rejected
- `400 Bad Request` - Invalid status or not found
- `500 Internal Server Error` - Server error

---

### 7. Get Creator's Pending Refunds

**GET** `/pro-rata/creator/:creatorId/pending`

Retrieve all pending refunds for a creator.

**Parameters:**
- `creatorId` (path) - Creator ID

**Query Parameters:**
- `limit` (optional) - Number of records (default: 50)
- `offset` (optional) - Records to skip (default: 0)

**Response:**
```json
{
  "creatorId": "creator-456",
  "totalPending": 5,
  "limit": 50,
  "offset": 0,
  "returned": 5,
  "refunds": [
    {
      "_id": "refund-456",
      "subscriptionId": "sub-123",
      "refundAmount": 20.00,
      "refundStatus": "pending",
      "createdAt": "2026-02-08T10:30:00Z"
    }
  ]
}
```

**Status Codes:**
- `200 OK` - Refunds retrieved
- `500 Internal Server Error` - Server error

---

### 8. Get User Refunds

**GET** `/pro-rata/user/:userId`

Retrieve all pro-rata refunds for a user.

**Parameters:**
- `userId` (path) - User ID

**Query Parameters:**
- `status` (optional) - Filter by status (pending/approved/processing/completed/failed/rejected)
- `limit` (optional) - Number of records (default: 50)
- `offset` (optional) - Records to skip (default: 0)

**Response:**
```json
{
  "userId": "user-123",
  "summary": {
    "total": 10,
    "pending": 2,
    "approved": 1,
    "completed": 5,
    "rejected": 2,
    "totalRefunded": 150.00
  },
  "filter": null,
  "limit": 50,
  "offset": 0,
  "returned": 10,
  "refunds": [
    {
      "_id": "refund-456",
      "subscriptionId": "sub-123",
      "refundAmount": 20.00,
      "refundStatus": "completed"
    }
  ]
}
```

**Status Codes:**
- `200 OK` - Refunds retrieved
- `500 Internal Server Error` - Server error

---

### 9. Get Refunds by Status

**GET** `/pro-rata/status/:status`

Retrieve refunds filtered by status.

**Parameters:**
- `status` (path) - Refund status (pending/approved/processing/completed/failed/rejected)

**Response:**
```json
{
  "status": "pending",
  "totalCount": 8,
  "refunds": [
    {
      "_id": "refund-456",
      "subscriptionId": "sub-123",
      "refundAmount": 20.00,
      "refundStatus": "pending",
      "createdAt": "2026-02-08T10:30:00Z"
    }
  ]
}
```

**Status Codes:**
- `200 OK` - Refunds retrieved
- `400 Bad Request` - Invalid status
- `500 Internal Server Error` - Server error

---

### 10. Get Refund Statistics

**GET** `/pro-rata/statistics`

Get refund statistics and metrics.

**Query Parameters:**
- `creatorId` (optional) - Filter by creator
- `status` (optional) - Filter by status
- `dateFrom` (optional) - Start date (ISO 8601)
- `dateTo` (optional) - End date (ISO 8601)

**Response:**
```json
{
  "success": true,
  "statistics": {
    "totalRefunds": 150,
    "byStatus": {
      "pending": 5,
      "approved": 3,
      "processing": 2,
      "completed": 130,
      "failed": 5,
      "rejected": 5
    },
    "totalAmount": {
      "requested": 3500.00,
      "completed": 3200.00
    },
    "averageRefund": "23.33",
    "averageRefundPercentage": "77.80"
  }
}
```

**Status Codes:**
- `200 OK` - Statistics retrieved
- `500 Internal Server Error` - Server error

---

### 11. Get Subscription Refund

**GET** `/pro-rata/subscription/:subscriptionId`

Get refund for a specific subscription.

**Parameters:**
- `subscriptionId` (path) - Subscription ID

**Response:**
```json
{
  "subscriptionId": "sub-123",
  "refund": {
    "_id": "refund-456",
    "refundAmount": 20.00,
    "refundStatus": "completed"
  }
}
```

**Status Codes:**
- `200 OK` - Refund retrieved
- `404 Not Found` - No refund found
- `500 Internal Server Error` - Server error

---

### 12. Get All Pending Refunds (Admin)

**GET** `/pro-rata/pending/all`

Retrieve all pending refunds across all creators (admin endpoint).

**Query Parameters:**
- `limit` (optional) - Number of records (default: 100)
- `offset` (optional) - Records to skip (default: 0)

**Response:**
```json
{
  "total": 20,
  "limit": 100,
  "offset": 0,
  "returned": 20,
  "refunds": [
    {
      "_id": "refund-456",
      "subscriptionId": "sub-123",
      "userId": "user-123",
      "creatorId": "creator-456",
      "refundAmount": 20.00,
      "refundStatus": "pending"
    }
  ]
}
```

**Status Codes:**
- `200 OK` - Refunds retrieved
- `500 Internal Server Error` - Server error

---

### 13. Bulk Approve Refunds (Admin)

**POST** `/pro-rata/bulk-approve`

Bulk approve multiple refunds (admin endpoint).

**Request Body:**
```json
{
  "refundIds": ["refund-1", "refund-2", "refund-3"],
  "approvedBy": "admin-user-id"
}
```

**Response:**
```json
{
  "message": "Bulk approval completed: 3 approved, 0 failed",
  "successful": 3,
  "failed": 0,
  "results": [
    {
      "success": true,
      "refund": { "_id": "refund-1", "refundStatus": "approved" }
    }
  ]
}
```

**Status Codes:**
- `200 OK` - Bulk approval completed
- `400 Bad Request` - Missing refundIds array
- `500 Internal Server Error` - Server error

---

## Refund Status Guide

| Status | Description | Next Action |
|--------|-------------|-------------|
| **pending** | Awaiting approval | Approve or reject |
| **approved** | Approved for processing | Process refund |
| **processing** | Blockchain transaction submitted | Monitor processing |
| **completed** | Successfully refunded | No action needed |
| **failed** | Transaction failed | Retry or reject |
| **rejected** | Refund rejected | No action needed |

---

## Refund Calculation Examples

### Example 1: Early Cancellation (Low Usage)
```
Original Price: $30
Subscription Duration: 30 days
Cancellation Date: Day 5
Usage: 5/30 = 16.7%
Refund: (30 - 5) / 30 × $30 = $25
```

### Example 2: Mid-Cancellation
```
Original Price: $50
Subscription Duration: 30 days
Cancellation Date: Day 15
Usage: 15/30 = 50%
Refund: (30 - 15) / 30 × $50 = $25
```

### Example 3: Late Cancellation (High Usage)
```
Original Price: $99.99
Subscription Duration: 30 days
Cancellation Date: Day 28
Usage: 28/30 = 93.3%
Refund: (30 - 28) / 30 × $99.99 = $6.67
```

---

## Error Responses

### 400 Bad Request

```json
{
  "success": false,
  "message": "Subscription is already cancelled",
  "subscriptionId": "sub-123"
}
```

### 404 Not Found

```json
{
  "success": false,
  "message": "Subscription not found"
}
```

### 500 Internal Server Error

```json
{
  "message": "Failed to cancel subscription",
  "error": "Database connection error"
}
```

---

## Best Practices

1. **Check Eligibility First**: Use `/refund-preview` to check eligibility before cancelling
2. **Preserve Audit Trail**: All refund states are logged for compliance
3. **Timely Processing**: Process approved refunds within 24 hours
4. **User Communication**: Notify users of refund status changes
5. **Batch Operations**: Use bulk approval for multiple refunds
6. **Monitor Refund Window**: Track days remaining in refund window
7. **Blockchain Safety**: Always verify transaction IDs on blockchain

---

## Refund Window

By default, users can request refunds within **30 days** of subscription purchase.

- **Refund Window**: 30 days (configurable per subscription)
- **Deadline**: Original purchase date + refund window days
- **Outside Window**: No refund eligible, but might be eligibility exception

---

## Webhook Events

The system can trigger events at key refund lifecycle points:

- `refund.initiated` - Refund request created
- `refund.approved` - Refund approved for processing
- `refund.processing` - Blockchain transaction submitted
- `refund.completed` - Refund successfully issued
- `refund.failed` - Refund processing failed
- `refund.rejected` - Refund rejected

---

## Rate Limiting

API endpoints implement rate limiting:
- **Default**: 100 requests/minute per user
- **Bulk Operations**: 10 requests/minute per user
- **Admin**: 500 requests/minute

---

## Support

For API support and questions:
- **Email**: api-support@example.com
- **Documentation**: https://docs.example.com/pro-rata-refunds
- **Status Page**: https://status.example.com
