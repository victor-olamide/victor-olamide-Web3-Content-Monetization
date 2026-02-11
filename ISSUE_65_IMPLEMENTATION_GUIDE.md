# Transaction History Viewer - Implementation Guide

## Overview

Issue #65 implements a comprehensive transaction history tracking system with STX amount tracking, blockchain confirmation monitoring, and tax reporting capabilities.

## Architecture

### Backend Components

#### 1. TransactionHistory Model (`backend/models/TransactionHistory.js`)
- **Purpose**: Persistent storage for all blockchain transactions
- **Fields**:
  - `userAddress`: User's wallet address (indexed)
  - `transactionType`: 13 transaction types (purchase, subscription, refund, payout, transfer, deposit, withdrawal, renewal, upgrade, downgrade, fee, tip, reward)
  - `amount`: STX amount
  - `amountUsd`: USD equivalent at transaction time
  - `stxPrice`: STX/USD price at transaction time
  - `txHash`: Blockchain transaction hash (indexed, 64 hex chars)
  - `status`: Transaction status (pending, confirmed, failed, cancelled)
  - `blockHeight`: Stacks block number
  - `blockTime`: When block was created
  - `confirmations`: Number of blockchain confirmations
  - `description`: Human-readable transaction description
  - `category`: Category for organization (income, expense, fee, reward)
  - `relatedContentId`: Reference to content purchased/refunded
  - `relatedAddress`: Recipient/sender address
  - `metadata`: Flexible JSON for type-specific details
  - `taxRelevant`: Boolean flag for tax reporting
  - `isReconciled`: Whether blockchain data has been reconciled

- **Indexes**:
  1. `(userAddress, createdAt)` - For user timeline queries
  2. `(userAddress, status, createdAt)` - Filter by status
  3. `(userAddress, transactionType, createdAt)` - Filter by type
  4. `(userAddress, category, createdAt)` - Filter by category
  5. `(txHash)` - Fast hash lookups
  6. `(relatedAddress)` - Related address lookups
  7. `(metadata.tags)` - Metadata searching

- **Methods**:
  - `isConfirmed()`: Check if transaction is confirmed (6+ confirmations)
  - `isFinalized()`: Check if transaction is complete
  - `updateConfirmations()`: Update blockchain confirmation count
  - `toDisplay()`: Format for API response
  - `getTransactionSummary()`: Static method for aggregation

#### 2. TransactionHistoryService (`backend/services/transactionHistoryService.js`)
- **Purpose**: Business logic for transaction operations
- **Key Methods**:

| Method | Purpose | Parameters | Returns |
|--------|---------|------------|---------|
| `recordTransaction()` | Create new transaction | Transaction data | Transaction object |
| `getTransactionHistory()` | Paginated transaction list | skip, limit, filters, sorting | {data[], pagination} |
| `getTransactionsByDateRange()` | Query by date range | startDate, endDate, pagination | {data[], pagination} |
| `getPendingTransactions()` | Get unconfirmed transactions | pagination | {data[], pagination} |
| `getTransactionByHash()` | Lookup by blockchain hash | txHash | Transaction object |
| `getTransactionById()` | Lookup by database ID | transactionId | Transaction object |
| `getTransactionSummary()` | Aggregate statistics | — | {totalAmount, byType, byCategory} |
| `getTransactionsByType()` | Filter by type | type, pagination | {data[], pagination} |
| `getTransactionsByCategory()` | Filter by category | category, pagination | {data[], pagination} |
| `updateTransactionStatus()` | Mark confirmed/failed | txHash, status, blockData | Updated transaction |
| `updateConfirmations()` | Track blockchain confirmations | txHash, confirmations | Updated transaction |
| `getMonthlyTransactionSummary()` | Monthly rollup | month, year | {totalAmount, transactions} |
| `exportForTaxReporting()` | Tax-compliant export | year | {income, expenses, fees, total} |
| `getBalanceOverTime()` | Historical balance chart data | days | [{date, balance, transactions}] |
| `getUserTransactionStats()` | Dashboard metrics | — | {total, confirmed, pending, failed, lastDate} |
| `reconcileTransaction()` | Match blockchain data | transactionId, blockchainData | Reconciled transaction |

#### 3. Transaction Validation Middleware (`backend/middleware/transactionValidation.js`)
- **Purpose**: Ensure request data integrity
- **Validators**:
  - `validateTransactionData()`: Type, amount (0-1M), status, description (<500 chars)
  - `validatePaginationParams()`: skip (0+), limit (1-500), sortBy
  - `validateDateRangeParams()`: Format check, max 365 days
  - `validateTransactionFilter()`: Status/type/category enum validation
  - `validateTransactionHash()`: 64 hex character format
  - `validateTransactionId()`: 24 hex MongoDB ObjectId
  - `validateTransactionStatusUpdate()`: Status enum, blockHeight, confirmations
  - `validateExportYear()`: Year 2000-current
  - `validateMonth()`: Month 1-12
  - `validateDaysParam()`: Days 1-365

