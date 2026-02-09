# Wallet Connection - Security and Validation Guide

## Security Architecture

```
┌─────────────────────────────────────────────────────────┐
│ User/Frontend                                           │
│ - Wallet extension handles cryptographic operations    │
│ - Never exposes private keys                           │
│ - Signs challenges with private key                    │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ Network (HTTPS)                                         │
│ - All communication encrypted in production             │
│ - TLS 1.3 or higher                                     │
│ - Certificate pinning recommended                      │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ API Layer                                               │
│ - Validates incoming signatures                        │
│ - Rate limiting on auth endpoints                      │
│ - CORS whitelist enforcement                           │
│ - CSRF token validation                                │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ Session Layer                                           │
│ - Secure session token generation (32 bytes entropy)   │
│ - HttpOnly cookies prevent XSS access                  │
│ - Secure flag prevents HTTP transmission               │
│ - SameSite=Strict prevents CSRF                        │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ Database Layer                                          │
│ - No passwords stored                                  │
│ - Public keys stored for verification                 │
│ - Session tokens hashed in production                  │
│ - Indexed for fast lookups                             │
└─────────────────────────────────────────────────────────┘
```

## Signature Verification

### Challenge Message Format
```
Sign to connect your wallet

Nonce: <32-byte hex nonce>
Timestamp: <unix timestamp>
```

### Verification Steps
1. ✅ Check nonce is present and matches request
2. ✅ Check timestamp is recent (within 5 minutes)
3. ✅ Verify signature cryptographically
4. ✅ Validate public key matches wallet address
5. ✅ Confirm wallet is not already connected with different key

### Implementation
```javascript
// In production, implement full signature verification
async function verifySignature(message, signature, publicKey) {
  // Use @stacks/transactions for verification
  const { publicKeyFromSignature } = require('@stacks/transactions');
  
  const recoveredPublicKey = publicKeyFromSignature(
    message,
    signature
  );
  
  return recoveredPublicKey === publicKey;
}
```

## Nonce Security

### Nonce Generation
```javascript
const crypto = require('crypto');

function generateNonce() {
  // 32 bytes = 64 hex characters
  return crypto.randomBytes(32).toString('hex');
}
```

### Nonce Properties
- **Size:** 32 bytes (256 bits entropy)
- **Uniqueness:** Cryptographically random
- **Single-use:** Validated once, discarded
- **Expiration:** 5 minutes default
- **Storage:** Not persisted long-term

### Nonce Validation
```javascript
// Check nonce hasn't been used
if (await isNonceUsed(nonce)) {
  throw new Error('Nonce has already been used');
}

// Check nonce is recent
const nonce Timestamp = new Date(parseInt(nonce.timestamp) * 1000);
if (Date.now() - nonceTimestamp > 5 * 60 * 1000) {
  throw new Error('Nonce expired');
}
```

## Session Security

### Session Token Generation
```javascript
const crypto = require('crypto');

function generateSessionId() {
  // 16 bytes = secure session identifier
  return `sess_${crypto.randomBytes(16).toString('hex')}`;
}
```

### Session Token Storage
```javascript
// Frontend: HttpOnly cookie (can't be accessed via JavaScript)
Set-Cookie: sessionId=sess_...; 
  HttpOnly;           // Prevents XSS theft
  Secure;             // HTTPS only
  SameSite=Strict;    // Prevents CSRF
  Max-Age=86400;      // 24 hours
  Path=/api;          // Limited to API paths

// Frontend: localStorage (fallback, vulnerable to XSS)
localStorage.setItem('sessionId', sessionId);
// Use only if strict CSP headers are in place
```

### Session Expiration
```javascript
// Default: 24 hours
// Configurable: 1 hour to 365 days
// Warning threshold: 30 minutes before expiration

// Automatic cleanup: Hourly job removes expired sessions
async function cleanupExpiredSessions() {
  const result = await WalletSession.updateMany(
    {
      status: 'active',
      expiresAt: { $lt: new Date() }
    },
    { status: 'expired' }
  );
  
  return result.modifiedCount;
}
```

## Input Validation

