# Content Preview Feature - Implementation Guide

## Overview

This guide provides step-by-step instructions for implementing and deploying the Content Preview feature (Issue #63) which enables creators to add preview content (thumbnails, trailers, preview text) to unpurchased content.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       Frontend (React)                        │
├─────────────────────────────────────────────────────────────┤
│  ContentPreview  │  PreviewGallery  │  UploadPreview  │      │
│    Component     │    Component     │   Component     │      │
└────────────┬──────────────────────────────────────┬───────────┘
             │                                      │
             │ HTTP Requests                        │
             ▼                                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    Preview API Routes                        │
│    (previewRoutes.js - /api/preview/*)                     │
├─────────────────────────────────────────────────────────────┤
│  • GET endpoints (public)     • POST/PATCH endpoints (auth) │
│  • Batch operations           • Upload handlers            │
│  • Filtering & sorting        • Creator analytics          │
└────────────┬────────────────────────────────────┬───────────┘
             │                                    │
             │ Service Layer                      │
             ▼                                    ▼
┌─────────────────────────────────────────────────────────────┐
│               Preview Service Layer                          │
│         (previewService.js - Business Logic)               │
├─────────────────────────────────────────────────────────────┤
│  • Create/update previews      • Access control checking   │
│  • View tracking              • Statistics calculation     │
│  • File management            • Data queries              │
└────────────┬────────────────────────────────────┬───────────┘
             │                                    │
             │ Data Access                        │
             ▼                                    ▼
┌─────────────────────────────────────────────────────────────┐
│              Data Models & Storage                           │
│  • ContentPreview Model (MongoDB)                          │
│  • IPFS Integration (thumbnails/trailers)                  │
│  • Purchase/Subscription models (existing)                 │
└─────────────────────────────────────────────────────────────┘
```

## Database Schema

### ContentPreview Model

```javascript
{
  contentId: Number,           // Reference to content
  title: String,               // Content title
  description: String,         // Content description
  contentType: String,         // video/article/image/music
  price: Number,               // Content price
  creator: String,             // Creator address
  
  // Preview Assets
  thumbnailUrl: String,        // IPFS/Gaia URL
  thumbnailStorageType: String, // ipfs or gaia
  thumbnailQuality: String,    // low/medium/high/ultra
  
  trailerUrl: String,          // IPFS/Gaia URL
  trailerStorageType: String,  // ipfs or gaia
  trailerDuration: Number,     // Seconds
  trailerSize: Number,         // Bytes
  trailerQuality: String,      // 360p/480p/720p/1080p
  
  // Preview Metadata
  previewText: String,         // Short preview description
  previewImageUrl: String,     // Additional preview image
  
  // Analytics
  previewEnabled: Boolean,     // Is preview active?
  totalViews: Number,          // View count
  totalPreviewDownloads: Number, // Download count
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date
}
```

## API Endpoints

### Public Endpoints (No Authentication Required)

#### 1. Get Single Preview
```
GET /api/preview/:contentId
```
Returns preview data and increments view count.

#### 2. Get Multiple Previews (Batch)
```
POST /api/preview/batch/get
Body: { contentIds: [1, 2, 3] }
```

#### 3. Get Previews by Type
```
GET /api/preview/type/:contentType?skip=0&limit=10
```
Supported types: video, article, image, music

#### 4. Get Trending Previews
```
GET /api/preview/trending?limit=10&days=7
```

#### 5. Check User Access Status
```
GET /api/preview/:contentId/access/:userAddress
```
Determines if user has purchased/subscribed or only has preview access.

#### 6. Record Preview Download
```
POST /api/preview/:contentId/download
```

### Creator Endpoints (Requires Authentication)

#### 7. Create/Update Preview
```
POST /api/preview/:contentId
Headers: Authorization: Bearer <token>
Body: {
  previewEnabled: boolean,
  contentAccessType: string,
  thumbnailQuality: string,
  trailerQuality: string
}
```

#### 8. Upload Thumbnail
```
POST /api/preview/:contentId/thumbnail
Headers: Authorization: Bearer <token>
Form Data: thumbnail (file), quality (optional)
```

#### 9. Upload Trailer
```
POST /api/preview/:contentId/trailer
Headers: Authorization: Bearer <token>
Form Data: trailer (file), duration (optional), quality (optional)
```

#### 10. Update Preview Metadata
```
PATCH /api/preview/:contentId/metadata
Headers: Authorization: Bearer <token>
Body: { previewText: string, previewImageUrl: string }
```

#### 11. Toggle Preview Visibility
```
PATCH /api/preview/:contentId/visibility
Headers: Authorization: Bearer <token>
Body: { enabled: boolean }
```

#### 12. Get Creator Statistics
```
GET /api/preview/stats/:creatorAddress
```

#### 13. Delete Preview
```
DELETE /api/preview/:contentId
Headers: Authorization: Bearer <token>
```

## Frontend Integration

### Using React Hooks

```typescript
import {
  useContentPreview,
  useContentAccess,
  useTrendingPreviews,
  usePreviewsByType,
  usePreviewStats
} from '@hooks/usePreview';

// Fetch single preview
const { preview, loading, error } = useContentPreview(contentId);

// Check user access
const { accessStatus } = useContentAccess(contentId, userAddress);

// Get trending previews
const { previews } = useTrendingPreviews(limit, days);

// Get previews by type
const { previews, total } = usePreviewsByType(contentType, limit, skip);

// Get creator stats
const { stats } = usePreviewStats(creatorAddress);
```

### Using Components

```typescript
import ContentPreview from '@components/ContentPreview';
import PreviewGallery from '@components/PreviewGallery';
import UploadPreview from '@components/UploadPreview';

// Display single preview
<ContentPreview
  contentId={123}
  userAddress={userAddress}
  onPurchaseClick={handlePurchase}
/>

// Display gallery of previews
<PreviewGallery
  onContentSelect={handleSelectContent}
  contentType="video"
  showTrendingOnly={false}
/>

// Creator upload interface
<UploadPreview
  contentId={123}
  contentTitle="My Video"
  onSuccess={handleSuccess}
  onError={handleError}
/>
```

## Deployment Checklist

### Backend Deployment

- [ ] Create `ContentPreview` model
- [ ] Implement `previewService.js`
- [ ] Create `previewRoutes.js`
- [ ] Register routes in `index.js`
- [ ] Set up IPFS integration for file uploads
- [ ] Create database indexes for efficient queries
- [ ] Run unit tests: `npm test -- preview.test.js`
- [ ] Run integration tests: `npm test -- previewIntegration.test.js`
- [ ] Set up environment variables
- [ ] Deploy to staging environment
- [ ] Smoke test all endpoints

### Frontend Deployment

- [ ] Create `ContentPreview.tsx` component
- [ ] Create `PreviewGallery.tsx` component
- [ ] Create `UploadPreview.tsx` component
- [ ] Create `usePreview.ts` hooks
- [ ] Integrate with existing content pages
- [ ] Update navigation to include preview discovery
- [ ] Test all interactive features
- [ ] Optimize images and lazy load previews
- [ ] Test on mobile devices
- [ ] Deploy to staging environment

### Database Migrations

- [ ] Create `ContentPreview` collection
- [ ] Create indexes:
  ```javascript
  db.contentpreviews.createIndex({ contentId: 1 })
  db.contentpreviews.createIndex({ creator: 1 })
  db.contentpreviews.createIndex({ previewEnabled: 1 })
  db.contentpreviews.createIndex({ contentType: 1 })
  ```

### Configuration

```javascript
// .env
PREVIEW_UPLOAD_MAX_SIZE=52428800  // 50MB
THUMBNAIL_MAX_SIZE=10485760       // 10MB
TRAILER_MAX_SIZE=524288000        // 500MB
PREVIEW_CACHE_TTL=3600000         // 1 hour
```

## File Size & Quality Guidelines

### Thumbnails
- **Recommended:** 1920x1080 (16:9)
- **Max Size:** 10 MB
- **Quality Levels:**
  - `low`: 240p compressed (~200KB)
  - `medium`: 480p compressed (~500KB)
  - `high`: 1080p slightly compressed (~2MB)
  - `ultra`: 2K/4K lossless (~10MB)

### Trailers
- **Recommended Duration:** 30-120 seconds
- **Max Size:** 500 MB
- **Quality Levels:**
  - `360p`: ~10MB/min
  - `480p`: ~20MB/min
  - `720p`: ~40MB/min (recommended)
  - `1080p`: ~80MB/min

## Content Moderation

### Preview Validation Rules

1. **Thumbnail Validation:**
   - Must be valid image format
   - Must not exceed 10MB
   - Should be appropriate for content

2. **Trailer Validation:**
   - Must be valid video format
   - Must not exceed 500MB
   - Should be appropriate excerpt of content
   - Should not contain ads or external links

3. **Text Validation:**
   - Max 500 characters for preview text
   - Should accurately describe content
   - Must follow content guidelines

## Performance Optimization

### Caching Strategy

```javascript
// Browser caching
Cache-Control: public, max-age=3600

// Server-side caching (Redis)
PREVIEW_CACHE_KEY: `preview:${contentId}`
TRENDING_CACHE_KEY: `trending:${days}days`
STATS_CACHE_KEY: `stats:${creatorAddress}`
```

### Database Query Optimization

- Use indexes on frequently queried fields
- Implement pagination for large result sets
- Use lean() for read-only queries
- Implement query result caching

### Frontend Optimization

- Lazy load images and videos
- Implement image optimization/compression
- Use efficient video streaming (IPFS gateways)
- Implement infinite scroll for galleries
- Cache preview data locally

## Security Considerations

### Access Control

1. **Public Endpoints:** No authentication required
2. **Creator Endpoints:** Require valid JWT token
3. **Creator Verification:** Verify token user owns the content
4. **Admin Endpoints:** Optional admin-only endpoints for moderation

### File Upload Security

1. **File Type Validation:** Only accept image/video MIME types
2. **File Size Limits:** Enforce max file sizes
3. **Virus Scanning:** Optional integration with antivirus service
4. **Rate Limiting:** Limit uploads per user/hour

### Data Privacy

1. **User Data:** Only store necessary information
2. **Access Logs:** Track preview views for analytics
3. **Content Ownership:** Verify creator ownership before allowing modifications

## Monitoring & Analytics

### Key Metrics to Track

1. **Preview Performance:**
   - Total previews created
   - Preview view counts
   - Download counts
   - Engagement rates

2. **Content Performance:**
   - Preview-to-purchase conversion rate
   - Most viewed previews
   - Content type popularity

3. **Creator Analytics:**
   - Creator preview statistics
   - Audience reach
   - Content performance trends

### Logging

```javascript
console.log(`[Preview] User viewed content ${contentId}`);
console.log(`[Preview] Creator ${creator} uploaded thumbnail for ${contentId}`);
console.log(`[Preview] Preview download recorded for ${contentId}`);
```

## Troubleshooting

### Common Issues

1. **IPFS Upload Failures**
   - Check IPFS gateway connectivity
   - Verify file size limits
   - Check network timeout settings

2. **Slow Preview Loading**
   - Implement caching
   - Optimize file sizes
   - Use CDN for IPFS gateway

3. **Access Control Issues**
   - Verify JWT token validity
   - Check user ownership verification
   - Review middleware stack order

## Future Enhancements

1. **Advanced Analytics:**
   - Heatmaps of preview engagement
   - A/B testing different preview styles
   - Predictive analytics for conversion

2. **AI-Powered Features:**
   - Automatic thumbnail generation
   - AI-powered trailer creation
   - Content recommendation engine

3. **Social Features:**
   - Preview sharing on social media
   - User ratings on previews
   - Community curated preview lists

4. **Monetization:**
   - Preview rewards for creators
   - Sponsored previews
   - Premium preview tiers

## Support & Documentation

- **API Docs:** See `CONTENT_PREVIEW_API_DOCUMENTATION.md`
- **Code Examples:** See inline JSDoc comments
- **Test Files:** `backend/tests/preview.test.js` and `previewIntegration.test.js`
- **Frontend Examples:** Component PropTypes and hooks documentation