#### 4. Transaction Routes (`backend/routes/transactionRoutes.js`)
- **Purpose**: HTTP API endpoints
- **Endpoints**:

| Method | Path | Purpose | Parameters |
|--------|------|---------|------------|
| GET | `/api/transactions/history` | Paginated transaction list | skip, limit, status, type, category, sortBy, startDate, endDate |
| GET | `/api/transactions/summary` | Aggregated statistics | — |
| GET | `/api/transactions/stats` | User metrics | — |
| GET | `/api/transactions/pending` | Unconfirmed transactions | skip, limit |
| GET | `/api/transactions/by-type/:type` | Filter by type | type, skip, limit |
| GET | `/api/transactions/by-category/:category` | Filter by category | category, skip, limit |
| GET | `/api/transactions/date-range` | Date range filtering | startDate, endDate, skip, limit |
| GET | `/api/transactions/monthly/:year/:month` | Monthly summary | year, month |
| GET | `/api/transactions/balance-over-time` | Balance history | days |
| GET | `/api/transactions/:txId` | Single transaction | txId |
| GET | `/api/transactions/hash/:txHash` | Lookup by hash | txHash |
| POST | `/api/transactions` | Record new transaction | Transaction data |
| PUT | `/api/transactions/:txHash/status` | Update status | status, blockHeight, blockTime |
| PUT | `/api/transactions/:txHash/confirmations` | Update confirmations | confirmations |
| GET | `/api/transactions/export/tax/:year` | Tax export | year |

**Authentication**: All endpoints require `verifyWalletAuth` middleware
**Response Format**: `{success: boolean, data: any, message?: string, pagination?: {}}`

### Frontend Components

#### 1. TransactionHistoryPage (`frontend/src/components/TransactionHistoryPage.tsx`)
- **Purpose**: Main transaction viewer
- **Features**:
  - Paginated transaction list (10, 20, 50, 100 per page)
  - 5 independent filter dimensions
  - Real-time search
  - Date range filtering
  - STX/USD amount display
  - Status badges with icons
  - Export to JSON
  - Responsive design

#### 2. TransactionStatsComponent (`frontend/src/components/TransactionStatsComponent.tsx`)
- **Purpose**: Dashboard with statistics
- **Displays**:
  - Total amount (STX & USD)
  - Average transaction amount
  - Total transaction count
  - Last transaction date
  - Transaction status breakdown
  - Amount by category

#### 3. TransactionDetail (`frontend/src/components/TransactionDetail.tsx`)
- **Purpose**: Detailed transaction modal
- **Features**:
  - Full transaction information
  - Blockchain hash with copy-to-clipboard
  - Block height and confirmations
  - Related content/address links
  - Stacks explorer integration
  - Metadata display

#### 4. BalanceChart (`frontend/src/components/BalanceChart.tsx`)
- **Purpose**: Historical balance visualization
- **Features**:
  - Interactive bar chart
  - Time period selector (7, 14, 30, 60, 90 days)
  - Balance change tracking
  - Daily summary table
  - Peak balance indicator
  - Tooltip with transaction details

### React Hooks

#### 1. useTransactionHistory (`frontend/src/hooks/useTransactionHistory.ts`)
```typescript
const { transactions, total, isLoading, error, hasMore, refetch, setFilters, nextPage, previousPage } = useTransactionHistory({
  limit: 20,
  status: 'confirmed'
});
```

#### 2. useTransactionStats (`frontend/src/hooks/useTransactionStats.ts`)
```typescript
const { stats, summary, isLoading, error, refetch } = useTransactionStats(refreshInterval);
```

### Utility Functions

#### 1. transactionApi (`frontend/src/utils/transactionApi.ts`)
- 14 typed API wrapper functions
- Automatic session ID inclusion
- Error handling and throwing
- Covers all backend endpoints

#### 2. transactionExportUtils (`frontend/src/utils/transactionExportUtils.ts`)
- `exportAsJSON()`: Complete data archive
- `exportAsCSV()`: Transaction list
- `exportForTaxReportingCSV()`: Tax-formatted CSV
- `exportAsHTML()`: Printable HTML report

## Data Flow

### Recording a Transaction
```
User Action (purchase, subscription, etc.)
  ↓
Backend Records Transaction (recordTransaction)
  ↓
TransactionHistory Model (stored in MongoDB)
  ↓
Response returns transaction with ID
```

