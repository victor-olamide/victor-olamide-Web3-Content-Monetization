# Content Filtering - Implementation Guide

**Issue**: #67  
**Status**: COMPLETED  
**Total Commits**: 11+

## Overview

Implementation of advanced content filtering system with category and price range filtering, search, sorting, and pagination. The system enables users to discover content through multiple discovery mechanisms.

## Architecture

### Backend Components

#### Content Filter Service (`backend/services/contentFilterService.js`)
- **Dependencies**: mongoose, ContentPreview model
- **Features**:
  - Category and price range filtering
  - Full-text search across title, description, preview text, and creator
  - Intelligent caching (1-hour TTL)
  - Trending/popular content
  - Personalized recommendations

**Key Methods**:
```javascript
getAvailableCategories()       // Get categories with counts
getPriceRangeInfo()            // Get price distribution
filterContent(params)           // Advanced multi-criteria filter
getContentByCategory(cat)       // Filter by single category
getContentByPriceRange(min,max) // Filter by price
searchContent(term)             // Full-text search
getTrendingContent()            // Get popular items
getRecommendedContent()         // Get recommendations
clearFilterCache()              // Manual cache clear
getFilterCacheStatus()          // Cache status info
```

**Caching Strategy**:
- TTL: 1 hour
- Caches: Categories, price ranges
- Manual clear endpoint available
- Automatic refresh on content updates

#### Filter Routes (`backend/routes/filterRoutes.js`)
- **Base URL**: `/api/filters`
- **9 Endpoints**:

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/categories` | Get available categories with counts |
| GET | `/price-range` | Get price range information |
| POST | `/search` | Advanced search with all filters |
| GET | `/category/:category` | Get content by category |
| POST | `/price-range` | Get content by price range |
| GET | `/search-term` | Search by keyword |
| GET | `/trending` | Get trending content |
| POST | `/recommendations` | Get recommended content |
| GET | `/cache-status` | Cache status (debug) |
| POST | `/cache-clear` | Clear cache manually |

**Response Format**:
```json
{
  "success": true,
  "data": {
    "results": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8,
      "hasNextPage": true,
      "hasPrevPage": false
    },
    "filters": {
      "categories": [],
      "minPrice": null,
      "maxPrice": null,
      "searchTerm": "",
      "sortBy": "createdAt",
      "sortOrder": "desc"
    }
  }
}
```

### Frontend Components

#### 1. CategoryFilter Component (`CategoryFilter.tsx`)
- **Purpose**: Select content categories
- **Features**:
  - Multi-select checkboxes
  - Category counts
  - Select all/none toggle
  - Loading skeleton
  - Error handling

#### 2. PriceRangeFilter Component (`PriceRangeFilter.tsx`)
- **Purpose**: Filter by price range
- **Features**:
  - Preset price ranges with counts
  - Custom min/max inputs
  - Price info summary
  - Visual feedback for selected range
  - Input validation

#### 3. FilterBar Component (`FilterBar.tsx`)
- **Purpose**: Display active filters
- **Features**:
  - Show all active filters as removable tags
  - Color-coded by filter type
  - Quick remove buttons
  - Clear all filters

#### 4. ContentBrowser Page (`ContentBrowser.tsx`)
- **Purpose**: Complete content discovery interface
- **Features**:
  - Sidebar with CategoryFilter and PriceRangeFilter
  - Results with sorting options
  - Grid/list view toggle
  - Pagination controls
  - Loading and error states
  - Responsive layout

### React Hooks

#### useFilters Hook (`useFilters.ts`)
```typescript
const {
  filters,           // Current filter state
  results,           // Search results
  pagination,        // Pagination info
  isLoading,         // Loading state
  error,             // Error message
  setCategories,     // Set categories
  setPriceRange,     // Set price range
  setSearchTerm,     // Set search term
  setSortBy,         // Set sorting
  goToPage,          // Go to specific page
  nextPage,          // Next page
  prevPage,          // Previous page
  clearAllFilters,   // Clear all filters
  hasActiveFilters   // Check if any filter active
} = useFilters();
```

### Utility Functions

#### filterApi Module (`filterApi.ts`)
10 typed API wrapper functions:
```typescript
getCategories()              // Get available categories
getPriceRangeInfo()          // Get price info
searchContent(params)        // Search with filters
getContentByCategory(cat)    // Category filter
getContentByPriceRange()     // Price filter
searchByTerm(term)           // Keyword search
getTrendingContent()         // Trending content
getRecommendedContent()      // Recommendations
getCacheStatus()             // Cache info
clearCache()                 // Clear cache
```

## Data Flow

### Filter Search Flow
```
User selects filters
  ↓
useFilters hook updates state
  ↓
filterApi.searchContent() called
  ↓
POST /api/filters/search
  ↓
contentFilterService.filterContent()
  ↓
MongoDB query execution
  ↓
Results with pagination
  ↓
Component renders results
```

### Category Discovery Flow
```
Component mounts
  ↓
filterApi.getCategories() called
  ↓
GET /api/filters/categories
  ↓
contentFilterService.getAvailableCategories()
  ↓
Check cache (1-hour TTL)
  ├─ Valid: Return cached categories
  └─ Invalid: Query database
    ↓
    Count items per category
    ↓
    Return with counts
  ↓
