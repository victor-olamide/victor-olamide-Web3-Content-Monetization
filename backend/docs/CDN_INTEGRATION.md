# CDN Integration for Content Delivery (#197)

## Overview

All content GET requests now serve content via CDN first, with an automatic fallback to IPFS/Gaia when the CDN has no cached entry.  CDN cache entries are stored in MongoDB (`CdnCacheEntry`) and automatically invalidated when content is updated or deleted.

---

## Delivery Flow

```
Client GET /api/delivery/:id/stream
        │
        ▼
  withCdnResolution middleware
        │
        ├─ CDN enabled? ──YES──► CdnCacheEntry.findActiveByContentId(id)
        │                             │
        │                    cached & not expired?
        │                         │         │
        │                        YES        NO
        │                         │         │
        │                    req.cdnResolution  cdnService.addToCache() [async]
        │                    .method = 'cdn'    ipfsFallbackService.resolveFallbackUrl()
        │                         │              req.cdnResolution.method = 'ipfs'
        │                         │
        ▼                         ▼
  Route handler receives req.cdnResolution

  – CDN HIT + unencrypted  → HTTP 302 redirect to CDN URL
  – CDN MISS / encrypted   → fetch from IPFS/Gaia gateway, stream to client
```

---

## Files Changed / Added

| File | Change |
|---|---|
| `services/ipfsFallbackService.js` | NEW — resolves IPFS gateway URL with primary + alternate fallback |
| `utils/cdnUtils.js` | NEW — shared helpers: buildCacheKey, buildCdnUrl, isCacheEntryValid |
| `middleware/cdnMiddleware.js` | NEW — attaches CDN resolution result to req.cdnResolution |
| `middleware/cdnCacheInvalidation.js` | NEW — purges CDN cache after content mutations |
| `services/cdnService.js` | FIXED — deterministic cache key (no Date.now()); added getOrCreateCdnUrl |
| `services/cdnDeliveryService.js` | ADDED — resolveContentUrl() CDN→IPFS chain; replaced console.* with logger |
| `models/CdnCache.js` | ADDED — findActiveByContentId static (status=cached + expiry check) |
| `config/cdnConfig.js` | ADDED — ipfsFallback config block |
| `routes/contentRoutes.js` | UPDATED — GET /:contentId enriched with CDN URL; PUT/PATCH/DELETE invalidate CDN |
| `routes/deliveryRoutes.js` | UPDATED — /stream uses withCdnResolution, redirects on CDN hit |
| `.env.example` | UPDATED — all CDN + IPFS fallback env vars documented |

---

## CdnCache Model — Key Statics

| Method | Description |
|---|---|
| `findActiveByContentId(id)` | Returns a cached, non-expired entry or null |
| `findByContentId(id)` | Returns most recent entry (any status) |
| `findExpired()` | Returns all expired cached entries (for cleanup jobs) |
| `updateAccessStats(key, bytes, region)` | Increments hitCount and bytesServed |

---

## Cache Key Stability

`buildCacheKey(contentId, contentType)` produces a deterministic 16-char hex string — **no timestamp** — so the same content always maps to the same cache entry and repeated calls never create duplicate rows.

---

## Cache Invalidation

Applied automatically to:
- `PUT /api/content/:contentId` — full content replacement
- `PATCH /api/content/:contentId` — partial update
- `DELETE /api/content/:contentId` — content removal
- `POST /api/content/:contentId/remove` — creator-initiated removal

The purge fires asynchronously **after** the response finishes (non-blocking).

---

## Environment Variables

See `.env.example` for the full list.  Key variables:

| Variable | Default | Description |
|---|---|---|
| `CDN_ENABLED` | `true` | Master CDN switch |
| `CDN_CONTENT_DELIVERY_ENABLED` | `true` | Enable CDN for content GETs |
| `CDN_PRIMARY_DOMAIN` | `cdn.yourplatform.com` | CDN hostname |
| `CDN_PROVIDER` | `cloudflare` | Provider: cloudflare / cloudfront / fastly / akamai |
| `CDN_IPFS_FALLBACK_ENABLED` | `true` | Enable IPFS fallback on CDN miss |
| `IPFS_GATEWAY_URL` | `https://gateway.pinata.cloud` | Primary IPFS gateway |
| `IPFS_ALT_GATEWAY_URL` | `https://cloudflare-ipfs.com` | Alternate IPFS gateway |

---

## Response Headers

| Header | Value |
|---|---|
| `X-Delivery-Method` | `cdn` or `ipfs` or `direct` |
| `X-CDN-Cache` | `HIT` (on redirect to CDN) |
| `X-Access-Method` | Access control method (from auth middleware) |
