# Content Encryption Implementation Guide - Issue #70

## Overview

Issue #70 implements secure AES-256-GCM encryption for paid content, ensuring that purchased content remains encrypted at rest and is only decryptable by authorized users with valid access.

## Architecture

### Encryption Scheme

**Algorithm:** AES-256-GCM (Galois/Counter Mode)
- **Key Size:** 256 bits (32 bytes)
- **IV Size:** 96 bits (12 bytes)
- **Authentication Tag:** 128 bits (16 bytes)
- **Mode:** Authenticated encryption (detects tampering)

### Security Model

```
Purchase Flow:
1. User purchases content
2. Content URL is encrypted with AES-256-GCM
3. Encrypted metadata stored in MongoDB
4. User receives encrypted content ID

Access Flow:
1. User requests content with encrypted ID
2. Server verifies purchase and access status
3. Server decrypts and returns content URL
4. Access is logged and tracked
5. Automatic cleanup of expired records
```

### Key Derivation

**Per-User, Per-Content Keys:**
```
masterKey = MASTER_ENCRYPTION_KEY (from environment)
derivedKey = HMAC-SHA256(masterKey, userId || contentId)
```

This prevents:
- Single key compromise from affecting multiple contents
- Cross-user access
- Cross-content access

### Access Control

**Access is valid when:**
- `isActive = true`
- `expiresAt > now`
- `revokedAt = null`

**Access can be:**
- **Extended:** Add time to expiration
- **Revoked:** Immediately disable access
- **Expired:** Automatically removed after 60 days

## Backend Components

### 1. Encryption Service (`backend/services/encryptionService.js`)

**Key Management:**
```javascript
// Generate random 256-bit key
const key = encryptionService.generateEncryptionKey();

// Generate random 96-bit IV
const iv = encryptionService.generateIv();

// Derive per-user-content key
const contentKey = encryptionService.generateContentKey(
  userId,
  contentId,
  masterKey
);
```

**Content Encryption:**
```javascript
// Encrypt content URL
const encrypted = await encryptionService.encryptContent(
  ContentEncryption,
  {
    contentId: '123',
    userId: userId,
    contentUrl: 'https://ipfs.io/...',
    masterKey: Buffer.from(process.env.CONTENT_ENCRYPTION_MASTER_KEY, 'hex'),
    contentType: 'video',
    expiresIn: 86400 * 30 // 30 days in seconds
  }
);
// Returns: { id, contentId, expiresAt }
```

**Content Decryption:**
```javascript
// Verify access and decrypt
const decrypted = await encryptionService.verifyAndDecryptContent(
  ContentEncryption,
  contentId,
  userId,
  masterKey
);
// Returns: { contentUrl, accessAttempts, expiresAt }
// Throws error if access invalid/expired/revoked
```

**Access Control:**
```javascript
// Revoke access immediately
await encryptionService.revokeContentAccess(ContentEncryption, contentId, userId);

// Extend expiration
await encryptionService.extendContentAccess(
  ContentEncryption,
  contentId,
  userId,
  86400 * 7 // Add 7 days
);

// Check current status
const status = await encryptionService.getContentAccessStatus(
  ContentEncryption,
  contentId,
  userId
);
// Returns: { isActive, isExpired, isRevoked, expiresAt }
```

**Batch Operations:**
```javascript
// Get all user's decrypted contents
const contents = await encryptionService.getUserDecryptedContents(
  ContentEncryption,
  userId,
  masterKey
);

// Clean up expired records (run periodically)
const result = await encryptionService.cleanupExpiredAccess(ContentEncryption);
// Returns: { modifiedCount }
```

### 2. ContentEncryption Model (`backend/models/ContentEncryption.js`)

**Schema Fields:**
- `contentId`: String (reference to content)
- `userId`: String (reference to user)
- `encryptedUrl`: String (hex-encoded encrypted data)
- `encryptionIv`: String (hex-encoded IV)
- `encryptionTag`: String (hex-encoded authentication tag)
- `isActive`: Boolean (access status)
- `expiresAt`: Date (access expiration)
- `revokedAt`: Date (revocation timestamp)
- `expiredAt`: Date (when access was marked expired)
- `accessAttempts`: Number (total access attempts)
- `failedAccessAttempts`: Number (failed attempts)
- `lastAccessedAt`: Date (last successful access)
- `purchaseTransactionId`: String (link to purchase)
- `contentType`: String (video, audio, document, etc.)
- `encryptionAlgorithm`: String (algorithm identifier)
- `encryptionVersion`: Number (for future upgrades)
- `accessTokens`: Array (temporary access tokens)
- `createdAt`, `updatedAt`: Timestamps