### Querying Transactions
```
Frontend Component
  ↓
useTransactionHistory hook
  ↓
transactionApi.getTransactionHistory()
  ↓
Backend transactionRoutes (/api/transactions/history)
  ↓
TransactionHistoryService.getTransactionHistory()
  ↓
MongoDB query with indexes
  ↓
Response with pagination
```

### Updating Confirmation Status
```
Blockchain Confirmation Event
  ↓
Backend Updates Status (updateTransactionStatus)
  ↓
TransactionHistory Model updated
  ↓
Confirmation count incremented
  ↓
Status changed to 'confirmed' at 6+ confirmations
```

## Transaction Types

1. **Purchase** - Content/subscription purchase
2. **Subscription** - Active subscription charge
3. **Refund** - Refund issued
4. **Payout** - Creator payout
5. **Transfer** - STX transfer
6. **Deposit** - Account funding
7. **Withdrawal** - Account withdrawal
8. **Renewal** - Subscription renewal
9. **Upgrade** - Tier upgrade
10. **Downgrade** - Tier downgrade
11. **Fee** - Platform/transaction fee
12. **Tip** - User tip
13. **Reward** - Earned reward

## Category Classification

- **Income**: Purchase, payout, deposit, reward, renewal, upgrade
- **Expense**: Withdrawal, subscription, fee, downgrade
- **Fee**: Platform charges
- **Reward**: Incentives and bonuses

## Transaction Status

- **Pending** (0-5 confirmations): Not yet finalized
- **Confirmed** (6+ confirmations): Finalized and secure
- **Failed**: Transaction failed on-chain
- **Cancelled**: Manually cancelled

## Integration Points

### Backend Integration
1. Add route imports to main server file
2. Include middleware in request pipeline
3. Initialize MongoDB connection for TransactionHistory
4. Add error handling for wallet authentication

### Frontend Integration
1. Import components where transaction history is needed
2. Use hooks in parent components for state management
3. Utilize utility functions for API calls and exports
4. Add navigation links to transaction pages

## Security Considerations

- All endpoints require wallet authentication
- Session ID validation on every request
- User can only access their own transactions
- Blockchain hash verification prevents tampering
- Tax data marked for compliance reporting

## Performance Optimization

- 7 MongoDB indexes for common query patterns
- Pagination limits to 500 items max per request
- Date range limits to 365 days max
- Virtual fields for calculated values (no recalculation)
- Caching strategies in React hooks

## Tax Reporting

Export supports:
- Year-based filtering
- Category-based summaries
- CSV format for accounting software
- USD conversion at transaction time
- Tax-relevant flag for manual verification

## Future Enhancements

1. **Real-time Updates**: WebSocket for live transaction status
2. **Advanced Analytics**: Charts for spending patterns
3. **Budget Tracking**: Category-based budgets
4. **Recurring Transactions**: Auto-tracking subscriptions
5. **Multi-currency Support**: Other token tracking
6. **Blockchain Webhooks**: Automatic confirmation updates
7. **PDF Statements**: Monthly statement generation
8. **API Rate Limiting**: Request throttling per user

## Testing

### Unit Tests Needed
- Transaction model validation
- Service method calculations
- API endpoint response formats
- Hook state management
- Export format generation

### Integration Tests Needed
- Full transaction lifecycle
- Pagination correctness
- Filter combination accuracy
- Date range validation
- Tax export compliance

### E2E Tests Needed
- Record transaction flow
- Update confirmation flow
- Export transaction flow
- Filter and search flows

## Deployment Checklist

- [ ] Database indexes created
- [ ] Environment variables set
- [ ] Error logging configured
- [ ] API rate limits set
- [ ] CORS headers configured
- [ ] Session validation working
- [ ] Frontend hooks tested
- [ ] Export functions tested
- [ ] Database backups configured
- [ ] Monitoring alerts set up

## Troubleshooting

### Transaction Not Appearing
- Check wallet authentication
- Verify transaction status is not 'failed'
- Check date range filters
- Clear browser cache

### Confirmation Count Not Updating
- Verify blockchain webhook is configured
- Check blockHeight is being recorded
- Ensure confirmations field is updating

### Export File Not Downloading
- Check browser popup blocker
- Verify file size is not too large
- Try different export format
- Check browser console for errors

## Support Resources

- [Stacks Blockchain Documentation](https://docs.stacks.co)
- [MongoDB Indexing Guide](https://docs.mongodb.com/manual/indexes/)
- [React Hooks Documentation](https://react.dev/reference/react/hooks)
- [STX Price API](https://www.coingecko.com/api/documentations/v3)
