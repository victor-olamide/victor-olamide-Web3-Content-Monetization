# Subscription Renewal API Documentation

## Overview

This document describes the comprehensive API endpoints for managing subscription renewals, including automatic renewal processing, grace period handling, and renewal history tracking.

## Base URL

```
http://localhost:5000/api/subscriptions
```

## Authentication

All endpoints require standard authentication headers:
```
Authorization: Bearer <token>
```

---

## Endpoints

### 1. Get User Subscriptions

**GET** `/:user`

Retrieve all active and inactive subscriptions for a specific user.

**Parameters:**
- `user` (path) - User ID

**Response:**
```json
[
  {
    "_id": "sub-123",
    "user": "user-123",
    "creator": "creator-456",
    "tierId": "tier-789",
    "price": 9.99,
    "expiryDate": "2024-12-31T00:00:00Z",
    "autoRenewal": true,
    "gracePeriodDays": 7,
    "renewalStatus": "active",
    "status": "active",
    "createdAt": "2024-01-01T00:00:00Z"
  }
]
```

**Status Codes:**
- `200 OK` - Subscriptions retrieved successfully
- `404 Not Found` - User not found
- `500 Internal Server Error` - Server error

---

### 2. Get User Subscription Status Dashboard

**GET** `/:user/status`

Get a comprehensive status dashboard for all subscriptions of a user.

**Parameters:**
- `user` (path) - User ID

**Response:**
```json
{
  "user": "user-123",
  "totalSubscriptions": 5,
  "activeCount": 3,
  "expiringCount": 1,
  "expiredCount": 1,
  "subscriptions": [
    {
      "subscriptionId": "sub-123",
      "status": "active",
      "renewalStatus": "active",
      "expiryDate": "2024-12-31T00:00:00Z",
      "daysUntilExpiry": 120,
      "autoRenewal": true
    }
  ],
  "statistics": {
    "totalSpent": 99.90,
    "averagePrice": 9.99,
    "oldestSubscription": "2023-01-01T00:00:00Z",
    "mostRecentRenewal": "2024-10-15T10:30:00Z"
  }
}
```

---

### 3. Get Subscription with Renewal Details

**GET** `/subscription/:id`

Retrieve detailed information about a specific subscription including renewal history.

**Parameters:**
- `id` (path) - Subscription ID

**Response:**
```json
{
  "subscription": {
    "_id": "sub-123",
    "user": "user-123",
    "creator": "creator-456",
    "tierId": "tier-789",
    "price": 9.99,
    "expiryDate": "2024-12-31T00:00:00Z",
    "autoRenewal": true,
    "gracePeriodDays": 7,
    "graceExpiresAt": null,
    "renewalAttempts": 0,
    "lastRenewalAttempt": null,
    "nextRenewalDate": "2024-12-28T00:00:00Z",
    "renewalTxId": null,
    "status": "active",
    "createdAt": "2024-01-01T00:00:00Z"
  },
  "renewalStatus": "active",
  "renewalHistory": [
    {
      "_id": "renewal-123",
      "status": "completed",
      "renewalType": "automatic",
      "amount": 9.99,
      "transactionId": "tx-abc123",
      "completedAt": "2024-09-30T10:15:00Z"
    }
  ]
}
```

**Status Codes:**
- `200 OK` - Subscription retrieved successfully
- `404 Not Found` - Subscription not found
- `500 Internal Server Error` - Server error

---

### 4. Initiate Manual Renewal

**POST** `/:id/renew`

Trigger a manual renewal for a subscription.

**Parameters:**
- `id` (path) - Subscription ID

**Request Body:**
```json
{
  "renewalType": "manual"
}
```

**Response:**
```json
{
  "message": "Renewal initiated successfully",
  "renewal": {
    "_id": "renewal-456",
    "subscriptionId": "sub-123",
    "status": "pending",
    "renewalType": "manual",
    "amount": 9.99,
    "attemptNumber": 1,
    "maxAttempts": 3,
    "createdAt": "2024-10-20T14:30:00Z"
  }
}
```

