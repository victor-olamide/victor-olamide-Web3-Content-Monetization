# Batch Operations - Usage Examples and Client Integration

## Quick Start Examples

### Example 1: Batch Update Prices

**Scenario:** Creator wants to increase prices for 5 content items from 500k STX to 1M STX

**Client Code:**
```javascript
const response = await fetch('/api/batches/batch-update-price', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    creator: 'SP2ZNGJ85ENDY6QTHQ4P3KCQJRNYWB43HCUB7QY0J',
    contentIds: [
      'content-001',
      'content-002',
      'content-003',
      'content-004',
      'content-005'
    ],
    newPrice: 1000000
  })
});

const batch = await response.json();
console.log(`Batch created: ${batch.batchId}`);
console.log(`Status: ${batch.status}`);
console.log(`Total items: ${batch.totalItems}`);
```

**Response:**
```json
{
  "message": "Batch price update initiated",
  "batchId": "batch-59f3e2a1c5d4b2e1",
  "status": "pending",
  "totalItems": 5
}
```

### Example 2: Monitor Batch Progress

**Client Code:**
```javascript
const batchId = 'batch-59f3e2a1c5d4b2e1';

// Poll every 2 seconds until completion
const pollBatchStatus = async () => {
  let completed = false;
  
  while (!completed) {
    const response = await fetch(`/api/batches/${batchId}`);
    const batch = await response.json();
    
    console.log(`Status: ${batch.status}`);
    console.log(`Progress: ${batch.successCount}/${batch.totalItems}`);
    
    if (batch.status === 'completed' || batch.status === 'failed') {
      completed = true;
      console.log('Batch processing complete');
      console.log(`Results: ${batch.successCount} succeeded, ${batch.failureCount} failed`);
      
      // Display per-item results
      batch.results.forEach(result => {
        console.log(`  ${result.contentId}: ${result.success ? '✓' : '✗'} ${result.message || result.error}`);
      });
    } else {
      await new Promise(r => setTimeout(r, 2000)); // Wait 2 seconds
    }
  }
};

pollBatchStatus();
```

### Example 3: Batch Remove Outdated Content

**Scenario:** Creator wants to remove 3 outdated articles

**Client Code:**
```javascript
const response = await fetch('/api/batches/batch-remove', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    creator: 'SP2ZNGJ85ENDY6QTHQ4P3KCQJRNYWB43HCUB7QY0J',
    contentIds: [
      'old-article-1',
      'old-article-2',
      'old-article-3'
    ],
    removalReason: 'Archived: Content superseded by newer versions'
  })
});

const batch = await response.json();
console.log(`Removal batch created: ${batch.batchId}`);
```

### Example 4: Batch Update Metadata

**Scenario:** Creator wants to update descriptions and content type for 8 items

**Client Code:**
```javascript
const response = await fetch('/api/batches/batch-update-metadata', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    creator: 'SP2ZNGJ85ENDY6QTHQ4P3KCQJRNYWB43HCUB7QY0J',
    contentIds: [
      'tutorial-1',
      'tutorial-2',
      'tutorial-3',
      'tutorial-4',
      'tutorial-5',
      'tutorial-6',
      'tutorial-7',
      'tutorial-8'
    ],
    updates: {
      contentType: 'tutorial',
      description: 'Updated tutorial series - 2024 version',
      refundable: true,
      refundWindowDays: 7
    }
  })
});

const batch = await response.json();
console.log(`Metadata batch created: ${batch.batchId}`);
```

### Example 5: List Creator's Batch Operations

**Scenario:** Creator wants to see their recent batch operations with pagination

**Client Code:**
```javascript
const creatorAddress = 'SP2ZNGJ85ENDY6QTHQ4P3KCQJRNYWB43HCUB7QY0J';
const pageSize = 20;
const pageNumber = 1;

const response = await fetch(
  `/api/batches/creator/${creatorAddress}?limit=${pageSize}&skip=${(pageNumber - 1) * pageSize}`
);

const result = await response.json();
console.log(`Total batches: ${result.total}`);
console.log(`Showing: ${result.batches.length} batches`);

result.batches.forEach(batch => {
  console.log(`
    Batch: ${batch._id}
    Type: ${batch.operationType}
    Status: ${batch.status}
    Items: ${batch.totalItems} (${batch.successCount} succeeded, ${batch.failureCount} failed)
    Created: ${new Date(batch.createdAt).toLocaleString()}
  `);
});
```

## Error Handling Examples

### Example 6: Handle Validation Errors

