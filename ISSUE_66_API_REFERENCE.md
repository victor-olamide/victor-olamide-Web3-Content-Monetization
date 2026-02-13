# Real-time STX Price Display - API Reference

**Issue**: #66  
**Documentation**: Complete API Endpoints  
**Status**: Updated

## API Overview

The Price API provides real-time STX/USD pricing, conversion operations, and cache management. All endpoints return JSON responses with consistent structure.

## Base URL

```
http://localhost:3000/api/prices
or
https://api.example.com/api/prices
```

## Response Format

All successful responses follow this structure:

```json
{
  "success": true,
  "data": {},
  "message": "Success message"
}
```

Error responses:

```json
{
  "success": false,
  "data": null,
  "message": "Error description"
}
```

## Endpoints

### 1. Get Full Price Data

**Endpoint**: `GET /stx`

**Description**: Returns complete STX price information including market data and cache status.

**Request**:
```bash
curl -X GET http://localhost:3000/api/prices/stx
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "current": 2.45,
    "volume_24h": 150000000,
    "change_24h": 0.15,
    "change_24h_percent": "6.52",
    "last_updated": "2024-01-20T14:30:00Z",
    "cache_age_ms": 5234
  },
  "message": "Price data retrieved successfully"
}
```

**Response Fields**:
| Field | Type | Description |
|-------|------|-------------|
| current | number | Current STX price in USD |
| volume_24h | number | 24h trading volume in USD |
| change_24h | number | Price change in last 24h (USD) |
| change_24h_percent | string | Price change in last 24h (%) |
| last_updated | string | ISO timestamp of last update |
| cache_age_ms | number | Cache age in milliseconds |

**Error** (500):
```json
{
  "success": false,
  "data": null,
  "message": "Unable to fetch price data. Please try again later."
}
```

---

### 2. Get Formatted Price

**Endpoint**: `GET /stx/formatted`

**Description**: Returns price data in display-ready format (currency symbols, percentage signs, etc.).

**Request**:
```bash
curl -X GET http://localhost:3000/api/prices/stx/formatted
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "usd": "$2.45",
    "change_24h": "0.15",
    "change_percent": "6.52%"
  },
  "message": "Formatted price retrieved successfully"
}
```

**Response Fields**:
| Field | Type | Description |
|-------|------|-------------|
| usd | string | Formatted price with $ symbol |
| change_24h | string | Change amount |
| change_percent | string | Percentage with % symbol |

**Use Case**: Direct display in UI without formatting logic

---

### 3. Get Raw Price

**Endpoint**: `GET /stx/raw`

**Description**: Returns just the current STX price as a number. Minimal response for lightweight integrations.

**Request**:
```bash
curl -X GET http://localhost:3000/api/prices/stx/raw
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": 2.45,
  "message": "Raw price retrieved successfully"
}
```

**Use Case**: Quick price checks, calculator inputs, minimal bandwidth

---

### 4. Convert STX to USD

**Endpoint**: `POST /convert/stx-to-usd`

**Description**: Convert STX amount to USD equivalent.

**Request**:
```bash
curl -X POST http://localhost:3000/api/prices/convert/stx-to-usd \
  -H "Content-Type: application/json" \
  -d '{"amount": 10.5}'
```

**Request Body**:
```json
{
  "amount": 10.5
}
```

**Validation**:
- `amount` required (number)
- `amount` must be ≥ 0
- `amount` must be ≤ 1,000,000,000

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "stx": 10.5,
    "usd": 25.725,
    "rate": 2.45,
    "timestamp": "2024-01-20T14:30:00Z"
  },
  "message": "Conversion completed successfully"
}
```

**Response Fields**:
| Field | Type | Description |
|-------|------|-------------|
| stx | number | Input amount in STX |
| usd | number | Converted amount in USD |
| rate | number | Exchange rate used (STX → USD) |
| timestamp | string | ISO timestamp of conversion |

**Error Examples**:

Missing amount (400):
```json
{
  "success": false,
  "data": null,
  "message": "Amount is required"
}
```

Invalid amount (400):
```json
{
  "success": false,
  "data": null,
  "message": "Amount must be a non-negative number"
}
```

---

### 5. Convert USD to STX

**Endpoint**: `POST /convert/usd-to-stx`

**Description**: Convert USD amount to STX equivalent.

**Request**:
```bash
curl -X POST http://localhost:3000/api/prices/convert/usd-to-stx \
  -H "Content-Type: application/json" \
  -d '{"amount": 25.725}'
