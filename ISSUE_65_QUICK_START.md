# Transaction History Quick Start Guide

## Overview

This guide will get you up and running with the Transaction History system in 5 minutes.

## Prerequisites

- Node.js 16+ with Express backend running
- MongoDB connected and configured
- Frontend React app with TypeScript support
- Valid wallet authentication (session ID)

## 5-Minute Setup

### Step 1: Backend - Add Route Integration (1 minute)

In your main server file (e.g., `backend/index.js`):

```javascript
// Add this import at the top
const transactionRoutes = require('./routes/transactionRoutes');

// Add this to your route middleware (after other routes)
app.use('/api', transactionRoutes);

// Optional: Add error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});
```

### Step 2: Frontend - Add Main Component (1 minute)

In your main app file:

```typescript
import TransactionHistoryPage from './components/TransactionHistoryPage';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <Router>
      <Routes>
        {/* Your other routes */}
        <Route path="/transactions" element={<TransactionHistoryPage />} />
      </Routes>
    </Router>
  );
}
```

### Step 3: Test Recording a Transaction (1 minute)

```javascript
// Backend test
const transactionService = require('./services/transactionHistoryService');

// Record a test transaction
await transactionService.recordTransaction({
  userAddress: 'SP1234567890ABCDEF',
  transactionType: 'purchase',
  amount: 10.5,
  amountUsd: 52.50,
  stxPrice: 5.0,
  description: 'Test purchase',
  category: 'expense'
});
```

### Step 4: Test Frontend Display (1 minute)

Navigate to `/transactions` in your browser. You should see:
- Transaction history list
- Filter options
- Search functionality
- Pagination controls

### Step 5: Test API Endpoint (1 minute)

```bash
curl -H "X-Session-Id: your-session-id" \
  "http://localhost:3000/api/transactions/history"
```

You should receive:
```json
{
  "success": true,
  "data": [...],
  "pagination": {...}
}
```

## Common Tasks

### Display Transaction History

```typescript
import { TransactionHistoryPage } from './components/TransactionHistoryPage';

export function Dashboard() {
  return <TransactionHistoryPage />;
}
```

### Record a Purchase Transaction

```typescript
import { recordTransaction } from './utils/transactionApi';

async function processPurchase(contentId: string, amount: number) {
  try {
    const transaction = await recordTransaction({
      transactionType: 'purchase',
      amount: amount,
      amountUsd: amount * 5.0, // Assuming $5 per STX
      stxPrice: 5.0,
      description: `Purchase of content ${contentId}`,
      category: 'expense',
      relatedContentId: contentId
    });
    console.log('Transaction recorded:', transaction);
  } catch (error) {
    console.error('Failed to record transaction:', error);
  }
}
```

### Get Transaction Stats

```typescript
import { useTransactionStats } from './hooks/useTransactionStats';

function StatsDashboard() {
  const { stats, isLoading } = useTransactionStats(30000); // Refresh every 30s
  
  if (isLoading) return <div>Loading...</div>;
  
  return (
    <div>
      <p>Total: {stats?.totalAmount} STX</p>
      <p>Confirmed: {stats?.confirmedTransactions}</p>
      <p>Pending: {stats?.pendingTransactions}</p>
    </div>
  );
}
```

### Filter Transactions by Status

```typescript
import { useTransactionHistory } from './hooks/useTransactionHistory';

function PendingTransactions() {
  const { transactions, setFilters } = useTransactionHistory();
  
  // Filter to pending transactions
  const handleFilterPending = () => {
    setFilters({ status: 'pending' });
  };
  
  return (
    <div>
      <button onClick={handleFilterPending}>Show Pending Only</button>
      {transactions.map(tx => (
        <div key={tx._id}>{tx.description}</div>
      ))}
    </div>
  );
}
```

### Export Transactions

```typescript
import { exportAsCSV, exportAsJSON } from './utils/transactionExportUtils';
import { getTransactionHistory } from './utils/transactionApi';

async function exportUserTransactions() {
  const response = await getTransactionHistory({
    limit: 500
  });
  
  const transactions = response.data;
  
  // Export as CSV
  exportAsCSV(transactions, 'transactions.csv');
  
  // Or export as JSON
  exportAsJSON(transactions, 'transactions.json');
}
```

### Get Balance History for Chart

```typescript
import { getBalanceOverTime } from './utils/transactionApi';
import BalanceChart from './components/BalanceChart';

function BalanceHistory() {
  return <BalanceChart />;
}
```

### Display Transaction Details

```typescript
import { useState } from 'react';
import { TransactionDetail } from './components/TransactionDetail';

function TransactionRow({ transaction }) {
  const [showDetail, setShowDetail] = useState(false);
  
  return (
    <>
      <tr onClick={() => setShowDetail(true)}>
        <td>{transaction.description}</td>
        <td>{transaction.amount} STX</td>
      </tr>
      
      <TransactionDetail
        transactionId={transaction._id}
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
      />
    </>
  );
}
```

## API Quick Reference

### Get Transaction History
```typescript
const response = await fetch('/api/transactions/history?limit=20', {
  headers: { 'X-Session-Id': sessionId }
});
const { data, pagination } = await response.json();
```

### Record Transaction
```typescript
const response = await fetch('/api/transactions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Session-Id': sessionId
  },
  body: JSON.stringify({
    transactionType: 'purchase',
    amount: 10.5,
    amountUsd: 52.50,
    stxPrice: 5.0,
    description: 'Test',
    category: 'expense'
  })
});
```

