# Batch Operations - Async Execution Pattern and Error Tracking

## Async Execution Overview

Batch operations use a fire-and-forget async pattern for scalability:

```
┌─────────────────────────────────────────────────────────┐
│ Client Request Received                                 │
│ POST /api/batches/batch-update-price                   │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ Step 1: Validation (Synchronous)                        │
│ - Check array size (≤100)                               │
│ - Validate types and formats                             │
│ - Verify creator address                                 │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ Step 2: Create BatchOperation (Synchronous)             │
│ - Insert document in DB                                  │
│ - Set status: "pending"                                 │
│ - Generate batchId                                      │
│ - Return immediately to client                          │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ Client receives response with batchId                   │
│ HTTP 201: {"batchId": "...", "status": "pending"}      │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ Step 3: Queue for Async Processing                      │
│ - Schedule executor via setImmediate or Promise         │
│ - Main thread continues serving requests                │
└─────────────────────────────────────────────────────────┘
                         ↓
         ┌──────────────┴──────────────┐
         ↓                             ↓
┌──────────────────────────────┐  ┌──────────────────────────────┐
│ Background Execution         │  │ Client Polling Loop          │
│ (Async, separate stack)      │  │ GET /api/batches/:batchId   │
│                              │  │ Every 2 seconds              │
│ Update status: processing    │  │                              │
│ FOR each contentId:          │  │ Checks batch.status          │
│  - Update DB                 │  │  - pending → processing      │
│  - Call contract service     │  │  - processing → completed    │
│  - Record result             │  │  - completed → display       │
│ Update status: completed     │  │                              │
│ Record final counts          │  │ Displays per-item results    │
└──────────────────────────────┘  └──────────────────────────────┘
```

## Execution Phases

### Phase 1: Validation (0-10ms)
```javascript
// Synchronous - fast checks
if (!contentIds || contentIds.length === 0) throw Error;
if (contentIds.length > 100) throw Error;
if (!newPrice || newPrice < 0) throw Error;
```

### Phase 2: Persistence (0-50ms)
```javascript
// Synchronous - DB insert
const batch = new BatchOperation({
  creator,
  operationType: 'update-price',
  status: 'pending',
  totalItems: contentIds.length,
  contentIds,
  updatePayload: { newPrice },
  results: []
});
await batch.save();
```

### Phase 3: Queue (0-1ms)
```javascript
// Async queue for later execution
setImmediate(() => {
  executeBatchPriceUpdate(batch._id, contentIds, newPrice);
});
```

### Phase 4: Response (0-1ms)
```javascript
// Return immediately
res.status(201).json({
  message: 'Batch price update initiated',
  batchId: batch._id,
  status: batch.status,
  totalItems: batch.totalItems
});
```

## Actual Async Execution

### Background Worker Function
```javascript
async function executeBatchPriceUpdate(batchId, contentIds, newPrice) {
  const batch = await BatchOperation.findById(batchId);
  
  try {
    batch.status = 'processing';
    batch.results = [];
    await batch.save();

    for (const contentId of contentIds) {
      try {
        // Database update
        const content = await Content.findById(contentId);
        if (!content) {
          recordResult(contentId, false, 'Content not found');
          continue;
        }

        // Update database
        content.price = newPrice;
        content.updatedAt = new Date();
        await content.save();

        // Attempt contract update
        try {
          const txResult = await contractService.updateContentPrice(
            contentId,
            newPrice,
            privateKey
          );
          
          recordResult(contentId, true, `Price updated to ${newPrice} STX`, txResult.txId);
        } catch (contractError) {
          // Database succeeded, contract failed - still count as partial success
          recordResult(contentId, true, 'Price updated (off-chain)', null, contractError.message);
        }
      } catch (itemError) {
        recordResult(contentId, false, itemError.message);
      }
    }

    // Finalize
    batch.status = 'completed';
    batch.successCount = batch.results.filter(r => r.success).length;
    batch.failureCount = batch.results.filter(r => !r.success).length;
    batch.completedAt = new Date();
    await batch.save();
  } catch (error) {
    batch.status = 'failed';
    batch.error = error.message;
    await batch.save();
  }
}

function recordResult(contentId, success, message, txId = null, error = null) {
  batch.results.push({
    contentId,
    success,
    message: success ? message : undefined,
    error: !success ? error || message : undefined,
    txId
  });
}
```

## Error Tracking Strategy

### Multi-Level Error Handling

