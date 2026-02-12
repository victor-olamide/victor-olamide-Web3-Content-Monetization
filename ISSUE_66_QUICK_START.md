# Real-time STX Price Display - Quick Start Guide

**Issue**: #66  
**Time to Setup**: 5 minutes  
**Status**: Ready

## 5-Minute Setup

### Step 1: Install Dependencies (1 minute)

Backend dependencies should already be installed, but verify axios:

```bash
cd backend
npm list axios
# or install if missing
npm install axios
```

### Step 2: Mount Price Routes (1 minute)

Add to your main server file (`backend/index.js` or `backend/server.js`):

```javascript
// At the top with other requires
const priceRoutes = require('./routes/priceRoutes');

// After other routes (typically before error handlers)
app.use('/api', priceRoutes);

console.log('✓ Price routes mounted at /api/prices');
```

### Step 3: Import Components in Frontend (1 minute)

In your main app file or layout:

```typescript
import { PriceWidget } from './components/PriceWidget';
import { PriceDashboard } from './pages/PriceDashboard';

// Add to layout or routing
```

### Step 4: Add Price Widget to Header (1 minute)

In your header or navigation component:

```typescript
import { PriceWidget } from './components/PriceWidget';

export function AppHeader() {
  return (
    <header className="flex items-center justify-between">
      {/* Your header content */}
      <div className="ml-auto">
        <PriceWidget compact={true} />
      </div>
    </header>
  );
}
```

### Step 5: Test It Works (1 minute)

```bash
# Start backend
npm start

# In another terminal, start frontend
cd frontend
npm start

# Visit http://localhost:3000
# You should see the price widget in the header updating every 30 seconds
```

## Common Integration Patterns

### Pattern 1: Display Price in Header

```typescript
import { PriceWidget } from './components/PriceWidget';

function AppHeader() {
  return (
    <header>
      <h1>My App</h1>
      <PriceWidget compact={true} />
    </header>
  );
}
```

### Pattern 2: Show Price on Product Card

```typescript
import { ContentPriceDisplay } from './components/ContentPriceDisplay';

function ProductCard({ product }) {
  return (
    <div className="card">
      <h3>{product.name}</h3>
      <ContentPriceDisplay 
        stxPrice={product.price} 
        contentTitle={product.name}
        compact={true}
      />
      <button>Buy Now</button>
    </div>
  );
}
```

### Pattern 3: Conversion Tool on Checkout

```typescript
import { PriceConverter } from './components/PriceConverter';
import { ContentPriceDisplay } from './components/ContentPriceDisplay';

function CheckoutPage({ cartTotal }) {
  return (
    <div>
      <h2>Checkout</h2>
      <ContentPriceDisplay 
        stxPrice={cartTotal}
        contentTitle="Your Cart"
        showConversion={true}
      />
      <PriceConverter />
      <button className="btn-primary">Complete Purchase</button>
    </div>
  );
}
```

### Pattern 4: Full Pricing Dashboard

```typescript
import { PriceDashboard } from './pages/PriceDashboard';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/pricing" element={<PriceDashboard />} />
        <Route path="/products" element={<ProductPage />} />
      </Routes>
    </BrowserRouter>
  );
}
```

### Pattern 5: Custom Hook Usage

```typescript
import { useSTXPrice } from './hooks/useSTXPrice';
import { usePriceConversion } from './hooks/usePriceConversion';

function CustomPricingComponent() {
  // Get current price with 30-second refresh
  const { current, formatted, change_24h } = useSTXPrice(30000);
  
  // Get conversion functions
  const { convertSTXtoUSD, convertUSDtoSTX, isLoading } = usePriceConversion();
  
  const handleConvert = async (amount) => {
    const result = await convertSTXtoUSD(amount);
    console.log(`${amount} STX = $${result.usd.toFixed(2)}`);
  };
  
  return (
    <div>
      <p>Current Price: {formatted}</p>
      <p>24h Change: {change_24h}</p>
      <input 
        type="number"
        placeholder="Enter STX amount"
        onChange={(e) => handleConvert(parseFloat(e.target.value))}
      />
      {isLoading && <p>Converting...</p>}
    </div>
  );
}
```

## API Quick Reference

### Frontend API Wrapper Functions

```typescript
import {
  getSTXPrice,              // Get full price data
  getFormattedSTXPrice,     // Get formatted ($X.XX)
  getRawSTXPrice,           // Get just the number
  convertSTXtoUSD,          // Convert STX amount
  convertUSDtoSTX,          // Convert USD amount
  batchConvertSTXtoUSD,     // Convert multiple amounts
  getCacheStatus,           // Check cache status
  clearCache                // Force cache refresh
} from './utils/priceApi';

// Usage
const price = await getSTXPrice();
console.log(price.current);  // 2.45

const formatted = await getFormattedSTXPrice();
console.log(formatted.usd);  // "$2.45"

const raw = await getRawSTXPrice();
console.log(raw);  // 2.45

const result = await convertSTXtoUSD(10);
console.log(result.usd);  // 24.5

const batch = await batchConvertSTXtoUSD([1, 5, 10]);
batch.conversions.forEach(c => console.log(c.stx, c.usd));
```

