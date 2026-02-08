# Content Removal and Refund System - Deployment Guide

## Overview
This guide explains how to deploy the content removal and refund functionality to your Stacks Content Monetization platform.

## Prerequisites
- Node.js v14+ and npm
- MongoDB instance
- Stacks blockchain testnet/mainnet access
- Creator private key for contract interactions
- Environment variables configured

## Step 1: Database Migrations

### Create Indexes
The Refund model includes database indexes for efficient querying:
```bash
# Connect to MongoDB and run:
db.contents.createIndex({ "contentId": 1 })
db.contents.createIndex({ "isRemoved": 1 })
db.purchases.createIndex({ "refundStatus": 1 })
db.refunds.createIndex({ "contentId": 1, "user": 1 })
db.refunds.createIndex({ "status": 1 })
db.refunds.createIndex({ "createdAt": -1 })
db.refunds.createIndex({ "creator": 1 })
```

### Backfill Existing Data
If migrating existing data:

```javascript
// Add removal fields to existing content
db.contents.updateMany(
  { isRemoved: { $exists: false } },
  { 
    $set: { 
      isRemoved: false,
      removedAt: null,
      removalReason: null,
      refundable: true,
      refundWindowDays: 30
    }
  }
)

// Add refund fields to existing purchases
db.purchases.updateMany(
  { refundStatus: { $exists: false } },
  { 
    $set: { 
      refundStatus: "none",
      refundAmount: null,
      refundTxId: null,
      refundedAt: null
    }
  }
)
```

## Step 2: Environment Variables
Add the following to your `.env` file:

```env
# Existing variables
STACKS_API_URL=https://api.testnet.hiro.so
CONTRACT_ADDRESS=your_contract_address
CREATOR_PRIVATE_KEY=your_private_key
NODE_ENV=development

# Optional: Configure default refund window (in days)
DEFAULT_REFUND_WINDOW=30

# Optional: Enable auto-refund processing
AUTO_REFUND_PROCESSING_ENABLED=true
AUTO_REFUND_PROCESSING_INTERVAL=3600000  # Run every hour (in milliseconds)
```

## Step 3: Deploy Smart Contract Functions
The Clarity contract already includes the `remove-content` and `refund-user` functions. 

**Verify contract has these functions:**
```clarity
;; Remove content function
(define-public (remove-content (content-id uint)) ...)

;; Refund function  
(define-public (refund-user (content-id uint) (user principal)) ...)
```

If updating an existing contract, deploy with:
```bash
# Using Clarinet
clarinet contract publish-deploy --testnet

# Or using your deployment script
node scripts/deploy/deploy-all.js
```

## Step 4: Backend Application Updates

### 1. Install Dependencies
All required packages should already be installed with your existing dependencies. Verify:
```json
{
  "express": "^4.x",
  "mongoose": "^6.x",
  "@stacks/transactions": "^6.x"
}
```

### 2. Start the Application
```bash
cd backend
npm install  # If needed
npm start
```

### 3. Verify Routes Registration
Check that `index.js` includes:
```javascript
const refundRoutes = require('./routes/refundRoutes');
app.use('/api/refunds', refundRoutes);
```

## Step 5: Testing

### Run Unit Tests
```bash
npm test -- backend/tests/contentRemoval.test.js
```

### Run Integration Tests
```bash
npm test -- backend/tests/contentRemovalIntegration.test.js
```

### Manual API Testing
```bash
# Test content removal endpoint
curl -X POST http://localhost:5000/api/content/1/remove \
  -H "x-creator-address: SP1..." \
  -H "Content-Type: application/json" \
  -d '{"reason":"Testing removal"}'

# Test refund endpoints
curl http://localhost:5000/api/refunds/user/SP2...

curl http://localhost:5000/api/refunds/creator/SP1...

curl http://localhost:5000/api/refunds/status/summary
```

## Step 6: Optional - Set Up Automatic Refund Processing

### Method 1: Cron Job (Recommended)
Create a scheduled task to auto-process refunds:

