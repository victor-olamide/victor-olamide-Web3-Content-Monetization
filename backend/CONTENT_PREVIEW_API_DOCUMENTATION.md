# Content Preview API Documentation

## Overview

The Content Preview API provides functionality for creators to add preview content (thumbnails, trailers, preview text) to their digital content, and for users to browse and discover content through previews before making a purchase.

## Base URL
```
/api/preview
```

---

## Public Endpoints

### 1. Get Preview for Content
Retrieve preview data for a specific content item.

**Endpoint:** `GET /api/preview/:contentId`

**Parameters:**
- `contentId` (URL param, required): Numeric ID of the content

**Response:**
```json
{
  "success": true,
  "data": {
    "contentId": 123,
    "title": "Beautiful Sunset Video",
    "description": "A 4K video of a beautiful sunset",
    "contentType": "video",
    "price": 9.99,
    "creator": "creator.stx",
    "thumbnailUrl": "ipfs://Qm...",
    "thumbnailQuality": "high",
    "trailerUrl": "ipfs://Qm...",
    "trailerDuration": 60,
    "trailerQuality": "720p",
    "previewText": "Watch this stunning sunset...",
    "previewImageUrl": "ipfs://Qm...",
    "contentAccessType": "purchase_required",
    "totalViews": 1524
  }
}
```

---

### 2. Get Batch Previews
Retrieve previews for multiple content items at once.

**Endpoint:** `POST /api/preview/batch/get`

**Request Body:**
```json
{
  "contentIds": [123, 124, 125]
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    { /* preview object 1 */ },
    { /* preview object 2 */ },
    { /* preview object 3 */ }
  ]
}
```

---

### 3. Get Previews by Content Type
Filter previews by content type with pagination.

**Endpoint:** `GET /api/preview/type/:contentType`

**Parameters:**
- `contentType` (URL param): `video`, `article`, `image`, or `music`
- `skip` (query, optional): Number of previews to skip (default: 0)
- `limit` (query, optional): Number of previews to return (default: 10)

**Response:**
```json
{
  "success": true,
  "data": {
    "data": [{ /* preview objects */ }],
    "total": 150,
    "skip": 0,
    "limit": 10
  }
}
```

---

### 4. Get Trending Previews
Retrieve the most viewed previews from the last N days.

**Endpoint:** `GET /api/preview/trending`

**Parameters:**
- `limit` (query, optional): Number of results to return (default: 10)
- `days` (query, optional): Time window in days (default: 7)

**Response:**
```json
{
  "success": true,
  "data": [
    { /* preview object 1 */ },
    { /* preview object 2 */ }
  ]
}
```

---

### 5. Check User Access Status
Verify if a user has access to the full content or only preview.

**Endpoint:** `GET /api/preview/:contentId/access/:userAddress`

**Parameters:**
- `contentId` (URL param): Numeric ID of the content
- `userAddress` (URL param): User's wallet address

**Response:**
```json
{
  "success": true,
  "data": {
    "contentId": 123,
    "hasAccess": true,
    "accessType": "purchased",
    "purchaseDate": "2024-01-15T10:30:00Z"
  }
}
```

**Access Types:**
- `purchased`: User has purchased the content
- `subscription`: User has active subscription from creator
- `preview_only`: User can only view preview
- `token_gated`: Content requires token gating (check `requiresTokenGating`)

---

### 6. Record Preview Download
Track when a user downloads or views a preview.

**Endpoint:** `POST /api/preview/:contentId/download`

**Parameters:**
- `contentId` (URL param): Numeric ID of the content

**Response:**
```json
{
  "success": true,
  "data": {
    "contentId": 123,
    "totalPreviewDownloads": 45
  }
}
```

---

## Creator/Admin Endpoints

All creator endpoints require authentication via `verifyCreatorOwnership` middleware.

### 7. Create or Update Preview
Create a new preview or update an existing one for content.

**Endpoint:** `POST /api/preview/:contentId`

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "previewEnabled": true,
  "contentAccessType": "purchase_required",
  "thumbnailQuality": "high",
  "trailerQuality": "720p"
}
```

**Response:**
```json
{
  "success": true,
  "data": { /* full preview object */ }
}
```

---

### 8. Upload Thumbnail
Upload a thumbnail image for content preview.

**Endpoint:** `POST /api/preview/:contentId/thumbnail`

**Content-Type:** `multipart/form-data`

**Form Parameters:**
- `thumbnail` (file, required): Image file (JPEG, PNG, GIF)
- `quality` (string, optional): `low`, `medium`, `high`, `ultra`

**Response:**
```json
{
  "success": true,
  "data": { /* updated preview object */ },
  "message": "Thumbnail uploaded successfully"
}
```

---

### 9. Upload Trailer
Upload a video trailer for content preview.

**Endpoint:** `POST /api/preview/:contentId/trailer`

**Content-Type:** `multipart/form-data`

**Form Parameters:**
- `trailer` (file, required): Video file (MP4, WebM)
- `duration` (number, optional): Duration in seconds
- `quality` (string, optional): `360p`, `480p`, `720p`, `1080p`

**Response:**
```json
{
  "success": true,
  "data": { /* updated preview object */ },
  "message": "Trailer uploaded successfully"
}
```

---

### 10. Update Preview Metadata
Update preview text and associated images.

**Endpoint:** `PATCH /api/preview/:contentId/metadata`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "previewText": "A compelling preview of the content...",
  "previewImageUrl": "ipfs://Qm..."
}
```