CategoryFilter renders checkboxes
```

## Query Building

### Advanced Search Example
```javascript
// Backend builds this query
{
  contentType: { $in: ['video', 'article'] },
  price: { $gte: 5, $lte: 50 },
  $or: [
    { title: { $regex: 'tutorial', $options: 'i' } },
    { description: { $regex: 'tutorial', $options: 'i' } },
    { previewText: { $regex: 'tutorial', $options: 'i' } },
    { creator: { $regex: 'tutorial', $options: 'i' } }
  ],
  previewEnabled: true
}
```

## Integration Points

### Backend Integration
1. Add to main server file (`backend/index.js`):
```javascript
const filterRoutes = require('./routes/filterRoutes');
app.use('/api', filterRoutes);
```

### Frontend Integration
1. Add ContentBrowser to routing:
```typescript
import { ContentBrowser } from './pages/ContentBrowser';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

export function App() {
  return (
    <Routes>
      <Route path="/browse" element={<ContentBrowser />} />
    </Routes>
  );
}
```

2. Add navigation link:
```typescript
<Link to="/browse">Browse Content</Link>
```

## Filtering Capabilities

### 1. Category Filtering
- Support for: video, article, image, music
- Multi-select (OR logic)
- Real-time count updates
- Select all/none toggle

### 2. Price Range Filtering
- Preset ranges based on distribution
- Custom min/max inputs
- Validation (min ≤ max)
- Price statistics display

### 3. Text Search
- Searches: title, description, preview text, creator
- Case-insensitive
- Partial matching
- Results by relevance (total views)

### 4. Sorting Options
- By creation date (newest first)
- By price (low to high)
- By title (A-Z)
- By popularity (views)

### 5. Pagination
- Configurable page size (20 default, max 100)
- Total results count
- Page navigation
- Has next/prev page indicators

## Performance Features

### Caching
- **Category Cache**: 1-hour TTL
- **Price Range Cache**: 1-hour TTL
- **Manual Refresh**: Clear cache endpoint
- **Stale-while-revalidate**: Can serve stale data

### Query Optimization
- **Indexes**: contentType, creator, previewEnabled, price
- **Lean queries**: Only fetch necessary fields
- **Limit results**: Max 100 per page
- **Skip pagination**: Efficient offset-based pagination

### Frontend Optimization
- **Debounced search**: 300ms delay
- **Lazy loading**: Load components on-demand
- **Memoization**: Prevent unnecessary re-renders
- **Virtual scrolling**: For long lists (future enhancement)

## Error Handling

### API Errors
```javascript
try {
  const result = await filterApi.searchContent(filters);
} catch (error) {
  // Display error to user
  // Suggest filter adjustment
}
```

### Validation
- Min price > 0
- Min price ≤ max price
- Page > 0
- Limit between 1-100
- Categories must exist

## Search Examples

### Basic Category Filter
```json
{
  "categories": ["video"]
}
```

### Price Range Filter
```json
{
  "minPrice": 5,
  "maxPrice": 50
}
```

### Combined Filter
```json
{
  "categories": ["article", "video"],
  "minPrice": 10,
  "maxPrice": 100,
  "searchTerm": "tutorial",
  "sortBy": "price",
  "sortOrder": "asc",
  "page": 1,
  "limit": 20
}
```

## Testing Checklist

- [ ] CategoryFilter loads and displays all categories
- [ ] Category counts are accurate
- [ ] Select all/none toggles work
- [ ] PriceRangeFilter shows correct ranges
- [ ] Custom price inputs validate correctly
- [ ] FilterBar displays active filters
- [ ] Filter removal works
- [ ] ContentBrowser loads results
- [ ] Pagination works correctly
- [ ] Sorting options function
- [ ] View mode toggle works
- [ ] Search debouncing works
- [ ] Error handling displays properly
- [ ] No results message shows
- [ ] Loading skeletons display

## Future Enhancements

1. **Advanced Filtering**:
   - Duration/length filtering
   - Creator filtering
   - Rating/review filtering
   - Availability status

2. **Personalization**:
   - Save filter preferences
   - Filter history
   - Recommended filters

3. **Performance**:
   - Elasticsearch integration
   - Instant search
   - Faceted search

4. **Analytics**:
   - Track popular filters
   - Monitor search terms
   - Measure filter usage

5. **UI Enhancements**:
   - Filter suggestions
   - Visual search
   - Saved searches
   - Filter presets

## Deployment Checklist

- [ ] contentFilterService.js deployed
- [ ] filterRoutes.js mounted in main server
- [ ] MongoDB indexes created
- [ ] CategoryFilter component imported
- [ ] PriceRangeFilter component imported
- [ ] FilterBar component imported
- [ ] ContentBrowser page added to routing
- [ ] useFilters hook working
- [ ] filterApi utilities accessible
- [ ] API response times verified
- [ ] Cache working (1-hour TTL)
- [ ] Error handling tested

## Related Issues

- Issue #63: Content Preview (shows preview data)
- Issue #64: User Profile (user preferences)
- Issue #65: Transaction History (content purchases)
- Issue #66: STX Price (pricing information)
- Issue #68: Analytics (filter usage tracking)