**Status Codes:**
- `200 OK` - Renewal initiated successfully
- `400 Bad Request` - Invalid subscription or renewal not eligible
- `404 Not Found` - Subscription not found
- `500 Internal Server Error` - Server error

---

### 5. Complete Renewal with Transaction

**POST** `/renewal/:renewalId/complete`

Mark a renewal as completed with blockchain transaction ID.

**Parameters:**
- `renewalId` (path) - Renewal ID

**Request Body:**
```json
{
  "txId": "tx-abc123def456"
}
```

**Response:**
```json
{
  "message": "Renewal completed successfully",
  "renewal": {
    "_id": "renewal-456",
    "subscriptionId": "sub-123",
    "status": "completed",
    "transactionId": "tx-abc123def456",
    "amount": 9.99,
    "completedAt": "2024-10-20T14:35:00Z"
  }
}
```

**Status Codes:**
- `200 OK` - Renewal completed successfully
- `400 Bad Request` - Invalid transaction ID or renewal status
- `404 Not Found` - Renewal not found
- `500 Internal Server Error` - Server error

**Required Fields:**
- `txId` - Blockchain transaction ID (required)

---

### 6. Handle Renewal Failure

**POST** `/renewal/:renewalId/fail`

Report a renewal failure and optionally schedule a retry.

**Parameters:**
- `renewalId` (path) - Renewal ID

**Request Body:**
```json
{
  "failureReason": "Insufficient funds"
}
```

**Response:**
```json
{
  "message": "Renewal failed, scheduled for retry on 2024-10-21T14:30:00Z",
  "renewal": {
    "_id": "renewal-456",
    "subscriptionId": "sub-123",
    "status": "pending",
    "failureReason": "Insufficient funds",
    "attemptNumber": 2,
    "maxAttempts": 3,
    "nextRetryDate": "2024-10-21T14:30:00Z"
  },
  "willRetry": true
}
```

**Status Codes:**
- `200 OK` - Failure recorded
- `400 Bad Request` - Invalid renewal or max retries exceeded
- `404 Not Found` - Renewal not found
- `500 Internal Server Error` - Server error

**Retry Logic:**
- Default maximum attempts: 3
- Retry interval: 24 hours
- After max retries exhausted, renewal marked as permanently failed
- User can apply grace period or manually renew

---

### 7. Get Renewal History

**GET** `/:id/renewals`

Retrieve complete renewal history for a subscription.

**Parameters:**
- `id` (path) - Subscription ID

**Query Parameters:**
- `limit` (optional) - Number of records to return (default: 50)
- `offset` (optional) - Number of records to skip (default: 0)
- `status` (optional) - Filter by status (pending/processing/completed/failed)

**Response:**
```json
{
  "subscriptionId": "sub-123",
  "totalRenewals": 12,
  "renewals": [
    {
      "_id": "renewal-456",
      "subscriptionId": "sub-123",
      "status": "completed",
      "renewalType": "automatic",
      "amount": 9.99,
      "transactionId": "tx-abc123def456",
      "attemptNumber": 1,
      "previousExpiryDate": "2024-09-30T00:00:00Z",
      "newExpiryDate": "2024-10-31T00:00:00Z",
      "completedAt": "2024-10-01T10:15:00Z"
    }
  ]
}
```

**Status Codes:**
- `200 OK` - History retrieved successfully
- `404 Not Found` - Subscription not found
- `500 Internal Server Error` - Server error

---

### 8. Cancel Subscription

**POST** `/:id/cancel`

Cancel an active subscription with optional reason.

**Parameters:**
- `id` (path) - Subscription ID

**Request Body:**
```json
{
  "reason": "No longer interested in content"
}
```

**Response:**
```json
{
  "message": "Subscription cancelled successfully",
  "subscription": {
    "_id": "sub-123",
    "status": "cancelled",
    "cancelledAt": "2024-10-20T14:40:00Z",
    "cancelReason": "No longer interested in content",
    "lastAccessDate": "2024-10-20T08:00:00Z"
  }
}
```

**Status Codes:**
- `200 OK` - Subscription cancelled successfully
- `400 Bad Request` - Subscription already cancelled
- `404 Not Found` - Subscription not found
- `500 Internal Server Error` - Server error