```

**Request Body**:
```json
{
  "amount": 25.725
}
```

**Validation**:
- `amount` required (number)
- `amount` must be ≥ 0
- `amount` must be ≤ 1,000,000,000

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "usd": 25.725,
    "stx": 10.5,
    "rate": 2.45,
    "timestamp": "2024-01-20T14:30:00Z"
  },
  "message": "Conversion completed successfully"
}
```

**Response Fields**:
| Field | Type | Description |
|-------|------|-------------|
| usd | number | Input amount in USD |
| stx | number | Converted amount in STX |
| rate | number | Exchange rate used (USD → STX) |
| timestamp | string | ISO timestamp of conversion |

---

### 6. Batch Convert

**Endpoint**: `POST /convert/batch`

**Description**: Convert multiple STX amounts to USD in a single request. More efficient than individual conversions.

**Request**:
```bash
curl -X POST http://localhost:3000/api/prices/convert/batch \
  -H "Content-Type: application/json" \
  -d '{"amounts": [1, 5, 10, 50, 100]}'
```

**Request Body**:
```json
{
  "amounts": [1, 5, 10, 50, 100]
}
```

**Validation**:
- `amounts` required (array)
- Array length: 1-1000 items
- Each item must be ≥ 0
- Each item must be ≤ 1,000,000,000

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "conversions": [
      { "stx": 1, "usd": 2.45 },
      { "stx": 5, "usd": 12.25 },
      { "stx": 10, "usd": 24.50 },
      { "stx": 50, "usd": 122.50 },
      { "stx": 100, "usd": 245.00 }
    ],
    "rate": 2.45,
    "timestamp": "2024-01-20T14:30:00Z"
  },
  "message": "Batch conversion completed successfully"
}
```

**Response Fields**:
| Field | Type | Description |
|-------|------|-------------|
| conversions | array | Array of conversions |
| conversions[].stx | number | STX amount |
| conversions[].usd | number | USD equivalent |
| rate | number | Exchange rate used |
| timestamp | string | ISO timestamp of conversion |

**Error Examples**:

Missing amounts (400):
```json
{
  "success": false,
  "data": null,
  "message": "Amounts array is required"
}
```

Too many items (400):
```json
{
  "success": false,
  "data": null,
  "message": "Cannot convert more than 1000 amounts in a single request"
}
```

---

### 7. Get Cache Status

**Endpoint**: `GET /cache-status`

**Description**: Returns cache information for debugging and monitoring. Useful for understanding data freshness.

**Request**:
```bash
curl -X GET http://localhost:3000/api/prices/cache-status
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "isCached": true,
    "age_ms": 5234,
    "valid": true,
    "ttl_ms": 60000
  },
  "message": "Cache status retrieved successfully"
}
```

**Response Fields**:
| Field | Type | Description |
|-------|------|-------------|
| isCached | boolean | Whether data is cached |
| age_ms | number | Cache age in milliseconds |
| valid | boolean | Whether cache is still valid |
| ttl_ms | number | Cache time-to-live in milliseconds |

**Interpretation**:
- `isCached: true` + `valid: true` → Using cached data
- `age_ms < ttl_ms` → Cache is fresh
- `age_ms > ttl_ms` → Cache expired (will refresh on next request)

---

### 8. Clear Cache

**Endpoint**: `POST /cache-clear`

**Description**: Manually clear the price cache and force a fresh API call on next request. Useful for testing and emergency updates.

**Request**:
```bash
curl -X POST http://localhost:3000/api/prices/cache-clear
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": null,
  "message": "Cache cleared successfully"
}
```

**Note**: Next price request will fetch from CoinGecko API and cache the result.

**Error** (500):
```json
{
  "success": false,
  "data": null,
  "message": "Failed to clear cache"
}
```

---

## HTTP Status Codes

| Code | Meaning | When |
|------|---------|------|
| 200 | OK | Request successful |
| 400 | Bad Request | Invalid parameters or missing fields |
| 500 | Server Error | API unavailable or internal error |

## Rate Limiting

**CoinGecko API Limits**:
- Free tier: 10-50 calls/minute
- Backend cache: Reduces API calls significantly
- Browser cache: Additional 5-minute caching

**Recommended Usage**:
- Use `/stx/raw` for simple price checks
- Batch multiple conversions together
- Cache results on client side
- Avoid calling `/stx` more than once per 30 seconds

## Authentication

No authentication required. API is public.

## CORS

Endpoints are CORS-enabled for browser requests.

**Headers**:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

## TypeScript Definitions

```typescript
interface PriceData {
  current: number;
  volume_24h: number;
  change_24h: number;
  change_24h_percent: string;
  last_updated: string;
  cache_age_ms: number;
}

