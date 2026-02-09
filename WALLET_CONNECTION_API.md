# Wallet Connection - API Reference

## Base URL
```
http://localhost:5000/api/wallet
```

## Authentication
Sessions are passed via:
- Header: `X-Session-Id: sess_...`
- Cookie: `sessionId=sess_...`

## Endpoints

### 1. POST /connection-request
**Get a nonce and challenge for wallet to sign**

**Request:**
```json
{
  "network": "mainnet" // optional, default: mainnet
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "nonce": "abc123def456...",
    "timestamp": 1705315200000,
    "message": "Sign to connect your wallet\n\nNonce: abc123def456\nTimestamp: 1705315200000",
    "network": "mainnet"
  },
  "message": "Connection request created. Sign the message with your wallet."
}
```

**Error (400):**
```json
{
  "success": false,
  "error": "Invalid network"
}
```

---

### 2. POST /connect
**Connect wallet with signature verification**

**Request:**
```json
{
  "address": "SP2ZNGJ85ENDY6QTHQ4P3KCQJRNYWB43HCUB7QY0J",
  "walletType": "hiro",
  "publicKey": "0x1234567890abcdef...",
  "signature": "0xsignature...",
  "nonce": "abc123def456..."
}
```

**Headers:**
```
X-Network: mainnet (optional)
X-Browser: Chrome
X-OS: Windows
X-App-Version: 1.0.0
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "address": "sp2zngj85endy6qthq4p3kcqjrnywb43hcub7qy0j",
    "walletType": "hiro",
    "network": "mainnet",
    "connectedAt": "2024-01-15T10:30:00Z",
    "message": "hiro wallet connected successfully"
  },
  "message": "Wallet connected successfully"
}
```

**Error (400):**
```json
{
  "success": false,
  "error": "Missing required fields: address, publicKey, signature"
}
```

---

### 3. POST /authenticate
**Create authenticated session after wallet connection**

**Request:**
```json
{
  "address": "SP2ZNGJ85ENDY6QTHQ4P3KCQJRNYWB43HCUB7QY0J",
  "walletType": "hiro",
  "publicKey": "0x1234567890abcdef...",
  "sessionDurationHours": 24 // optional, default: 24
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "sessionId": "sess_abc123def456789...",
    "address": "sp2zngj85endy6qthq4p3kcqjrnywb43hcub7qy0j",
    "walletType": "hiro",
    "expiresAt": "2024-01-16T10:30:00Z",
    "expiresIn": 86400,
    "message": "Session created successfully"
  },
  "message": "Session created successfully"
}
```

**Cookies Set:**
```
Set-Cookie: sessionId=sess_...; HttpOnly; Secure; SameSite=Strict
```

**Error (400):**
```json
{
  "success": false,
  "error": "Wallet not connected. Please connect wallet first"
}
```

---

### 4. GET /me
**Get current authenticated wallet information**

**Authentication:** Required
**Headers:**
```
X-Session-Id: sess_...
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "address": "sp2zngj85endy6qthq4p3kcqjrnywb43hcub7qy0j",
    "walletType": "hiro",
    "isConnected": true,
    "connectedAt": "2024-01-15T10:30:00Z",
    "lastVerifiedAt": "2024-01-15T10:30:00Z",
    "lastAuthenticatedAt": "2024-01-15T10:35:00Z",
    "network": "mainnet",
    "displayName": "John Doe",
    "profile": {
      "avatar": "https://example.com/avatar.jpg",
      "username": "johndoe",
      "bio": "Web3 enthusiast"
    }
  },
  "message": "Wallet information retrieved"
}
```

**Error (401):**
```json
{
  "success": false,
  "error": "No session ID provided"
}
```

---

### 5. GET /:address
**Get wallet connection details (public or authenticated)**

**Parameters:**
- `address` (required): Wallet address
- `walletType` (optional query): Filter by wallet type (hiro/xverse)

**Authentication:** Optional

**Response (200):**
```json
{
  "success": true,
  "data": {
    "address": "sp2zngj85endy6qthq4p3kcqjrnywb43hcub7qy0j",
    "walletType": "hiro",
    "network": "mainnet",
    "displayName": "John Doe"
    // Additional fields only if authenticated as owner:
    // "isConnected": true,
    // "connectedAt": "2024-01-15T10:30:00Z",
    // "lastVerifiedAt": "2024-01-15T10:30:00Z"
  },
  "message": "Wallet information retrieved"
}
```

**Error (404):**
```json
{
  "success": false,
  "error": "Wallet not found"
}
```

---

### 6. GET /wallets/all
**Get all connected wallets for authenticated user**

**Authentication:** Required
**Headers:**
```
X-Session-Id: sess_...
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "address": "sp2zngj85endy6qthq4p3kcqjrnywb43hcub7qy0j",
    "connectedWallets": [
      {
        "address": "sp2zngj85endy6qthq4p3kcqjrnywb43hcub7qy0j",
        "walletType": "hiro",
        "connectedAt": "2024-01-15T10:30:00Z",
        "network": "mainnet",
        "displayName": "Main Wallet"
      },
      {
        "address": "sp2zngj85endy6qthq4p3kcqjrnywb43hcub7qy0j",
        "walletType": "xverse",
        "connectedAt": "2024-01-14T15:20:00Z",
        "network": "testnet",
        "displayName": "Test Wallet"
      }
    ],
    "totalConnected": 2
  },
  "message": "Connected wallets retrieved"
}
```

