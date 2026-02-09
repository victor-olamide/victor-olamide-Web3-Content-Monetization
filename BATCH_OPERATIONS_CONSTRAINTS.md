# Batch Operations - Size Constraints and Safety Limits

## Maximum Batch Size: 100 Items

### Rationale for 100-Item Limit

The 100-item batch size limit balances several competing concerns:

#### 1. Performance
- **Processing Time:** 100 items takes ~10-60 seconds depending on contract load
- **Memory Usage:** Single batch ≤ 50MB even with large payloads
- **Database Query:** Bulk operations stay within optimal query window
- **API Response:** Client gets results within reasonable timeout window

#### 2. Resource Consumption
- **Database Connections:** Single batch uses one connection
- **Contract Calls:** 100 sequential calls manageable in one executor
- **Network Bandwidth:** JSON payload typically 5-50KB
- **Disk I/O:** Batch operation document + results fit in single DB block

#### 3. User Experience
- **Reasonable Wait Time:** Processing completes in under 60 seconds
- **Polling Interval:** 2-5 second polls feasible for 100 items
- **Error Visibility:** Manageable result set for UI display
- **Retry Feasibility:** Failed items can be re-batched easily

### Overflow Handling

If user submits more than 100 items:

```javascript
if (contentIds.length > 100) {
  return res.status(400).json({
    message: 'Batch size limited to 100 items',
    submitted: contentIds.length,
    allowed: 100,
    suggestion: 'Create multiple batches or reduce content count'
  });
}
```

**Recommended Client Strategy:**
```javascript
const contentIds = /* 250 items */;
const batchSize = 100;
const batches = [];

for (let i = 0; i < contentIds.length; i += batchSize) {
  batches.push(contentIds.slice(i, i + batchSize));
}

// Create 3 batches
for (const batch of batches) {
  await createBatch(creator, batch, newPrice);
}
```

## Field Size Constraints

### Metadata Update Payloads

| Field | Max Size | Validation |
|-------|----------|-----------|
| title | 255 chars | string, non-empty |
| description | 10,000 chars | string, optional |
| contentType | 50 chars | enum: video, article, tutorial, etc. |
| removalReason | 500 chars | string, optional |
| newPrice | 64-bit int | numeric, ≥ 0 |

### Per-Item Result Size

```javascript
{
  contentId: "128-char max",      // 128 bytes
  success: true,                  // 4 bytes
  message: "255-char message",    // 255 bytes max
  error: "255-char error",        // 255 bytes max
  txId: "64-char transaction ID"  // 64 bytes max
}
// Total: ~700 bytes per result
// 100 items: ~70KB max
```

## Database Storage Constraints

### BatchOperation Document Size

```javascript
{
  _id: ObjectId,                  // 12 bytes
  creator: String,                // 50 bytes
  operationType: String,          // 20 bytes
  status: String,                 // 20 bytes
  totalItems: Number,             // 8 bytes
  successCount: Number,           // 8 bytes
  failureCount: Number,           // 8 bytes
  contentIds: [String],           // 50 * 100 = 5,000 bytes
  updatePayload: Object,          // 1,000-5,000 bytes
  results: [Object],              // 700 * 100 = 70,000 bytes
  createdAt: Date,                // 8 bytes
  updatedAt: Date,                // 8 bytes
  completedAt: Date,              // 8 bytes
}
// Total: ~76 KB per batch document
// Collection: 76 KB * 100,000 batches = 7.6 GB
```

### Index Storage Impact

```
creator index:     ~500 MB (for 10M creators)
status index:      ~200 MB (sparse for pending)
createdAt index:   ~500 MB (time-series)
Total indexes:     ~1.2 GB for 100K batches
```

## API Request Size Limits

### Recommended Express Configuration

