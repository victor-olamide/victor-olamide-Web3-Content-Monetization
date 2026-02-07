# Creator Dashboard Documentation

## Overview
The Creator Dashboard provides comprehensive earnings tracking and subscriber management for content creators on the Stacks blockchain.

## Features

### 1. Stats Overview
- Total Revenue (STX)
- Active Subscribers Count
- Pay-Per-View Sales Count
- Subscription Sales Count

### 2. Earnings Card
- Total earnings display
- Breakdown by PPV and Subscriptions
- Creator wallet address

### 3. Subscribers Card
- Active subscriber count
- Recent subscribers list
- Month-over-month growth percentage

### 4. Revenue Chart
- 7-day revenue visualization
- Interactive bar chart
- Hover tooltips with exact amounts

### 5. Earnings Breakdown
- Visual percentage breakdown
- Transaction counts per type
- Progress bars for each revenue stream

### 6. Transaction List
- Recent 10 transactions
- Transaction type badges (PPV/SUB)
- Timestamp and amount details

### 7. Top Content
- Top 5 performing content by revenue
- Sales count per content
- Revenue ranking

### 8. Export Functionality
- Export all earnings data to CSV
- Date range filtering support
- Includes all transaction details

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

## Components

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
