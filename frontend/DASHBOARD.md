# Creator Dashboard Documentation

## Overview

The Creator Dashboard (`/dashboard/creator`) is a comprehensive platform for creators to manage their content, track analytics, monitor revenue, and engage with subscribers. It provides real-time insights into content performance and audience metrics.

## Core Features

### 1. Content Management
- **Upload New Content**: Add videos, articles, images, or music directly to the dashboard
- **Edit Content**: Modify title, description, pricing, and other metadata
- **Delete Content**: Remove content from your dashboard
- **Content Browser**: Advanced content viewing with sorting and filtering

#### Supported Content Types
- Video
- Article
- Image
- Music

### 2. Analytics & Insights

#### Dashboard Metrics
- **Total Revenue**: Combined earnings from PPV and subscriptions
- **Subscribers**: Active paid subscribers count with growth trends
- **Uploaded Content**: Total content items with average pricing
- **Conversion Rate**: Purchase-to-view ratio

#### Advanced Analytics
- **Content Performance Metrics**
  - Total views and purchases
  - Revenue breakdown by content type
  - Top performing content identification
  - Engagement rate analysis

- **Revenue Comparison**
  - PPV vs Subscription revenue mix
  - Revenue trend visualization
  - Daily revenue breakdown
  - Actionable insights based on revenue patterns

- **Subscriber Engagement**
  - Monthly recurring revenue (MRR)
  - Subscriber retention rates
  - Churn risk identification
  - High-value subscriber tracking

### 3. Date Range Selection

Use the Analytics Date Range Picker to:
- Select preset ranges (7 days, 30 days, 90 days)
- Create custom date ranges
- Filter analytics based on specific time periods

### 4. Data Export

Export your dashboard data in multiple formats:

#### CSV Export
- Content list (title, description, type, price, views, purchases, revenue)
- Analytics data (date, PPV revenue, subscription revenue, total revenue)
- Combined reports

#### JSON Export
- Full metadata with structured format
- Ideal for data analysis tools
- Includes export timestamp and summary

### 5. Content Browser

The enhanced Content Browser provides:
- **Search**: Find content by title or description
- **Filter by Type**: Filter by video, article, image, or music
- **Sort**: Sort by date, views, revenue, or price
- **Quick Actions**: Edit, delete, or view content inline

## API Endpoints

### GET /api/creator/earnings/:address
Returns total earnings breakdown for a creator.

### GET /api/creator/subscribers/:address
Returns active subscribers list.

### GET /api/creator/growth/:address
Returns subscriber growth metrics.

### GET /api/creator/analytics/:address?period=7d
Returns daily revenue analytics.

### GET /api/creator/history/:address
Returns transaction history.

### GET /api/creator/top-content/:address?limit=5
Returns top performing content.

### GET /api/creator/export/:address?startDate&endDate
Returns exportable transaction data.

## Deployment

The frontend is deployed on Vercel with the following configuration:

- **Framework**: Next.js
- **Environment Variables**:
  - `NEXT_PUBLIC_API_URL`: Production API endpoint
  - `NEXT_PUBLIC_STACKS_NETWORK`: Mainnet
  - `NEXT_PUBLIC_ANALYTICS_ID`: Google Analytics measurement ID
- **Custom Domain**: Configured via Vercel dashboard
- **HTTPS**: Automatically enabled by Vercel

To deploy:
1. Ensure Vercel CLI is installed and logged in
2. Run `npm run deploy` from the frontend directory
3. Verify all pages load correctly post-deployment

## Components

### Core Components

1. **AnalyticsDateRangePicker**
   - Preset date range selection
   - Custom date range input
   - Date validation

2. **AnalyticsSummaryCard**
   - Display key metrics
   - Show trending indicators
   - Export functionality

3. **ContentBrowser**
   - Sortable and filterable content table
   - Search functionality
   - Inline actions

4. **ContentPerformanceMetrics**
   - Performance overview
   - Top performers visualization
   - Performance insights

5. **RevenueComparison**
   - Revenue mix visualization
   - Trend analysis
   - Revenue insights

6. **SubscriberEngagementMetrics**
   - Subscriber statistics
   - Retention analytics
   - Churn risk tracking

7. **ExportAnalytics**
   - CSV/JSON export options
   - Multiple export types
   - Download functionality

### Utility Components

- **DashboardLoadingSkeleton**: Loading states
- **DashboardErrorBoundary**: Error handling
- **ResponsiveDashboardLayout**: Responsive design
- **EmptyState**: No data scenarios

## Hooks

### useCreatorDashboard
Main hook for dashboard data management

```typescript
const {
  content,           // Array of content items
  metrics,           // Dashboard metrics
  loading,           // Loading state
  saving,            // Save operation state
  deletingId,        // Current deleting content ID
  error,             // Error message
  refresh,           // Refresh data function
  saveContent,       // Save/create content function
  removeContent,     // Delete content function
  totals,            // Aggregated totals
} = useCreatorDashboard(stxAddress);
```

### useAutoRefresh
Automatic data refresh with intervals

```typescript
const {
  isRefreshing,
  lastRefresh,
  nextRefresh,
  refresh,
  startAutoRefresh,
  stopAutoRefresh,
} = useAutoRefresh(onRefresh, { interval: 5 * 60 * 1000 });
```

## API Endpoints

- `EarningsCard` - Displays total earnings
- `SubscribersCard` - Shows active subscribers
- `RevenueChart` - Visualizes revenue trends
- `StatsOverview` - Quick metrics grid
- `EarningsBreakdown` - Revenue breakdown
- `TransactionList` - Recent transactions
- `TopContent` - Top performing content
- `ExportButton` - Data export functionality

## Usage

The dashboard automatically loads when a creator connects their wallet. All data is fetched in real-time from the backend API and updates based on blockchain transactions.
