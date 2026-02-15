# Issue #73: Tiered Rate Limiting - Quick Start Guide

## Getting Started

### 1. Check Your Rate Limit Status

```bash
curl http://localhost:5000/api/rate-limit/status
```

### 2. View Available Tiers

```bash
curl http://localhost:5000/api/rate-limit/tiers
```

### 3. Compare Tiers

```bash
curl "http://localhost:5000/api/rate-limit/tiers/compare?tierA=free&tierB=premium"
```

### 4. Check Rate Limit Headers

Every API response includes rate limit headers:

```bash
curl -v http://localhost:5000/api/content
# Look for X-RateLimit-* headers in the response
```

## Frontend Usage

### Using the Hook

```tsx
import { useRateLimit } from './hooks/useRateLimit';

function MyComponent() {
  const { status, isRateLimited, usagePercentage, currentTier } = useRateLimit();

  if (isRateLimited) {
    return <div>Rate limited! Please wait...</div>;
  }

  return <div>Usage: {usagePercentage}% ({currentTier} tier)</div>;
}
```

### Using the Component

```tsx
import { RateLimitStatus } from './components/RateLimitStatus';

// Compact mode
<RateLimitStatus compact />

// Detailed mode with tier comparison
<RateLimitStatus detailed showTierComparison />
```

### Rate-Limit-Aware Fetch

```tsx
import { fetchWithRetry } from './utils/rateLimitUtils';

const response = await fetchWithRetry('/api/content', {}, 3);
```

## Admin Operations

### View Global Statistics

```bash
curl http://localhost:5000/api/rate-limit/stats
```

### Reset a User's Rate Limits

```bash
curl -X POST http://localhost:5000/api/rate-limit/reset \
  -H "Content-Type: application/json" \
  -d '{"key": "wallet:SP123..."}'
```

### Update a User's Tier

```bash
curl -X PUT http://localhost:5000/api/rate-limit/tier \
  -H "Content-Type: application/json" \
  -d '{"key": "wallet:SP123...", "tier": "premium"}'
```

### Clean Up Expired Records

```bash
curl -X POST http://localhost:5000/api/rate-limit/cleanup
```

## Tier Limits Summary

| Tier | Requests/15min | Burst/min | Daily | Concurrent |
|------|---------------|-----------|-------|------------|
| Free | 100 | 20 | 1,000 | 5 |
| Basic | 500 | 50 | 5,000 | 10 |
| Premium | 2,000 | 200 | 20,000 | 25 |
| Enterprise | 10,000 | 1,000 | 100,000 | 50 |
| Admin | 50,000 | 5,000 | 500,000 | 100 |
