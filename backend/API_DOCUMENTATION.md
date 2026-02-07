# Backend Access Control API Documentation

## Overview
The backend service acts as a gatekeeper, verifying on-chain status before delivering content. All access is verified against the Stacks blockchain.

## Base URL
```
http://localhost:5000/api
```

## Authentication
Include the Stacks address in the request header:
```
X-Stacks-Address: ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM
```

## Endpoints

### Access Verification

#### Verify Single Content Access
```http
GET /access/verify/:user/:contentId
```

**Response:**
```json
{
  "hasAccess": true,
  "reason": "purchase",
  "method": "pay-per-view"
}
```

#### Batch Verify Access
```http
POST /access/verify-batch
```

**Request Body:**
```json
{
  "user": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
  "contentIds": [1, 2, 3]
}
```

**Response:**
```json
{
  "results": [
    { "contentId": 1, "allowed": true, "reason": "purchase" },
    { "contentId": 2, "allowed": false, "reason": "no-access" },
    { "contentId": 3, "allowed": true, "reason": "subscription" }
  ]
}
```

### Content Delivery

#### Stream Content
```http
GET /delivery/:contentId/stream
Headers: X-Stacks-Address: <user-address>
```

**Response:** Binary content stream

#### Get Content Metadata
```http
GET /delivery/:contentId/metadata
```

**Response:**
```json
{
  "contentId": 1,
  "title": "Premium Video",
  "description": "Exclusive content",
  "contentType": "video",
  "price": 1000000,
  "creator": "ST1CREATOR"
}
```

#### Generate Access Token
```http
POST /delivery/:contentId/access-token
Headers: X-Stacks-Address: <user-address>
```

**Response:**
```json
{
  "token": "abc123...",
  "expiresIn": 3600,
  "contentId": 1
}
```

### Analytics

#### Get User Access History
```http
GET /analytics/user/:address?limit=50
```

**Response:**
```json
{
  "logs": [
    {
      "userAddress": "ST1USER",
      "contentId": 1,
      "accessMethod": "purchase",
      "accessGranted": true,
      "timestamp": "2024-01-01T00:00:00Z"
    }
  ],
  "count": 1
}
```

#### Get Content Access History
```http
GET /analytics/content/:contentId?limit=50
```

**Response:**
```json
{
  "logs": [...],
  "count": 10
}
```

#### Get Content Access Statistics
```http
GET /analytics/stats/:contentId
```

**Response:**
```json
{
  "contentId": 1,
  "stats": {
    "purchase": 50,
    "subscription": 30,
    "token-gating": 20
  }
}
```

## Access Methods

### 1. Creator Access
- Content creator always has full access
- No verification needed

### 2. Pay-Per-View
- Verified via `pay-per-view` contract
- Checks `has-access` function on-chain

### 3. Subscription
- Verified via `subscription` contract
- Checks `is-subscribed` function on-chain

### 4. Token Gating
- Verified via `content-gate` contract
- Supports SIP-009 (NFT) and SIP-010 (FT)
- Checks token ownership/balance

## Error Codes

| Code | Message | Description |
|------|---------|-------------|
| 401 | Authentication required | No Stacks address provided |
| 403 | Access denied | User doesn't have access |
| 404 | Content not found | Content doesn't exist |
| 429 | Rate limit exceeded | Too many requests |
| 500 | Internal server error | Server error |

## Rate Limiting
- 100 requests per minute per user
- Applies to content delivery endpoints

## Security Features

1. **On-chain Verification**: All access verified against blockchain
2. **Access Logging**: Complete audit trail
3. **Rate Limiting**: Prevents abuse
4. **Token-based Access**: Temporary access tokens
5. **IP Tracking**: Monitor access patterns

## Example Usage

### JavaScript/Node.js
```javascript
const axios = require('axios');

async function verifyAccess(userAddress, contentId) {
  const response = await axios.get(
    `http://localhost:5000/api/access/verify/${userAddress}/${contentId}`
  );
  return response.data.hasAccess;
}

async function streamContent(userAddress, contentId) {
  const response = await axios.get(
    `http://localhost:5000/api/delivery/${contentId}/stream`,
    {
      headers: { 'X-Stacks-Address': userAddress },
      responseType: 'arraybuffer'
    }
  );
  return response.data;
}
```

### cURL
```bash
# Verify access
curl http://localhost:5000/api/access/verify/ST1USER/1

# Stream content
curl -H "X-Stacks-Address: ST1USER" \
  http://localhost:5000/api/delivery/1/stream \
  --output content.mp4
```

## Environment Variables

```env
STACKS_NETWORK=testnet
CONTRACT_ADDRESS=ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM
MONGODB_URI=mongodb://localhost:27017/stacks_monetization
PINATA_API_KEY=your_key
PINATA_SECRET_API_KEY=your_secret
```

## Testing

Run tests:
```bash
npm test
```

Run with coverage:
```bash
npm run test
```

## Deployment

1. Set environment variables
2. Install dependencies: `npm install`
3. Start server: `npm start`
4. Server runs on port 5000

## Support

For issues or questions, please open an issue on GitHub.
