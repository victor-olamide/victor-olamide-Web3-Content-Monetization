# Batch Operations - Integration with Existing Features

## Content Model Integration

Batch operations seamlessly integrate with the existing Content model:

### Fields Modified During Batch Operations

**Price Updates (batch-update-price)**
- `price`: Numeric field updated to newPrice
- `updatedAt`: Timestamp updated to current time
- `updatedBy`: Could track which batch operation updated it

**Content Removal (batch-remove)**
- `isRemoved`: Set to true
- `removedAt`: Set to current timestamp
- `removalReason`: Stores reason provided in batch request
- `updatedAt`: Timestamp updated to current time

**Metadata Updates (batch-update-metadata)**
- `title`: Updated if included in updates payload
- `description`: Updated if included in updates payload
- `contentType`: Updated if included in updates payload
- `tokenGating`: Updated if included in updates payload
- `refundable`: Updated if included in updates payload
- `refundWindowDays`: Updated if included in updates payload
- `updatedAt`: Timestamp updated to current time

### Compatibility with Existing Content Queries

```javascript
// All existing queries still work
Content.find({ creator: creatorId })                    // ✓ Works
Content.find({ isRemoved: false })                      // ✓ Works
Content.find({ price: { $gte: 1000000 } })             // ✓ Works
Content.find({ contentType: 'article' })               // ✓ Works
Content.find({ creator: creatorId, isRemoved: false })  // ✓ Works

// Batch operations respect existing query constraints
```

## Contract Service Integration

Batch operations call existing contract service functions:

### Price Update Integration
```javascript
// From batchOperationService.js
const updateResult = await contractService.updateContentPrice(
  contentId,
  newPrice,
  privateKey
);

// Returns:
{
  success: true,
  txId: '0x...',
  message: 'Price updated'
}

// Or on failure:
{
  success: false,
  error: 'Contract call failed',
  message: 'On-chain update failed'
}
```

### Graceful Fallback Pattern
```javascript
// Database update always succeeds
await Content.updateOne(
  { _id: contentId },
  { price: newPrice, updatedAt: new Date() }
);

// Contract update is best-effort
try {
  const txResult = await contractService.updateContentPrice(...);
  recordResult(contentId, txResult);
} catch (error) {
  // Don't throw - record error and continue
  recordResult(contentId, { success: false, error: error.message });
}
```

## Purchase and Refund Integration

Batch operations don't directly affect existing purchases, but price changes apply to new purchases:

### Scenario: Price Update Impact
```
Before Batch:
  Content A: 500k STX
  3 pending purchases at 500k each

Batch Update:
  Content A price → 1M STX
  status: completed
  results: [{contentId: "A", success: true, message: "..."}]

After Batch:
  Old purchases: Still 500k (immutable)
  New purchases: Will be 1M STX
  Historical data preserved
```

## Subscription Integration

Batch operations don't affect subscription models but can update subscription-gated content:

```javascript
// If batch updates a subscription-gated content
{
  operationType: "update-metadata",
  updates: {
    description: "New subscription benefit added"
  }
}

// Subscription model unchanged
// Content description updated for display purposes
// Existing subscribers see new description
```

## Royalty Distribution Integration

Batch operations support royalty calculations on future purchases:

```javascript
// If batch removes content
{
  isRemoved: true,
  removalReason: "Archived content"
}

// Existing royalty distributions: Unaffected (already completed)
// New purchases: Cannot occur (isRemoved prevents purchase)
// Historical royalties: Remain in RoyaltyDistribution records
```

## Analytics Integration

Batch operations fully logged for analytics queries:

```javascript
// Query analytics by operation type
BatchOperation.countDocuments({ operationType: 'update-price' })

// Query by creator
BatchOperation.find({ creator: creatorId })

// Query by date range
BatchOperation.find({
  createdAt: {
    $gte: new Date('2024-01-01'),
    $lt: new Date('2024-02-01')
  }
})

// Query success metrics
const batch = await BatchOperation.findById(batchId);
const successRate = (batch.successCount / batch.totalItems) * 100;
```

## Licensing Integration

Batch operations work alongside licensing without conflict:

