# Issue #73: Tiered Rate Limiting - Implementation Guide

## Overview

This implementation adds tiered rate limiting based on user subscription levels. Each tier (Free, Basic, Premium, Enterprise, Admin) has different request limits per time window, burst limits, daily limits, and concurrent request limits.

## Architecture

### Backend Components

#### 1. Configuration (`backend/config/rateLimitConfig.js`)
- Defines tier levels: `free`, `basic`, `premium`, `enterprise`, `admin`
- Configures per-tier limits (window, burst, daily, concurrent)
- Endpoint-specific multipliers for different API routes
- Rate limit response headers configuration

#### 2. Model (`backend/models/RateLimitStore.js`)
- MongoDB schema for tracking rate limit state per user/IP
- Window-based, burst, and daily request counters
- Concurrent request tracking
- Violation tracking with progressive blocking
- Auto-cleanup via TTL indexes

#### 3. Service (`backend/services/rateLimitService.js`)
- Core rate limiting logic
- User tier resolution from request context
- Key generation (wallet, IP, or combined)
- Endpoint-specific limit calculation
- Rate limit checking and enforcement
- Status querying and management

#### 4. Middleware (`backend/middleware/rateLimiter.js`)
- Express middleware for applying rate limits
- Automatic header injection (X-RateLimit-*)
- Fail-open error handling
- Factory functions for strict/lenient/API-key variants

#### 5. Routes (`backend/routes/rateLimitRoutes.js`)
- `/api/rate-limit/status` - Current user's rate limit status
- `/api/rate-limit/tiers` - Available tier configurations
- `/api/rate-limit/tiers/compare` - Compare two tiers
- `/api/rate-limit/endpoints` - Endpoint-specific overrides
- `/api/rate-limit/stats` - Global statistics (admin)
- `/api/rate-limit/reset` - Reset limits for a key (admin)
- `/api/rate-limit/cleanup` - Clean up expired records (admin)
- `/api/rate-limit/tier` - Update user tier (admin)
- `/api/rate-limit/health` - Health check

#### 6. Utilities (`backend/utils/rateLimitUtils.js`)
- Duration formatting
- Usage percentage calculation
- Tier validation and comparison
- Logging helpers
- Request cost calculation

### Frontend Components

#### 1. Hook (`frontend/src/hooks/useRateLimit.ts`)
- Real-time rate limit status monitoring
- Auto-refresh with configurable interval
- Automatic retry on rate limit errors
- Response header parsing
- Tier comparison support

#### 2. Utilities (`frontend/src/utils/rateLimitUtils.ts`)
- Header parsing
- Duration formatting
- Status color/label helpers
- Rate-limit-aware fetch wrapper
- Fetch with exponential backoff retry

#### 3. Component (`frontend/src/components/RateLimitStatus.tsx`)
- Visual rate limit status display
- Compact and detailed modes
- Progress bar with color-coded usage
- Tier comparison view
- Rate limited state with retry information

## Rate Limit Tiers

| Tier | Window (15min) | Burst (1min) | Daily | Concurrent |
|------|---------------|--------------|-------|------------|
| Free | 100 | 20 | 1,000 | 5 |
| Basic | 500 | 50 | 5,000 | 10 |
| Premium | 2,000 | 200 | 20,000 | 25 |
| Enterprise | 10,000 | 1,000 | 100,000 | 50 |
| Admin | 50,000 | 5,000 | 500,000 | 100 |

## Endpoint Multipliers

| Endpoint | Multiplier | Reason |
|----------|-----------|--------|
| `/api/content` | 1.5x | Higher limits for content browsing |
| `/api/purchases` | 0.5x | Stricter for expensive operations |
| `/api/subscriptions` | 0.75x | Moderate limits |
| `/api/wallet` | 0.5x | Stricter for security |
| `/api/analytics` | 2.0x | Higher for dashboard usage |
| `/api/preview` | 2.0x | Higher for preview browsing |

## Response Headers

All responses include rate limit headers:
- `X-RateLimit-Limit` - Maximum requests in window
- `X-RateLimit-Remaining` - Remaining requests in window
- `X-RateLimit-Reset` - Unix timestamp when window resets
- `X-RateLimit-Tier` - User's current tier
- `X-RateLimit-Daily-Limit` - Daily request limit
- `X-RateLimit-Daily-Remaining` - Remaining daily requests
- `Retry-After` - Seconds to wait (when rate limited)

## Progressive Blocking

Repeated violations trigger progressive blocking:
- 3+ violations: 5-minute block
- 5+ violations: 15-minute block
- 10+ violations: 1-hour block

## Integration

The rate limiter is applied globally in `backend/index.js` before all route handlers, ensuring every API request is rate-limited based on the user's subscription tier.
