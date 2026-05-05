# Content Encryption Quick Start - Issue #70

## 5-Minute Setup

### Prerequisites
- Node.js 16+
- MongoDB 4.4+
- React 17+
- Backend API running

### Step 1: Environment Configuration

Add to `.env`:
```
CONTENT_ENCRYPTION_MASTER_KEY=your_256bit_hex_key_here
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 2: Register Routes

In `backend/index.js`:
```javascript
const encryptionRoutes = require('./routes/encryptionRoutes');
app.use('/api/encryption', encryptionRoutes);
```

### Step 3: Import in Frontend

```typescript
import { useEncryption } from './hooks/useEncryption';
import { EncryptedContentAccess } from './components/EncryptedContentAccess';
```

## Common Patterns

### Pattern 1: Auto-Decrypt on Page Load

```typescript
import EncryptedContentAccess from '../components/EncryptedContentAccess';

export const ContentPage = ({ contentId }) => {
  return (
    <EncryptedContentAccess
      contentId={contentId}
      contentType="video"
      title="My Secure Content"
      autoDecrypt={true}
    />
  );
};
```

### Pattern 2: Manual Decryption with Button

```typescript
import { useEncryption } from '../hooks/useEncryption';

export const VideoViewer = ({ contentId }) => {
  const { contentState, decryptContent } = useEncryption();

  return (
    <div>
      {!contentState.isDecrypted ? (
        <button onClick={() => decryptContent(contentId)}>
          Unlock Content
        </button>
      ) : (
        <video src={contentState.contentUrl} controls />
      )}
    </div>
  );
};
```

### Pattern 3: Handle Purchase Completion

```typescript
import { usePurchaseEncryption } from '../hooks/usePurchaseEncryption';

export const PurchaseFlow = ({ contentId, contentUrl, contentType }) => {
  const { handlePurchaseSuccess } = usePurchaseEncryption();

  const onPaymentSuccess = async (transaction) => {
    const success = await handlePurchaseSuccess(
      contentId,
      contentUrl,
      contentType,
      transaction.id
    );
    
    if (success) {
      // Navigate to content viewer
      navigate(`/view/${contentId}`);
    }
  };

  return <PaymentComponent onSuccess={onPaymentSuccess} />;
};
```

### Pattern 4: List User's Purchased Content

```typescript
import { useEffect, useState } from 'react';
import { EncryptionAPIService } from '../utils/encryptionUtils';

export const LibraryPage = () => {
  const [contents, setContents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContents = async () => {
      try {
        const { contents } = await EncryptionAPIService.getUserContents({
          limit: 50,
          activeOnly: true
        });
        setContents(contents);
      } catch (error) {
        console.error('Failed to fetch contents:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchContents();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="grid grid-cols-3 gap-4">
      {contents.map((content) => (
        <ContentCard key={content._id} content={content} />
      ))}
    </div>
  );
};
```

### Pattern 5: Extend Access Before Expiration

```typescript
import { useEncryption } from '../hooks/useEncryption';

export const ContentExpirationWarning = ({ contentId }) => {
  const { contentState, extendAccess } = useEncryption();

  if (!contentState.accessStatus) return null;

  const daysRemaining = Math.floor(
    (new Date(contentState.accessStatus.expiresAt).getTime() - Date.now()) /
      (1000 * 60 * 60 * 24)
  );

  if (daysRemaining > 7) return null;

  return (
    <div className="bg-yellow-50 border border-yellow-300 rounded p-4">
      <p>Your access expires in {daysRemaining} days</p>
      <button
        onClick={() => extendAccess(contentId, 30)}
        className="bg-yellow-600 text-white px-4 py-2 rounded mt-2"
      >
        Extend for 30 Days
      </button>
    </div>
  );
};
```

### Pattern 6: Handle Access Denied

```typescript
export const SecureContent = ({ contentId }) => {
  return (
    <EncryptedContentAccess
      contentId={contentId}
      contentType="video"
      onAccessDenied={() => (
        <div className="text-center p-8">
          <h2>Access Denied or Expired</h2>
          <p>You need to purchase this content to view it</p>
          <Link to="/purchase" className="btn btn-primary">
            Purchase Now
          </Link>
        </div>
      )}
    />
  );
};
```

## API Reference

### Encrypt Content

```bash
curl -X POST http://localhost:5000/api/encryption/encrypt-content \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d {
    "contentId": "123",
    "contentUrl": "https://ipfs.io/...",
    "contentType": "video",
    "expiresIn": 2592000
  }
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "encrypted_id_123",
    "contentId": "123",
    "expiresAt": "2024-01-01T00:00:00Z"
  }
}
```

### Decrypt Content

```bash
curl -X POST http://localhost:5000/api/encryption/decrypt-content/123 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

Response:
```json
{
  "success": true,
  "data": {
    "contentUrl": "https://ipfs.io/...",
    "accessAttempts": 5,
    "expiresAt": "2024-01-01T00:00:00Z"
  }
}
```

