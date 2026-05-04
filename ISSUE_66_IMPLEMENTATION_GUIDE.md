# Real-time STX Price Display - Implementation Guide

**Issue**: #66  
**Status**: COMPLETED  
**Total Commits**: 12+

## Overview

Implementation of real-time STX/USD price display with conversion tools, multiple UI components, and comprehensive caching strategy. The system provides accurate, responsive pricing information throughout the application.

## Architecture

### Backend Components

#### STX Price Service (`backend/services/stxPriceService.js`)
- **Dependencies**: axios (HTTP client)
- **Features**:
  - Real-time price fetching from CoinGecko API
  - 1-minute cache with configurable TTL
  - Fallback to cached data on API failures
  - STX ↔ USD conversion functions
  - Batch conversion support for multiple amounts
  - Cache status monitoring
  - Formatted price output

**Key Methods**:
```javascript
getCurrentSTXPrice()          // Fetch with caching
convertSTXtoUSD(amount)       // Single conversion
convertUSDtoSTX(amount)       // Reverse conversion
getPriceData()                // With market data
convertMultipleSTXtoUSD(arr)  // Batch conversion
getFormattedPrice()           // Display format
clearCache()                  // Manual refresh
getCacheStatus()              // Debug info
```

**Caching Strategy**:
- Cache TTL: 60 seconds
- Stores: price (USD), 24h volume, 24h change, timestamp
- Fallback: Returns stale data if API unavailable
- Error handling: Throws error only if no cache available

#### Price Routes (`backend/routes/priceRoutes.js`)
- **Base URL**: `/api/prices`
- **8 Endpoints**:

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/stx` | Full price data with market info |
| GET | `/stx/formatted` | Formatted price ($X.XX) |
| GET | `/stx/raw` | Raw price number only |
| POST | `/convert/stx-to-usd` | Convert STX to USD |
| POST | `/convert/usd-to-stx` | Convert USD to STX |
| POST | `/convert/batch` | Batch convert multiple amounts |
| GET | `/cache-status` | Cache information |
| POST | `/cache-clear` | Clear cache (manual refresh) |

**Response Format**:
```json
{
  "success": true,
  "data": {
    "current": 2.45,
    "volume_24h": 150000000,
    "change_24h": 0.15,
    "change_24h_percent": "6.52",
    "last_updated": "2024-01-20T14:30:00Z",
    "cache_age_ms": 5000
  }
}
```

### Frontend Components

#### 1. PriceDisplay Component (`PriceDisplay.tsx`)
- **Purpose**: Full-featured price display widget
- **Features**:
  - Real-time STX price
  - 24h change with trend indicator
  - Auto-refresh every 30 seconds
  - Error handling with retry button
  - Collapsible details section
  - Loading states and animations

#### 2. PriceConverter Component (`PriceConverter.tsx`)
- **Purpose**: Interactive STX ↔ USD converter
- **Features**:
  - Bidirectional conversion
  - Swap currencies button
  - Quick convert buttons (1, 5, 10, 25, 50, 100)
  - Real-time conversion as you type
  - Display current exchange rate
  - Error states

#### 3. PriceWidget Component (`PriceWidget.tsx`)
- **Purpose**: Compact price display
- **Usage**: Headers, sidebars, small spaces
- **Features**:
  - Minimal UI footprint
  - Shows current price + 24h change
  - Two display modes (compact/normal)
  - No configuration needed

#### 4. ContentPriceDisplay Component (`ContentPriceDisplay.tsx`)
- **Purpose**: Show content prices in STX and USD
- **Features**:
  - Dual-currency display
  - Conversion breakdown
  - Exchange rate display
  - Two modes (compact/detailed)
  - Timestamp for freshness

#### 5. PriceTicker Component (`PriceTicker.tsx`)
- **Purpose**: Animated price conversions
- **Features**:
  - Animated cycling through price conversions
  - Static grid view option
  - Customizable items list
  - Great for hero sections
  - Navigation dots for manual control

#### 6. PriceDashboard Page (`PriceDashboard.tsx`)
- **Purpose**: Complete pricing dashboard
- **Features**:
  - Combines all components
  - Example content pricing
  - Information cards
  - Responsive layout
  - Educational content

### React Hooks

#### useSTXPrice Hook (`useSTXPrice.ts`)
```typescript
const { 
  current,           // Current price (number)
  formatted,         // Formatted string ($X.XX)
  change_24h,        // 24h change amount
  change_24h_percent,// 24h change percentage
  isLoading,         // Loading state
  error,             // Error message
  refetch            // Manual refresh function
} = useSTXPrice(refreshInterval);
```

**Features**:
- Auto-refresh at configurable intervals
- Caches price data
- Error handling
- Returns both formatted and raw data
- Manual refetch capability

#### usePriceConversion Hook (`usePriceConversion.ts`)
```typescript
const {
  result,                    // Conversion result
  isLoading,                 // Loading state
  error,                     // Error message
  convertSTXtoUSD,           // Convert STX → USD
  convertUSDtoSTX,           // Convert USD → STX
  batchConvertSTXtoUSD       // Batch convert
} = usePriceConversion();
```

**Features**:
- Manages conversion state
- Async conversion functions
- Error handling
- Batch support
- Input validation

### Utility Functions

#### priceApi Module (`priceApi.ts`)
8 typed API wrapper functions:
```typescript
getSTXPrice()              // Full price data
getFormattedSTXPrice()     // Formatted price
getRawSTXPrice()           // Raw price number
convertSTXtoUSD(amount)    // Convert STX
convertUSDtoSTX(amount)    // Convert USD
batchConvertSTXtoUSD(arr)  // Batch convert
getCacheStatus()           // Cache info
clearCache()               // Clear cache
```

## Data Flow

### Price Fetch Flow
```
Component (useSTXPrice hook)
  ↓
