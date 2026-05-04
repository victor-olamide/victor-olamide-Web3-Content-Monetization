# Batch Operations - Architecture and Design

## Service Layer Architecture

The batch operations feature is implemented as a layered architecture:

```
┌─────────────────────────────────────────┐
│  Express Routes (batchOperationRoutes)  │
│  - Input validation                      │
│  - Creator verification                  │
│  - Immediate response                    │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│ Batch Operation Service                 │
│ - batchUpdatePrice                      │
│ - batchRemoveContent                    │
│ - batchUpdateMetadata                   │
│ - Batch CRUD operations                 │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│ Async Executors                         │
│ - executeBatchPriceUpdate               │
│ - executeBatchRemove                    │
│ - executeBatchMetadataUpdate            │
│ - Per-item processing                   │
└─────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────┐
│ Data Layer                               │
│ - BatchOperation Model (tracking)        │
│ - Content Model (updates)                │
│ - Contract Service (on-chain calls)      │
└──────────────────────────────────────────┘
```

## Batch Operation Lifecycle

1. **Request Received**
   - Validate contentIds array (non-empty, ≤100 items)
   - Validate operation-specific parameters
   - Verify creator ownership

2. **Batch Created**
   - Create BatchOperation document with status: "pending"
   - Store operation configuration (type, contentIds, updatePayload)
   - Initialize empty results array
   - Return batchId immediately to client

3. **Async Execution** (Background)
   - Status transitions to "processing"
   - Iterate through contentIds
   - For each item:
     - Attempt database update
     - If applicable, attempt on-chain update
     - Record success/failure with message
     - Continue on error (graceful degradation)

4. **Completion**
   - Status transitions to "completed"
   - Aggregate successCount and failureCount
   - Store final results array
   - Update completedAt timestamp

## Key Design Decisions

### 1. Immediate Response Pattern
- API returns immediately with batchId
- Client polls for progress via GET /api/batches/:batchId
- Prevents timeout on large batches
- Decouples request lifecycle from processing

### 2. Batch Size Limit (100 items)
- Prevents memory exhaustion
- Ensures reasonable processing time
- Allows pagination for larger operations
- Matches typical API batch practices

### 3. Graceful Error Handling
- On-chain failures don't block off-chain success
- Per-item results track both success and failure reasons
- Database updates proceed even if contract call fails
- Allows partial success scenarios

### 4. Metadata Whitelist Validation
- Only specific fields allowed for updates:
  - title, description, contentType
  - tokenGating, refundable, refundWindowDays
- Prevents accidental structural changes
- Maintains data integrity
- Rejectable fields documented clearly

### 5. Async Executor Pattern
- Separate worker functions for each operation type
- Queued after initial request completes
- Uses setImmediate or Promise queue
- Maintains processing isolation

## Data Flow Example: Batch Price Update

```
Client Request:
POST /api/batches/batch-update-price
{
  "creator": "SP...",
  "contentIds": ["id1", "id2"],
  "newPrice": 1000000
}
  ↓
Validation:
- Array non-empty? ✓
- Length ≤ 100? ✓
- newPrice ≥ 0? ✓
- Creator provided? ✓
  ↓
Database:
INSERT BatchOperation {
  creator: "SP...",
  operationType: "update-price",
  status: "pending",
  totalItems: 2,
  contentIds: ["id1", "id2"],
  updatePayload: { newPrice: 1000000 },
  results: []
}
  ↓
Immediate Response:
{
  "message": "Batch price update initiated",
  "batchId": "batch-123",
  "status": "pending",
  "totalItems": 2
}
  ↓
Background Execution (async):
FOR EACH contentId in ["id1", "id2"] DO:
  1. UPDATE content SET price = 1000000
  2. CALL contractService.updateContentPrice(contentId, 1000000)
  3. RECORD results: {
       contentId: "id1",
       success: true,
       message: "Price updated to 1000000 STX"
     }
  4. ON ERROR: record with success: false, error message
END FOR
  ↓
UPDATE BatchOperation:
  status: "completed",
  successCount: 2,
  failureCount: 0,
  results: [...]
```

## Performance Considerations

### Database Indexes
- BatchOperation.creator: Enables creator queries
- BatchOperation.status: Enables pending batch queries
- BatchOperation.createdAt: Enables sorting

### Query Optimization
- Pagination on creator list (limit/skip)
- Single ID lookup for batch details
- Batch size limit prevents large result sets

### Async Execution
- Non-blocking: doesn't slow API response
- Processable during off-peak hours
- Can be paused/resumed if needed

## Safety and Validation

| Layer | Validation |
|-------|-----------|
| Route | Array size, required fields, data types |
| Service | Creator ownership, business rules |
| Executor | Per-item error tracking, rollback safety |
| Database | Unique indexes, transaction safety |
| Contract | On-chain checks (contract state, permissions) |

## Integration Points

1. **Content Model:** Updates title, description, price, contentType, etc.
2. **Contract Service:** Calls smart contract functions (update price, etc.)
3. **Creator Auth:** Verifies creator ownership via address
4. **Analytics:** Batch operations queryable for reporting

## Future Enhancement Opportunities

1. Webhook notifications for batch completion
2. Batch operation scheduling (future execution)
3. Batch priority queues (expedited processing)
4. Batch operation templates (save and reuse)
5. Bulk export of batch results
6. Retry mechanism for failed items
7. Dependency tracking between batches