### Get Content Status

```bash
curl http://localhost:5000/api/encryption/content-status/123 \
  -H "Authorization: Bearer $TOKEN"
```

Response:
```json
{
  "success": true,
  "data": {
    "isActive": true,
    "isExpired": false,
    "isRevoked": false,
    "expiresAt": "2024-01-01T00:00:00Z"
  }
}
```

### List User's Contents

```bash
curl "http://localhost:5000/api/encryption/my-contents?limit=20&skip=0&activeOnly=true" \
  -H "Authorization: Bearer $TOKEN"
```

Response:
```json
{
  "success": true,
  "data": {
    "contents": [...],
    "pagination": {
      "total": 50,
      "limit": 20,
      "skip": 0
    }
  }
}
```

### Extend Access

```bash
curl -X PUT http://localhost:5000/api/encryption/extend-access/123 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d {
    "additionalSeconds": 2592000
  }
```

### Revoke Access

```bash
curl -X PUT http://localhost:5000/api/encryption/revoke-access/123 \
  -H "Authorization: Bearer $TOKEN"
```

## Hook API Reference

### useEncryption

```typescript
const {
  contentState,      // Current encryption state
  decryptContent,    // Decrypt content URL
  verifyAccess,      // Verify access only
  checkStatus,       // Check access status
  revokeAccess,      // Revoke access
  extendAccess,      // Extend expiration
  clearError,        // Clear error message
  reset              // Reset state
} = useEncryption(contentId);
```

### usePurchaseEncryption

```typescript
const {
  purchaseState,           // Purchase encryption state
  encryptPurchasedContent, // Encrypt content
  handlePurchaseSuccess,   // Handle payment success
  handleRefund,            // Handle refund
  handleRenewal,           // Handle subscription renewal
  clearError               // Clear error message
} = usePurchaseEncryption();
```

## Component API Reference

### EncryptedContentAccess

```typescript
<EncryptedContentAccess
  contentId="123"                    // Required: Content identifier
  contentType="video"                // Required: video|audio|document|image|other
  title="My Course"                  // Optional: Display title
  description="Description"          // Optional: Display description
  fallbackContent={<div>...</div>}   // Optional: Show when access denied
  onAccessGranted={(url) => {}}      // Optional: Called when decrypted
  onAccessDenied={() => {}}          // Optional: Called when denied
  autoDecrypt={true}                 // Optional: Auto-decrypt on mount
  showStatus={true}                  // Optional: Show access status badge
  showActions={true}                 // Optional: Show extend/revoke buttons
/>
```

## Utility Functions

```typescript
import {
  formatExpirationDate,    // Returns "Expires in 5 days"
  isContentAccessValid,    // Returns boolean
  getAccessStatusColor,    // Returns 'green'|'red'|'gray'
  getAccessStatusText,     // Returns status string
  EncryptionAPIService     // API methods
} from '../utils/encryptionUtils';
```

## Error Handling

```typescript
const { contentState } = useEncryption();

// Handle errors
if (contentState.error) {
  console.error('Encryption error:', contentState.error);
  // Show error to user
}

// Common errors:
// - "Access has expired"
// - "Access has been revoked"
// - "Content not found"
// - "User not authenticated"
```

## Testing

### Test Encryption
```typescript
it('should encrypt and decrypt content', async () => {
  const encrypted = await EncryptionAPIService.encryptContent(
    'test-id',
    'https://test.com',
    'video',
    30
  );

  expect(encrypted.id).toBeDefined();
  expect(encrypted.expiresAt).toBeDefined();
});
```

### Test Access Control
```typescript
it('should deny access to expired content', async () => {
  await expect(
    decryptContent('expired-id')
  ).rejects.toThrow('Access has expired');
});
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Master key not configured" | Set `CONTENT_ENCRYPTION_MASTER_KEY` in env |
| "Failed to decrypt" | Check if content expired or revoked |
| "Access denied" | Verify user owns the content |
| Slow performance | Check database indexes exist |
| Decryption fails | Verify encryption key matches |

## Best Practices

1. **Always use HTTPS** for API calls
2. **Don't expose content URLs** in error messages
3. **Implement rate limiting** on encryption endpoints
4. **Log all access attempts** for audit trail
5. **Rotate encryption keys** periodically
6. **Test expiration flow** before production
7. **Monitor TTL cleanup** job
8. **Back up encryption keys** securely
9. **Use environment variables** for keys
10. **Implement access refresh** tokens

## Performance Tips

- Cache verification results (5-10 minutes)
- Use database indexes for user/content queries
- Batch decrypt operations when possible
- Implement lazy decryption (decrypt on demand)
- Use CDN for content distribution
- Monitor key derivation performance

## Next Steps

1. Set environment variables
2. Register routes in main app
3. Import components in frontend
4. Test encryption flow
5. Monitor in production
6. Set up automated cleanup job