**Notes:**
- Default reason: "User requested cancellation"
- Once cancelled, subscription cannot be renewed automatically
- User retains access until current expiry date
- If in grace period, access ends immediately

---

### 9. Apply Grace Period

**POST** `/:id/grace-period`

Manually apply grace period to an expired subscription.

**Parameters:**
- `id` (path) - Subscription ID

**Request Body:** (empty)

**Response:**
```json
{
  "message": "Grace period applied successfully",
  "subscription": {
    "_id": "sub-123",
    "status": "active",
    "expiryDate": "2024-10-20T00:00:00Z",
    "graceExpiresAt": "2024-10-27T00:00:00Z",
    "gracePeriodDays": 7
  },
  "gracePeriod": {
    "startedAt": "2024-10-20T14:45:00Z",
    "expiresAt": "2024-10-27T00:00:00Z",
    "daysRemaining": 7
  }
}
```

**Status Codes:**
- `200 OK` - Grace period applied successfully
- `400 Bad Request` - Subscription not eligible (e.g., not expired)
- `404 Not Found` - Subscription not found
- `500 Internal Server Error` - Server error

---

### 10. Get Renewals by Status

**GET** `/renewals/status/:status`

Retrieve all renewals with a specific status.

**Parameters:**
- `status` (path) - Renewal status (pending/processing/completed/failed/cancelled)

**Query Parameters:**
- `limit` (optional) - Number of records (default: 50)
- `offset` (optional) - Records to skip (default: 0)
- `creatorId` (optional) - Filter by creator
- `dateFrom` (optional) - Filter from date (ISO 8601)
- `dateTo` (optional) - Filter to date (ISO 8601)

**Response:**
```json
{
  "status": "completed",
  "totalRenewals": 156,
  "renewals": [
    {
      "_id": "renewal-456",
      "subscriptionId": "sub-123",
      "userId": "user-123",
      "creatorId": "creator-456",
      "status": "completed",
      "amount": 9.99,
      "completedAt": "2024-10-20T10:15:00Z"
    }
  ]
}
```

**Valid Statuses:**
- `pending` - Awaiting processing
- `processing` - Currently being processed
- `completed` - Successfully completed
- `failed` - Permanently failed
- `cancelled` - Cancelled by user

**Status Codes:**
- `200 OK` - Renewals retrieved successfully
- `400 Bad Request` - Invalid status
- `500 Internal Server Error` - Server error

---

### 11. Get All Pending Renewals

**GET** `/pending/all`

Retrieve all renewals currently pending or processing.

**Query Parameters:**
- `limit` (optional) - Number of records (default: 100)
- `offset` (optional) - Records to skip (default: 0)

**Response:**
```json
{
  "totalPending": 42,
  "renewals": [
    {
      "_id": "renewal-456",
      "subscriptionId": "sub-123",
      "userId": "user-123",
      "creatorId": "creator-456",
      "status": "pending",
      "amount": 9.99,
      "attemptNumber": 1,
      "nextRetryDate": "2024-10-21T14:30:00Z",
      "createdAt": "2024-10-20T14:30:00Z"
    }
  ]
}
```

**Status Codes:**
- `200 OK` - Pending renewals retrieved
- `500 Internal Server Error` - Server error

---

## Renewal Status Lifecycle

```
┌─────────────────────────────────────────────────────────┐
│                    ACTIVE SUBSCRIPTION                   │
│              (expires in > 3 days)                       │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
          ┌─────────────────────┐
          │  EXPIRING-SOON      │
          │ (expires in ≤ 3 days)│
          │ - auto renewal      │
          │   initiated         │
          └────────┬────────────┘
                   │
          ┌────────▼──────────┐
          │ RENEWAL PENDING   │
          │ - waiting for     │
          │   transaction     │
          └────────┬──────────┘
                   │
      ┌────────────┴────────────┐
      ▼                         ▼
   SUCCESS            ┌─────────────────┐
   │                  │ RENEWAL FAILED  │
   │                  │ - retry attempt │
   │                  │ - max 3 times   │
   │                  └────────┬────────┘
   │                           │
   │                    ┌──────▼──────┐
   │                    │ GRACE PERIOD│
   │                    │ (7 days)    │
   │                    └──────┬──────┘
   │                           │
   ▼                           ▼
┌─────────────────┐    ┌──────────────┐
│ RENEWED         │    │ EXPIRED      │
│ SUBSCRIPTION    │    │ (past grace) │
│ (new cycle)     │    └──────────────┘
└─────────────────┘
```