### React Hooks Quick Reference

```typescript
// Hook 1: Get current price with auto-refresh
const { 
  current,           // Number
  formatted,         // String
  change_24h,        // Number
  change_24h_percent,// String
  isLoading,         // Boolean
  error,             // String | null
  refetch            // Function
} = useSTXPrice(refreshInterval);

// Hook 2: Conversion operations
const {
  result,                    // ConversionResult | null
  isLoading,                 // Boolean
  error,                     // String | null
  convertSTXtoUSD,           // Function(amount) => Promise
  convertUSDtoSTX,           // Function(amount) => Promise
  batchConvertSTXtoUSD       // Function(amounts[]) => Promise
} = usePriceConversion();
```

### HTTP Endpoints Quick Reference

```bash
# Get price
GET /api/prices/stx              # Full data
GET /api/prices/stx/formatted    # Formatted ($X.XX)
GET /api/prices/stx/raw          # Just number

# Convert (POST)
POST /api/prices/convert/stx-to-usd   # {"amount": 10}
POST /api/prices/convert/usd-to-stx   # {"amount": 24.5}
POST /api/prices/convert/batch        # {"amounts": [1,5,10]}

# Cache management
GET /api/prices/cache-status     # Check cache
POST /api/prices/cache-clear     # Clear cache
```

## Styling

### With Tailwind CSS

Components use Tailwind CSS classes by default. Ensure Tailwind is configured:

```javascript
// tailwind.config.js
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

### Custom Styling

Override component styles using CSS modules:

```css
/* components/PriceDisplay.module.css */
.container {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem;
  border-radius: 8px;
  color: white;
}

.price {
  font-size: 2.5rem;
  font-weight: bold;
  margin: 1rem 0;
}
```

## Troubleshooting

### Issue: "API Not Found" Error

**Solution**:
1. Check routes are mounted in `backend/index.js`
2. Verify backend is running: `npm start`
3. Check network tab in browser DevTools
4. Ensure API URL matches: `http://localhost:3000/api/prices/stx`

### Issue: Price Not Updating

**Solution**:
1. Check cache status:
   ```bash
   curl http://localhost:3000/api/prices/cache-status
   ```
2. Clear cache if stale:
   ```bash
   curl -X POST http://localhost:3000/api/prices/cache-clear
   ```
3. Check CoinGecko API is accessible
4. Review browser console for errors

### Issue: Conversion Returns Wrong Value

**Solution**:
1. Verify current price: `GET /api/prices/stx/raw`
2. Manual calculation: `amount × rate`
3. Check for rounding issues (use 6 decimals)
4. Test with known values (1 STX at $2.45 should equal $2.45)

### Issue: Component Styling Broken

**Solution**:
1. Ensure Tailwind CSS is installed and configured
2. Check all CSS classes are available
3. Verify component imports are correct
4. Check browser DevTools for missing classes
5. Run `npm run build` to check for errors

### Issue: TypeScript Errors

**Solution**:
1. Verify TypeScript version: `npm list typescript`
2. Check tsconfig.json includes React types
3. Run type check: `npm run type-check`
4. Ensure all imports use correct file extensions

## Performance Tips

1. **Cache Management**:
   - Default 30-second refresh is good for most use cases
   - Reduce refresh interval for volatile pricing
   - Increase for less frequent updates

2. **Batch Conversions**:
   - Use batch endpoint for multiple amounts
   - More efficient than individual requests

3. **Lazy Loading**:
   - Load PriceDashboard only when needed
   - Import components on-demand

4. **Memoization**:
   - Use `React.memo()` to prevent unnecessary re-renders
   - Memoize expensive calculations

## Testing Examples

### Test Price Display

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import { PriceDisplay } from './components/PriceDisplay';

test('displays current price', async () => {
  render(<PriceDisplay />);
  
  await waitFor(() => {
    expect(screen.getByText(/\$\d+\.\d{2}/)).toBeInTheDocument();
  });
});
```

### Test Conversion

```typescript
import { convertSTXtoUSD } from './utils/priceApi';

test('converts STX to USD correctly', async () => {
  const result = await convertSTXtoUSD(10);
  expect(result.stx).toBe(10);
  expect(typeof result.usd).toBe('number');
  expect(typeof result.rate).toBe('number');
});
```

## Next Steps

1. ✅ Basic setup complete
2. Add price widget to header
3. Integrate with product pages
4. Add to checkout flow
5. Monitor cache performance
6. Consider WebSocket upgrade for real-time
7. Add price history tracking
8. Implement price alerts

## Documentation Links

- [Implementation Guide](./ISSUE_66_IMPLEMENTATION_GUIDE.md)
- [API Reference](./ISSUE_66_API_REFERENCE.md)
- [CoinGecko API Docs](https://docs.coingecko.com)
- [React Hooks Docs](https://react.dev/reference/react/hooks)

## Support Resources

- Check [TROUBLESHOOTING](#troubleshooting) section above
- Review browser console for error messages
- Check `/api/prices/cache-status` endpoint
- Clear cache with `/api/prices/cache-clear` if needed
- Test individual API endpoints with curl before debugging components
