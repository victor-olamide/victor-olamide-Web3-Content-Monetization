# Multi-Tier Subscription API Documentation

## Overview

This document describes the API endpoints for managing multi-tier subscriptions. Creators can create multiple subscription tiers with different pricing, benefits, and features.

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

## Core Concepts

### Subscription Tier

A **subscription tier** represents a pricing level with specific benefits and features. Creators can offer multiple tiers (e.g., Basic, Standard, Premium) at different price points.

### Tier Hierarchy

Tiers are organized by position (0=entry-level, 1+=premium). Each tier can have:
- Different price points
- Different features/benefits
- Different access levels
- Subscriber limits
- Trial periods

### Tier Visibility

- **Public** - Visible to all users
- **Private** - Invite-only access
- **Hidden** - Creator admin only

---

## Endpoints

### 1. Create Subscription Tier

**POST** `/tiers`

Create a new subscription tier for a creator.

**Request Body:**
```json
{
  "creatorId": "creator-123",
  "name": "Premium",
  "description": "Premium subscription with exclusive access",
  "price": 9.99,
  "icon": "https://example.com/premium-icon.png",
  "position": 1,
  "isPopular": true,
  "trialDays": 7,
  "benefits": [
    { "feature": "Exclusive Videos", "description": "Access to exclusive content" },
    { "feature": "Early Access", "description": "Early access to new content" }
  ],
  "accessLevel": 2,
  "maxSubscribers": 1000,
  "downloadLimit": 50,
  "visibility": "public"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Subscription tier created successfully",
  "tier": {
    "_id": "tier-123",
    "creatorId": "creator-123",
    "name": "Premium",
    "price": 9.99,
    "position": 1,
    "subscriberCount": 0,
    "isActive": true
  }
}
```

**Status Codes:**
- `201 Created` - Tier created successfully
- `400 Bad Request` - Invalid data
- `500 Internal Server Error` - Server error

---

### 2. Get Creator's Tiers

**GET** `/creators/:creatorId/tiers`

Retrieve all subscription tiers for a creator.

**Query Parameters:**
- `includeInactive` (boolean) - Include inactive tiers (default: false)
- `onlyVisible` (boolean) - Only visible tiers (default: true)
- `sortBy` (string) - Sort field: position/price/createdAt (default: position)
- `ascending` (boolean) - Sort order (default: true)

**Response:**
```json
{
  "success": true,
  "creatorId": "creator-123",
  "count": 3,
  "tiers": [
    {
      "_id": "tier-1",
      "name": "Basic",
      "price": 4.99,
      "position": 0,
      "subscriberCount": 100,
      "isPopular": false
    },
    {
      "_id": "tier-2",
      "name": "Premium",
      "price": 9.99,
      "position": 1,
      "subscriberCount": 50,
      "isPopular": true
    }
  ]
}
```

---

### 3. Get Specific Tier

**GET** `/tiers/:tierId`

Retrieve details of a specific tier.

**Response:**
```json
{
  "success": true,
  "tier": {
    "_id": "tier-123",
    "name": "Premium",
    "description": "Premium subscription",
    "price": 9.99,
    "benefits": [
      { "feature": "Exclusive Videos", "included": true },
      { "feature": "Early Access", "included": true }
    ],
    "accessLevel": 2,
    "subscriberCount": 50,
    "maxSubscribers": 1000,
    "isActive": true,
    "isPopular": true,
    "trialDays": 7
  }
}
```

---

### 4. Update Tier

**PUT** `/tiers/:tierId`

Update a subscription tier.

**Request Body:**
```json
{
  "name": "Premium Plus",
  "price": 14.99,
  "description": "Updated description",
  "isPopular": false,
  "benefits": [
    { "feature": "Everything in Premium", "included": true },
    { "feature": "Priority Support", "included": true }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Tier updated successfully",
  "tier": {
    "_id": "tier-123",
    "name": "Premium Plus",
    "price": 14.99
  }
}
```

---

### 5. Delete Tier

**DELETE** `/tiers/:tierId`

Delete or archive a subscription tier.

**Query Parameters:**
- `hardDelete` (boolean) - Permanently delete (default: false, soft delete)