interface FormattedPrice {
  usd: string;
  change_24h: string;
  change_percent: string;
}

interface ConversionResult {
  stx: number;
  usd: number;
  rate: number;
  timestamp: string;
}

interface BatchConversionResult {
  conversions: Array<{
    stx: number;
    usd: number;
  }>;
  rate: number;
  timestamp: string;
}

interface CacheStatus {
  isCached: boolean;
  age_ms: number;
  valid: boolean;
  ttl_ms: number;
}

interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  message: string;
}
```

## SDK Integration Examples

### JavaScript/Node.js

```javascript
// Using priceApi utilities
import { getSTXPrice, convertSTXtoUSD, batchConvertSTXtoUSD } from './utils/priceApi';

// Get current price
const price = await getSTXPrice();
console.log(`Current STX price: $${price.current}`);

// Convert single amount
const result = await convertSTXtoUSD(10);
console.log(`10 STX = $${result.usd}`);

// Batch conversion
const batch = await batchConvertSTXtoUSD([1, 5, 10, 50, 100]);
batch.conversions.forEach(c => {
  console.log(`${c.stx} STX = $${c.usd}`);
});
```

### React Hooks

```typescript
import { useSTXPrice } from './hooks/useSTXPrice';
import { usePriceConversion } from './hooks/usePriceConversion';

function PricingComponent() {
  const { current, formatted } = useSTXPrice(30000); // 30s refresh
  const { convertSTXtoUSD } = usePriceConversion();
  
  const handleConvert = async (amount: number) => {
    const result = await convertSTXtoUSD(amount);
    console.log(`${amount} STX = $${result.usd}`);
  };
  
  return (
    <div>
      <p>Current price: {formatted}</p>
      <button onClick={() => handleConvert(10)}>Convert 10 STX</button>
    </div>
  );
}
```

### cURL Examples

```bash
# Get current price
curl http://localhost:3000/api/prices/stx

# Get formatted price
curl http://localhost:3000/api/prices/stx/formatted

# Get raw price
curl http://localhost:3000/api/prices/stx/raw

# Convert 10 STX to USD
curl -X POST http://localhost:3000/api/prices/convert/stx-to-usd \
  -H "Content-Type: application/json" \
  -d '{"amount": 10}'

# Batch convert
curl -X POST http://localhost:3000/api/prices/convert/batch \
  -H "Content-Type: application/json" \
  -d '{"amounts": [1, 5, 10, 50, 100]}'

# Check cache status
curl http://localhost:3000/api/prices/cache-status

# Clear cache
curl -X POST http://localhost:3000/api/prices/cache-clear
```

## Changelog

### Version 1.0 (Current)
- 8 endpoints for price operations
- STX/USD conversion support
- Batch conversion (up to 1000 items)
- 1-minute caching with fallback
- Cache management endpoints
- Full error handling
- CORS support

## Support

For issues or questions:
1. Check cache status: `GET /cache-status`
2. Clear cache if needed: `POST /cache-clear`
3. Verify API is accessible
4. Check browser console for errors
5. Review this documentation
