# Subscription Tier Management API Documentation

## Overview

The Subscription Tier Management API provides comprehensive CRUD operations for managing subscription tiers in the platform. This API allows creators to create, update, delete, and manage subscription tiers with features like pricing, benefits, analytics, and bulk operations.

## Base URL
```
/api
```

## Authentication
All endpoints require JWT authentication. Include the JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

## Endpoints

### Tier CRUD Operations

#### 1. Create Subscription Tier
**POST** `/subscription-tiers`

Create a new subscription tier for a creator.

**Request Body:**
```json
{
  "creatorId": "string",
  "name": "string (required)",
  "description": "string (required)",
  "price": "number (required)",
  "benefits": [
    {
      "feature": "string",
      "included": "boolean"
    }
  ],
  "trialDays": "number",
  "visibility": "public|private|hidden",
  "currency": "USD|EUR|GBP|CAD|AUD",
  "billingCycle": "monthly|quarterly|annual",
  "maxSubscribers": "number|null",
  "upgradeDiscount": "number"
}
```

**Response (201):**
```json
{
  "success": true,
  "tier": {
    "_id": "string",
    "creatorId": "string",
    "name": "string",
    "description": "string",
    "price": "number",
    "position": "number",
    "isActive": true,
    "isVisible": true,
    "createdAt": "date",
    "updatedAt": "date"
  }
}
```

#### 2. Get Creator Tiers
**GET** `/subscription-tiers/creator/:creatorId`

Retrieve all subscription tiers for a specific creator.

**Query Parameters:**
- `includeInactive` (boolean): Include inactive tiers (default: false)
- `onlyVisible` (boolean): Only return visible tiers (default: true)
- `sortBy` (string): Sort field (default: 'position')
- `ascending` (boolean): Sort direction (default: true)

**Response (200):**
```json
{
  "success": true,
  "count": "number",
  "tiers": [
    {
      "_id": "string",
      "name": "string",
      "description": "string",
      "price": "number",
      "subscriberCount": "number",
      "revenueTotal": "number",
      "isPopular": "boolean",
      "isFull": "boolean"
    }
  ]
}
```

#### 3. Get Tier by ID
**GET** `/subscription-tiers/:tierId`

Retrieve a specific subscription tier.

**Response (200):**
```json
{
  "success": true,
  "tier": {
    "_id": "string",
    "creatorId": "string",
    "name": "string",
    "description": "string",
    "price": "number",
    "benefits": [],
    "subscriberCount": "number",
    "revenueTotal": "number"
  }
}
```

#### 4. Update Subscription Tier
**PUT** `/subscription-tiers/:tierId`

Update an existing subscription tier.

**Request Body:**
```json
{
  "name": "string",
  "description": "string",
  "price": "number",
  "benefits": [],
  "isVisible": "boolean",
  "trialDays": "number"
}
```

**Response (200):**
```json
{
  "success": true,
  "tier": {
    "_id": "string",
    "name": "string",
    "description": "string",
    "updatedAt": "date"
  }
}
```

#### 5. Delete Subscription Tier
**DELETE** `/subscription-tiers/:tierId`

Delete a subscription tier (soft delete by default).

**Query Parameters:**
- `hardDelete` (boolean): Permanently delete (default: false)

**Response (200):**
```json
{
  "success": true,
  "message": "Tier deleted successfully"
}
```

### Tier Benefits Management

#### 6. Add Benefit to Tier
**POST** `/tier-benefits/:tierId/benefits`

Add a benefit/feature to a subscription tier.

**Request Body:**
```json
{
  "feature": "string (required)",
  "description": "string",
  "included": "boolean (default: true)"
}
```

**Response (201):**
```json
{
  "success": true,
  "benefit": {
    "_id": "string",
    "feature": "string",
    "included": true
  }
}
```

#### 7. Get Tier Benefits
**GET** `/tier-benefits/:tierId/benefits`

Retrieve all benefits for a subscription tier.

**Response (200):**
```json
{
  "success": true,
  "benefits": [
    {
      "_id": "string",
      "feature": "string",
      "description": "string",
      "included": true
    }
  ]
}
```

### Tier Analytics and Metrics

#### 8. Get Tier Performance Metrics
**GET** `/tier-metrics/tiers/:tierId/metrics`

Get performance metrics for a specific tier.

**Query Parameters:**
- `startDate` (string): Start date (ISO format)
- `endDate` (string): End date (ISO format)

**Response (200):**
```json
{
  "success": true,
  "metrics": {
    "tierId": "string",
    "tierName": "string",
    "totalSubscribers": "number",
    "activeSubscribers": "number",
    "totalRevenue": "number",
    "averageRevenuePerSubscriber": "number",
    "churnRate": "number",
    "conversionRate": "number"
  }
}
```

#### 9. Get Creator Tier Analytics
**GET** `/tier-metrics/creators/:creatorId/analytics`

Get comprehensive analytics for all creator tiers.

