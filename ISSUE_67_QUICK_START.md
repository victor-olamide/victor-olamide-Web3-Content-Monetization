# Content Filtering - Quick Start Guide

**Issue**: #67  
**Time to Setup**: 5 minutes  
**Status**: Ready

## 5-Minute Setup

### Step 1: Mount Filter Routes (1 minute)

Add to your main server file (`backend/index.js`):

```javascript
// At the top with other requires
const filterRoutes = require('./routes/filterRoutes');

// After other routes (before error handlers)
app.use('/api', filterRoutes);

console.log('✓ Filter routes mounted at /api/filters');
```

### Step 2: Add to Frontend Routing (1 minute)

In your main app routing file:

```typescript
import { ContentBrowser } from './pages/ContentBrowser';

export function App() {
  return (
    <Routes>
      <Route path="/browse" element={<ContentBrowser />} />
    </Routes>
  );
}
```

### Step 3: Add Navigation Link (1 minute)

In your navigation component:

```typescript
<Link to="/browse" className="nav-link">
  Browse Content
</Link>
```

### Step 4: Verify Backend (1 minute)

```bash
# Start backend
npm start

# Test the API (in another terminal)
curl http://localhost:3000/api/filters/categories
# Should return JSON with categories
```

### Step 5: View in Browser (1 minute)

```bash
# Start frontend
cd frontend
npm start

# Visit http://localhost:3000/browse
# You should see filters, search, and content results
```

## Common Integration Patterns

### Pattern 1: Add Filter Widget to Homepage

```typescript
import { CategoryFilter } from './components/CategoryFilter';
import { useState } from 'react';

export function HomePage() {
  const [selected, setSelected] = useState<string[]>([]);

  return (
    <div>
      <h1>Discover Content</h1>
      <CategoryFilter
        selectedCategories={selected}
        onCategoriesChange={setSelected}
      />
    </div>
  );
}
```

### Pattern 2: Use Filters in Modal

```typescript
import { ContentBrowser } from './pages/ContentBrowser';
import { useState } from 'react';

function ContentModal() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsOpen(true)}>
        Browse Content
      </button>
      {isOpen && (
        <div className="modal">
          <ContentBrowser />
        </div>
      )}
    </>
  );
}
```

### Pattern 3: Programmatic Filtering

```typescript
import { useFilters } from './hooks/useFilters';

function MyComponent() {
  const { setCategories, setPriceRange, results } = useFilters();

  const handleQuickFilter = () => {
    setCategories(['video']);
    setPriceRange(0, 25);
  };

  return (
    <>
      <button onClick={handleQuickFilter}>
        Videos Under $25
      </button>
      <div>
        {results.map(item => (
          <div key={item._id}>{item.title}</div>
        ))}
      </div>
    </>
  );
}
```

### Pattern 4: Trending Content Widget

```typescript
import { filterApi } from './utils/filterApi';
import { useEffect, useState } from 'react';

export function TrendingWidget() {
  const [trending, setTrending] = useState([]);

  useEffect(() => {
    filterApi.getTrendingContent(5)
      .then(setTrending)
      .catch(console.error);
  }, []);

  return (
    <div>
      <h3>Trending Now</h3>
      {trending.map(item => (
        <div key={item._id}>{item.title}</div>
      ))}
    </div>
  );
}
```

### Pattern 5: Recommendations

```typescript
import { filterApi } from './utils/filterApi';
import { useState, useEffect } from 'react';

export function RecommendationsWidget() {
  const [recs, setRecs] = useState([]);

  useEffect(() => {
    filterApi.getRecommendedContent(
      ['video'],  // user preferred categories
      50,         // max price
      10          // number of results
    ).then(setRecs);
  }, []);

  return (
    <div>
      <h3>Recommended For You</h3>
      {recs.map(item => (
        <div key={item._id}>{item.title}</div>
      ))}
    </div>
  );
}
```

## API Quick Reference

### Fetch Categories
```bash
curl http://localhost:3000/api/filters/categories
```

### Fetch Price Range Info
```bash
curl http://localhost:3000/api/filters/price-range
```

### Search with Filters
```bash
curl -X POST http://localhost:3000/api/filters/search \
  -H "Content-Type: application/json" \
  -d '{
    "categories": ["video"],
    "minPrice": 5,
    "maxPrice": 50,
    "searchTerm": "tutorial",
    "sortBy": "price",
    "page": 1,
    "limit": 20
  }'
```

### Get by Category
```bash
curl http://localhost:3000/api/filters/category/video?limit=10&skip=0
```