### Scenario: Update Content for Licensing
```javascript
// Update content for new license tier pricing
{
  operationType: "update-metadata",
  updates: {
    description: "Now available with 24-hour rental option"
  }
}

// License model: Unaffected
// Existing licenses: Remain valid
// New licenses: Can be purchased at existing license prices
// Content metadata: Updated for clarity
```

## Access Control Integration

Batch operations respect existing access control:

```javascript
// Batch operations require creator ownership
verifyCreatorOwnership middleware checks:
✓ Creator address matches content.creator
✓ All contentIds belong to same creator
✓ Creator has permission to modify

// Non-creator cannot:
✗ Create batch for another creator's content
✗ Remove another creator's items
✗ Update another creator's metadata
```

## Middleware Integration

### Creator Auth Middleware
```javascript
// Routes using batch operations:
// /api/batches/batch-update-price  → Requires creator in request body
// /api/batches/batch-remove        → Requires creator in request body
// /api/batches/batch-update-metadata → Requires creator in request body

// Validation: Creator address must be provided
// Future enhancement: Extract from JWT token
```

### Potential Additional Middleware
```javascript
// Rate limiting (future)
app.use('/api/batches', rateLimit({
  windowMs: 3600000, // 1 hour
  max: 50             // 50 batches per hour per creator
}));

// Batch size enforcement
validateBatchSize({ maxItems: 100 })

// Metadata field whitelist validation
validateMetadataFields(['title', 'description', ...])
```

## Database Index Optimization

Indexes support batch operation queries:

```javascript
// Existing indexes in BatchOperation model
db.batchoperations.createIndex({ creator: 1 })           // Creator queries
db.batchoperations.createIndex({ status: 1 })            // Status filtering
db.batchoperations.createIndex({ createdAt: -1 })        // Sorting

// Query optimization
BatchOperation.find({ creator }).sort({ createdAt: -1 }) // Uses indexes
  .limit(50)
  .skip(0)
```

## Data Consistency Patterns

### Transaction Safety
```javascript
// Database update (synchronous)
await Content.updateOne({ _id }, { price: newPrice });

// Contract update (asynchronous)
contractService.updateContentPrice(...)
  .then(recordSuccess)
  .catch(recordFailure)

// Guarantee: Database always updated, contract best-effort
// Result: Consistent off-chain state, optimistic on-chain state
```

### State Machine
```javascript
BatchOperation states:
pending    → Created, not yet processed
processing → Currently iterating items
completed  → All items processed (may have failures)
failed     → Critical error (e.g., database down)

Content states:
Normal     → Available for purchase
Removed    → isRemoved=true, blocked from new purchases
Updated    → Metadata/price changed (still available)
```

## Error Handling Cascade

```
Request Validation Error
↓ (400 Bad Request)
✗ Fail fast, return error

Service Execution Error
↓ (Async execution)
Per-item tracking, continue processing

Database Errors
↓ (500 Server Error)
Log error, record failure, continue

Contract Errors
↓ (Graceful degradation)
Record failure, don't block success
```

## Forward Compatibility Considerations

### Future Feature Integration Points

1. **Webhooks**: Notify external systems on batch completion
   ```
   WebhookEvent.create({
     batchId,
     event: 'batch.completed',
     creator,
     successCount,
     failureCount
   })
   ```

2. **Batch Scheduling**: Schedule batches for future execution
   ```
   {
     scheduledFor: '2024-02-01T10:00:00Z',
     executeAt: timestamp
   }
   ```

3. **Batch Templates**: Save and reuse batch configurations
   ```
   BatchTemplate.create({
     creator,
     name: 'Quarterly Price Increase',
     operationType: 'update-price',
     updatePayload: { newPrice: 2000000 },
     autoApply: 'quarterly'
   })
   ```

4. **Batch Dependencies**: Chain operations
   ```
   // Phase 1: Update price
   // Phase 2: Update metadata once price done
   // Phase 3: Trigger licensing refresh
   ```

5. **Creator Notifications**: Email/push on completion
   ```
   if (batch.failureCount > 0) {
     notifyCreator(creator, {
       subject: 'Batch operation completed with errors',
       batchId,
       failureCount
     })
   }
   ```