**Soft Delete (Deactivate & Hide):**
```
DELETE /tiers/tier-123
```

**Hard Delete (Permanent):**
```
DELETE /tiers/tier-123?hardDelete=true
```

**Response:**
```json
{
  "success": true,
  "message": "Tier deleted successfully"
}
```

**Note:** Cannot delete tier with active subscribers unless `hardDelete=true`

---

### 6. Get Tier Hierarchy

**GET** `/creators/:creatorId/hierarchy`

Get organized view of all tiers for a creator.

**Response:**
```json
{
  "success": true,
  "hierarchy": {
    "creatorId": "creator-123",
    "tiers": [
      {
        "id": "tier-1",
        "position": 0,
        "name": "Basic",
        "price": 4.99,
        "benefits": ["Standard Content", "Community Access"],
        "subscribers": 100,
        "availableSlots": Infinity,
        "isFull": false
      },
      {
        "id": "tier-2",
        "position": 1,
        "name": "Premium",
        "price": 9.99,
        "benefits": ["Exclusive Videos", "Early Access"],
        "subscribers": 50,
        "availableSlots": 950,
        "isFull": false
      }
    ],
    "minPrice": 4.99,
    "maxPrice": 9.99,
    "totalSubscribers": 150,
    "totalRevenue": 998.50
  }
}
```

---

### 7. Compare Tiers

**GET** `/tiers/compare`

Compare features between two tiers.

**Query Parameters:**
- `tierId1` (required) - First tier ID
- `tierId2` (required) - Second tier ID

**Response:**
```json
{
  "success": true,
  "comparison": {
    "tier1": {
      "id": "tier-1",
      "name": "Basic",
      "price": 4.99,
      "benefits": ["Standard Content"]
    },
    "tier2": {
      "id": "tier-2",
      "name": "Premium",
      "price": 9.99,
      "benefits": ["Standard Content", "Exclusive Videos", "Early Access"]
    },
    "tier1Exclusive": [],
    "tier2Exclusive": ["Exclusive Videos", "Early Access"],
    "commonFeatures": ["Standard Content"],
    "priceDifference": 5.00
  }
}
```

---

### 8. Get Tier Suggestions

**GET** `/creators/:creatorId/suggestions`

Get optimization suggestions for tier structure.

**Response:**
```json
{
  "success": true,
  "suggestions": {
    "optimizeTiers": [
      "Tier 'Premium' is at capacity - consider increasing subscriber limit"
    ],
    "addTier": null,
    "removeTier": null
  }
}
```

---

### 9. Reorder Tiers

**POST** `/creators/:creatorId/reorder`

Reorder tiers for display.

**Request Body:**
```json
{
  "tierPositions": [
    { "tierId": "tier-2", "position": 0 },
    { "tierId": "tier-1", "position": 1 },
    { "tierId": "tier-3", "position": 2 }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "3 tiers reordered successfully",
  "tiers": [
    { "_id": "tier-2", "position": 0 },
    { "_id": "tier-1", "position": 1 },
    { "_id": "tier-3", "position": 2 }
  ]
}
```

---

### 10. Get Tier Statistics

**GET** `/creators/:creatorId/statistics`

Get performance metrics for creator's tiers.

**Response:**
```json
{
  "success": true,
  "statistics": {
    "totalTiers": 3,
    "activeTiers": 3,
    "totalSubscribers": 250,
    "totalRevenue": 2499.50,
    "averagePrice": 8.33,
    "averageChurn": 4.5,
    "popularTiers": 1,
    "fullTiers": 0,
    "byPosition": {
      "0": {
        "name": "Basic",
        "price": 4.99,
        "subscribers": 150,
        "revenue": 748.50
      },
      "1": {
        "name": "Premium",
        "price": 9.99,
        "subscribers": 80,
        "revenue": 799.20
      }
    }
  }
}
```

---

### 11. Activate Tier

**POST** `/tiers/:tierId/activate`

Activate a deactivated tier.

**Response:**
```json
{
  "success": true,
  "message": "Tier activated successfully",
  "tier": {
    "_id": "tier-123",
    "isActive": true
  }
}
```