**Indexes:**
```javascript
// Simple indexes
{ contentId: 1 }
{ userId: 1 }

// Compound indexes for efficient queries
{ contentId: 1, userId: 1, isActive: 1 }
{ userId: 1, isActive: 1, expiresAt: 1 }
{ userId: 1, createdAt: -1 }

// TTL index (auto-delete after 60 days of expiration)
{ expiresAt: 1 }, { expireAfterSeconds: 5184000 }
```

### 3. Encryption Routes (`backend/routes/encryptionRoutes.js`)

**Endpoints:**

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/encryption/encrypt-content` | Encrypt and store content |
| POST | `/api/encryption/decrypt-content/:contentId` | Verify and decrypt content |
| GET | `/api/encryption/content-status/:contentId` | Check access status |
| GET | `/api/encryption/my-contents` | List user's contents |
| PUT | `/api/encryption/revoke-access/:contentId` | Revoke access |
| PUT | `/api/encryption/extend-access/:contentId` | Extend expiration |
| GET | `/api/encryption/key-info` | Get encryption config (admin) |
| POST | `/api/encryption/cleanup-expired` | Manual cleanup (admin) |
| GET | `/api/encryption/stats` | Get statistics (admin) |

## Frontend Components

### 1. Encryption Utilities (`frontend/src/utils/encryptionUtils.ts`)

**API Service:**
```typescript
// Encrypt content on purchase
const encrypted = await EncryptionAPIService.encryptContent(
  contentId,
  contentUrl,
  contentType,
  expiresInDays
);

// Decrypt content on access
const decrypted = await EncryptionAPIService.decryptContent(contentId);

// Get status
const status = await EncryptionAPIService.getContentStatus(contentId);

// List user's contents
const { contents, pagination } = await EncryptionAPIService.getUserContents({
  limit: 20,
  skip: 0,
  activeOnly: true
});

// Revoke access
await EncryptionAPIService.revokeAccess(contentId);

// Extend access
await EncryptionAPIService.extendAccess(contentId, additionalDays);
```

**Helper Functions:**
```typescript
// Format expiration for display
formatExpirationDate(expiresAt) // Returns: "Expires in 5 days"

// Check if access is valid
isContentAccessValid(expiresAt) // Returns: boolean

// Get status badge color
getAccessStatusColor(isActive, isExpired) // Returns: 'green', 'red', 'gray'

// Get status text
getAccessStatusText(isActive, isExpired, isRevoked) // Returns: status string
```

### 2. useEncryption Hook (`frontend/src/hooks/useEncryption.ts`)

**Hook State:**
```typescript
const { contentState, decryptContent, verifyAccess, checkStatus, revokeAccess, extendAccess, clearError, reset } = useEncryption(initialContentId);
```

**Content State:**
```typescript
{
  contentId: string;
  contentUrl?: string;
  isDecrypted: boolean;
  isLoading: boolean;
  error: null | string;
  accessStatus: {
    isActive: boolean;
    isExpired: boolean;
    isRevoked: boolean;
    expiresAt: string;
  } | null;
  accessAttempts: number;
  lastAccessedAt?: string;
}
```

**Methods:**
```typescript
// Decrypt and verify access
await decryptContent(contentId); // Returns contentUrl

// Just verify (no decryption)
const hasAccess = await verifyAccess(contentId); // Returns boolean

// Check status only
const isValid = await checkStatus(contentId); // Returns boolean

// Revoke access
await revokeAccess(contentId); // Returns boolean

// Extend expiration
await extendAccess(contentId, additionalDays); // Returns boolean

// Clear error
clearError();

// Reset state
reset();
```

### 3. EncryptedContentAccess Component (`frontend/src/components/EncryptedContentAccess.tsx`)

**Props:**
```typescript
<EncryptedContentAccess
  contentId="123"
  contentType="video"
  title="My Course Video"
  description="Exclusive training content"
  autoDecrypt={true}
  showStatus={true}
  showActions={true}
  fallbackContent={<div>Access denied</div>}
  onAccessGranted={(url) => console.log('Access granted')}
  onAccessDenied={() => console.log('Access denied')}
/>
```

**Features:**
- Automatic decryption on mount (optional)
- Loading state with spinner
- Error display with fallback content
- Renders content based on type (video, audio, image, document, download)
- Access status badge
- Extend access form
- Revoke access button
- Renew access button for expired content

### 4. usePurchaseEncryption Hook (`frontend/src/hooks/usePurchaseEncryption.ts`)

**Integration with Purchase Flow:**
```typescript
const {
  purchaseState,
  encryptPurchasedContent,
  handlePurchaseSuccess,
  handleRefund,
  handleRenewal,
  clearError
} = usePurchaseEncryption();
```

**Purchase Integration:**
```typescript
// After successful payment
const success = await handlePurchaseSuccess(
  contentId,
  contentUrl,
  contentType,
  purchaseTransactionId
);

