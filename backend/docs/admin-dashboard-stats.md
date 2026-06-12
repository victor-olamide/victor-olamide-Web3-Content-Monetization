# Admin Dashboard Stats API

## Endpoint

- `GET /api/admin/stats`

## Requirements

- Restricted to users with the `admin` role
- Returns platform-wide metrics including:
  - `totalUsers`
  - `totalRevenue`
  - `totalContent`
  - `activeSubscriptions`
- Also includes nested breakdowns for users, content, revenue, subscriptions, and activity.

## Response shape

```json
{
  "success": true,
  "data": {
    "totalUsers": 123,
    "totalRevenue": 456.78,
    "totalContent": 42,
    "activeSubscriptions": 10,
    "users": {
      "total": 123,
      "active": 100,
      "new": 10,
      "suspended": 3
    },
    "content": {
      "total": 42,
      "active": 40,
      "removed": 2
    },
    "revenue": {
      "total": 456.78,
      "platformFees": 45.67,
      "creatorPayouts": 411.11,
      "totalTransactions": 28
    },
    "subscriptions": {
      "active": 10
    },
    "activity": {
      "purchasesToday": 5
    },
    "generatedAt": "2026-05-26T15:00:00.000Z"
  }
}
```
