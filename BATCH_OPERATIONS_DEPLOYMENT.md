# Batch Operations - Deployment and Monitoring Guide

## Pre-Deployment Checklist

### Code Verification
- [x] All endpoints implemented and tested
- [x] Input validation in place (size, type, range)
- [x] Error handling comprehensive (400, 404, 500)
- [x] Database indexes created
- [x] Service layer properly isolated
- [x] Routes registered in index.js
- [x] No SQL/NoSQL injection vulnerabilities
- [x] No XSS vulnerabilities in response data

### Documentation Complete
- [x] API endpoints documented
- [x] Architecture diagrams included
- [x] Usage examples provided
- [x] Error codes documented
- [x] Performance notes included
- [x] Deployment guide created

### Testing Coverage
- [x] Unit tests for service layer
- [x] Integration tests for routes
- [x] Error scenario tests
- [x] Load tests for batch limits
- [x] Pagination tests
- [x] Async execution tests

## Deployment Steps

### 1. Database Preparation (MongoDB)

Create required indexes:
```javascript
// Connect to MongoDB
use stacks_monetization

// Create primary index
db.batchoperations.createIndex(
  { creator: 1, createdAt: -1 },
  { name: "creator_createdAt_idx" }
);

// Create status index for pending queries
db.batchoperations.createIndex(
  { status: 1, createdAt: -1 },
  { name: "status_createdAt_idx", sparse: true }
);

// Create index for single batch lookups
db.batchoperations.createIndex(
  { _id: 1 },
  { name: "_id_idx" }
);

// Verify indexes
db.batchoperations.getIndexes();
```

### 2. Environment Configuration

Add to `.env` file:
```bash
# Batch Operations Configuration (optional - uses defaults)
BATCH_OPERATION_MAX_SIZE=100
BATCH_OPERATION_TIMEOUT=120000
BATCH_EXECUTOR_DELAY=100

# Creator Authentication
CREATOR_PRIVATE_KEY=your_private_key_here
```

### 3. Application Deployment

```bash
# 1. Pull latest code
git pull origin issue/59-batch-operations

# 2. Verify dependencies (already in package.json)
npm list mongoose express

# 3. Run tests
npm test

# 4. Start server
npm start

# 5. Verify endpoint
curl http://localhost:5000/api/batches/creator/SP2ZNGJ85ENDY6QTHQ4P3KCQJRNYWB43HCUB7QY0J
```

### 4. Health Check

```bash
# Verify all routes are working
curl -X GET http://localhost:5000/api/status

# Expected response:
{
  "server": "up",
  "indexer": "running",
  "storage": "connected",
  // ... other status items
}

# Test batch creation
curl -X POST http://localhost:5000/api/batches/batch-update-price \
  -H "Content-Type: application/json" \
  -d '{
    "creator": "SP2ZNGJ85ENDY6QTHQ4P3KCQJRNYWB43HCUB7QY0J",
    "contentIds": ["test-id"],
    "newPrice": 1000000
  }'

# Should return:
{
  "message": "Batch price update initiated",
  "batchId": "...",
  "status": "pending",
  "totalItems": 1
}
```

## Monitoring Setup

### Key Metrics to Track

```javascript
// In application code
const metrics = {
  // Batch statistics
  totalBatches: await BatchOperation.countDocuments(),
  pendingBatches: await BatchOperation.countDocuments({ status: 'pending' }),
  completedBatches: await BatchOperation.countDocuments({ status: 'completed' }),
  failedBatches: await BatchOperation.countDocuments({ status: 'failed' }),

  // Performance metrics
  avgProcessingTime: await getAvgProcessingTime(),
  avgSuccessRate: await getAvgSuccessRate(),
  avgFailureRate: await getAvgFailureRate(),

  // Resource metrics
  dbCollectionSize: await getCollectionSize('batchoperations'),
  dbIndexSize: await getIndexSize('batchoperations'),
  pendingQueueSize: await getPendingQueueSize()
};
```