// On refund
const refunded = await handleRefund(
  contentId,
  purchaseTransactionId
);

// On subscription renewal
const renewed = await handleRenewal(
  contentId,
  renewalDays
);
```

## Integration Patterns

### Pattern 1: Purchase Content

```typescript
// In purchase component
const { handlePurchaseSuccess } = usePurchaseEncryption();

const onPaymentSuccess = async (purchaseData) => {
  const encrypted = await handlePurchaseSuccess(
    purchaseData.contentId,
    purchaseData.contentUrl,
    purchaseData.contentType,
    purchaseData.transactionId
  );
  
  if (encrypted) {
    navigate(`/content/${purchaseData.contentId}`);
  }
};
```

### Pattern 2: Display Encrypted Content

```typescript
// In content viewer component
import EncryptedContentAccess from '../components/EncryptedContentAccess';

export const ContentViewer = ({ contentId }) => {
  return (
    <EncryptedContentAccess
      contentId={contentId}
      contentType="video"
      autoDecrypt={true}
      onAccessDenied={() => navigate('/purchase')}
    />
  );
};
```

### Pattern 3: Manual Encryption Control

```typescript
// For advanced use cases
const { contentState, decryptContent, extendAccess } = useEncryption();

const handleViewClick = async () => {
  try {
    const url = await decryptContent(contentId);
    // Use url
  } catch (error) {
    // Handle error
  }
};
```

### Pattern 4: List User's Contents

```typescript
// In library/dashboard
const fetchUserContents = async () => {
  const { contents } = await EncryptionAPIService.getUserContents({
    limit: 50,
    skip: 0,
    activeOnly: true
  });
  
  // Render contents with EncryptedContentAccess components
};
```

## Security Considerations

### 1. Master Key Management
- Store in secure environment variable or vault (AWS KMS, Azure Key Vault)
- Never commit to repository
- Rotate periodically
- Use different keys for different environments

### 2. Network Security
- Always use HTTPS for API calls
- Implement rate limiting on encryption endpoints
- Log all decryption attempts
- Monitor for suspicious patterns

### 3. Access Control
- Verify user authentication before any operation
- Check purchase status before decryption
- Track access attempts for audit
- Implement IP whitelisting if needed

### 4. Data Protection
- Encrypted URLs stored in database
- IV and auth tag included with encrypted data
- TTL index removes old records automatically
- Failed decryptions don't leak information

### 5. Key Derivation
- HMAC-SHA256 prevents key reuse
- Different key per user + content combination
- Master key never directly used for encryption
- Supports key rotation without re-encryption

## Deployment Checklist

- [ ] Set `CONTENT_ENCRYPTION_MASTER_KEY` in environment
- [ ] Create MongoDB indexes
- [ ] Set up TTL cleanup schedule (cron job)
- [ ] Configure HTTPS/TLS
- [ ] Set up rate limiting on encryption endpoints
- [ ] Enable audit logging
- [ ] Test encryption/decryption flow
- [ ] Test access verification
- [ ] Test expiration and cleanup
- [ ] Test refund revocation flow
- [ ] Test renewal extension flow
- [ ] Load test encryption service
- [ ] Set up monitoring and alerts
- [ ] Document key rotation procedure
- [ ] Configure backup strategy

## Troubleshooting

**Issue: "Master encryption key not configured"**
- Check environment variable `CONTENT_ENCRYPTION_MASTER_KEY`
- Ensure it's in hex format

**Issue: "Failed to decrypt content"**
- Verify access hasn't expired: check `expiresAt`
- Verify access hasn't been revoked: check `revokedAt`
- Verify encrypted data integrity: check auth tag

**Issue: "Access verification failed"**
- Check user authentication
- Check purchase status in database
- Verify content ownership

**Issue: Slow decryption**
- Check database query performance
- Monitor network latency
- Verify key derivation caching

## Performance Optimization

1. **Cache verification results** (5-10 minutes)
2. **Batch decrypt operations** for multiple contents
3. **Use database indexes** efficiently
4. **Implement CDN** for content distribution
5. **Monitor** encryption/decryption latency
6. **Profile** key derivation function

## Future Enhancements

- [ ] Support for key rotation
- [ ] Streaming encryption for large files
- [ ] Time-limited tokens for temporary access
- [ ] Per-device access limits
- [ ] Geographic access restrictions
- [ ] Watermarking encrypted content
- [ ] Hardware security module (HSM) integration
