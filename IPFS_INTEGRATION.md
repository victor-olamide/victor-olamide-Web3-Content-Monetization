# IPFS Integration Guide

## Overview

This document provides comprehensive guidance on the IPFS (InterPlanetary File System) integration for the Stacks Content Monetization Platform. The platform enables creators to upload content directly to IPFS with real-time progress tracking, automatic retry logic, and seamless blockchain integration.

## Architecture

### Components

1. **Backend IPFS Service** (`backend/services/ipfsService.js`)
   - Handles file uploads to Pinata (IPFS provider)
   - Manages progress tracking and retry logic
   - Provides gateway URL generation and file management

2. **Frontend IPFS Hook** (`frontend/src/hooks/useIPFSUpload.ts`)
   - React hook for client-side IPFS uploads
   - File validation and progress tracking
   - Upload history management

3. **Content Upload Component** (`frontend/src/components/ContentUploadInterface.tsx`)
   - Full-featured UI for content creators
   - Drag-and-drop file upload
   - Real-time progress display
   - Token gating configuration

4. **Backend API Endpoints** (`backend/routes/contentRoutes.js`)
   - `/api/content/upload-ipfs` - Enhanced IPFS upload with retry logic
   - Integration with Clarity smart contracts

## Setup Instructions

### Prerequisites