| Level | Error Type | Handler | Recovery |
|-------|-----------|---------|----------|
| 1. Route | Invalid input | Return 400 | None (client's problem) |
| 2. Service | Database error | Throw/catch | Record failure |
| 3. Item | Contract error | Catch/record | Continue loop |
| 4. Executor | Critical error | Log/retry | Mark batch failed |

### Per-Item Error Tracking

```javascript
// Success case
{
  contentId: "content-123",
  success: true,
  message: "Price updated to 1000000 STX",
  txId: "0x1234abcd..."
}

// Partial success (DB ok, contract failed)
{
  contentId: "content-456",
  success: true,
  message: "Price updated (off-chain)",
  txId: null,
  error: "Contract call timed out"
}

// Complete failure
{
  contentId: "content-789",
  success: false,
  error: "Content not found in database"
}
```

## Status Transitions and Polling

### Client Polling Loop
```javascript
async function pollBatchStatus(batchId, maxPolls = 300, interval = 2000) {
  let polls = 0;
  
  while (polls < maxPolls) {
    const batch = await fetch(`/api/batches/${batchId}`).then(r => r.json());
    
    console.log(`[${polls}] Status: ${batch.status}`);
    console.log(`Progress: ${batch.successCount + batch.failureCount}/${batch.totalItems}`);
    
    if (['completed', 'failed'].includes(batch.status)) {
      console.log(`Final: ${batch.successCount} succeeded, ${batch.failureCount} failed`);
      return batch;
    }
    
    await sleep(interval);
    polls++;
  }
  
  throw new Error('Polling timeout - batch still pending');
}
```

### Expected Status Timeline
```
Time    Status      Progress  Event
────    ──────      ────────  ──────────────────────
0ms     pending     0/100     Batch created, queued
5ms     pending     0/100     Client polls
10ms    pending     0/100     Async executor starts
100ms   processing  0/100     Updated DB, still running
2100ms  processing  45/100    Client polls again
4100ms  processing  89/100    Client polls again
6100ms  completed   100/100   Batch finished
6105ms  completed   100/100   Client receives final results
```

## Handling Async Failures

### Network Failures
```javascript
// Contract call timeout
try {
  const result = await contractService.updateContentPrice(...);
} catch (error) {
  if (error.code === 'TIMEOUT') {
    // Record as partial success (DB ok, contract timeout)
    recordResult(contentId, true, 'Price updated (on-chain pending)', null, 'Network timeout');
  } else {
    recordResult(contentId, false, error.message);
  }
}
```

### Database Failures
```javascript
// DB operation fails mid-batch
try {
  await Content.updateOne({ _id }, { price: newPrice });
} catch (error) {
  if (error.code === 11000) {
    recordResult(contentId, false, 'Duplicate key error');
  } else if (error.code === 'ECONNREFUSED') {
    // Critical - stop processing, mark batch as failed
    throw new Error('Database connection lost');
  } else {
    recordResult(contentId, false, error.message);
  }
}
```

### Memory Exhaustion
```javascript
// Check memory before processing
const memUsage = process.memoryUsage();
if (memUsage.heapUsed / memUsage.heapTotal > 0.8) {
  // Pause batch, wait for garbage collection
  await new Promise(r => setTimeout(r, 100));
}
```

## Graceful Degradation

### Database-First Approach
```
Priority 1: Database update MUST succeed
Priority 2: Contract update is BEST-EFFORT
Priority 3: Result tracking MUST complete

Result: Creator sees off-chain updates even if contract fails
        Contract updates can be retried separately
        Batch always completes with full result tracking
```

### Cascade Failure Example
```
Item 1: DB ok, contract ok     → Success
Item 2: DB ok, contract fail   → Partial success (marked)
Item 3: DB fails, stop batch   → Batch failed (critical)

Final: 1 success, 1 partial success, 98 pending
Creator: Can retry item 3 in new batch, item 2 is considered done
```

## Performance Optimization

### Batch Processing Strategies

**Sequential Processing** (Current)
```javascript
for (const contentId of contentIds) {
  await updateItem(contentId);  // Wait for each
}
// Time: n × itemTime
// Max: 100 × 1s = 100s
// Safe: Yes, no concurrency issues
```

**Parallel Processing** (Future)
```javascript
await Promise.all(
  contentIds.map(id => updateItem(id))
);
// Time: ~itemTime (concurrent)
// Max: 100 concurrent calls
// Safe: Requires connection pooling
```

**Chunked Parallel** (Recommended Future)
```javascript
const chunkSize = 10;
for (let i = 0; i < contentIds.length; i += chunkSize) {
  const chunk = contentIds.slice(i, i + chunkSize);
  await Promise.all(chunk.map(id => updateItem(id)));
}
// Time: (n/chunkSize) × itemTime
// Max: 100 items, 10 chunks = ~10x faster
// Safe: Controlled concurrency
```

## Monitoring Async Execution

### Metrics to Track
```javascript
const metrics = {
  batchId: batch._id,
  startTime: batch.createdAt,
  endTime: batch.completedAt,
  totalDuration: batch.completedAt - batch.createdAt,
  itemCount: batch.totalItems,
  avgTimePerItem: totalDuration / itemCount,
  successRate: batch.successCount / batch.totalItems,
  failureRate: batch.failureCount / batch.totalItems
};
```

### Alerts for Slow Execution
```javascript
if (batch.totalDuration > 120000) {  // 2 minutes
  console.warn(`Slow batch ${batch._id}: ${batch.totalDuration}ms for ${batch.totalItems} items`);
  // Notify ops team for investigation
}

if (batch.failureRate > 0.5) {  // >50% failures
  console.warn(`High failure rate batch ${batch._id}: ${batch.failureRate * 100}% failed`);
  // Trigger incident response
}
```
