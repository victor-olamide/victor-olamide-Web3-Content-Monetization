# Content Streaming & Viewing Page (#185)

This document describes the implementation of the content streaming and viewing page (`/content/:id`) for the Web3 content monetization platform.

## Overview

The content viewing page is a comprehensive solution for displaying, accessing, and monetizing digital content. It implements a gated access model with support for one-time purchases, subscriptions, and token-gating mechanisms.

## Features

### 1. **Content Display & Streaming**
- **ContentPlayer Component**: Advanced media player with support for:
  - Video playback with controls (play, pause, mute, volume)
  - Adjustable playback speed (0.5x, 1x, 1.5x, 2x)
  - Fullscreen mode for immersive viewing
  - Progress bar with seek functionality
  - Time display and duration tracking
  - Music playback with album art display
  - Image viewing with responsive sizing
  - Embedded article/document viewing

### 2. **Access Control & Monetization**
- **Paywall Component**: Comprehensive access gating with:
  - One-time purchase option with balance checking
  - Subscription tier selection (monthly/yearly)
  - Token-gating verification (NFTs/tokens)
  - Real-time STX balance display
  - USD price conversion
  - Transaction status tracking
  - Blockchain explorer links

### 3. **Content Metadata & Discovery**
- **ContentMetadata Component**: Rich content information including:
  - Title, description, and content type
  - Creator information with avatar
  - Engagement statistics (views, published date, duration, price)
  - Tags and category display
  - Share, download, and report actions
  - License and terms disclaimer

### 4. **Content Discovery**
- **RelatedContent Component**: Recommendation engine featuring:
  - Category-based recommendations
  - Thumbnail previews with hover animations
  - Creator information and view counts
  - Pricing indicators and lock badges
  - Loading skeleton states
  - Empty state handling

### 5. **Analytics & Tracking**
- **useContentView Hook**: Comprehensive event tracking:
  - Content view tracking on page load
  - Streaming progress monitoring (25%, 50%, 75%, 100%)
  - Purchase event tracking with transaction IDs
  - Share action logging across platforms
  - Download tracking
  - Content report submissions
  - Subscription event tracking

- **AnalyticsService**: Batch event collection with:
  - Configurable batch sizes
  - Automatic periodic flushing (30 seconds)
  - Retry logic for failed submissions
  - Event queue management
  - Debugging utilities

### 6. **Social Sharing**
- **Content Sharing Utilities**: Multi-platform sharing including:
  - Native Web Share API support
  - Twitter sharing with hashtags
  - Facebook sharing
  - LinkedIn sharing
  - Email sharing with pre-filled subject/body
  - Clipboard copy with fallback
  - Referral URL generation
  - Social metadata generation

### 7. **Error Handling & Recovery**
- **ContentErrorBoundary**: Robust error handling with:
  - Specific error type detection (network, 404, generic)
  - User-friendly error messages
  - Retry functionality with error count tracking
  - Expandable error details for debugging
  - Multiple recovery options
  - Automatic reset on content change

### 8. **Loading States**
- **ContentLoadingSkeleton**: Smooth loading experience with:
  - Full-page skeleton layout
  - Component-specific skeletons
  - Animated gradient loading states
  - Proper spacing and aspect ratio maintenance
  - Reduced cumulative layout shift

### 9. **State Management**
- **ContentAccessContext**: Global access state tracking with:
  - Client-side access caching
  - Access type differentiation
  - Expiration tracking and auto-cleanup
  - Purchase timestamp recording
  - Efficient access checking

### 10. **Subscription Management**
- **SubscriptionModal**: Tier-based subscription flow featuring:
  - Multiple pricing tiers
  - Monthly and yearly billing options
  - Recommended tier highlighting
  - Balance verification
  - Tier feature comparison
  - Error handling and edge cases

## Component Architecture

```
ContentView (Page)
├── ContentErrorBoundary
│   └── DashboardShell
│       ├── Breadcrumb Navigation
│       ├── Main Content (lg:col-span-2)
│       │   ├── ContentPlayer
│       │   └── ContentMetadata
│       └── Sidebar (lg:col-span-1)
│           ├── PaywallComponent / ContentDisplay
│           └── RelatedContent
└── SubscriptionModal
```

## Data Flow

### Content Access Check Flow
1. User navigates to `/content/:id`
2. `useContentAccess` hook fetches content and verifies access
3. Access is determined by:
   - Content price (free if $0)
   - Creator ownership check
   - Purchase history query
   - Token balance verification