---

### 12. Deactivate Tier

**POST** `/tiers/:tierId/deactivate`

Deactivate a tier (prevents new purchases).

**Response:**
```json
{
  "success": true,
  "message": "Tier deactivated successfully",
  "tier": {
    "_id": "tier-123",
    "isActive": false
  }
}
```

---

### 13. Toggle Popular Status

**POST** `/tiers/:tierId/toggle-popular`

Mark/unmark a tier as popular (featured).

**Response:**
```json
{
  "success": true,
  "message": "Tier marked as popular",
  "tier": {
    "_id": "tier-123",
    "isPopular": true
  }
}
```

---

## Tier Features & Benefits

### Standard Features

| Field | Type | Description |
|-------|------|-------------|
| name | String | Tier name (e.g., "Basic", "Premium") |
| description | String | Tier description and overview |
| price | Number | Monthly subscription price |
| position | Number | Display order (0=first, higher=later) |
| isPopular | Boolean | Mark as recommended/featured |

### Access & Limits

| Field | Type | Description |
|-------|------|-------------|
| accessLevel | Number | 1=basic, 10=exclusive (higher=more access) |
| maxSubscribers | Number | Subscriber limit (null=unlimited) |
| downloadLimit | Number | Max downloads/month (null=unlimited) |
| contentAccess | Array | Types: all, exclusive, early-access |

### Trial & Incentives

| Field | Type | Description |
|-------|------|-------------|
| trialDays | Number | Free trial period |
| introductoryPrice | Object | { price, duration in months } |
| upgradeDiscount | Number | Discount % for upgrades (0-100) |

### Visibility & Status

| Field | Type | Description |
|-------|------|-------------|
| isActive | Boolean | Available for purchase |
| isVisible | Boolean | Publicly listed |
| visibility | String | public / private / hidden |
| waitlistEnabled | Boolean | Enable waitlist when full |

---

## Error Responses

### 400 Bad Request

```json
{
  "success": false,
  "message": "Creator ID, name, description, and price are required"
}
```

### 404 Not Found

```json
{
  "success": false,
  "message": "Tier not found"
}
```

### 500 Internal Server Error

```json
{
  "success": false,
  "message": "Error creating subscription tier",
  "error": "Database connection error"
}
```

---

## Best Practices

1. **Tier Positioning**: Use position 0 for entry-level (cheapest), increasing positions for premium tiers
2. **Benefits Clarity**: Clearly describe differences between tiers
3. **Popular Marking**: Mark your most attractive tier as popular
4. **Pricing Strategy**: Ensure tiers represent good value at each price point
5. **Limits**: Set reasonable subscriber limits for exclusive tiers
6. **Trial Periods**: Use trials to encourage conversions
7. **Visibility**: Archive inactive tiers instead of deleting them
8. **Monitoring**: Check statistics regularly to optimize tier structure

---

## Tier Recommendations

### Typical Creator Structure

```
Tier 0 (Basic) - $4.99/month
├─ Standard content
├─ Community access
└─ 30-day subscriber limit

Tier 1 (Standard) - $9.99/month [POPULAR]
├─ Everything in Basic
├─ Exclusive monthly video
├─ Early content access
└─ 14-day subscriber limit

Tier 2 (Premium) - $19.99/month
├─ Everything in Standard
├─ Exclusive weekly videos
├─ Direct messaging
├─ 7-day subscriber limit
└─ Unlimited downloads
```

---

## Upgrade/Downgrade Flow

```
User subscribes to Tier 1
        ↓
User wants to upgrade to Tier 2
        ↓
Calculate pro-rata difference
        ↓
Charge upgrade fee (if any)
        ↓
Update subscription tier
        ↓
Grant new tier benefits
```

---

## Rate Limiting

API endpoints implement rate limiting:
- **Standard**: 100 requests/minute per user
- **Tier Creation**: 10 requests/minute per creator
- **Admin**: 500 requests/minute

---

## Support

For API support:
- **Email**: api-support@example.com
- **Documentation**: https://docs.example.com/tiers
- **Status**: https://status.example.com