**Response (200):**
```json
{
  "success": true,
  "analytics": {
    "totalTiers": "number",
    "totalSubscribers": "number",
    "totalRevenue": "number",
    "averageTierPrice": "number",
    "tierPerformance": [
      {
        "tierId": "string",
        "name": "string",
        "subscribers": "number",
        "revenue": "number",
        "isPopular": "boolean"
      }
    ]
  }
}
```

#### 10. Compare Tier Metrics
**GET** `/tier-metrics/tiers/compare/:tierId1/:tierId2/metrics`

Compare metrics between two tiers.

**Response (200):**
```json
{
  "success": true,
  "comparison": {
    "tier1": {
      "id": "string",
      "name": "string",
      "price": "number",
      "subscribers": "number",
      "revenue": "number"
    },
    "tier2": {
      "id": "string",
      "name": "string",
      "price": "number",
      "subscribers": "number",
      "revenue": "number"
    },
    "differences": {
      "priceDifference": "number",
      "subscriberDifference": "number",
      "revenueDifference": "number"
    }
  }
}
```

### Bulk Operations

#### 11. Bulk Create Tiers
**POST** `/tier-bulk/bulk/create`

Create multiple subscription tiers in bulk.

**Request Body:**
```json
{
  "tiers": [
    {
      "name": "string",
      "description": "string",
      "price": "number"
    }
  ]
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Successfully created X tiers",
  "createdTiers": [],
  "failedTiers": []
}
```

#### 12. Bulk Update Tiers
**PUT** `/tier-bulk/bulk/update`

Update multiple subscription tiers in bulk.

**Request Body:**
```json
{
  "updates": [
    {
      "tierId": "string",
      "updateData": {
        "name": "string",
        "price": "number"
      }
    }
  ]
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Successfully updated X tiers",
  "updatedTiers": [],
  "failedUpdates": []
}
```

#### 13. Bulk Delete Tiers
**DELETE** `/tier-bulk/bulk/delete`

Delete multiple subscription tiers in bulk.

**Request Body:**
```json
{
  "tierIds": ["string"]
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Successfully deleted X tiers",
  "deletedTiers": [],
  "failedDeletions": []
}
```

### Advanced Features

#### 14. Get Tier Hierarchy
**GET** `/subscription-tiers/hierarchy/:creatorId`

Get tier hierarchy with pricing and features.

**Response (200):**
```json
{
  "success": true,
  "hierarchy": {
    "creatorId": "string",
    "tiers": [
      {
        "id": "string",
        "position": "number",
        "name": "string",
        "price": "number",
        "benefits": [],
        "subscribers": "number"
      }
    ],
    "minPrice": "number",
    "maxPrice": "number",
    "totalSubscribers": "number",
    "totalRevenue": "number"
  }
}
```

#### 15. Get Tier Suggestions
**GET** `/subscription-tiers/suggestions/:creatorId`

Get AI-powered suggestions for tier optimization.

**Response (200):**
```json
{
  "success": true,
  "suggestions": {
    "optimizeTiers": ["string"],
    "addTier": "string",
    "removeTier": "string"
  }
}
```

#### 16. Reorder Tiers
**PUT** `/subscription-tiers/reorder/:creatorId`

Reorder subscription tiers by position.

**Request Body:**
```json
{
  "tierPositions": [
    {
      "tierId": "string",
      "position": "number"
    }
  ]
}
```

**Response (200):**
```json
{
  "success": true,
  "updated": "number",
  "tiers": []
}
```

## Error Responses

All endpoints return errors in the following format:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

### Common HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict (duplicate data)
- `429` - Too Many Requests
- `500` - Internal Server Error

## Rate Limiting

API endpoints are rate limited to prevent abuse:
- Standard operations: 100 requests per 15 minutes
- Bulk operations: 10 requests per 15 minutes
- Analytics endpoints: 50 requests per 15 minutes

## Caching

The API uses intelligent caching to improve performance:
- Tier data cached for 5 minutes
- Analytics data cached for 10 minutes
- Cache automatically invalidated on data changes

## Data Models

### SubscriptionTier
```javascript
{
  _id: ObjectId,
  creatorId: ObjectId,
  name: String,
  description: String,
  price: Number,
  benefits: [{
    feature: String,
    description: String,
    included: Boolean
  }],
  trialDays: Number,
  visibility: String,
  currency: String,
  billingCycle: String,
  maxSubscribers: Number,
  upgradeDiscount: Number,
  position: Number,
  subscriberCount: Number,
  revenueTotal: Number,
  averageChurn: Number,
  isPopular: Boolean,
  isFull: Boolean,
  isActive: Boolean,
  isVisible: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

## Webhooks

The API supports webhooks for real-time tier updates:
- `tier.created`
- `tier.updated`
- `tier.deleted`
- `tier.subscribed`
- `tier.unsubscribed`

Configure webhooks in the admin panel to receive notifications.

## SDKs and Libraries

Official SDKs available for:
- JavaScript/Node.js
- Python
- PHP
- Ruby
- Go

## Support

For API support, contact the development team or refer to the platform documentation.