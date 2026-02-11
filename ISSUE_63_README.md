# Content Preview Feature (Issue #63)

## Overview

This feature enables creators to add preview content (thumbnails, trailers, preview text) to their digital content, allowing non-purchasers to discover and preview content before making a purchase decision.

## Problem Statement

Without preview content, users cannot adequately evaluate content before purchasing, leading to:
- Lower purchase confidence
- Higher refund rates
- Reduced discovery and discoverability
- Lower engagement from potential buyers

## Solution

The Content Preview feature provides:
- **Thumbnail Images**: High-quality preview images (low/medium/high/ultra quality options)
- **Trailers**: Video previews (360p to 1080p quality options)
- **Preview Text**: Short descriptions for article content
- **Preview Images**: Additional visual content for articles
- **Analytics**: Track views, downloads, and engagement metrics

## Features

### For Users (Non-Purchasers)

- 🖼️ **Browse Previews**: Discover content through thumbnail galleries
- 🎬 **Watch Trailers**: View video previews before purchasing
- 📊 **View Analytics**: See popularity and view counts
- 🔍 **Filter & Search**: Find content by type or search query
- 📈 **Trending**: Discover trending content in the last 7 days
- ✅ **Access Check**: Verify if user has purchased or just preview access

### For Creators

- 📤 **Upload Thumbnails**: Add high-quality preview images with quality options
- 🎥 **Upload Trailers**: Add video previews with duration and quality settings
- ✍️ **Add Preview Text**: Write compelling descriptions for articles
- 📊 **Analytics Dashboard**: View preview statistics and engagement metrics
- 🔧 **Content Management**: Toggle preview visibility and manage preview content
- 🎯 **Quality Control**: Set quality levels for optimal delivery

### Technical Features

- **IPFS Integration**: Store preview files on IPFS for decentralized delivery
- **View Tracking**: Automatically track preview views
- **Batch Operations**: Fetch multiple previews efficiently
- **Type Filtering**: Filter previews by content type
- **Pagination**: Handle large result sets with pagination
- **Caching**: Optimize performance with smart caching
- **Rate Limiting**: Prevent abuse with upload rate limits
- **Access Control**: Verify creator ownership and user permissions

## Architecture

```
┌──────────────────────────────────────────┐
│         React Components                  │
│  • ContentPreview                        │
│  • PreviewGallery                        │
│  • UploadPreview                         │
└──────────────┬───────────────────────────┘
               │ usePreview Hooks
               ▼
┌──────────────────────────────────────────┐
│      Preview API Routes                  │
│  /api/preview/*                          │
└──────────────┬───────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│    Preview Service Layer                 │
│  previewService.js                       │
└──────────────┬───────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│     ContentPreview Model                 │
│     MongoDB + IPFS Storage               │
└──────────────────────────────────────────┘
```

## API Endpoints

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/preview/:contentId` | Get single preview |
| POST | `/api/preview/batch/get` | Get multiple previews |
| GET | `/api/preview/type/:type` | Filter by content type |
| GET | `/api/preview/trending` | Get trending previews |
| GET | `/api/preview/:contentId/access/:user` | Check user access |
| POST | `/api/preview/:contentId/download` | Record download |

### Creator Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/preview/:contentId` | Create/update preview |
| POST | `/api/preview/:contentId/thumbnail` | Upload thumbnail |
| POST | `/api/preview/:contentId/trailer` | Upload trailer |
| PATCH | `/api/preview/:contentId/metadata` | Update metadata |
| PATCH | `/api/preview/:contentId/visibility` | Toggle visibility |
| GET | `/api/preview/stats/:creator` | Get creator stats |
| DELETE | `/api/preview/:contentId` | Delete preview |

## File Structure

```
project-root/
├── backend/
│   ├── models/
│   │   └── ContentPreview.js          # Preview data model
│   ├── routes/
│   │   └── previewRoutes.js           # API endpoints
│   ├── services/
│   │   └── previewService.js          # Business logic
│   ├── middleware/
│   │   └── previewAuth.js             # Authorization & validation
│   ├── tests/
│   │   ├── preview.test.js            # Unit tests
│   │   └── previewIntegration.test.js # Integration tests
│   └── CONTENT_PREVIEW_API_DOCUMENTATION.md
│
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── ContentPreview.tsx      # Preview display component
│       │   ├── PreviewGallery.tsx      # Gallery browsing component
│       │   └── UploadPreview.tsx       # Creator upload component
│       └── hooks/
│           └── usePreview.ts           # React hooks for preview data
│
└── ISSUE_63_IMPLEMENTATION_GUIDE.md    # Implementation guide
```

## Installation

### Backend Setup

1. **Model Registration**: The ContentPreview model is automatically registered
2. **Database Indexes**: Automatically created on first run
3. **Routes**: Mounted at `/api/preview` in the Express app
4. **Services**: Instantiated and ready to use

### Frontend Setup

1. **Component Integration**: Import components as needed
```typescript
import ContentPreview from '@components/ContentPreview';
import PreviewGallery from '@components/PreviewGallery';
import UploadPreview from '@components/UploadPreview';
```

2. **Hook Usage**: Use React hooks for data fetching
```typescript
import { useContentPreview, useTrendingPreviews } from '@hooks/usePreview';
```

## Usage Examples

### Display a Content Preview