```javascript
// In index.js
app.use(express.json({ limit: '1mb' })); // Default is 100kb

// Batch request worst-case:
// 100 contentIds * 50 chars = 5,000 bytes
// + overhead = ~10-20 KB total
// Well within 1 MB limit
```

### Request Headers

```
POST /api/batches/batch-update-price HTTP/1.1
Content-Type: application/json
Content-Length: 8,547  // Typical batch
```

## Memory Usage During Processing

### Peak Memory During Execution

```
MongoDB connection pool:    50 MB
Batch operation object:     500 KB
Content model cache:        100 items × 50 KB = 5 MB
Results array:              100 items × 1 KB = 100 KB
Active contracts:           10 connections × 1 MB = 10 MB
                           _______________
Total peak:                ~66 MB
```

### Safe Operating Parameters

- **Minimum Node.js heap:** 512 MB (--max-old-space-size=512)
- **Recommended heap:** 2 GB
- **Safe concurrent batches:** 10-20 on 2 GB heap
- **Batches per minute:** 30-50 without memory issues

## Queue and Rate Limiting

### Recommended Rate Limits

```javascript
// Per creator, per hour
const MAX_BATCHES_PER_HOUR = 50;
const MAX_ITEMS_PER_HOUR = 5000; // 50 batches × 100 items

// Per IP address, per hour
const MAX_REQUESTS_PER_HOUR = 100;

// Burst limits (per minute)
const MAX_REQUESTS_PER_MINUTE = 10;
```

### Future Implementation

```javascript
const rateLimit = require('express-rate-limit');

const batchLimiter = rateLimit({
  windowMs: 3600000,           // 1 hour
  max: 50,                     // 50 requests per hour
  keyGenerator: (req) => {
    return req.body.creator;   // Rate limit per creator
  },
  handler: (req, res) => {
    res.status(429).json({
      message: 'Too many batch operations. Max 50 per hour.',
      retryAfter: 3600
    });
  }
});

app.post('/api/batches/batch-*', batchLimiter);
```

## Monitoring Batch Health

### Recommended Alerts

| Metric | Warning | Critical |
|--------|---------|----------|
| Batch size | >80 items | >100 items (blocked) |
| Processing time | >45 sec | >120 sec (timeout) |
| Failure rate | >20% | >50% |
| Pending queue | >100 batches | >500 batches |
| Database size | >5 GB | >10 GB |

### Health Check Endpoint

```javascript
app.get('/api/batches/health', async (req, res) => {
  const stats = {
    totalBatches: await BatchOperation.countDocuments(),
    pendingBatches: await BatchOperation.countDocuments({ status: 'pending' }),
    failedBatches: await BatchOperation.countDocuments({ status: 'failed' }),
    avgProcessingTime: await getAvgProcessingTime(),
    avgSuccessRate: await getAvgSuccessRate(),
    dbSize: await getCollectionSize('batchoperations')
  };
  
  res.json(stats);
});
```

## Scalability Path

### Current (100-item limit, single server)
- Max: 50 batches/hour = 5,000 items/hour
- Supports: Small-to-medium creator base

### Future: Distributed Processing
```
1. Increase batch size to 500 items
2. Use job queue (Bull, RabbitMQ)
3. Separate executor workers
4. Parallel processing (10 items at a time)
5. Supports: Large creator bases
```

### Future: Streaming Processing
```
1. Stream results instead of storing
2. Webhook notifications instead of polling
3. Background workers for long-running batches
4. Supports: Enterprise-scale operations
```

## Cost Considerations

### Storage
- 100 batches/day × 76 KB = 7.6 MB/day
- 30 days = 228 MB/month
- 1 year = 2.7 GB

### Compute
- Batch processing: 10-100ms per item
- 100 items = 1-10 seconds CPU
- 50 batches/hour = 50-500 seconds CPU/hour

### Network
- Typical batch: 10-20 KB request, 5-10 KB response
- 50 batches/hour = 500-1000 KB/hour
- Negligible bandwidth impact
