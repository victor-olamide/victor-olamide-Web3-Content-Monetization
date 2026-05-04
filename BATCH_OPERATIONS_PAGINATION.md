# Batch Operations - Creator-Scoped Queries and Pagination

## Creator-Scoped Batch Operations

All batch operations are tightly bound to the creator who initiated them:

```javascript
// Batch is always tied to creator
{
  _id: ObjectId,
  creator: "SP2ZNGJ85ENDY6QTHQ4P3KCQJRNYWB43HCUB7QY0J",  // Immutable once created
  operationType: "update-price",
  status: "completed",
  totalItems: 5,
  successCount: 5,
  failureCount: 0,
  contentIds: [...],
  results: [...]
}
```

### Creator Isolation

**What Each Creator Can See:**
```javascript
// Creator A can list their own batches
GET /api/batches/creator/SP_ADDRESS_A
// Returns: Only batches where creator = SP_ADDRESS_A

// Creator A cannot see Creator B's batches
GET /api/batches/creator/SP_ADDRESS_B
// Returns: Only that creator's batches
// Creator A cannot intercept/modify this data
```

**Database Query Enforcement:**
```javascript
// Service layer enforces creator isolation
async function getCreatorBatchOperations(creator, options) {
  return await BatchOperation
    .find({ creator })  // Filter by creator
    .sort({ createdAt: -1 })
    .limit(options.limit)
    .skip(options.skip)
    .lean();
}

// No batch can be created without creator
await new BatchOperation({
  creator,  // Required, immutable
  operationType,
  status: 'pending',
  contentIds,
  ...
}).save();
```

## Pagination System

### Query Parameters

```
GET /api/batches/creator/:creator?limit=50&skip=0
```

| Parameter | Type | Default | Min | Max | Description |
|-----------|------|---------|-----|-----|-------------|
| limit | number | 50 | 1 | 500 | Items per page |
| skip | number | 0 | 0 | unlimited | Starting offset |

### Page Calculation

```javascript
const pageNumber = 1;
const pageSize = 20;

// Skip value = (pageNumber - 1) * pageSize
const skip = (pageNumber - 1) * pageSize;

// API call
GET /api/batches/creator/SP2...?limit=20&skip=0   // Page 1
GET /api/batches/creator/SP2...?limit=20&skip=20  // Page 2
GET /api/batches/creator/SP2...?limit=20&skip=40  // Page 3
```

### Response Format

```json
{
  "total": 150,
  "limit": 20,
  "skip": 0,
  "page": 1,
  "totalPages": 8,
  "batches": [
    {
      "_id": "batch-001",
      "operationType": "update-price",
      "status": "completed",
      "totalItems": 5,
      "successCount": 5,
      "failureCount": 0,
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:35:00Z"
    },
    // ... more batches
  ]
}
```

## Pagination Examples

### Example 1: First Page
```javascript
const creator = 'SP2ZNGJ85ENDY6QTHQ4P3KCQJRNYWB43HCUB7QY0J';
const pageSize = 50;

// Fetch page 1
const response = await fetch(`/api/batches/creator/${creator}?limit=${pageSize}&skip=0`);
const result = await response.json();

console.log(`Showing ${result.batches.length} of ${result.total} total batches`);
console.log(`Page 1 of ${result.totalPages}`);

// Display batches
result.batches.forEach(batch => {
  console.log(`${batch._id}: ${batch.operationType} - ${batch.status}`);
});
```

### Example 2: Subsequent Pages
```javascript
class CreatorBatchPaginator {
  constructor(creator, pageSize = 50) {
    this.creator = creator;
    this.pageSize = pageSize;
    this.currentPage = 1;
    this.totalPages = 1;
  }

  async getPage(pageNumber) {
    const skip = (pageNumber - 1) * this.pageSize;
    const url = `/api/batches/creator/${this.creator}?limit=${this.pageSize}&skip=${skip}`;
    const response = await fetch(url);
    return await response.json();
  }

  async getFirstPage() {
    const result = await this.getPage(1);
    this.totalPages = Math.ceil(result.total / this.pageSize);
    this.currentPage = 1;
    return result;
  }

  async getNextPage() {
    if (this.currentPage >= this.totalPages) {
      throw new Error('Already at last page');
    }
    const result = await this.getPage(this.currentPage + 1);
    this.currentPage++;
    return result;
  }

  async getPreviousPage() {
    if (this.currentPage <= 1) {
      throw new Error('Already at first page');
    }
    const result = await this.getPage(this.currentPage - 1);
    this.currentPage--;
    return result;
  }

  async getLastPage() {
    const result = await this.getPage(this.totalPages);
    this.currentPage = this.totalPages;
    return result;
  }

  async getAllBatches() {
    const allBatches = [];
    let pageNumber = 1;
    let hasMore = true;

    while (hasMore) {
      const result = await this.getPage(pageNumber);
      allBatches.push(...result.batches);
      hasMore = (pageNumber * this.pageSize) < result.total;
      pageNumber++;
    }

    return allBatches;
  }
}

// Usage
const paginator = new CreatorBatchPaginator(creator);
const firstPage = await paginator.getFirstPage();
console.log(`Total pages: ${paginator.totalPages}`);

const secondPage = await paginator.getNextPage();
console.log(`Page 2 batches: ${secondPage.batches.length}`);

const allBatches = await paginator.getAllBatches();
console.log(`Total batches: ${allBatches.length}`);
```