### Prometheus Metrics

Add Prometheus client for monitoring:
```javascript
const prometheus = require('prom-client');

// Create metrics
const batchCounter = new prometheus.Counter({
  name: 'batch_operations_total',
  help: 'Total batch operations created',
  labelNames: ['operation_type', 'status']
});

const processingTime = new prometheus.Histogram({
  name: 'batch_processing_duration_seconds',
  help: 'Batch processing duration in seconds',
  buckets: [1, 5, 10, 30, 60, 120]
});

// Track metrics
batchCounter.inc({ operation_type: 'update-price', status: 'completed' });
processingTime.observe(processingTimeSeconds);

// Expose metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', prometheus.register.contentType);
  res.end(await prometheus.register.metrics());
});
```

### Alerting Rules

```yaml
# prometheus-alerts.yaml
groups:
  - name: batch_operations
    rules:
      - alert: HighBatchFailureRate
        expr: rate(batch_failures_total[5m]) > 0.1
        for: 5m
        annotations:
          summary: "High batch operation failure rate"

      - alert: SlowBatchProcessing
        expr: histogram_quantile(0.95, batch_processing_duration_seconds) > 60
        for: 10m
        annotations:
          summary: "Batch processing slower than 60 seconds"

      - alert: LargePendingQueue
        expr: batch_pending_operations > 500
        for: 5m
        annotations:
          summary: "Large pending batch operation queue"
```

### Log Monitoring

Track these log patterns:
```bash
# Successful batches
grep "Batch.*completed" /var/log/app.log | wc -l

# Failed batches
grep "Batch.*failed" /var/log/app.log | wc -l

# Errors
grep "ERROR.*batch" /var/log/app.log | tail -20

# Performance
grep "processing_time:" /var/log/app.log | tail -10
```

## Health Check Endpoint

```javascript
app.get('/api/batches/health', async (req, res) => {
  try {
    const stats = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      batch_operations: {
        total: await BatchOperation.countDocuments(),
        pending: await BatchOperation.countDocuments({ status: 'pending' }),
        processing: await BatchOperation.countDocuments({ status: 'processing' }),
        completed: await BatchOperation.countDocuments({ status: 'completed' }),
        failed: await BatchOperation.countDocuments({ status: 'failed' })
      },
      performance: {
        avg_processing_time_ms: await getAvgProcessingTime(),
        success_rate: await getAvgSuccessRate(),
        failure_rate: await getAvgFailureRate()
      },
      resources: {
        db_collection_size_bytes: await getCollectionSize('batchoperations'),
        db_indexes_size_bytes: await getIndexSize('batchoperations'),
        heap_used_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
      }
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});
```

## Troubleshooting Common Issues

### Issue: Batches Stuck in "pending" Status

**Symptoms:**
```
Batch created 10 minutes ago, still in pending status
No processing started
```

**Diagnosis:**
```javascript
// Check pending batches
db.batchoperations.find({ status: 'pending' }).count()

// Check logs for executor errors
grep "ERROR.*executeBatch" /var/log/app.log
```

**Solution:**
```javascript
// Manually trigger executor for stuck batch
const batch = await BatchOperation.findById(batchId);
await executeBatchPriceUpdate(batch._id, batch.contentIds, batch.updatePayload.newPrice);
```

### Issue: High Memory Usage During Batch Processing

**Symptoms:**
```
Node.js process memory: 1.2 GB
CPU usage: 100%
Batch processing slow
```

**Root Cause:**
- Processing too many items sequentially
- Large contract responses accumulating
- Memory leak in executor

**Solution:**
```javascript
// 1. Reduce batch size
const MAX_BATCH_SIZE = 50;  // Was 100

// 2. Add garbage collection
if (itemCount % 25 === 0) {
  if (global.gc) global.gc();
}

// 3. Implement chunked processing
const CHUNK_SIZE = 10;
for (let i = 0; i < contentIds.length; i += CHUNK_SIZE) {
  const chunk = contentIds.slice(i, i + CHUNK_SIZE);
  await Promise.all(chunk.map(id => processItem(id)));
}
```