### Get Statistics
```typescript
const response = await fetch('/api/transactions/stats', {
  headers: { 'X-Session-Id': sessionId }
});
const { data } = await response.json();
// data = { totalAmount, confirmedTransactions, pendingTransactions, ... }
```

### Get Balance History
```typescript
const response = await fetch('/api/transactions/balance-over-time?days=30', {
  headers: { 'X-Session-Id': sessionId }
});
const { data } = await response.json();
// data = [{ date, balance, transactions }, ...]
```

## Database Verification

Check MongoDB to verify transactions are being recorded:

```bash
# Connect to MongoDB
mongo

# Select your database
use your_database_name

# View transactions
db.transactionhistories.find().pretty()

# Count transactions
db.transactionhistories.countDocuments()

# Check indexes
db.transactionhistories.getIndexes()
```

Expected output should show your created indexes:
```
{
  "v" : 2,
  "key" : { "userAddress" : 1, "createdAt" : -1 },
  "name" : "userAddress_1_createdAt_-1"
}
```

## Troubleshooting

### Transactions Not Appearing

1. **Check Session ID**: Verify `X-Session-Id` header is set
   ```javascript
   console.log('Session ID:', localStorage.getItem('sessionId'));
   ```

2. **Check Authentication**: Verify `verifyWalletAuth` middleware is working
   ```javascript
   // In your server logs, you should see auth validation
   ```

3. **Check Database Connection**: Verify MongoDB is running
   ```bash
   mongodb --version  # Should show installed version
   ```

### API Returns 401 Unauthorized

- Session ID is expired or invalid
- Solution: Re-authenticate and get new session ID

### API Returns 404 Not Found

- Route not properly integrated into main server
- Solution: Verify `app.use('/api', transactionRoutes)` is in your main file

### Transactions Show as "Pending"

- Transaction hasn't received 6 confirmations on blockchain yet
- Check confirmation count: `transaction.confirmations`
- Once confirmations reach 6, status updates to "confirmed"

### Export Not Downloading

- Browser popup blocker is enabled
- Solution: Add your domain to popup whitelist
- Or use manual copy-paste from browser console

## Performance Tips

1. **Pagination**: Always use `limit` query parameter (max 500)
   ```typescript
   const response = await getTransactionHistory({
     limit: 100,
     skip: 0
   });
   ```

2. **Caching**: Cache stats and summaries with intervals
   ```typescript
   const { stats } = useTransactionStats(60000); // Cache for 60s
   ```

3. **Date Ranges**: Limit to 365 days max for performance
   ```typescript
   // Good ✓
   const startDate = new Date();
   startDate.setDate(startDate.getDate() - 30);
   
   // Bad ✗ (limit exceeded)
   const startDate = new Date('2000-01-01');
   ```

4. **Search**: Use client-side search for small datasets
   ```typescript
   const filtered = transactions.filter(t =>
     t.description.includes(searchQuery)
   );
   ```

## What's Next?

After basic setup:

1. **Add Authentication Integration**: Link to wallet login
2. **Add Real Transactions**: Integrate with actual purchase flow
3. **Configure Blockchain Webhooks**: Auto-update confirmations
4. **Add Notifications**: Alert on transaction status changes
5. **Implement Tax Reports**: Generate year-end summaries
6. **Add Analytics**: Track spending patterns

## Example: Complete Integration

Here's a complete example showing all pieces working together:

```typescript
// Component
import { useTransactionHistory } from './hooks/useTransactionHistory';
import { useTransactionStats } from './hooks/useTransactionStats';
import { recordTransaction } from './utils/transactionApi';
import TransactionHistoryPage from './components/TransactionHistoryPage';

export function TransactionDashboard() {
  const { transactions, refetch, setFilters } = useTransactionHistory({
    limit: 20
  });
  const { stats } = useTransactionStats(30000);

  const handlePurchase = async (contentId: string, price: number) => {
    try {
      await recordTransaction({
        transactionType: 'purchase',
        amount: price,
        amountUsd: price * 5.0,
        stxPrice: 5.0,
        description: `Purchased content ${contentId}`,
        category: 'expense',
        relatedContentId: contentId
      });
      await refetch(); // Refresh transaction list
    } catch (error) {
      console.error('Purchase failed:', error);
    }
  };

  return (
    <div>
      <h1>Transactions</h1>
      
      {/* Stats Summary */}
      <div>
        Total: {stats?.totalAmount} STX
        Confirmed: {stats?.confirmedTransactions}
      </div>

      {/* Transaction List */}
      <TransactionHistoryPage />

      {/* Filter Controls */}
      <button onClick={() => setFilters({ status: 'pending' })}>
        Show Pending
      </button>
    </div>
  );
}
```

## Support Resources

- **Full Implementation Guide**: See `ISSUE_65_IMPLEMENTATION_GUIDE.md`
- **Complete API Reference**: See `ISSUE_65_API_REFERENCE.md`
- **Stacks Documentation**: https://docs.stacks.co
- **MongoDB Docs**: https://docs.mongodb.com

## Success Checklist

- [ ] Backend routes integrated into main server
- [ ] Frontend TransactionHistoryPage added to routing
- [ ] Test transaction recorded via API
- [ ] Transaction visible in UI
- [ ] Pagination controls working
- [ ] Filters applying correctly
- [ ] Stats calculating and displaying
- [ ] Export functionality working
- [ ] Database indexes created
- [ ] Session authentication working

**You're ready to use Transaction History! 🎉**