- Node.js 18+
- Pinata account (https://www.pinata.cloud/)
- Stacks wallet (Hiro Wallet or Xverse)
- Backend and frontend dependencies installed

### Environment Configuration

#### Backend Setup

1. **Create Pinata API Keys**
   - Sign up at https://www.pinata.cloud/
   - Navigate to API Keys section
   - Generate a new API key

2. **Configure Environment Variables**

Add the following to your `.env` file:

```env
# Pinata IPFS Configuration
PINATA_API_KEY=your_pinata_api_key_here
PINATA_SECRET_API_KEY=your_pinata_secret_key_here

# Optional: Custom IPFS Gateway
IPFS_GATEWAY=https://gateway.pinata.cloud

# Blockchain Configuration
STACKS_NETWORK=mainnet  # or 'testnet'
CONTRACT_ADDRESS=your_contract_address
CREATOR_PRIVATE_KEY=your_private_key
```

3. **Verify Installation**

```bash
cd backend
npm install

# Test Pinata connection
node -e "require('./services/ipfsService').verifyCredentials().then(console.log)"
```

#### Frontend Setup

1. **Install Dependencies**

```bash
cd frontend
npm install
```

2. **Configure Backend URL**

Add to your `frontend/.env.local`:

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000  # or your backend URL
```

3. **Start Development Server**

```bash
npm run dev
```

## Usage

### For Creators

#### Basic Upload Flow

1. **Navigate to Upload Interface**
   - Go to Creator Dashboard
   - Click "Upload Content"

2. **Select Files**
   - Click to select or drag-and-drop files
   - Supported formats: Images, Videos, Audio, PDF, Text (max 100MB)

3. **Fill Content Details**
   - **Title**: Content name (required)
   - **Price**: STX price for access (required)
   - **Description**: Content description
   - **Content Type**: Video, Music, Image, Document, or Article
   - **Tags**: Comma-separated keywords

4. **Configure Token Gating (Optional)**
   - Enable "Token Gating" for restricted access
   - Select token type: SIP-009 (NFT) or SIP-010 (Fungible Token)
   - Enter token contract identifier
   - Set minimum balance requirement

5. **Publish**
   - Click "Publish to IPFS"
   - Monitor upload progress
   - Wait for blockchain confirmation

6. **Confirmation**
   - Success message displayed
   - Content is now live and purchasable
   - IPFS hash stored on blockchain

### For Developers

#### Using the IPFS Service

```javascript
const { uploadFileToIPFS, getGatewayUrl, verifyCredentials } = require('./services/ipfsService');

// Verify credentials
const valid = await verifyCredentials();

// Upload a file with progress tracking
const ipfsHash = await uploadFileToIPFS(
  fileBuffer,
  'my-content.mp4',
  {
    metadata: {
      title: 'My Video',
      description: 'A great video'
    },
    tags: ['video', 'tutorial'],
    public: true
  },
  (percent) => {
    console.log(`Upload progress: ${percent}%`);
  }
);

// Get gateway URL
const gatewayUrl = getGatewayUrl(`ipfs://${ipfsHash}`);
```

#### Using the React Hook

```typescript
import { useIPFSUpload } from '@/hooks/useIPFSUpload';

export const MyComponent = () => {
  const { uploadToIPFS, progress, uploadHistory } = useIPFSUpload();

  const handleUpload = async (file: File) => {
    try {
      const ipfsUrl = await uploadToIPFS(file, {
        metadata: { title: 'My File' },
        tags: ['important']
      });
      console.log('Uploaded to:', ipfsUrl);
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  return (
    <div>
      <input 
        type="file" 
        onChange={(e) => e.target.files && handleUpload(e.target.files[0])}
      />
      {progress && <div>Progress: {progress.percentComplete}%</div>}
    </div>
  );
};
```

#### API Endpoint Usage

```bash
# Upload file with IPFS integration
curl -X POST http://localhost:5000/api/content/upload-ipfs \
  -F "file=@/path/to/file.mp4" \
  -H "Content-Type: multipart/form-data"

# Response
{
  "success": true,
  "ipfsHash": "QmXxxx...",
  "ipfsUrl": "ipfs://QmXxxx...",
  "gatewayUrl": "https://gateway.pinata.cloud/ipfs/QmXxxx...",
  "fileName": "file.mp4",
  "fileSize": 1024000,
  "contentType": "video/mp4"
}
```

## Features

### Progress Tracking

- Real-time upload progress percentage
- File size and transfer rate information
- Per-file status indicators
- Overall upload completion status

### Retry Logic

- Automatic retry on failed uploads (up to 3 attempts)
- Exponential backoff strategy
- Detailed error logging
- User-friendly error messages

### File Validation

**Supported MIME Types:**
- `image/jpeg`, `image/png`, `image/gif`, `image/webp`
- `video/mp4`, `video/webm`
- `audio/mpeg`, `audio/wav`
- `application/pdf`
- `text/plain`

**File Size Limits:**
- Single file: 100MB max
- Batch upload: Depends on system resources

**Validation Points:**
- Client-side before upload
- Server-side before processing
- Content type verification

### Token Gating

Restrict content access to holders of specific tokens:

```typescript
// SIP-009 (NFT) Example
{
  enabled: true,
  tokenType: 'sip-009',
  tokenContract: 'SP2KAF9...',
  minBalance: 1  // Must hold at least 1 NFT
}

// SIP-010 (Fungible Token) Example
{
  enabled: true,
  tokenType: 'sip-010',
  tokenContract: 'SP2KAF9...',
  minBalance: 1000  // Must hold at least 1000 tokens
}
```

### Metadata Storage

Content metadata is stored in two places:

1. **IPFS**: Complete metadata JSON file
2. **MongoDB**: Indexed metadata for fast queries
3. **Blockchain**: Content reference and pricing

Example metadata structure:
```json
{
  "title": "My Video",
  "description": "A detailed description",
  "contentType": "video",
  "creator": "ST1PQHQV0RRRNRNGZ69SCSMD3BQ5QEFJLCF695LH1",
  "tags": ["crypto", "tutorial"],
  "uploadedAt": "2024-02-09T10:30:00Z",
  "price": 10,
  "tokenGating": {
    "enabled": false
  }
}
```

## Performance Optimization

### Upload Optimization

1. **File Chunking**: Large files are uploaded in chunks for better reliability
2. **Parallel Uploads**: Multiple files can be queued (processed sequentially to avoid rate limits)
3. **Compression**: Consider pre-compressing video/audio before upload
4. **CDN Caching**: Pinata gateway provides global CDN caching

### Best Practices

1. **Prepare Content**
   - Compress video/audio appropriately
   - Optimize image resolution for intended use
   - Keep metadata descriptions concise

2. **Network Optimization**
   - Upload during off-peak hours
   - Use stable internet connection
   - Consider upload from server location for better speeds

3. **Error Handling**
   - System automatically retries failed uploads
   - Check error logs for persistent issues
   - Contact Pinata support for quota issues

## Troubleshooting

### Common Issues

#### "Failed to upload to IPFS"

**Causes:**
- Invalid Pinata credentials
- File size exceeds limit
- Network connectivity issues
- Pinata API rate limit exceeded

**Solutions:**
```bash
# 1. Verify credentials
node -e "require('./services/ipfsService').verifyCredentials()"

# 2. Check file size
ls -lh /path/to/file

# 3. Test network
curl -I https://api.pinata.cloud

# 4. Check Pinata status
# Visit https://status.pinata.cloud/
```

#### Upload Timeout

**Causes:**
- Large file size
- Slow internet connection
- Server overload

**Solutions:**
- Increase timeout in `ipfsService.js` (currently 300000ms)
- Split large files
- Retry upload during off-peak hours

#### Progress Not Updating

**Causes:**
- Browser doesn't support XMLHttpRequest progress events
- Ad-blockers interfering with requests

**Solutions:**
- Check browser console for errors
- Try in incognito/private mode
- Update browser to latest version

### Debug Mode

Enable detailed logging:

```javascript
// In backend service
process.env.DEBUG_IPFS = 'true';

// In frontend hook
console.log('Upload progress:', progress);
```

Check logs:
```bash
# Backend logs
tail -f logs/ipfs-upload.log

# Browser console (F12)
# Look for [IPFS Upload] messages
```

### Storage Status

Check Pinata account usage:

```javascript
const { getStorageUsage } = require('./services/ipfsService');
const usage = await getStorageUsage();
console.log(usage);
// { bytesUsed: 1024000, percentUsed: 0.001 }
```

## API Reference

### Backend Service Methods

#### `uploadFileToIPFS(fileBuffer, fileName, options, onProgress)`

Upload a file to IPFS with progress tracking.

**Parameters:**
- `fileBuffer` (Buffer): File content
- `fileName` (string): Original filename
- `options` (Object): Upload options
  - `maxRetries` (number): Max retry attempts (default: 3)
  - `metadata` (Object): File metadata
  - `tags` (Array): File tags
  - `public` (boolean): Make file publicly accessible (default: true)
- `onProgress` (Function): Progress callback (percentage 0-100)

**Returns:** Promise<string> - IPFS hash

**Example:**
```javascript
const hash = await uploadFileToIPFS(
  buffer,
  'video.mp4',
  { metadata: { title: 'Video' }, tags: ['video'] },
  (percent) => console.log(percent)
);
```

#### `uploadMetadataToIPFS(metadata, fileName)`

Upload JSON metadata to IPFS.

**Parameters:**
- `metadata` (Object): Metadata object
- `fileName` (string): JSON filename (default: 'metadata.json')

**Returns:** Promise<string> - IPFS URL

#### `getGatewayUrl(ipfsUrl, gateway)`

Get gateway URL from IPFS hash.

**Parameters:**
- `ipfsUrl` (string): IPFS URL or hash
- `gateway` (string): Gateway URL (default: Pinata)

**Returns:** string - Full gateway URL

#### `verifyCredentials()`

Verify Pinata API credentials.

**Returns:** Promise<boolean> - True if valid

#### `getStorageUsage()`

Get account storage usage information.

**Returns:** Promise<Object> - Usage statistics

#### `unpinFile(ipfsHash)`

Unpin (delete) a file from IPFS.

**Parameters:**
- `ipfsHash` (string): IPFS hash to unpin

**Returns:** Promise<void>

### Frontend Hook Methods

#### `useIPFSUpload()`

React hook for IPFS uploads.

**Returns:**
```typescript
{
  uploadToIPFS: (file, options) => Promise<string>,
  uploadMultiple: (files, options) => Promise<string[]>,
  progress: IPFSUploadProgress | null,
  uploadHistory: Array,
  validateFile: (file, options) => {valid, error?},
  clearProgress: () => void,
  getStatus: () => IPFSUploadProgress
}
```

### REST API Endpoints

#### POST `/api/content/upload-ipfs`

Upload file with IPFS integration.

**Request:**
```
POST /api/content/upload-ipfs
Content-Type: multipart/form-data

file: <binary>
metadata: <JSON string (optional)>
tags: <comma-separated tags (optional)>
```

**Response:**
```json
{
  "success": true,
  "ipfsHash": "QmXxxx...",
  "ipfsUrl": "ipfs://QmXxxx...",
  "gatewayUrl": "https://gateway.pinata.cloud/ipfs/QmXxxx...",
  "fileName": "file.mp4",
  "fileSize": 1024000,
  "contentType": "video/mp4"
}
```

## Security Considerations

### File Validation

1. **MIME Type Checking**: All files validated client and server-side
2. **Size Limits**: 100MB per file to prevent abuse
3. **Filename Sanitization**: Original filenames preserved but indexed safely

### API Security

1. **Pinata Credentials**: Never expose in frontend code
2. **Environment Variables**: Keep `.env` file secure and never commit to git
3. **CORS**: Backend validates origin for cross-origin requests

### Content Moderation

1. **Community Standards**: Creators must adhere to platform guidelines
2. **Reporting**: Users can report inappropriate content
3. **Removal**: Creators can remove content (triggers refunds)

## Deployment

### Production Setup

1. **Scale Considerations**
   - Pinata free tier: 1GB storage, 1000 requests/month
   - Pinata Pro: 100GB storage, unlimited requests
   - Consider dedicated IPFS node for high volume

2. **Configuration**
```env
# Production
NODE_ENV=production
STACKS_NETWORK=mainnet
LOG_LEVEL=info

# Pinata Pro account
PINATA_API_KEY=production_key
PINATA_SECRET_API_KEY=production_secret
```

3. **Monitoring**
   - Monitor Pinata API rate limits
   - Track upload success rates
   - Monitor storage usage
   - Alert on failures

4. **Backup Strategy**
   - Document all IPFS hashes in MongoDB
   - Regular exports of pinned files list
   - Blockchain provides immutable record

## Examples

### Complete Upload Example

```typescript
import { useIPFSUpload } from '@/hooks/useIPFSUpload';
import { useAuth } from '@/contexts/AuthContext';

export const UploadExample = () => {
  const { uploadToIPFS, progress } = useIPFSUpload();
  const { stxAddress } = useAuth();

  const handleUpload = async (file: File) => {
    try {
      const ipfsUrl = await uploadToIPFS(file, {
        metadata: {
          title: 'My Content',
          description: 'A great piece of content',
          creator: stxAddress
        },
        tags: ['tutorial', 'crypto']
      });

      // Save to backend
      await fetch('/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'My Content',
          ipfsUrl,
          price: 10,
          creator: stxAddress
        })
      });
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  return (
    <div>
      <input 
        type="file" 
        onChange={(e) => e.target.files && handleUpload(e.target.files[0])}
      />
      {progress && <p>Progress: {progress.percentComplete}%</p>}
    </div>
  );
};
```

## Support and Resources

- **Pinata Documentation**: https://docs.pinata.cloud/
- **IPFS Overview**: https://ipfs.io/
- **Stacks Documentation**: https://docs.stacks.co/
- **GitHub Issues**: Report bugs in repository
- **Community Forum**: Discuss features and best practices

## Version History

- **v1.0.0** (2024-02-09): Initial IPFS integration with progress tracking
  - Enhanced IPFS service with retry logic
  - Frontend upload hook with validation
  - Content upload interface component
  - Backend API endpoints
  - Comprehensive documentation

## License

This IPFS integration is part of the Stacks Content Monetization Platform and is licensed under the same terms as the main project.

---

For more information about the Stacks Content Monetization Platform, see the main [README.md](./README.md).