### Get by Price Range
```bash
curl -X POST http://localhost:3000/api/filters/price-range \
  -H "Content-Type: application/json" \
  -d '{"minPrice": 5, "maxPrice": 50}'
```

### Search by Term
```bash
curl "http://localhost:3000/api/filters/search-term?q=tutorial&limit=20"
```

### Get Trending
```bash
curl http://localhost:3000/api/filters/trending?limit=10
```

### Get Recommendations
```bash
curl -X POST http://localhost:3000/api/filters/recommendations \
  -H "Content-Type: application/json" \
  -d '{"categories": ["video"], "maxPrice": 100}'
```

## Component Quick Reference

### useFilters Hook
```typescript
const {
  filters,              // { categories, minPrice, maxPrice, ... }
  results,              // Array of content items
  pagination,           // { page, total, totalPages, ... }
  isLoading,            // Boolean
  error,                // String or null
  setCategories,        // (categories: string[]) => void
  setPriceRange,        // (min, max) => void
  setSearchTerm,        // (term: string) => void
  setSortBy,            // (field, order) => void
  goToPage,             // (page: number) => void
  clearAllFilters       // () => void
} = useFilters();
```

### useFilters Default Behavior
```typescript
// Automatically loads results on mount
// Resets page to 1 when filters change
// Maintains pagination state
// Handles loading and error states
```

## Styling

### With Tailwind CSS (Already Configured)

All components use Tailwind CSS classes. No additional configuration needed.

### Custom Styling

Override component styles with CSS modules:

```css
/* components/CategoryFilter.module.css */
.filterContainer {
  background: white;
  padding: 1rem;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.categoryLabel {
  display: flex;
  align-items: center;
  cursor: pointer;
}
```

## Troubleshooting

### Issue: "Filters Not Loading"

**Solution**:
1. Check backend is running: `npm start`
2. Verify routes are mounted: Check `backend/index.js`
3. Check network tab: Should see `/api/filters/categories` request
4. Check browser console: Look for error messages

### Issue: "No Results Showing"

**Solution**:
1. Verify content exists in database
2. Check that `previewEnabled: true` in content
3. Try clearing filters to see all content
4. Check API response: `GET /api/filters/categories`

### Issue: "Price Range Not Showing Correct Values"

**Solution**:
1. Check content has `price` field
2. Verify price values are numbers (not strings)
3. Clear cache: `POST /api/filters/cache-clear`
4. Check `getPriceRangeInfo()` response

### Issue: "Search Not Finding Content"

**Solution**:
1. Verify search term in database
2. Check title, description, or creator fields
3. Try simpler search term
4. Check for case sensitivity (should be case-insensitive)

### Issue: "Components Not Rendering"

**Solution**:
1. Verify imports are correct
2. Check hook is called at component level (not in conditional)
3. Verify filterApi module exists
4. Check browser console for errors

## Performance Optimization

### Cache Management
- Category cache: 1 hour TTL
- Price range cache: 1 hour TTL
- Clear cache if content updates: `POST /api/filters/cache-clear`

### API Efficiency
- Results per page: Default 20, max 100
- Use page numbers (not offset-based)
- Batch multiple categories in single request

### Frontend Optimization
- ContentBrowser lazy loads images
- Debounced search (300ms delay)
- Pagination prevents loading all results

## Next Steps

1. ✅ Basic setup complete
2. Add ContentBrowser to main routing
3. Test filtering works
4. Integrate with product pages
5. Add recommendations widget
6. Monitor filter performance
7. Consider caching strategy
8. Plan future enhancements

## API Response Examples

### Categories Response
```json
{
  "success": true,
  "data": [
    {
      "id": "video",
      "name": "Video",
      "count": 42
    },
    {
      "id": "article",
      "name": "Article",
      "count": 28
    }
  ]
}
```

### Search Response
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "contentId": 1,
        "title": "Introduction to JavaScript",
        "price": 29.99,
        "contentType": "video",
        "totalViews": 150,
        "creator": "John Doe"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 120,
      "totalPages": 6,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

## Support Resources

- Check [Troubleshooting](#troubleshooting) section above
- Review browser console for errors
- Test API endpoints with curl
- Check filter cache: `GET /api/filters/cache-status`
- Clear cache if needed: `POST /api/filters/cache-clear`

## Documentation Links

- [Implementation Guide](./ISSUE_67_IMPLEMENTATION_GUIDE.md)
- [API Reference](./ISSUE_67_API_REFERENCE.md)
- [Completion Summary](./ISSUE_67_COMPLETION_SUMMARY.md)