```typescript
import ContentPreview from '@components/ContentPreview';

<ContentPreview
  contentId={123}
  userAddress="user.stx"
  onPurchaseClick={() => handlePurchase(123)}
  showAccessStatus={true}
/>
```

### Browse Preview Gallery

```typescript
import PreviewGallery from '@components/PreviewGallery';

<PreviewGallery
  onContentSelect={(contentId) => viewPreview(contentId)}
  contentType="video"
  showTrendingOnly={false}
  limit={12}
/>
```

### Creator Upload Interface

```typescript
import UploadPreview from '@components/UploadPreview';

<UploadPreview
  contentId={123}
  contentTitle="My Video Content"
  onSuccess={() => console.log('Upload successful')}
  onError={(error) => console.error(error)}
/>
```

### Fetch Preview with Hook

```typescript
import { useContentPreview } from '@hooks/usePreview';

const { preview, loading, error } = useContentPreview(123);

if (loading) return <div>Loading...</div>;
if (error) return <div>Error: {error}</div>;

return (
  <div>
    <img src={preview.thumbnailUrl} alt={preview.title} />
    <p>{preview.title}</p>
  </div>
);
```

### Check User Access

```typescript
import { useContentAccess } from '@hooks/usePreview';

const { accessStatus } = useContentAccess(123, "user.stx");

if (accessStatus?.hasAccess && accessStatus?.accessType !== 'preview_only') {
  // Show full content access
} else {
  // Show preview only
}
```

## Configuration

### Environment Variables

```env
# Preview upload settings
PREVIEW_UPLOAD_MAX_SIZE=52428800        # 50MB
THUMBNAIL_MAX_SIZE=10485760             # 10MB
TRAILER_MAX_SIZE=524288000              # 500MB
PREVIEW_CACHE_TTL=3600000               # 1 hour
MAX_UPLOADS_PER_HOUR=10                 # Rate limiting
```

### Quality Settings

**Thumbnails:**
- `low`: 240p (mobile)
- `medium`: 480p (standard)
- `high`: 1080p (HD - recommended)
- `ultra`: 2K/4K (premium)

**Trailers:**
- `360p`: Mobile/low bandwidth
- `480p`: Standard definition
- `720p`: HD (recommended)
- `1080p`: Full HD

## Testing

### Run Unit Tests
```bash
npm test -- preview.test.js
```

### Run Integration Tests
```bash
npm test -- previewIntegration.test.js
```

### Manual Testing Checklist
- [ ] Preview creation and updates
- [ ] File uploads (thumbnail and trailer)
- [ ] Preview visibility toggling
- [ ] Access status checking
- [ ] Analytics tracking
- [ ] Batch operations
- [ ] Error handling
- [ ] Rate limiting

## Performance

### Optimization Strategies

1. **Database Indexes**: Optimize queries on frequently searched fields
2. **Caching**: Cache preview data with TTL
3. **Image Optimization**: Compress thumbnails based on quality level
4. **Pagination**: Return limited results per request
5. **Lazy Loading**: Load images/videos on demand in frontend

### Benchmarks

- **Preview Retrieval**: < 200ms
- **Batch Operations**: < 500ms (10 items)
- **File Upload**: Depends on file size and network
- **View Count Updates**: < 50ms

## Security

### Access Control
- Public endpoints require no authentication
- Creator endpoints require JWT authentication
- Creator ownership verified before modifications

### File Upload Security
- MIME type validation
- File size limits enforced
- Rate limiting per user
- Virus scanning (optional)

### Data Privacy
- User data minimized
- Access logs maintained for auditing
- Creator ownership verified

## Monitoring & Analytics

### Key Metrics

- Total previews created
- Preview views by content type
- Preview download counts
- Preview-to-purchase conversion rates
- Creator statistics

### Logging

All preview operations are logged:
```
[Preview] {operation} - Content: {contentId}, User: {userAddress}, Time: {timestamp}
```

## Troubleshooting

### Common Issues

**Q: Preview not showing up**
- A: Verify preview is enabled (`previewEnabled: true`)
- A: Check if preview file uploaded successfully

**Q: Upload failing**
- A: Check file size limits
- A: Verify MIME type is correct
- A: Check IPFS connectivity

**Q: Slow loading**
- A: Clear browser cache
- A: Check IPFS gateway performance
- A: Verify database indexes are created

## Future Enhancements

- [ ] AI-powered thumbnail generation
- [ ] Automatic trailer creation from content
- [ ] Preview sharing on social media
- [ ] A/B testing different preview styles
- [ ] Community curated preview lists
- [ ] Preview ratings and comments
- [ ] Advanced analytics dashboard

## Support

- **API Documentation**: See `CONTENT_PREVIEW_API_DOCUMENTATION.md`
- **Implementation Guide**: See `ISSUE_63_IMPLEMENTATION_GUIDE.md`
- **Code Examples**: See inline JSDoc and component PropTypes
- **Test Files**: `backend/tests/preview.test.js` and `previewIntegration.test.js`

## Related Issues

- Issue #34: Pay-Per-View Flow
- Issue #62: Search and Filtering
- Issue #61: Wallet Connection

## Contributors

- Victor Olamide (@victor-olamide)

## License

This project is licensed under the MIT License - see LICENSE file for details.

---

**Last Updated**: February 10, 2026  
**Status**: ✅ Implemented and Tested  
**Version**: 1.0.0