**Response:**
```json
{
  "success": true,
  "data": { /* updated preview object */ }
}
```

---

### 11. Toggle Preview Visibility
Enable or disable preview for content.

**Endpoint:** `PATCH /api/preview/:contentId/visibility`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "enabled": true
}
```

**Response:**
```json
{
  "success": true,
  "data": { /* updated preview object */ }
}
```

---

### 12. Get Creator Preview Statistics
Retrieve analytics for all previews of a creator.

**Endpoint:** `GET /api/preview/stats/:creatorAddress`

**Parameters:**
- `creatorAddress` (URL param): Creator's wallet address

**Response:**
```json
{
  "success": true,
  "data": {
    "totalPreviews": 25,
    "totalPreviewViews": 5420,
    "totalPreviewDownloads": 342,
    "contentWithPreviews": [
      {
        "contentId": 123,
        "title": "Content Title",
        "views": 1524,
        "downloads": 87
      }
    ],
    "previewBreakdown": {
      "withThumbnails": 24,
      "withTrailers": 18,
      "withPreviewText": 20
    }
  }
}
```

---

### 13. Delete Preview
Remove preview from content.

**Endpoint:** `DELETE /api/preview/:contentId`

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "Preview deleted"
  }
}
```

---

## Error Responses

All endpoints return error responses in the following format:

```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

### Common Error Codes

| Status | Error | Description |
|--------|-------|-------------|
| 400 | `Invalid file type` | Uploaded file is not supported |
| 400 | `No file uploaded` | File upload was empty |
| 403 | `Unauthorized` | User doesn't own the content |
| 404 | `Preview not available` | Content has no preview |
| 404 | `Content not found` | Content doesn't exist |
| 500 | `Failed to upload to IPFS` | Storage service error |

---

## File Upload Specifications

### Thumbnail Images
- **Formats:** JPEG, PNG, GIF
- **Max Size:** 10 MB
- **Recommended Resolution:** 1920x1080 (16:9)
- **Quality Levels:**
  - `low`: 240p (compressed)
  - `medium`: 480p (compressed)
  - `high`: 1080p (slightly compressed)
  - `ultra`: 2K/4K (lossless)

### Trailer Videos
- **Formats:** MP4, WebM
- **Max Size:** 500 MB
- **Quality Levels:**
  - `360p`: Mobile/lower bandwidth
  - `480p`: Standard definition
  - `720p`: HD (recommended)
  - `1080p`: Full HD

---

## Rate Limiting

Preview endpoints are rate-limited as follows:
- Public GET endpoints: 100 requests per minute per IP
- Creator endpoints: 30 requests per minute per user
- Upload endpoints: 10 requests per hour per user

---

## Authentication

Creator-only endpoints require bearer token authentication:

```
Authorization: Bearer <JWT_TOKEN>
```

Token should be obtained through the wallet authentication endpoint.

---

## Integration Examples

### React Hook Usage

```typescript
import { useContentPreview, usePreviewStats } from '@hooks/usePreview';

// Fetch single preview
const { preview, loading, error } = useContentPreview(123);

// Get creator stats
const { stats } = usePreviewStats('creator.stx');
```

### Fetch API Usage

```javascript
// Get preview
const response = await fetch('/api/preview/123');
const { data } = await response.json();

// Upload thumbnail
const formData = new FormData();
formData.append('thumbnail', file);
await fetch('/api/preview/123/thumbnail', {
  method: 'POST',
  body: formData,
  headers: { 'Authorization': `Bearer ${token}` }
});
```

---

## Best Practices

1. **Thumbnail Quality:** Use high-quality thumbnails (1920x1080+) for better discovery
2. **Trailer Duration:** Keep trailers between 30-120 seconds for optimal engagement
3. **Preview Text:** Write compelling descriptions (max 500 characters)
4. **Caching:** Implement client-side caching for preview data
5. **Image CDN:** Use IPFS gateway URLs for fast thumbnail delivery
6. **Video Delivery:** Stream trailers from IPFS for bandwidth efficiency

---

## Changelog

### Version 2.0.0 (2026-02-11)
- Added comprehensive analytics endpoints for creators
- Implemented preview caching mechanism with 5-minute TTL
- Added validation middleware for all endpoints
- Created enhanced frontend components (PreviewPlayer, PreviewCard)
- Added engagement tracking hooks (usePreviewDiscovery, usePreviewEngagement)
- Implemented access control middleware with rate limiting
- Added error handling and recovery service with retry logic
- Support for preview quality configuration (low/medium/high/ultra)
- Daily analytics tracking for views and downloads
- Batch preview and analytics endpoints
- Event tracking for user engagement

### Version 1.0.0 (2024-01-15)
- Initial release with full preview functionality
- Support for thumbnails, trailers, and metadata
- Creator statistics and analytics
- Trending previews functionality
- Access status verification

