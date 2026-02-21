# IPFS Pinning Service

A comprehensive, production-ready IPFS pinning service with multi-provider support, redundancy, and automated lifecycle management for the Web3 Content Monetization platform.

## Overview

The IPFS Pinning Service ensures content persistence and availability by:

- **Multi-Provider Pinning**: Distributes content across multiple IPFS pinning services
- **Automated Redundancy**: Maintains multiple copies for high availability
- **Lifecycle Management**: Automatically pins new content and unpins removed content
- **Health Monitoring**: Continuously monitors pinning status and repairs failures
- **Cost Optimization**: Chooses the most efficient providers based on cost and reliability

## Architecture

```
┌─────────────────┐    ┌─────────────────┐
│   Application   │────│ Pinning Manager │
│   Services      │    │                 │
└─────────────────┘    └─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│  Pinning        │    │  Content       │
│  Service        │────│  Lifecycle     │
│                 │    │  Events        │
└─────────────────┘    └─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│  Multiple       │    │  Health        │
│  Providers      │    │  Monitoring    │
│  (Pinata,       │    │                │
│   Web3, NFT,    │    │                │
│   Infura)       │    └─────────────────┘
└─────────────────┘
```

## Supported Providers

| Provider | Status | Cost | Reliability | Notes |
|----------|--------|------|-------------|-------|
| **Pinata** | ✅ Primary | $$ | ⭐⭐⭐⭐⭐ | Best for production |
| **Web3.Storage** | ✅ Secondary | $ | ⭐⭐⭐⭐ | Good for large files |
| **NFT.Storage** | ✅ Tertiary | $ | ⭐⭐⭐⭐ | Optimized for NFTs |
| **Infura** | ✅ Fallback | $$ | ⭐⭐⭐ | Basic functionality |

## Quick Start

### 1. Environment Setup

```bash
# Copy configuration template
cp backend/config/pinningConfig.js .env

# Edit with your provider credentials
nano .env
```

### 2. Configure Providers

Get API keys from the respective services:

- **Pinata**: https://pinata.cloud/
- **Web3.Storage**: https://web3.storage/
- **NFT.Storage**: https://nft.storage/
- **Infura**: https://infura.io/

### 3. Start the Service

The pinning service starts automatically with your application. Content is pinned when:

- New content is uploaded via `/api/content/upload-and-register`
- Content is removed (automatically unpinned)
- Health checks detect missing pins (auto-repair)

## Configuration

### Environment Variables

```bash
# Provider Credentials
PINATA_API_KEY=your_pinata_key
PINATA_SECRET_API_KEY=your_pinata_secret
WEB3_STORAGE_API_KEY=your_web3_key
NFT_STORAGE_API_KEY=your_nft_key
INFURA_PROJECT_ID=your_infura_id
INFURA_PROJECT_SECRET=your_infura_secret

# Service Configuration
IPFS_PINNING_REDUNDANCY=2          # Number of providers to pin to
IPFS_AUTO_REPIN=true               # Auto-repair missing pins
IPFS_MAX_FILE_SIZE=104857600       # 100MB max file size
IPFS_PINNING_TIMEOUT=300000        # 5 minute timeout
IPFS_HEALTH_CHECK_INTERVAL=300000  # 5 minute health checks
```

### Provider Priorities

Providers are prioritized by reliability and cost:

1. **Pinata** (Primary) - Highest reliability, moderate cost
2. **Web3.Storage** (Secondary) - Good for large files, low cost
3. **NFT.Storage** (Tertiary) - NFT optimized, low cost
4. **Infura** (Fallback) - Basic functionality, moderate cost

## API Endpoints

### Service Management

```bash
# Get service status
GET /api/pinning/status

# Get service health
GET /api/pinning/health

# Get storage usage
GET /api/pinning/storage

# Trigger manual health check
POST /api/pinning/health-check
```

### Content Pinning

```bash
# Pin specific content
POST /api/pinning/content/:contentId/pin
{
  "redundancy": 3  // Optional: override default redundancy
}

# Unpin specific content
POST /api/pinning/content/:contentId/unpin
{
  "providers": ["pinata"]  // Optional: specific providers
}

# Check pinning status
GET /api/pinning/content/:contentId/status

# Repair pinning for content
POST /api/pinning/content/:contentId/repair

# List pinned content
GET /api/pinning/content?page=1&limit=20&status=pinned
```