/api/prices/stx endpoint
  ↓
stxPriceService.getPriceData()
  ↓
Check cache validity
  ├─ Valid: Return cached data
  └─ Invalid: Fetch from CoinGecko API
    ↓
    Update cache
    ↓
    Return data
  ↓
Component updates with fresh price
```

### Conversion Flow
```
User input amount
  ↓
usePriceConversion hook
  ↓
/api/prices/convert/stx-to-usd
  ↓
stxPriceService.convertSTXtoUSD()
  ↓
Get current price
  ↓
Calculate: amount × price
  ↓
Return result with rate and timestamp
  ↓
Component displays conversion
```

## Integration Points

### Backend Integration
1. Add to main server file (`backend/index.js`):
```javascript
const priceRoutes = require('./routes/priceRoutes');
app.use('/api', priceRoutes);
```

2. Ensure axios is installed:
```bash
npm install axios
```

### Frontend Integration
1. Add PriceWidget to header:
```typescript
import { PriceWidget } from './components/PriceWidget';

export function AppHeader() {
  return (
    <header>
      {/* Other header content */}
      <PriceWidget compact={true} />
    </header>
  );
}
```

2. Add PriceConverter to checkout:
```typescript
import { ContentPriceDisplay } from './components/ContentPriceDisplay';

export function CheckoutPage() {
  return (
    <div>
      <ContentPriceDisplay stxPrice={product.price} contentTitle={product.name} />
    </div>
  );
}
```

3. Add PriceDashboard to routing:
```typescript
import { PriceDashboard } from './pages/PriceDashboard';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