### Address Validation
```javascript
function validateStacksAddress(address) {
  // Stacks addresses start with 'SP' (mainnet) or 'ST' (testnet)
  const addressRegex = /^(SP|ST)[A-Z0-9]{32,}$/i;
  return addressRegex.test(address);
}

// Usage
if (!validateStacksAddress(req.body.address)) {
  return res.status(400).json({ error: 'Invalid address format' });
}
```

### Public Key Validation
```javascript
function validatePublicKey(publicKey) {
  // Public key should be hex string, 66 characters (33 bytes * 2)
  const pubkeyRegex = /^0x[0-9a-f]{66}$/i;
  return pubkeyRegex.test(publicKey);
}
```

### Wallet Type Validation
```javascript
const VALID_WALLET_TYPES = ['hiro', 'xverse'];

if (!VALID_WALLET_TYPES.includes(walletType.toLowerCase())) {
  return res.status(400).json({ error: 'Invalid wallet type' });
}
```

### Network Validation
```javascript
const VALID_NETWORKS = ['mainnet', 'testnet', 'devnet'];

if (!VALID_NETWORKS.includes(network.toLowerCase())) {
  return res.status(400).json({ error: 'Invalid network' });
}
```

## Rate Limiting

### Recommended Limits
```javascript
// Per IP address
const ipLimiter = rateLimit({
  windowMs: 60 * 1000,        // 1 minute
  max: 20,                    // 20 requests per minute
  keyGenerator: (req) => req.ip
});

// Per wallet address
const walletLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,   // 1 hour
  max: 10,                    // 10 connection attempts per hour
  keyGenerator: (req) => req.body.address
});

// Authentication endpoint
app.post('/authenticate', walletLimiter, async (req, res) => {
  // ...
});

// Connection endpoint
app.post('/connect', ipLimiter, async (req, res) => {
  // ...
});
```

## CORS Configuration

### Allowed Origins
```javascript
const cors = require('cors');

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://example.com', 'https://app.example.com']
    : 'http://localhost:3000',
  credentials: true,          // Allow credentials
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'X-Session-Id', 'X-Network']
}));
```

## CSRF Protection

### Token-based CSRF
```javascript
const csrf = require('csurf');
const cookieParser = require('cookie-parser');

app.use(cookieParser());
app.use(csrf({ cookie: true }));

// Include CSRF token in all state-changing requests
app.post('/api/wallet/disconnect', csrf(), async (req, res) => {
  // Token validated by middleware
  // ...
});
```

### SameSite Cookies
```javascript
// Prevent CSRF attacks
res.cookie('sessionId', sessionId, {
  sameSite: 'strict'  // Only send with same-site requests
});
```

## XSS Prevention

### Content Security Policy (CSP)
```javascript
// Prevent inline scripts and restrict script sources
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' https://trusted-cdn.com; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' https:; " +
    "connect-src 'self' https://api.hiro.so https://api.xverse.com"
  );
  next();
});
```

### Input Sanitization
```javascript
const xss = require('xss');

function sanitizeInput(input) {
  return xss(input, {
    whiteList: {},
    stripIgnoredTag: true
  });
}

// Usage
const displayName = sanitizeInput(req.body.displayName);
```

### Output Encoding
```javascript
// Always encode outputs in responses
app.get('/api/wallet/me', verifyWalletAuth, (req, res) => {
  const safeData = {
    address: req.walletAddress,  // Safe - no user input
    displayName: escapeHtml(req.walletData.displayName)  // Escape
  };
  res.json(safeData);
});

function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
```

## Authentication State Validation

### Wallet Connection Checks
```javascript
async function validateWalletConnection(address, walletType) {
  const connection = await WalletConnection.findOne({
    address: address.toLowerCase(),
    walletType,
    isConnected: true
  });
  
  if (!connection) {
    throw new Error('Wallet not connected or disconnected');
  }
  
  return connection;
}
```

### Session Validity Checks
```javascript
async function validateSession(sessionId) {
  const session = await WalletSession.findOne({ sessionId });
  
  if (!session) {
    throw new Error('Session not found');
  }
  
  if (session.status !== 'active') {
    throw new Error('Session is not active');
  }
  
  if (new Date() > session.expiresAt) {
    session.status = 'expired';
    await session.save();
    throw new Error('Session expired');
  }
  
  return session;
}
```