---

## Grace Period Handling

The system automatically handles grace periods for expired subscriptions:

1. **Grace Period Activation**: When a subscription expires, a grace period is automatically applied
2. **Duration**: Default 7 days (configurable per subscription tier)
3. **User Access**: Subscribers can access content during grace period
4. **Renewal Opportunities**: Users can renew at any point during grace period
5. **Expiration**: After grace period ends, subscription is marked expired and access denied

### Grace Period Flow

```
expiryDate                          graceExpiresAt
│                                   │
▼                                   ▼
└─────────────────────────────────────┘
   GRACE PERIOD (7 days default)
   
   ├─ User can still access content
   ├─ User can renew subscription
   ├─ Automatic renewal retries continue
   └─ After 7 days, subscription fully expires
```

---

## Retry Logic

Failed renewals follow automatic retry schedule:

- **First Failure**: Scheduled for retry 24 hours later
- **Second Failure**: Scheduled for retry 24 hours later
- **Third Failure**: Marked as permanently failed
- **After Permanent Failure**:
  - Subscription marked as `renewal-failed`
  - User notified
  - User can manually renew
  - Grace period applies if subscription expired

**Maximum Retries**: 3 (configurable)
**Retry Interval**: 24 hours (configurable)

---

## Error Responses

### 400 Bad Request

```json
{
  "message": "Subscription not eligible for renewal",
  "code": "RENEWAL_NOT_ELIGIBLE",
  "details": {
    "reason": "autoRenewal is disabled",
    "subscription": {
      "autoRenewal": false,
      "status": "active"
    }
  }
}
```

### 404 Not Found

```json
{
  "message": "Subscription not found",
  "code": "SUBSCRIPTION_NOT_FOUND",
  "subscriptionId": "sub-123"
}
```

### 500 Internal Server Error

```json
{
  "message": "Failed to process renewal",
  "code": "RENEWAL_PROCESSING_ERROR",
  "details": "Error details for debugging"
}
```

---

## Renewal Events and Webhooks

The system triggers events at key renewal lifecycle points:

- `renewal.initiated` - Renewal process started
- `renewal.processing` - Blockchain transaction submitted
- `renewal.completed` - Subscription renewed successfully
- `renewal.failed` - Renewal failed, will retry
- `renewal.permanently_failed` - Max retries exhausted
- `grace_period.applied` - Grace period activated
- `grace_period.expired` - Grace period ended, subscription expired
- `subscription.cancelled` - User cancelled subscription

### Webhook Payload Example

```json
{
  "event": "renewal.completed",
  "timestamp": "2024-10-20T10:15:00Z",
  "subscriptionId": "sub-123",
  "userId": "user-123",
  "renewal": {
    "renewalId": "renewal-456",
    "amount": 9.99,
    "transactionId": "tx-abc123def456",
    "newExpiryDate": "2024-11-20T00:00:00Z"
  }
}
```

---

## Rate Limiting

API endpoints implement rate limiting:

- **Default**: 100 requests per minute per user
- **Burst**: 200 requests per minute for premium users
- **Headers**:
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset`

---

## Best Practices

1. **Automatic Renewal**: Enable `autoRenewal` for seamless subscription continuity
2. **Grace Period**: Always allow grace period for subscriber retention
3. **Retry Handling**: Implement notifications for failed renewals
4. **Monitoring**: Track renewal metrics and success rates
5. **User Communication**: Notify users of upcoming expirations
6. **Error Handling**: Implement proper error recovery in client applications
7. **Timezone**: Use UTC timestamps consistently

---

## Support

For API support and issues, contact: api-support@example.com
