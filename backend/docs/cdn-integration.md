# CDN Integration Documentation

## Overview

The CDN (Content Delivery Network) integration provides faster global content delivery for the Web3 content platform. This system supports multiple CDN providers and includes comprehensive caching, purging, analytics, and health monitoring capabilities.

## Architecture

### Components

1. **CDN Configuration** (`config/cdnConfig.js`)
   - Multi-provider support (Cloudflare, AWS CloudFront, Fastly, Akamai)
   - Security settings and performance tuning
   - Geographic distribution configuration

2. **Database Models** (`models/CdnCache.js`)
   - `CdnCacheEntry`: Cache status and metadata
   - `CdnPurgeRequest`: Purge operation tracking
   - `CdnAnalytics`: Performance metrics
   - `CdnHealthCheck`: Provider health monitoring

3. **Core Services**
   - `cdnService.js`: Provider-specific operations
   - `cdnDeliveryService.js`: Content delivery optimization

4. **API Routes** (`routes/cdnRoutes.js`)
   - RESTful endpoints for CDN management
   - Admin-only access with authentication

## Configuration

### Environment Variables

```bash
# CDN Provider Configuration
CDN_PROVIDER=cloudflare
CDN_CLOUDFLARE_API_TOKEN=your_api_token
CDN_CLOUDFLARE_ZONE_ID=your_zone_id

# Alternative providers
CDN_AWS_ACCESS_KEY=your_access_key
CDN_AWS_SECRET_KEY=your_secret_key
CDN_AWS_DISTRIBUTION_ID=your_distribution_id

# CDN Settings
CDN_ENABLED=true
CDN_DEFAULT_TTL=3600
CDN_MAX_TTL=86400
CDN_COMPRESSION_ENABLED=true
```

### CDN Config Structure

```javascript
const cdnConfig = {
  enabled: true,
  provider: 'cloudflare',
  defaultTtl: 3600,
  maxTtl: 86400,
  compression: {
    enabled: true,
    types: ['text/*', 'application/json', 'application/javascript']
  },
  security: {
    httpsOnly: true,
    hsts: true,
    cors: {
      enabled: true,
      origins: ['https://yourdomain.com']
    }
  },
  providers: {
    cloudflare: {
      apiToken: process.env.CDN_CLOUDFLARE_API_TOKEN,
      zoneId: process.env.CDN_CLOUDFLARE_ZONE_ID
    }
    // ... other providers
  }
};
```

## API Endpoints

### Status and Health

#### GET /api/cdn/status
Get overall CDN system status and statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "health": {
      "healthy": true,
      "timestamp": "2024-01-01T00:00:00.000Z",
      "providers": [...]
    },
    "stats": {
      "totalRequests": 10000,
      "cacheHitRate": 0.85,
      "averageResponseTime": 150
    },
    "cacheStats": [...],
    "config": {
      "enabled": true,
      "provider": "cloudflare"
    }
  }
}
```

#### GET /api/cdn/health
Get CDN health check history.

#### POST /api/cdn/health/check
Perform manual health check.

### Cache Management

#### POST /api/cdn/cache/:contentId
Add specific content to CDN cache.

#### DELETE /api/cdn/cache/:contentId
Remove content from CDN cache.

#### POST /api/cdn/purge
Purge multiple content items.

**Request Body:**
```json
{
  "contentIds": [1, 2, 3],
  "reason": "content_update"
}
```

#### POST /api/cdn/warmup
Warm up CDN cache for content items.

**Request Body:**
```json
{
  "contentIds": [1, 2, 3],
  "limit": 50
}
```

### Analytics and Monitoring

#### GET /api/cdn/analytics
Get CDN performance analytics.

**Query Parameters:**
- `period`: 'daily', 'weekly', 'monthly'
- `days`: Number of days to analyze (default: 7)

#### GET /api/cdn/cache
Get cache entries with pagination.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `status`: Filter by status ('cached', 'purged', 'pending', 'failed')
- `contentType`: Filter by content type

#### GET /api/cdn/purges
Get purge request history.

## Usage Examples

### Adding Content to CDN Cache

```javascript
const cdnService = require('./services/cdnService');
const content = await Content.findOne({ contentId: 123 });

const result = await cdnService.addToCache(content);
if (result.success) {
  console.log('Content cached successfully:', result.cacheEntry.cdnUrl);
}
```

### Delivering Content via CDN

```javascript
const cdnDeliveryService = require('./services/cdnDeliveryService');

const result = await cdnDeliveryService.deliverContent(content, {
  userId: 'user123',
  quality: 'HD',
  format: 'mp4'
});