### Ownership Verification
```javascript
function verifyOwnership(requestAddress, resourceAddress) {
  if (requestAddress.toLowerCase() !== resourceAddress.toLowerCase()) {
    throw new Error('Access denied - ownership mismatch');
  }
}
```

## Data Privacy

### What's Stored
```javascript
// Permanently stored (necessary)
- address (lowercase)
- walletType (hiro/xverse)
- publicKey (needed for verification)
- connectedAt, lastVerifiedAt (audit trail)

// Temporary storage (cleared on disconnect)
- sessionId (cleared when session expires)
- sessionMetadata (cleared daily)

// Never stored
- Private keys
- Wallet mnemonics
- Signatures (after verification)
```

### GDPR Compliance

```javascript
// Right to be forgotten
async function deleteUserData(address) {
  // Remove wallet connection
  await WalletConnection.deleteOne({
    address: address.toLowerCase()
  });
  
  // Remove sessions
  await WalletSession.deleteMany({
    address: address.toLowerCase()
  });
  
  // Remove from user database
  await User.deleteOne({ address: address.toLowerCase() });
}

// Data export
async function exportUserData(address) {
  const connection = await WalletConnection.findOne({
    address: address.toLowerCase()
  });
  
  return {
    connection: connection.toObject(),
    exportDate: new Date(),
    note: 'This is your personal data export'
  };
}
```

## Logging and Monitoring

### Audit Logging
```javascript
async function logAuthEvent(event, address, walletType, status) {
  const log = new AuthenticationLog({
    event,              // 'connect', 'disconnect', 'authenticate'
    address,
    walletType,
    status,             // 'success', 'failure'
    timestamp: new Date(),
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  });
  
  await log.save();
}

// Usage
await logAuthEvent('authenticate', address, walletType, 'success');
```

### Security Alerts
```javascript
// Monitor suspicious activity
async function checkSuspiciousActivity(address) {
  const failedAttempts = await WalletSession.countDocuments({
    address,
    status: 'failed',
    createdAt: { $gte: new Date(Date.now() - 3600000) }
  });
  
  if (failedAttempts > 5) {
    // Alert security team
    alertSecurityTeam({
      issue: 'Multiple failed authentication attempts',
      address,
      attempts: failedAttempts
    });
  }
}
```

## Production Checklist

- ✅ HTTPS enabled (TLS 1.3+)
- ✅ Rate limiting configured
- ✅ CORS properly restricted
- ✅ CSRF protection enabled
- ✅ CSP headers set
- ✅ Input validation comprehensive
- ✅ Session tokens secure
- ✅ Cookies: HttpOnly, Secure, SameSite
- ✅ Nonce validation implemented
- ✅ Signature verification enabled
- ✅ Audit logging in place
- ✅ Database encryption at rest
- ✅ Secrets management configured
- ✅ Error messages don't leak info
- ✅ Security headers configured

## Incident Response

### Session Compromise
```javascript
async function handleCompromisedSession(sessionId) {
  // Revoke session
  await WalletSession.updateOne(
    { sessionId },
    { status: 'revoked', revocationReason: 'Compromised' }
  );
  
  // Alert user
  notifyUser('Your session has been revoked. Please login again.');
  
  // Log incident
  logSecurityIncident('session_compromise', sessionId);
}
```

### Wallet Compromise
```javascript
async function handleCompromisedWallet(address, walletType) {
  // Disconnect wallet
  await disconnectWallet(address, walletType, 'Compromised wallet');
  
  // Revoke all sessions
  await WalletSession.updateMany(
    { address, walletType, status: 'active' },
    { status: 'revoked', revocationReason: 'Wallet compromised' }
  );
  
  // Alert user
  notifyUser('Possible wallet compromise detected. Please review recent activity.');
  
  // Log incident
  logSecurityIncident('wallet_compromise', address);
}
```

## Testing Security

### Test Cases
1. ✅ Invalid signature rejection
2. ✅ Expired nonce rejection
3. ✅ Replay attack prevention
4. ✅ Session expiration enforcement
5. ✅ Rate limiting effectiveness
6. ✅ CORS validation
7. ✅ XSS payload blocking
8. ✅ CSRF token validation
9. ✅ Unauthorized access blocking
10. ✅ Proper error messages

### Penetration Testing
Recommend third-party security audit for production deployment.