### Issue: Database Connection Pool Exhaustion

**Symptoms:**
```
ECONNREFUSED errors in logs
Batch operations failing
Other services affected
```

**Root Cause:**
- Too many concurrent batches
- Executor holding connections too long
- Database connection limit reached

**Solution:**
```javascript
// Increase connection pool
mongoose.connect(uri, {
  maxPoolSize: 20,  // Was 10
  minPoolSize: 5
});

// Release connections faster
await batch.save();  // Explicit save
session.endSession();  // Close session
```

### Issue: Slow Pagination Queries

**Symptoms:**
```
First page: 50ms
Page 100: 5000ms
Memory spikes on high skip values
```

**Root Cause:**
- Large skip values are slow
- Missing indexes on creator + createdAt

**Solution:**
```javascript
// Ensure index exists
db.batchoperations.createIndex({ creator: 1, createdAt: -1 });

// Switch to cursor-based pagination
// See BATCH_OPERATIONS_PAGINATION.md
```

## Rollback Procedure

If deployment has critical issues:

### Option 1: Disable Batch Routes
```javascript
// In index.js, comment out:
// app.use('/api/batches', batchOperationRoutes);

// Restart server
npm restart
```

### Option 2: Revert to Previous Version
```bash
git checkout issue/59-batch-operations^
npm install
npm start
```

### Option 3: Database Cleanup
```javascript
// Remove all batches if necessary
db.batchoperations.deleteMany({ createdAt: { $gte: new Date('2024-01-15') } });
```

## Post-Deployment Verification

### Week 1: Intensive Monitoring

- Monitor every batch operation
- Check success/failure rates daily
- Watch database growth rate
- Track API response times
- Review error logs for patterns

### Week 2-4: Baseline Establishment

- Document normal performance metrics
- Set alerting thresholds
- Identify peak usage times
- Plan capacity for growth

### Month 2+: Optimization Phase

- Identify slow operations
- Optimize database indexes if needed
- Consider caching strategies
- Plan for scale improvements

## Performance Benchmarks

### Expected Performance

```
Single Batch (100 items):
  Database updates: 1-2 seconds
  Contract calls: 5-30 seconds (network dependent)
  Total: 6-32 seconds
  Success rate: >95%

API Response (creation): <100ms
Batch Details Lookup: <50ms
Creator Batch List (50 items): <100ms
Pagination Query: <150ms
```

### Scaling Limits

Current implementation can handle:
- 100 batches/day: Comfortable
- 500 batches/day: Acceptable
- 1000+ batches/day: May need optimization

For higher volumes, consider:
1. Chunked parallel processing
2. Separate batch executor workers
3. Job queue (Bull, RabbitMQ)
4. Database sharding

## Maintenance Schedule

### Daily
- Check error logs
- Verify all endpoints accessible
- Monitor success rate > 90%

### Weekly
- Review pending batch queue
- Analyze failure patterns
- Update documentation if needed

### Monthly
- Archive old completed batches (90+ days)
- Review performance metrics
- Plan optimizations
- Clean up failed batches

### Quarterly
- Database maintenance (defragmentation)
- Performance tuning
- Capacity planning
- Load testing for next scale tier

## Support and Escalation

### First-Level Support (Ops Team)

- Restart server on hung batches
- Check database connectivity
- Monitor disk space
- Review recent deployments

### Escalation Path

If high failure rate (>5%):
1. Check database status
2. Check contract service availability
3. Review recent code changes
4. Contact development team

If memory/CPU issues:
1. Check batch size of current operations
2. Reduce concurrent batches
3. Restart server if needed
4. Contact infrastructure team

## Rollback Readiness

Batch operations can be disabled without data loss:
- Existing batches remain in database
- No external dependencies
- No cascading failures possible
- Can re-enable any time

This makes deployment very low-risk.