if (result.deliveryMethod === 'cdn') {
  // Serve from CDN
  res.redirect(result.url);
} else {
  // Fallback to direct delivery
  // ... direct delivery logic
}
```

### Purging Content

```javascript
const result = await cdnService.purgeContent([123, 456], 'content_update');
console.log('Purge status:', result.purgeRequest.status);
```

## Supported CDN Providers

### Cloudflare
- **API**: Cloudflare API v4
- **Features**: Global distribution, real-time analytics, custom rules
- **Configuration**: API token and zone ID required

### AWS CloudFront
- **API**: AWS SDK
- **Features**: Integration with S3, Lambda@Edge, comprehensive analytics
- **Configuration**: Access key, secret key, and distribution ID required

### Fastly
- **API**: Fastly API
- **Features**: Real-time purging, custom VCL, instant analytics
- **Configuration**: API token and service ID required

### Akamai
- **API**: Akamai CCU API
- **Features**: Enterprise-grade security, extensive network
- **Configuration**: Client token, client secret, and host required

## Performance Optimization

### Caching Strategies

1. **Content-Type Based TTL**
   - Static assets: 1 year
   - Dynamic content: 1 hour
   - User-specific content: 15 minutes

2. **Cache Keys**
   - Include content ID, quality, and format
   - Consider user permissions for personalized content

3. **Purge Strategies**
   - Immediate purge for content updates
   - Scheduled purge for bulk operations
   - Selective purge for specific variants

### Geographic Optimization

- **Edge Locations**: Automatic selection based on user location
- **Regional Caching**: Content cached in multiple regions
- **Latency-Based Routing**: Route to nearest healthy edge

### Monitoring and Analytics

- **Real-time Metrics**: Request count, hit rate, response time
- **Error Tracking**: Failed requests and error rates
- **Cost Analysis**: Bandwidth usage and cost optimization

## Security Considerations

### Access Control
- HTTPS-only delivery
- HSTS headers for security
- CORS configuration for cross-origin requests

### Authentication
- API token-based authentication for admin operations
- Content access validation before CDN delivery
- Geographic restrictions for compliance

### Data Protection
- No sensitive data in cache keys
- Secure purge operations
- Audit logging for all operations

## Troubleshooting

### Common Issues

1. **Content Not Caching**
   - Check CDN provider configuration
   - Verify content accessibility
   - Check cache headers and TTL settings

2. **High Cache Miss Rate**
   - Review TTL settings
   - Check content popularity patterns
   - Consider cache warming strategies

3. **Purge Failures**
   - Verify API credentials
   - Check provider-specific limits
   - Implement retry logic

4. **Performance Degradation**
   - Monitor health check endpoints
   - Check geographic distribution
   - Review analytics for bottlenecks

### Debug Mode

Enable debug logging by setting:
```bash
DEBUG=cdn:*
```

### Health Checks

Regular health checks verify:
- Provider API connectivity
- Cache operations functionality
- Content delivery accessibility
- Performance metrics collection

## Database Indexes

The following indexes are created for optimal performance:

```javascript
// CdnCacheEntry
{ contentId: 1 } // Unique index
{ status: 1, createdAt: -1 }
{ contentType: 1, status: 1 }
{ lastAccessed: -1 }
{ expiresAt: 1 } // TTL index

// CdnPurgeRequest
{ status: 1, createdAt: -1 }
{ contentIds: 1 }
{ requestedBy: 1, createdAt: -1 }

// CdnAnalytics
{ date: 1, period: 1 } // Unique compound index
{ period: 1, date: -1 }
{ 'metrics.totalRequests': -1 }

// CdnHealthCheck
{ checkedAt: -1 }
{ provider: 1, checkedAt: -1 }
{ status: 1, checkedAt: -1 }
```

## Testing

Run the CDN integration tests:

```bash
npm test -- tests/cdnIntegration.test.js
```

Tests cover:
- Cache operations (add, purge, warmup)
- Content delivery with fallback
- Analytics and health monitoring
- Error handling and edge cases
- Performance under concurrent load

## Deployment Checklist

- [ ] Configure CDN provider credentials
- [ ] Update environment variables
- [ ] Create database indexes
- [ ] Test CDN connectivity
- [ ] Verify content delivery
- [ ] Monitor initial performance
- [ ] Set up alerting for failures
- [ ] Document custom configurations

## Future Enhancements

1. **Advanced Caching**
   - Machine learning-based cache prediction
   - Dynamic TTL adjustment
   - Content popularity analysis

2. **Enhanced Security**
   - DDoS protection integration
   - Token-based access control
   - Content encryption at edge

3. **Analytics Improvements**
   - Real-time dashboards
   - Predictive scaling
   - Cost optimization recommendations

4. **Multi-Provider Support**
   - Automatic failover between providers
   - Load balancing across providers
   - Provider performance comparison