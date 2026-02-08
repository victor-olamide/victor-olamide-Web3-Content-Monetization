# Batch Operations Implementation - API Endpoints Documentation

## Overview
Batch operations allow creators to efficiently manage multiple content items in a single request. All batch operations follow a standard pattern for consistency and error tracking.

## Endpoints

### 1. POST /api/batches/batch-update-price
**Purpose:** Batch update prices for multiple content items  
**Authentication:** Required (creator address)  
**Request Body:**
```json
{
  "creator": "creator-address",
  "contentIds": ["content-id-1", "content-id-2", ...],
  "newPrice": 1000000
}
```
**Response:** Returns batch operation ID and initial status  
**Rate Limiting:** Max 100 items per batch request  
**On-Chain:** Triggers per-item smart contract calls with graceful failure handling

### 2. POST /api/batches/batch-remove
**Purpose:** Batch remove multiple content items  
**Authentication:** Required (creator address)  
**Request Body:**
```json
{
  "creator": "creator-address",
  "contentIds": ["content-id-1", "content-id-2", ...],
  "removalReason": "Outdated content"
}
```
**Response:** Returns batch operation ID and initial status  
**Rate Limiting:** Max 100 items per batch request  
**Database:** Sets isRemoved=true for each item, tracks removal reason

### 3. POST /api/batches/batch-update-metadata
**Purpose:** Batch update metadata fields for multiple content items  
**Authentication:** Required (creator address)  
**Request Body:**
```json
{
  "creator": "creator-address",
  "contentIds": ["content-id-1", "content-id-2", ...],
  "updates": {
    "title": "New Title",
    "description": "Updated description",
    "contentType": "video"
  }
}
```
**Allowed Fields:**
- title
- description
- contentType
- tokenGating
- refundable
- refundWindowDays

**Response:** Returns batch operation ID and initial status  
**Rate Limiting:** Max 100 items per batch request  
**Validation:** Whitelist enforces safe field updates only

### 4. GET /api/batches/:batchId
**Purpose:** Get details of a specific batch operation  
**Authentication:** Optional  
**Response:** Returns complete batch operation with results array  
**Status Tracking:** Includes per-item success/failure messages  
**Performance:** Indexed lookup on _id field

### 5. GET /api/batches/creator/:creator?limit=50&skip=0
**Purpose:** List all batch operations for a creator  
**Authentication:** Optional  
**Query Parameters:**
- limit: Items per page (default: 50)
- skip: Pagination offset (default: 0)

**Response:** Returns paginated array of batch operations  
**Sorting:** Most recent first (createdAt descending)  
**Performance:** Indexed query on creator field

## Batch Operation States

| Status | Description |
|--------|-------------|
| pending | Operation queued, awaiting processing |
| processing | Currently executing items |
| completed | All items processed (may have failures) |
| failed | Critical error preventing execution |

## Response Examples

### Success Response (POST)
```json
{
  "message": "Batch price update initiated",
  "batchId": "batch-id-123",
  "status": "pending",
  "totalItems": 5
}
```

### Batch Details Response (GET)
```json
{
  "_id": "batch-id-123",
  "creator": "creator-address",
  "operationType": "update-price",
  "status": "completed",
  "totalItems": 5,
  "successCount": 4,
  "failureCount": 1,
  "results": [
    {
      "contentId": "content-1",
      "success": true,
      "message": "Price updated to 1000000 STX"
    },
    {
      "contentId": "content-2",
      "success": false,
      "error": "On-chain update failed"
    }
  ],
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:35:00Z"
}
```

## Error Handling

### Validation Errors (400)
- Empty contentIds array
- contentIds exceeding 100 items
- Invalid update payload
- Missing required creator address

### Processing Errors (500)
- Database connection failure
- Smart contract call failures (gracefully recorded per-item)
- Async executor errors (non-blocking)

### Not Found (404)
- Batch operation ID doesn't exist

## Size and Safety Constraints

1. **Batch Size Limit:** 100 items maximum per request
2. **Metadata Fields:** Whitelist validation prevents structural changes
3. **Price Validation:** Numeric validation (≥0)
4. **Creator Ownership:** All operations tied to creator address
5. **Result Tracking:** All successes and failures recorded

## Async Execution Pattern

1. API request returns immediately with batchId
2. Background worker processes items asynchronously
3. Client polls GET /api/batches/:batchId for progress
4. Status transitions: pending → processing → completed
5. Per-item results accessible after processing completes

## Integration with Other Features

- **Content Updates:** Works with existing content model
- **Pricing:** Integrates with contractService.updateContentPrice
- **Metadata:** Safe field updates via whitelist
- **Removal:** Compatible with content soft-delete pattern
- **Analytics:** All batch operations logged and queryable