### Emergency Operations

```bash
# Emergency unpin all content (USE WITH CAUTION)
POST /api/pinning/emergency/unpin-all
{
  "confirmation": "CONFIRM_UNPIN_ALL"
}
```

## Content Lifecycle Integration

### Automatic Pinning

Content is automatically pinned when:

1. **Content Creation**: New content uploaded via content routes
2. **Preview Upload**: Thumbnails and trailers uploaded
3. **Health Check Repair**: Missing pins detected and restored

### Automatic Unpinning

Content is automatically unpinned when:

1. **Content Removal**: Creator removes content
2. **Emergency Operations**: Administrative unpinning
3. **Service Decommissioning**: Provider removal

### Pinning Information Storage

Pinning metadata is stored in MongoDB:

```javascript
// Content.pinningInfo
{
  primaryHash: "QmXXX...",
  replicas: [
    {
      provider: "pinata",
      hash: "QmXXX...",
      url: "ipfs://QmXXX...",
      timestamp: "2024-01-01T00:00:00Z",
      size: 1048576
    }
  ],
  redundancyLevel: 2,
  pinnedAt: "2024-01-01T00:00:00Z"
}
```

## Monitoring and Health Checks

### Automatic Health Monitoring

- **Interval**: Every 5 minutes (configurable)
- **Checks**: Provider connectivity and content pinning status
- **Actions**: Auto-repair missing pins, log failures

### Health Status Indicators

```javascript
{
  providers: {
    pinata: {
      enabled: true,
      healthy: true,
      lastHealthCheck: "2024-01-01T00:00:00Z",
      priority: 1
    }
  },
  summary: {
    totalProviders: 4,
    enabledProviders: 3,
    healthyProviders: 3,
    serviceHealthy: true
  }
}
```

### Content Pinning Status

```javascript
{
  hash: "QmXXX...",
  status: {
    pinata: { pinned: true, healthy: true },
    "web3.storage": { pinned: true, healthy: true }
  },
  summary: {
    totalProviders: 4,
    pinnedCount: 2,
    healthyCount: 2,
    redundancyLevel: 2,
    isWellPinned: true
  }
}
```

## Cost Optimization

### Provider Selection Strategy

1. **Reliability First**: Prefer providers with proven uptime
2. **Cost Consideration**: Balance cost vs. reliability
3. **File Size Optimization**: Route large files to cost-effective providers
4. **Geographic Distribution**: Consider provider geographic coverage

### Cost Monitoring

```javascript
// Get usage statistics
const usage = await pinningService.getStorageUsage();
// Returns bytes used, file counts, and cost estimates per provider
```

## Backup and Recovery

### Automated Backups

- **Frequency**: Configurable intervals
- **Content**: Pinning metadata, provider configurations
- **Storage**: Local filesystem with optional cloud backup

### Recovery Procedures

1. **Provider Failure**: Auto-failover to healthy providers
2. **Content Recovery**: Re-pin from existing healthy replicas
3. **Full Recovery**: Restore from backup metadata

## Troubleshooting

### Common Issues

#### Provider Authentication Failures
```bash
# Check credentials
GET /api/pinning/health

# Verify environment variables
echo $PINATA_API_KEY
```

#### Pinning Failures
```bash
# Check content status
GET /api/pinning/content/123/status

# Manual repair
POST /api/pinning/content/123/repair
```

#### High Costs
```bash
# Check usage
GET /api/pinning/storage

# Adjust redundancy
export IPFS_PINNING_REDUNDANCY=1
```

### Logs and Debugging

```bash
# Enable debug logging
export IPFS_DEBUG_LOGGING=true

# Check application logs
tail -f logs/application.log | grep pinning
```

### Emergency Procedures

```bash
# Stop all pinning operations
export IPFS_AUTO_REPIN=false

# Emergency unpin (CAUTION)
POST /api/pinning/emergency/unpin-all
```

## Performance Considerations

### File Size Limits
- **Maximum**: 100MB per file (configurable)
- **Optimization**: Large files use streaming uploads
- **Chunking**: Automatic file chunking for large uploads

### Rate Limiting
- **Provider Limits**: Respects individual provider rate limits
- **Exponential Backoff**: Automatic retry with backoff
- **Queue Management**: Request queuing during high load