export function App() {
  return (
    <Routes>
      <Route path="/prices" element={<PriceDashboard />} />
    </Routes>
  );
}
```

## Performance Optimizations

### Caching Strategy
- **1-minute cache** for price data
- **Configurable TTL** for different needs
- **Stale data fallback** when API unavailable
- **Cache status endpoint** for monitoring

### API Efficiency
- **Single endpoint** for full price data
- **Batch conversion** for multiple amounts
- **Minimal response size** with `/raw` endpoint
- **Error compression** to reduce bandwidth

### Frontend Optimization
- **useSTXPrice auto-refresh** every 30 seconds
- **Debounced conversions** in PriceConverter
- **Lazy loading** of components
- **Memoization** of hooks

### Rate Limiting
- CoinGecko API: Free tier supports 10-50 calls/minute
- Backend cache: Reduces API calls significantly
- Browser cache: Additional 5-minute browser-level caching

## Security Features

- ✅ Input validation on conversion endpoints
- ✅ Amount limits (max 1000 items for batch)
- ✅ Error response filtering
- ✅ No sensitive data in responses
- ✅ CORS-safe API design
- ✅ Safe floating-point arithmetic

## Error Handling

### API Errors
```javascript
try {
  const price = await getCurrentSTXPrice();
} catch (error) {
  if (CACHE.price) {
    // Return cached price
  } else {
    // Throw error
  }
}
```

### Frontend Error States
- Display error message with refresh button
- Graceful degradation if price unavailable
- Retry mechanisms for failed conversions
- Clear error messages for debugging

## Testing Considerations

### Unit Tests
- Price calculation accuracy
- Cache TTL behavior
- API error handling
- Conversion rounding

### Integration Tests
- Full price fetch flow
- Conversion endpoint accuracy
- Cache invalidation
- Multiple hook instances

### E2E Tests
- PriceDisplay updates in real-time
- Conversions display correctly
- Components handle API failures
- Cache refresh works properly

## Troubleshooting

### Price Not Updating
- Check cache status: `/api/prices/cache-status`
- Clear cache: `POST /api/prices/cache-clear`
- Verify API access: Test endpoint directly
- Check browser cache settings

### Conversion Inaccurate
- Verify current price: `/api/prices/stx/raw`
- Check rounding: Ensure 4-6 decimal places
- Validate input amounts
- Compare with external source

### Components Not Rendering
- Check hook is called at component level
- Verify API routes are mounted
- Check browser console for errors
- Ensure styles are loaded

## API Examples

### Get Current Price
```bash
curl https://api.example.com/api/prices/stx
```

### Convert STX to USD
```bash
curl -X POST https://api.example.com/api/prices/convert/stx-to-usd \
  -H "Content-Type: application/json" \
  -d '{"amount": 10.5}'
```

### Batch Convert
```bash
curl -X POST https://api.example.com/api/prices/convert/batch \
  -H "Content-Type: application/json" \
  -d '{"amounts": [10, 25, 50, 100]}'
```

## Deployment Checklist

- [ ] axios installed in backend
- [ ] priceRoutes integrated into main server
- [ ] CoinGecko API accessible
- [ ] Cache TTL configured appropriately
- [ ] Error logging configured
- [ ] Frontend components imported correctly
- [ ] PriceDashboard route added
- [ ] PriceWidget in header/layout
- [ ] Styling loaded (Tailwind CSS)
- [ ] API response times monitored

## Future Enhancements

1. **Multi-currency Support**: Add other tokens (BTC, ETH, etc.)
2. **Historical Charts**: Show price trends over time
3. **Price Alerts**: Notify users of price movements
4. **Advanced Analytics**: Track conversion patterns
5. **WebSocket Updates**: Real-time push instead of polling
6. **Price History**: Store historical data for analysis
7. **Prediction**: ML-based price predictions
8. **Multiple Sources**: Aggregate prices from multiple APIs
9. **Offline Support**: Cache for offline access
10. **Blockchain Integration**: Auto-update from on-chain oracles

## Related Issues

- Issue #65: Transaction History (uses prices for USD conversion)
- Issue #67: Payment Processing (uses conversions for checkout)
- Issue #68: Analytics Dashboard (displays price trends)

## References

- [CoinGecko API Documentation](https://docs.coingecko.com)
- [Stacks Documentation](https://docs.stacks.co)
- [Axios Documentation](https://axios-http.com)
- [React Hooks Documentation](https://react.dev/reference/react/hooks)