**Client Code:**
```javascript
const createBatch = async (creator, contentIds, newPrice) => {
  // Validate on client side first
  if (!contentIds || contentIds.length === 0) {
    throw new Error('contentIds array cannot be empty');
  }
  
  if (contentIds.length > 100) {
    throw new Error('Maximum 100 items per batch');
  }
  
  if (newPrice === undefined || newPrice < 0) {
    throw new Error('newPrice must be non-negative');
  }

  try {
    const response = await fetch('/api/batches/batch-update-price', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creator,
        contentIds,
        newPrice
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    return await response.json();
  } catch (error) {
    console.error('Batch creation failed:', error.message);
    throw error;
  }
};

// Usage
try {
  const batch = await createBatch(
    'SP2ZNGJ85ENDY6QTHQ4P3KCQJRNYWB43HCUB7QY0J',
    ['content-1', 'content-2'],
    1500000
  );
  console.log('Batch created:', batch.batchId);
} catch (error) {
  console.error('Failed:', error.message);
}
```

### Example 7: Handle Partial Failures

**Client Code:**
```javascript
const processBatchResults = async (batchId) => {
  const response = await fetch(`/api/batches/${batchId}`);
  const batch = await response.json();

  const succeeded = batch.results.filter(r => r.success);
  const failed = batch.results.filter(r => !r.success);

  console.log(`Successfully processed: ${succeeded.length} items`);
  console.log(`Failed: ${failed.length} items`);

  if (failed.length > 0) {
    console.log('\nFailed items:');
    failed.forEach(result => {
      console.log(`  - ${result.contentId}: ${result.error}`);
    });

    // Option 1: Retry failed items in new batch
    const retryIds = failed.map(r => r.contentId);
    console.log(`\nTo retry, create new batch with: ${retryIds.join(', ')}`);

    // Option 2: Investigate specific failures
    console.log('\nInvestigation:');
    failed.forEach(result => {
      if (result.error.includes('on-chain')) {
        console.log(`  ${result.contentId}: Contract error - check permissions`);
      } else if (result.error.includes('database')) {
        console.log(`  ${result.contentId}: Database error - contact support`);
      }
    });
  }
};

// Usage
processBatchResults('batch-59f3e2a1c5d4b2e1');
```

## Real-World Workflow Example

### Creator Dashboard Integration

**Scenario:** Creator dashboard showing batch operations UI

**Client Code:**
```javascript
class BatchOperationManager {
  constructor(creatorAddress) {
    this.creatorAddress = creatorAddress;
  }

  async createPriceBatch(contentIds, newPrice) {
    const response = await fetch('/api/batches/batch-update-price', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creator: this.creatorAddress,
        contentIds,
        newPrice
      })
    });

    if (!response.ok) throw new Error('Batch creation failed');
    return response.json();
  }

  async monitorBatch(batchId, onProgress, onComplete) {
    let isRunning = true;

    while (isRunning) {
      const response = await fetch(`/api/batches/${batchId}`);
      const batch = await response.json();

      onProgress({
        batchId: batch._id,
        status: batch.status,
        completed: batch.successCount + batch.failureCount,
        total: batch.totalItems,
        percentComplete: ((batch.successCount + batch.failureCount) / batch.totalItems) * 100
      });

      if (['completed', 'failed'].includes(batch.status)) {
        isRunning = false;
        onComplete(batch);
      } else {
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  }

  async listBatches(pageNumber = 1, pageSize = 20) {
    const response = await fetch(
      `/api/batches/creator/${this.creatorAddress}?limit=${pageSize}&skip=${(pageNumber - 1) * pageSize}`
    );
    return response.json();
  }
}

// Usage in React component
const manager = new BatchOperationManager(creatorAddress);

const handleBulkPriceUpdate = async (contentIds, newPrice) => {
  setLoading(true);
  
  try {
    const batch = await manager.createPriceBatch(contentIds, newPrice);
    setCurrentBatchId(batch.batchId);

    await manager.monitorBatch(
      batch.batchId,
      (progress) => {
        setProgress(progress);
        console.log(`Processing: ${progress.percentComplete.toFixed(0)}%`);
      },
      (finalBatch) => {
        setSuccess(`Completed: ${finalBatch.successCount}/${finalBatch.totalItems} items`);
        setLoading(false);
      }
    );
  } catch (error) {
    setError(error.message);
    setLoading(false);
  }
};
```

## Best Practices

1. **Validate client-side first** - Check array size and data types before API call
2. **Store batch IDs** - Reference for monitoring and debugging
3. **Poll strategically** - Adjust poll interval based on expected batch size
4. **Handle partial success** - Don't treat partial failures as complete errors
5. **Retry failed items** - Create new batch for contentIds that failed
6. **Log results** - Track batch history for analytics and debugging
7. **Batch similar operations** - Group by operation type for efficiency