---

### 7. POST /disconnect
**Disconnect a wallet**

**Request:**
```json
{
  "address": "SP2ZNGJ85ENDY6QTHQ4P3KCQJRNYWB43HCUB7QY0J",
  "walletType": "hiro",
  "reason": "No longer using this wallet" // optional
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "hiro wallet disconnected successfully"
  },
  "message": "hiro wallet disconnected successfully"
}
```

**Error (400):**
```json
{
  "success": false,
  "error": "Missing required field: address"
}
```

---

### 8. POST /disconnect/:address
**Disconnect authenticated wallet**

**Parameters:**
- `address` (required): Wallet address

**Authentication:** Required
**Headers:**
```
X-Session-Id: sess_...
```

**Request:**
```json
{
  "reason": "Switching to new wallet" // optional
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "hiro wallet disconnected successfully"
  },
  "message": "hiro wallet disconnected successfully"
}
```

**Error (403):**
```json
{
  "success": false,
  "error": "You can only disconnect your own wallet"
}
```

---

### 9. POST /logout
**Logout / revoke current session**

**Authentication:** Required
**Headers:**
```
X-Session-Id: sess_...
```

**Request:** (empty body)
```json
{}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "Session revoked successfully"
  },
  "message": "Logged out successfully"
}
```

**Cookies Cleared:**
```
Set-Cookie: sessionId=; Expires=Thu, 01 Jan 1970 00:00:00 GMT
```

---

### 10. PUT /profile
**Update wallet profile**

**Authentication:** Required
**Headers:**
```
X-Session-Id: sess_...
```

**Request:**
```json
{
  "displayName": "John Doe",
  "avatar": "https://example.com/avatar.jpg",
  "username": "johndoe",
  "bio": "Web3 developer"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "success": true,
    "profile": {
      "avatar": "https://example.com/avatar.jpg",
      "username": "johndoe",
      "bio": "Web3 developer"
    },
    "displayName": "John Doe",
    "message": "Profile updated successfully"
  },
  "message": "Profile updated successfully"
}
```

**Error (400):**
```json
{
  "success": false,
  "error": "Wallet connection not found"
}
```

---

### 11. GET /verify/:sessionId
**Verify session validity (no authentication required)**

**Parameters:**
- `sessionId` (required): Session ID to verify

**Response (200):**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "address": "sp2zngj85endy6qthq4p3kcqjrnywb43hcub7qy0j",
    "walletType": "hiro",
    "expiresAt": "2024-01-16T10:30:00Z"
  },
  "message": "Session is valid"
}
```

**Expired Session (200):**
```json
{
  "success": false,
  "data": {
    "valid": false,
    "reason": "Session expired"
  },
  "message": "Session is invalid"
}
```

---

## Common Headers

### Request Headers
```
X-Session-Id: sess_...              // Session token
X-Wallet-Address: SP...             // Wallet address
X-Network: mainnet|testnet|devnet   // Network selection
X-Browser: Chrome|Firefox|Safari    // Browser info
X-OS: Windows|macOS|Linux           // OS info
X-App-Version: 1.0.0                // App version
```

### Response Headers
```
X-Session-Expires-Soon: true        // Warning if expiring <30 min
X-Session-Expires-In: 3600          // Seconds until expiration
```

---

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (auth required) |
| 403 | Forbidden (ownership check failed) |
| 404 | Not Found |
| 500 | Server Error |

---

## Error Response Format

All errors follow this format:

```json
{
  "success": false,
  "error": "Error description"
}
```

---

## Rate Limiting

Recommended rate limits:
- Connection requests: 10/minute
- Authentication: 5/minute
- General API: 100/minute

---

## Wallet Types

Supported wallet types:
- `hiro` - Hiro Wallet
- `xverse` - Xverse Wallet

---

## Networks

Supported networks:
- `mainnet` - Production Stacks blockchain
- `testnet` - Stacks testnet
- `devnet` - Local development network

---

## Session Duration

Default: 24 hours
Min: 1 hour
Max: 365 days

---

## Example Workflows

### Complete Login Flow
```
1. POST /connection-request
   ← Get nonce

2. User signs in wallet app
   ← Get signature

3. POST /connect
   ← Wallet connected

4. POST /authenticate
   ← Get session ID

5. GET /me
   Headers: X-Session-Id
   ← Verify authenticated
```

### Wallet Switching
```
1. GET /wallets/all
   ← List connected wallets

2. POST /disconnect (old wallet)
   ← Remove old wallet

3. Repeat login flow for new wallet
```

### Profile Update
```
1. Verify authenticated
   GET /me

2. PUT /profile
   ← Update profile

3. GET /me
   ← Verify changes
```