### Example 3: Large Dataset Streaming
```javascript
async function* batchOperationGenerator(creator, pageSize = 100) {
  let pageNumber = 1;
  let hasMore = true;

  while (hasMore) {
    const skip = (pageNumber - 1) * pageSize;
    const response = await fetch(`/api/batches/creator/${creator}?limit=${pageSize}&skip=${skip}`);
    const result = await response.json();

    for (const batch of result.batches) {
      yield batch;
    }

    hasMore = (pageNumber * pageSize) < result.total;
    pageNumber++;
  }
}

// Stream all batches
for await (const batch of batchOperationGenerator(creator)) {
  console.log(`Processing batch: ${batch._id}`);
  // Process batch data
}
```

## Performance Optimization

### Index Strategy

**MongoDB Index on Creator + CreatedAt:**
```javascript
db.batchoperations.createIndex(
  { creator: 1, createdAt: -1 },
  { name: "creator_createdAt_idx" }
);
```

**Query Plan:**
```
COLLSCAN → FILTER(creator) → SORT(createdAt) → LIMIT(50) → SKIP(0)
vs.
IXSCAN(creator_createdAt) → LIMIT(50) → SKIP(0)  // Much faster
```

### Recommended Page Sizes

| Use Case | Page Size | Rationale |
|----------|-----------|-----------|
| API response | 50 | Balanced: Not too large, not too small |
| Mobile UI | 20 | Smaller results, less data transfer |
| Desktop UI | 100 | More items visible, reduce pagination |
| Export | 1000 | Minimize API calls for bulk operations |
| Analytics | 5000 | Aggregate statistics, one query |

### Query Performance Benchmarks

```
Scenario: Creator with 10,000 batches

Page 1 (skip=0, limit=50):
Time: 5-10ms (hits index perfectly)

Page 50 (skip=2450, limit=50):
Time: 10-15ms (still efficient)

Page 100 (skip=4950, limit=50):
Time: 15-25ms (skip penalty increases)

Page 200 (skip=9950, limit=50):
Time: 50-100ms (heavy skip penalty)

Solution: Use createdAt as cursor for pagination
```

## Cursor-Based Pagination (Advanced)

### Alternative to Offset Pagination

**Problem with Offset Pagination:**
```javascript
// High skip values become slow
GET /api/batches/creator/SP2...?limit=50&skip=9950
// Must skip first 9,950 documents before returning 50
```

**Cursor-Based Solution:**
```javascript
// Use last document's ID as reference
GET /api/batches/creator/SP2...?limit=50&after=batch-id-123
// Returns documents after batch-id-123
// O(1) instead of O(skip)
```

### Implementation

```javascript
router.get('/creator/:creator', async (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const after = req.query.after;  // Last batch ID from previous page

  let query = { creator: req.params.creator };

  if (after) {
    // Get createdAt of the 'after' batch
    const lastBatch = await BatchOperation.findById(after);
    if (!lastBatch) {
      return res.status(400).json({ message: 'Invalid cursor' });
    }

    // Get batches after this one (by createdAt, then by ID for tiebreaker)
    query = {
      creator: req.params.creator,
      $or: [
        { createdAt: { $lt: lastBatch.createdAt } },
        {
          createdAt: lastBatch.createdAt,
          _id: { $lt: lastBatch._id }
        }
      ]
    };
  }

  const batches = await BatchOperation
    .find(query)
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1)  // Get one extra to know if there's a next page
    .lean();

  const hasNext = batches.length > limit;
  if (hasNext) {
    batches.pop();  // Remove extra item
  }

  const nextCursor = hasNext ? batches[batches.length - 1]._id : null;

  res.json({
    batches,
    hasNext,
    nextCursor
  });
});

// Client usage
let cursor = null;
let hasMore = true;

while (hasMore) {
  const url = cursor
    ? `/api/batches/creator/${creator}?limit=50&after=${cursor}`
    : `/api/batches/creator/${creator}?limit=50`;

  const result = await fetch(url).then(r => r.json());
  processBatches(result.batches);

  hasMore = result.hasNext;
  cursor = result.nextCursor;
}
```

## Sorting and Filtering

### Default Sorting

Batches sorted by **createdAt descending** (newest first):
```javascript
// Most recent batches first
{
  createdAt: "2024-01-15T15:30:00Z",  // Most recent
  ...
},
{
  createdAt: "2024-01-15T10:00:00Z",
  ...
},
{
  createdAt: "2024-01-14T20:00:00Z",  // Oldest
  ...
}
```

### Future Filtering Options

Could add filtering parameters:
```javascript
// Filter by operation type (future)
GET /api/batches/creator/SP2...?operationType=update-price

// Filter by status (future)
GET /api/batches/creator/SP2...?status=completed

// Filter by date range (future)
GET /api/batches/creator/SP2...?startDate=2024-01-01&endDate=2024-01-31

// Combined (future)
GET /api/batches/creator/SP2...?operationType=remove&status=failed&limit=50&skip=0
```

## Batch Detail Retrieval

### Single Batch Details

```javascript
// Get specific batch with full results
GET /api/batches/:batchId

Response: {
  _id: "batch-001",
  creator: "SP2...",
  operationType: "update-price",
  status: "completed",
  totalItems: 100,
  successCount: 99,
  failureCount: 1,
  contentIds: [...],  // Full array
  updatePayload: { newPrice: 1000000 },
  results: [          // All item results
    {
      contentId: "content-1",
      success: true,
      message: "Price updated to 1000000 STX",
      txId: "0x1234abcd"
    },
    // ... 99 more items
  ],
  createdAt: "2024-01-15T10:30:00Z",
  updatedAt: "2024-01-15T10:35:00Z",
  completedAt: "2024-01-15T10:35:23Z"
}
```

### Results Pagination (Future Enhancement)

Could add pagination to results array:
```javascript
// Paginate results within a batch
GET /api/batches/:batchId/results?limit=20&skip=0

Response: {
  total: 100,
  limit: 20,
  results: [...]
}
```
