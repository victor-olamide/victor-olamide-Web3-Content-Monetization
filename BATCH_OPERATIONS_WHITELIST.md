# Batch Operations - Metadata Field Whitelist and Validation

## Whitelist Validation

Only specific fields are allowed for batch metadata updates to prevent data corruption:

### Allowed Fields (6 Total)

| Field | Type | Min | Max | Description |
|-------|------|-----|-----|-------------|
| title | string | 1 | 255 | Content display title |
| description | string | 0 | 10000 | Detailed content description |
| contentType | string | 3 | 50 | Category: video, article, tutorial, etc. |
| tokenGating | boolean | - | - | Whether NFT/token gating is enabled |
| refundable | boolean | - | - | Whether purchase is refundable |
| refundWindowDays | number | 0 | 365 | Days until refund option expires |

### Explicitly Forbidden Fields

These fields CANNOT be modified via batch operations:

```javascript
// Creator identity - immutable
✗ creator
✗ owner
✗ creatorAddress

// Financial - requires separate audit
✗ price                // Use batch-update-price endpoint
✗ royaltyPercentage
✗ platformFee
✗ totalRevenue
✗ totalSales

// Purchase history - immutable
✗ purchaseCount
✗ purchaseHistory
✗ buyers
✗ sales

// System fields - managed by server
✗ _id
✗ __v
✗ createdAt
✗ updatedAt
✗ isRemoved
✗ removedAt
✗ removalReason

// Advanced settings - restricted
✗ contractAddress
✗ smartContractCode
✗ blockchainData
✗ adminSettings
```

## Validation Implementation

### Route-Level Validation
```javascript
// In batchOperationRoutes.js
const ALLOWED_FIELDS = [
  'title',
  'description',
  'contentType',
  'tokenGating',
  'refundable',
  'refundWindowDays'
];

router.post('/batch-update-metadata', async (req, res) => {
  const { contentIds, updates, creator } = req.body;

  // Whitelist validation
  const fieldsToUpdate = Object.keys(updates);
  const invalidFields = fieldsToUpdate.filter(
    field => !ALLOWED_FIELDS.includes(field)
  );

  if (invalidFields.length > 0) {
    return res.status(400).json({
      message: 'Invalid fields in update payload',
      invalidFields,
      allowedFields: ALLOWED_FIELDS
    });
  }

  // Continue with batch creation...
});
```

### Service-Level Validation
```javascript
// In batchOperationService.js
async function validateMetadataUpdates(updates) {
  const ALLOWED = ['title', 'description', 'contentType', 'tokenGating', 'refundable', 'refundWindowDays'];
  const PROVIDED = Object.keys(updates);
  
  // Check for invalid fields
  const invalid = PROVIDED.filter(f => !ALLOWED.includes(f));
  if (invalid.length > 0) {
    throw new Error(`Invalid fields: ${invalid.join(', ')}`);
  }

  // Validate field values
  if (updates.title !== undefined) {
    if (typeof updates.title !== 'string' || updates.title.length === 0) {
      throw new Error('title must be a non-empty string');
    }
    if (updates.title.length > 255) {
      throw new Error('title cannot exceed 255 characters');
    }
  }

  if (updates.description !== undefined) {
    if (typeof updates.description !== 'string') {
      throw new Error('description must be a string');
    }
    if (updates.description.length > 10000) {
      throw new Error('description cannot exceed 10000 characters');
    }
  }

  if (updates.contentType !== undefined) {
    const validTypes = ['video', 'article', 'tutorial', 'podcast', 'course', 'book', 'image'];
    if (!validTypes.includes(updates.contentType)) {
      throw new Error(`contentType must be one of: ${validTypes.join(', ')}`);
    }
  }

  if (updates.tokenGating !== undefined) {
    if (typeof updates.tokenGating !== 'boolean') {
      throw new Error('tokenGating must be a boolean');
    }
  }

  if (updates.refundable !== undefined) {
    if (typeof updates.refundable !== 'boolean') {
      throw new Error('refundable must be a boolean');
    }
  }

  if (updates.refundWindowDays !== undefined) {
    if (!Number.isInteger(updates.refundWindowDays) || updates.refundWindowDays < 0 || updates.refundWindowDays > 365) {
      throw new Error('refundWindowDays must be an integer between 0 and 365');
    }
  }

  return true;
}
```

### Database-Level Validation
```javascript
// In executeBatchMetadataUpdate
async function executeBatchMetadataUpdate(batchId, contentIds, updates) {
  // Whitelist safe fields for Object.assign
  const SAFE_FIELDS = ['title', 'description', 'contentType', 'tokenGating', 'refundable', 'refundWindowDays'];
  const safeUpdates = {};
  
  for (const field of SAFE_FIELDS) {
    if (field in updates) {
      safeUpdates[field] = updates[field];
    }
  }

  // Only update whitelisted fields
  for (const contentId of contentIds) {
    try {
      const content = await Content.findById(contentId);
      if (!content) {
        recordResult(contentId, false, 'Content not found');
        continue;
      }

      // Assign only safe fields
      Object.assign(content, safeUpdates);
      content.updatedAt = new Date();
      await content.save();
      
      recordResult(contentId, true, `Updated ${Object.keys(safeUpdates).join(', ')}`);
    } catch (error) {
      recordResult(contentId, false, error.message);
    }
  }
}
```