### Caching
- **Health Status**: Cached provider health status
- **Pin Status**: Cached pinning status with TTL
- **Gateway URLs**: Cached IPFS gateway URLs

## Security

### API Key Management
- **Environment Variables**: Keys stored securely
- **Access Control**: Admin-only API endpoints
- **Audit Logging**: All pinning operations logged

### Content Protection
- **Access Control**: Only authorized users can pin/unpin
- **Hash Verification**: Content integrity verification
- **Provider Validation**: Only approved providers used

## Migration Guide

### From Single Provider to Multi-Provider

1. **Configure Multiple Providers**
   ```bash
   # Add additional provider keys to .env
   export WEB3_STORAGE_API_KEY=...
   export NFT_STORAGE_API_KEY=...
   ```

2. **Update Redundancy Level**
   ```bash
   export IPFS_PINNING_REDUNDANCY=2
   ```

3. **Migrate Existing Content**
   ```bash
   # Pin existing content to new providers
   POST /api/pinning/content/:contentId/pin
   ```

### From Manual to Automatic Pinning

1. **Enable Auto-Pinning**
   ```bash
   export IPFS_AUTO_REPIN=true
   ```

2. **Update Application Code**
   ```javascript
   // Pinning now happens automatically in content routes
   // No manual pinning calls needed
   ```

## API Reference

### PinningService Class

```javascript
const { pinningService } = require('./services/pinningService');

// Upload and pin file
const result = await pinningService.uploadFile(buffer, filename, options);

// Pin existing hash
const result = await pinningService.pinExistingHash(ipfsHash, options);

// Check pinning status
const status = await pinningService.checkPinningStatus(ipfsHash);

// Unpin content
const result = await pinningService.unpinHash(ipfsHash, providers);
```

### PinningManager Class

```javascript
const { pinningManager } = require('./services/pinningManager');

// Pin content during creation
await pinningManager.pinContent(contentDoc, fileBuffer, filename);

// Unpin content during removal
await pinningManager.unpinContent(contentDoc);

// Repair pinning
await pinningManager.repairContentPinning(contentDoc);

// Get statistics
const stats = await pinningManager.getPinningStats();
```

## Contributing

### Adding New Providers

1. **Add Provider Configuration**
   ```javascript
   // In pinningService.js
   const PROVIDERS = {
     NEW_PROVIDER: 'new_provider'
   };
   ```

2. **Implement Provider Logic**
   ```javascript
   // Add to PROVIDER_CONFIGS
   [PROVIDERS.NEW_PROVIDER]: {
     apiUrl: 'https://api.newprovider.com',
     // ... provider configuration
   }
   ```

3. **Add Upload/Pinning Logic**
   ```javascript
   // Implement _uploadToProvider and _pinToProvider methods
   ```

### Testing

```bash
# Run pinning service tests
npm test -- --grep "pinning"

# Test specific provider
npm test -- --grep "pinning.*pinata"
```

## Support

For issues and questions:

1. Check service health: `GET /api/pinning/health`
2. Review application logs
3. Check provider status pages
4. Contact DevOps team

---

## Server Setup and Deployment

### Prerequisites

- Node.js 16+ installed
- MongoDB running
- API keys for pinning providers (see Configuration section)

### Installation

1. **Install Dependencies**
```bash
cd backend
npm install
```

2. **Environment Configuration**
```bash
cp .env.example .env
# Edit .env with your provider API keys
```

3. **Start the Server**
```bash
# Development mode
npm run dev

# Production mode
npm start
```

### Server Architecture

The pinning service is integrated into the main Express server (`server.js`):

```javascript
// Routes are registered in server.js
app.use('/api/pinning', pinningRoutes);

// Service initialization
await initializePinningService();
```

### Health Checks

- **Application Health**: `GET /health`
- **Pinning Service Health**: `GET /api/pinning/health`
- **Pinning Service Status**: `GET /api/pinning/status`

## Quick Commands

```bash
# Check service status
curl http://localhost:3000/api/pinning/status

# Check health
curl http://localhost:3000/api/pinning/health

# List pinned content
curl "http://localhost:3000/api/pinning/content?page=1&limit=10"

# Pin specific content
curl -X POST http://localhost:3000/api/pinning/content/123/pin

# Check content status
curl http://localhost:3000/api/pinning/content/123/status
```