```javascript
// scripts/auto-process-refunds.js
const { autoProcessRefundsForRemovedContent } = require('../backend/services/refundService');

async function processRefunds() {
  const result = await autoProcessRefundsForRemovedContent();
  console.log('Auto-refund processing:', result);
}

// Run every hour
setInterval(processRefunds, 3600000);

// Or use node-cron for more control
const cron = require('node-cron');
cron.schedule('0 * * * *', processRefunds); // Every hour
```

### Method 2: API Endpoint Call
Call the auto-process endpoint periodically:

```bash
# Can be called from your admin dashboard
curl -X POST http://localhost:5000/api/refunds/auto-process/removed-content

# Or with a scheduled curl job
0 * * * * curl -X POST http://localhost:5000/api/refunds/auto-process/removed-content
```

## Step 7: Monitor and Maintain

### Key Monitoring Points
1. **Refund Summary Dashboard**
   ```bash
   curl http://localhost:5000/api/refunds/status/summary
   ```
   Monitor the response for:
   - Growing pending refunds
   - Failed refund count
   - Total refund amounts

2. **Creator Refund Status**
   Monitor each creator's pending refunds:
   ```bash
   curl http://localhost:5000/api/refunds/creator/CREATOR_ADDRESS
   ```

3. **Error Logs**
   Watch for contract interaction errors in logs

### Maintenance Tasks

**Weekly:**
- Check pending refund count
- Review any failed refunds
- Verify auto-processing is running

**Monthly:**
- Analyze refund patterns
- Review rejection rates
- Update content refund window policies if needed

## Step 8: Backup and Recovery

### Database Backups
Ensure your MongoDB instance includes regular backups:
```bash
# Backup refund-related collections
mongodump --db stacks_monetization \
  --collection contents \
  --collection purchases \
  --collection refunds
```

### Recovery Procedures
**If refund data is lost:**
1. Restore from most recent backup
2. Verify refund status consistency with blockchain
3. Re-initiate any missing refunds within window
4. Document the incident

## Troubleshooting

### Problem: Refunds Not Processing
**Solution:**
1. Check MongoDB connection
2. Verify creator private key is valid
3. Check Stacks network connectivity
4. Review contract error responses
5. Check logs for detailed error messages

### Problem: Content Removal Failed
**Solution:**
1. Verify creator address header is correct
2. Ensure creator owns the content
3. Check Stacks network is accessible
4. Verify contract has enough fees (STX)
5. Review transaction errors in blockchain

### Problem: Refund Window Not Working
**Solution:**
1. Verify `refundWindowDays` is set correctly
2. Check purchase timestamp is accurate
3. Ensure system clock is correct
4. Test with a purchase from yesterday

## Rollback Plan
If critical issues occur:

1. **Stop the application**
   ```bash
   npm stop
   ```

2. **Disable refund routes** (temporarily)
   - Comment out refund route registration in `index.js`
   - Keep content removal data for audit purposes

3. **Restore previous backup** if needed
   ```bash
   mongorestore --db stacks_monetization ./backup
   ```

4. **Redeploy when issues fixed**

## Security Considerations

1. **Creator Authentication**
   - Always validate `x-creator-address` header
   - Implement additional signing/verification if possible
   - Log all removal and refund approvals

2. **Access Control**
   - Only creators can remove their content
   - Only creators can approve their refunds
   - Consider admin override capabilities

3. **Data Validation**
   - Validate all user inputs
   - Verify purchase and content existence
   - Check refund window validity

4. **Audit Trail**
   - All refunds are tracked in database
   - Contract interactions are recorded on blockchain
   - Log removal reasons and approvals

## Performance Optimization

### Database Queries
- Use indexes created in Step 1
- Batch refund processing to avoid memory issues
- Archive old completed refunds periodically

### API Rate Limiting
Consider implementing rate limiting for refund endpoints:
```javascript
const rateLimit = require('express-rate-limit');

const refundLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/refunds', refundLimiter);
```

## Support and Escalation

For issues or questions:
1. Check REFUND_API_DOCUMENTATION.md for API details
2. Review logs for detailed error messages
3. Test with curl/Postman first
4. Contact development team with:
   - Error message and timestamp
   - Creator/User address
   - Content ID
   - Steps to reproduce

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-02-08 | Initial content removal and refund system |