4. Display appropriate component:
   - ContentPlayer if access granted
   - PaywallComponent if access denied

### Purchase Flow
1. User clicks "Purchase Access"
2. `handlePurchase` validates balance and initiates transaction
3. Transaction ID is obtained from Stacks blockchain
4. `pollTransaction` monitors blockchain confirmation
5. Upon success:
   - `trackPurchase` logs analytics event
   - `refreshAccess` re-checks access rights
   - Content is immediately available
   - User receives success notification

### Analytics Event Flow
1. User interactions trigger tracking methods from `useContentView`
2. Events are queued in `AnalyticsService`
3. Events are batched and sent to backend periodically
4. Failed submissions are retried

## Types & Interfaces

### Content Type Enhanced Fields
```typescript
interface Content {
  id?: string | number;
  contentId: number;
  title: string;
  description: string;
  type: 'video' | 'article' | 'image' | 'music';
  price: number;
  creator: string;
  url?: string;
  category?: string;
  thumbnail?: string;
  duration?: string;
  viewCount?: number;
  likes?: number;
  tags?: string[];
  tokenGating?: TokenGatingConfig;
  isExplicit?: boolean;
  subtitles?: Array<{ language: string; url: string }>;
  createdAt?: string | number;
  updatedAt?: string | number;
}
```

## Usage Examples

### Basic Content View
```tsx
// Navigate to: /content/123
// Page automatically handles:
// - Content fetching
// - Access verification
// - Display of appropriate components
```

### Tracking Content Purchase
```tsx
const { trackPurchase } = useContentView({ contentId: contentId });
// Called automatically in handlePurchase()
trackPurchase(amount, transactionId);
```

### Sharing Content
```tsx
const { shareToTwitter, shareUrl } = useContentSharing({
  contentId: '123',
  creatorId: 'creator.stx',
  title: 'Amazing Content',
  description: 'Check this out!',
  hashtags: ['web3', 'content']
});

// Share to specific platform
await shareToTwitter();
```

### Checking Access
```tsx
const { hasAccess, checkAccess } = useContentAccessContext();

if (hasAccess(contentId)) {
  // Show content
}

const accessRecord = checkAccess(contentId);
// { accessType: 'owned', purchasedAt: 1234567890 }
```

## API Endpoints Used

- `GET /api/content/:id` - Fetch content metadata
- `GET /api/content/:id/access` - Check user access rights
- `POST /api/purchases` - Record purchase event
- `GET /api/content?category=X&limit=6` - Get related content
- `POST /api/analytics/events` - Submit analytics events

## Browser Compatibility

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- Mobile browsers: Full support with responsive design

## Performance Considerations

- **Lazy Loading**: Components are code-split
- **Caching**: Access state cached client-side
- **Batching**: Analytics events batched for efficiency
- **Optimization**: Images optimized with Next.js Image component
- **Skeletal UI**: Loading states prevent layout shift

## Future Enhancements

- [ ] Adaptive bitrate streaming
- [ ] DVR/Recording capabilities
- [ ] Live streaming support
- [ ] Comments and reactions
- [ ] Recommendation algorithm improvements
- [ ] Offline playback
- [ ] Subtitle/caption editor
- [ ] Advanced analytics dashboard
- [ ] Multi-user watch parties
- [ ] Content rating system

## Testing

Key test scenarios:
- [ ] Load content with valid ID
- [ ] Load non-existent content (404)
- [ ] Purchase flow with sufficient balance
- [ ] Purchase flow with insufficient balance
- [ ] Token-gating verification
- [ ] Subscription tier selection
- [ ] Social sharing to each platform
- [ ] Content loading and playback
- [ ] Error boundary activation
- [ ] Related content loading

## Security Considerations

- Access control verified server-side
- Transaction validation on blockchain
- User authentication required
- Rate limiting on API endpoints
- Input validation on all forms
- XSS prevention via React escaping
- CSRF token in forms

## Deployment

- Deployed as Next.js server component
- Images cached via CDN
- Analytics events sent to backend
- Blockchain transactions via Stacks Connect
- Video streaming via external CDN (IPFS/Arweave)

## Troubleshooting

**Content not loading?**
- Check network connection
- Verify content ID is valid
- Check backend API status

**Purchase fails?**
- Ensure sufficient STX balance
- Check wallet connection
- Verify transaction gas settings

**Videos won't play?**
- Check video URL is valid
- Verify video codec support
- Check CORS headers

**Analytics not tracking?**
- Verify backend analytics endpoint
- Check event payload format
- Review browser console for errors