## Validation Examples

### Valid Update Requests
```json
{
  "creator": "SP2ZNGJ85ENDY6QTHQ4P3KCQJRNYWB43HCUB7QY0J",
  "contentIds": ["content-1", "content-2"],
  "updates": {
    "title": "Updated Title",
    "description": "New description"
  }
}
```

### Invalid Update Requests

**Attempt to update price** (forbidden)
```json
{
  "creator": "SP2...",
  "contentIds": ["content-1"],
  "updates": {
    "price": 2000000
  }
}
// Response 400:
{
  "message": "Invalid fields in update payload",
  "invalidFields": ["price"],
  "allowedFields": ["title", "description", "contentType", "tokenGating", "refundable", "refundWindowDays"]
}
```

**Attempt to update creator** (forbidden)
```json
{
  "creator": "SP2...",
  "contentIds": ["content-1"],
  "updates": {
    "creator": "SP_DIFFERENT_ADDRESS"
  }
}
// Response 400:
{
  "message": "Invalid fields in update payload",
  "invalidFields": ["creator"],
  "allowedFields": [...]
}
```

**Invalid field values**
```json
{
  "creator": "SP2...",
  "contentIds": ["content-1"],
  "updates": {
    "title": ""  // Empty string not allowed
  }
}
// Response 400:
{
  "message": "Invalid fields in update payload",
  "errors": {
    "title": "title must be a non-empty string"
  }
}
```

**Oversized description**
```json
{
  "creator": "SP2...",
  "contentIds": ["content-1"],
  "updates": {
    "description": "..." // 15,000 characters (>10,000 limit)
  }
}
// Response 400:
{
  "message": "Invalid fields in update payload",
  "errors": {
    "description": "description cannot exceed 10000 characters"
  }
}
```

## Batch Update Examples

### Example 1: Update Title and Description
```javascript
fetch('/api/batches/batch-update-metadata', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    creator: 'SP2...',
    contentIds: ['article-1', 'article-2', 'article-3'],
    updates: {
      title: "2024 Edition - Revised",
      description: "Updated with latest information and corrections"
    }
  })
});
```

### Example 2: Enable Refunds
```javascript
fetch('/api/batches/batch-update-metadata', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    creator: 'SP2...',
    contentIds: ['course-1', 'course-2', 'course-3', 'course-4'],
    updates: {
      refundable: true,
      refundWindowDays: 14
    }
  })
});
```

### Example 3: Categorize Content
```javascript
fetch('/api/batches/batch-update-metadata', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    creator: 'SP2...',
    contentIds: ['video-1', 'video-2', 'video-3', 'video-4', 'video-5'],
    updates: {
      contentType: 'tutorial'
    }
  })
});
```

### Example 4: Enable Token Gating
```javascript
fetch('/api/batches/batch-update-metadata', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    creator: 'SP2...',
    contentIds: ['premium-1', 'premium-2'],
    updates: {
      tokenGating: true,
      description: "Exclusive content for token holders"
    }
  })
});
```

## Why This Whitelist Exists

### Security
- Prevents accidental deletion of critical fields
- Blocks unauthorized field modifications
- Protects purchase history integrity

### Data Integrity
- Ensures financial records remain accurate
- Maintains blockchain synchronization
- Preserves audit trail

### Business Logic
- Price changes require separate endpoint (audit trail)
- Creator reassignment prevented (ownership)
- Purchase history immutable (contract compliance)

### Future Extensibility
- Easy to add fields to whitelist
- No breaking changes to API
- Clear documentation of allowed changes

## Updating the Whitelist

If new fields need to be added:

1. **Evaluate Need:** Document why field must be updatable
2. **Security Review:** Ensure no data integrity risks
3. **Update Code:**
   - Add to ALLOWED_FIELDS array in routes
   - Add validation in service layer
   - Add to safe fields in executor
4. **Update Tests:** Add test cases for new field
5. **Release Notes:** Document whitelist changes
6. **Monitor:** Watch for issues post-deployment

### Example: Adding a New Field
```javascript
// Before
const ALLOWED_FIELDS = ['title', 'description', 'contentType', 'tokenGating', 'refundable', 'refundWindowDays'];

// After
const ALLOWED_FIELDS = ['title', 'description', 'contentType', 'tokenGating', 'refundable', 'refundWindowDays', 'newField'];

// Add validation for newField
if (updates.newField !== undefined) {
  if (typeof updates.newField !== 'expectedType') {
    throw new Error('newField must be expectedType');
  }
}
```
