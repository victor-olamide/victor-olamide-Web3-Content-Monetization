# Wallet Connection - Troubleshooting Guide

## Common Issues and Solutions

### Authentication Issues

#### Problem: "Session Token Invalid" / 401 Errors

**Symptoms:**
- API endpoints return 401 Unauthorized
- Users unable to stay logged in
- Session validation fails

**Diagnosis Steps:**

```bash
# Check if sessionId exists in request
curl -v http://localhost:5000/api/wallet/me

# Check session in database
db.wallet_sessions.findOne({ sessionId: 'sess_xxx' })

# Check session status
db.wallet_sessions.findOne({ sessionId: 'sess_xxx' }, { status: 1, expiresAt: 1 })
```

**Common Causes & Solutions:**

| Cause | Solution |
|-------|----------|
| Session expired | User needs to reconnect wallet |
| SessionId not in request | Add header: `X-Session-ID: sess_xxx` |
| Session revoked | Check revocation logs for reason |
| Clock skew between client/server | Sync system clocks, check `expiresAt` |
| Database down | Check MongoDB connection status |
| Session TTL index removed it | Verify TTL index still exists |

**Verification:**

```javascript
// Check session validity
async function debugSession(sessionId) {
  const session = await WalletSession.findOne({ sessionId });
  
  if (!session) {
    console.log('Session not found in database');
    return;
  }
  
  console.log('Session found:', {
    sessionId: session.sessionId,
    address: session.address,
    status: session.status,
    expiresAt: session.expiresAt,
    isExpired: session.expiresAt < new Date(),
    createdAt: session.createdAt,
    ageMinutes: (Date.now() - session.createdAt) / 60000
  });
}
```

---

#### Problem: "Invalid Signature" / Signature Verification Fails

**Symptoms:**
- Connection fails at signature verification step
- User can sign message but connection rejected
- Error: "Signature verification failed"

**Root Causes:**

1. **Message Format Mismatch**
   ```javascript
   // Wrong - message changed between signing and verification
   const originalMessage = "Sign this: " + nonce;
   // ... later ...
   const verifyMessage = "Sign this message: " + nonce;  // DIFFERENT!
   ```

2. **Nonce Reuse**
   ```javascript
   // Issue: Nonce used multiple times
   const nonce = generateNonce();
   await signMessage(nonce);
   await signMessage(nonce);  // Second attempt fails
   ```

3. **Encoding Issues**
   ```javascript
   // Different encodings cause verification failure
   const message = "Sign this";  // UTF-8
   const signed = await wallet.sign(Buffer.from(message, 'ascii'));  // ASCII
   ```

**Fix Checklist:**

```javascript
// 1. Ensure consistent message format
const message = `Connect to app\nNonce: ${nonce}\nTimestamp: ${timestamp}`;

// 2. Use nonce only once
const nonce = await generateNonce();
const signature = await wallet.signMessage(message);
// Delete nonce from database after use
await WalletSession.updateOne({ nonce }, { $unset: { nonce: 1 } });

// 3. Consistent encoding
const messageBytes = Buffer.from(message, 'utf-8');
const signature = await wallet.sign(messageBytes);

// 4. Verify signature with same parameters
const isValid = verifySignature(message, signature, publicKey);
```

---

### Connection Issues

#### Problem: "Wallet Not Detected" / Connection Extension Not Found

**Symptoms:**
- Error: "Wallet extension not installed"
- Connect button does nothing
- `window.stacks` or `window.XverseProviders` undefined

**Hiro Wallet Debugging:**

```javascript
// Check if Hiro is installed
if (typeof window.stacks !== 'undefined') {
  console.log('Hiro wallet found');
  console.log('API:', window.stacks.api);
} else {
  console.log('Hiro wallet not installed');
  // Provide installation link
  window.location.href = 'https://www.hiro.so/wallet/install-web';
}
```

**Xverse Wallet Debugging:**

```javascript
// Check if Xverse is installed
if (typeof window.XverseProviders !== 'undefined') {
  console.log('Xverse wallet found');
  console.log('Providers:', window.XverseProviders);
} else {
  console.log('Xverse wallet not installed');
  // Provide installation link
  window.location.href = 'https://www.xverse.app/';
}
```

**Solutions:**

1. **Enable wallet extension in browser**
   - Check extension settings
   - Ensure site has permission
   - Refresh page

2. **Check browser compatibility**
   - Hiro: Chrome, Firefox, Edge (not Safari)
   - Xverse: Chrome, Firefox, Edge

3. **Test with browser console**
   ```javascript
   // Wait for provider initialization
   setTimeout(() => {
     if (window.stacks) {
     console.log('Hiro ready');
     }
   }, 2000);
   ```

---

#### Problem: "User Rejected Connection" / Cancel Flows

**Symptoms:**
- Connection modal appears then closes
- Connection cancelled by user
- Transaction rejected at wallet level

**Implementation Pattern:**

```javascript
const connectWallet = async () => {
  try {
    // Show wallet UI
    const userSession = await authenticate({
      // config
    });
    
    // This line never executes if user cancels
    console.log('User approved');
  } catch (error) {
    if (error.message === 'User cancelled') {
      // Expected - user clicked cancel
      console.log('Connection cancelled by user');
      // Don't show error to user
    } else {
      // Unexpected error
      console.error('Connection failed:', error);
    }
  }
};
```

---

### Network and Network-Related Issues

#### Problem: "Network Mismatch" / Wrong Network Selected

**Symptoms:**
- Error: "Network mismatch - please switch networks"
- Address valid but on different network
- Session creation fails due to network

**Debug Network State:**

```javascript
// Check wallet network
async function debugNetwork() {
  const hiro = window.stacks;
  if (hiro) {
    const address = hiro.profile?.stxAddress;
    console.log({
      mainnet: address?.mainnet,
      testnet: address?.testnet,
      network: address?.hasMainnet ? 'mainnet' : 'testnet'
    });
  }
}

// Check server expectations
const response = await fetch('/api/wallet/connection-request', {
  method: 'POST',
  body: JSON.stringify({ network: 'mainnet' })
});
const { data: { network } } = await response.json();
console.log('Server expects:', network);
```

**Solutions:**

1. **Configure wallet to correct network**
   - Open wallet extension
   - Go to Settings → Network
   - Select testnet/mainnet to match server

2. **Update server configuration**
   ```bash
   # .env
   SUPPORTED_NETWORKS=mainnet,testnet
   DEFAULT_NETWORK=mainnet
   ```

3. **Handle network switching in code**
   ```javascript
   if (walletNetwork !== serverNetwork) {
     // Suggest network switch to user
     showNotification(`Please switch wallet to ${serverNetwork}`);
     // Don't proceed with connection
     return;
   }
   ```

---

### Session and Token Issues

#### Problem: "Session Expired" / 401 After Short Time

**Symptoms:**
- Works initially then 401 errors
- Session expires too quickly
- Active use doesn't extend session

**Check Session Configuration:**

```bash
# Verify environment variables
echo $SESSION_DEFAULT_DURATION_HOURS  # Should be 24 or higher

# Check session in database
db.wallet_sessions.findOne({ sessionId: 'sess_xxx' }, {
  createdAt: 1,
  expiresAt: 1,
  status: 1
})
```

**Calculate Session Age:**

```javascript
const session = await WalletSession.findOne({ sessionId });
const ageMinutes = (Date.now() - session.createdAt) / 60000;
const expiresInMinutes = (session.expiresAt - Date.now()) / 60000;

console.log({
  createdAt: session.createdAt,
  expiresAt: session.expiresAt,
  ageMinutes: Math.round(ageMinutes),
  expiresInMinutes: Math.round(expiresInMinutes),
  isExpired: session.expiresAt < new Date()
});
```

**Solutions:**

1. **Increase session duration**
   ```bash
   SESSION_DEFAULT_DURATION_HOURS=168  # 7 days
   ```

2. **Implement session refresh**
   ```javascript
   // Refresh session before it expires
   async function refreshSessionIfNeeded(sessionId) {
     const session = await WalletSession.findOne({ sessionId });
     const expiresInMinutes = (session.expiresAt - Date.now()) / 60000;
     
     if (expiresInMinutes < 60) {  // Less than 1 hour remaining
       // Create new session
       const newSession = await createSession(...);
       localStorage.setItem('sessionId', newSession.sessionId);
       return newSession.sessionId;
     }
     return sessionId;
   }
   ```

3. **Monitor session expiration**
   ```javascript
   // Check if server warns about expiration
   if (response.headers['X-Session-Expires-Soon']) {
     console.warn('Session expiring soon - refresh recommended');
     // Auto-refresh or notify user
   }
   ```

---

#### Problem: "Multiple Sessions Conflict" / Concurrent Session Issues

**Symptoms:**
- Multiple browser tabs conflict
- Session in one tab invalidates another
- Logout on one tab logs out everywhere

**Root Cause:**
Multiple sessions from same address stored, only one valid at a time.

**Solution Pattern:**

```javascript
// Option 1: Keep only one active session per wallet
async function createSessionExclusive(address, walletType) {
  // Revoke all existing sessions for this address
  await WalletSession.updateMany(
    { address, walletType, status: 'active' },
    { $set: { status: 'revoked' } }
  );
  
  // Create new session
  return createSession(address, walletType);
}

// Option 2: Allow multiple sessions but track them
async function getActiveSessions(address) {
  return WalletSession.find({
    address,
    status: 'active',
    expiresAt: { $gt: new Date() }
  });
}

// Option 3: Soft-revoke on logout
async function logout(sessionId) {
  // Mark as revoked but keep history
  await WalletSession.updateOne(
    { sessionId },
    { $set: { status: 'revoked', revokedAt: new Date() } }
  );
}
```

---

### Database Issues

#### Problem: "Database Connection Failed" / MongoDB Unavailable

**Symptoms:**
- All API endpoints return 500 errors
- "Cannot connect to MongoDB" in logs
- Connection timeout errors

**Connection Debugging:**

```bash
# Test MongoDB connectivity
mongosh "mongodb://localhost:27017/stacks_monetization"

# Check MongoDB service status
sudo systemctl status mongod
# or
brew services list | grep mongo

# Verify network connectivity
telnet localhost 27017
```

**Application Logs:**

```javascript
// Add connection event handlers
mongoose.connection.on('connected', () => {
  console.log('MongoDB connected');
});

mongoose.connection.on('error', (error) => {
  console.error('MongoDB error:', error);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});
```

**Solutions:**

1. **Start MongoDB service**
   ```bash
   # macOS
   brew services start mongodb-community
   
   # Linux
   sudo systemctl start mongod
   
   # Docker
   docker run -d -p 27017:27017 mongo
   ```

2. **Check connection string**
   ```bash
   # Verify format in .env file (NEVER commit credentials to version control)
   # Use environment variables or a secrets manager for credentials
   export MONGODB_URI="your_secure_mongodb_uri_here"
   
  # Example formats (use with proper credentials from secure source):
  # Local: mongodb://localhost:27017/stacks_monetization
  # Atlas: mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>
   ```
   
   **SECURITY WARNING:** Never hardcode credentials in files or documentation!

3. **Verify network access**
   - Check firewall rules
   - Verify MongoDB bind_ip
   - Check credentials if using auth

---

#### Problem: "Indexes Missing" / Poor Query Performance

**Symptoms:**
- Slow API responses (>1 second)
- High database CPU usage
- "Query scanned 100000 documents"

**Check Index Status:**

```bash
# List all indexes
db.wallet_sessions.getIndexes()
db.wallet_connections.getIndexes()

# Check index usage
db.wallet_sessions.aggregate([{ $indexStats: {} }])

# Analyze query performance
db.wallet_sessions.find({ sessionId: 'sess_xxx' }).explain('executionStats')
```

**Missing Indexes Fix:**

```bash
# Re-create essential indexes
mongo stacks_monetization <<EOF
db.wallet_sessions.createIndex({ sessionId: 1 }, { unique: true });
db.wallet_sessions.createIndex({ address: 1, status: 1, expiresAt: 1 });
db.wallet_connections.createIndex({ address: 1, walletType: 1 }, { unique: true });
db.wallet_connections.createIndex({ creator: 1, createdAt: -1 });
EOF
```

---

### CORS and Network Policy Issues

#### Problem: "CORS Error" / Cross-Origin Request Blocked

**Symptoms:**
- Browser console: "Access to XMLHttpRequest blocked by CORS"
- Fetch request fails from frontend
- API works in Postman but not browser

**Debug CORS:**

```javascript
// Check what's being sent
fetch('http://localhost:5000/api/wallet/me', {
  method: 'GET',
  headers: {
    'X-Session-ID': 'sess_xxx',
    'Content-Type': 'application/json'
  }
}).catch(error => {
  console.error('CORS Error:', error);
  console.log('Check browser DevTools > Network > Response headers');
});
```

**Expected Headers for Success:**

```
Access-Control-Allow-Origin: http://localhost:3000
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, X-Session-ID, X-Wallet-Address
Access-Control-Allow-Credentials: true
```

**Fix CORS Configuration:**

```javascript
// In backend/index.js
const cors = require('cors');

app.use(cors({
  origin: process.env.CORS_ORIGINS.split(','),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-Session-ID', 'X-Wallet-Address']
}));
```

---

### Rate Limiting Issues

#### Problem: "Too Many Requests" / 429 Responses

**Symptoms:**
- Repeated API calls return 429
- Rate limit headers present
- Temporary inability to authenticate

**Check Rate Limit Status:**

```javascript
// Inspect response headers
fetch('/api/wallet/connect').then(response => {
  console.log({
    remaining: response.headers.get('X-RateLimit-Remaining'),
    limit: response.headers.get('X-RateLimit-Limit'),
    reset: response.headers.get('X-RateLimit-Reset')
  });
});
```

**Solutions:**

1. **Implement exponential backoff**
   ```javascript
   async function retryWithBackoff(fn, maxRetries = 3) {
     for (let i = 0; i < maxRetries; i++) {
       try {
         return await fn();
       } catch (error) {
       if (error.status !== 429 || i === maxRetries - 1) throw error;
         
         const delay = Math.pow(2, i) * 1000;  // 1s, 2s, 4s
         await new Promise(r => setTimeout(r, delay));
       }
     }
   }
   ```

2. **Adjust rate limits**
   ```bash
   AUTH_RATE_LIMIT_WINDOW_MS=60000
   AUTH_RATE_LIMIT_MAX_REQUESTS=20
   ```

---

## Logging and Debugging

### Enable Debug Logging

```bash
# Set debug environment variables
DEBUG=wallet:*
NODE_DEBUG=http,mongodb
LOG_LEVEL=debug
```

### Common Log Messages

| Log | Meaning | Action |
|-----|---------|--------|
| "Session not found" | Session ID invalid | User needs to reconnect |
| "Signature verification failed" | Invalid signature | Check signing process |
| "Network mismatch" | Wrong blockchain network | Switch wallet network |
| "Session expired" | Token too old | Create new session |
| "Database error" | MongoDB issue | Check MongoDB status |

---

## Performance Debugging

### Check Response Times

```bash
# Measure API response time
time curl -X POST http://localhost:5000/api/wallet/connect \
  -H "Content-Type: application/json" \
  -d '{...}'

# Expected: <200ms
```

### Monitor Database Queries

```bash
# Enable MongoDB profiling
mongo stacks_monetization
db.setProfilingLevel(1, { slowms: 100 })

# View slow queries
db.system.profile.find({ millis: { $gt: 100 } }).sort({ ts: -1 }).limit(5)
```

---

## Getting Help

### Information to Gather When Reporting Issues

1. **Error Message**
   ```
   "Session token invalid" / 401 Unauthorized
   ```

2. **Reproduction Steps**
   ```
   1. Open wallet
   2. Click connect
   3. Error appears
   ```

3. **System Information**
   ```
   Node version: v16.13.0
   MongoDB version: 5.0
   Wallet: Hiro v8.10.0
   Browser: Chrome 120.0
   ```

4. **Relevant Logs**
   ```
   [Error] "Session not found in database"
   [Debug] "Query took 2500ms"
   ```

5. **Network Details**
   ```
   Request URL: http://localhost:5000/api/wallet/connect
   Status Code: 401
   Response: {"success":false,"message":"Invalid session"}
   ```

---

## Checklist for Troubleshooting

- [ ] Check error message and logs
- [ ] Verify MongoDB connection
- [ ] Confirm indexes exist
- [ ] Check network configuration
- [ ] Verify environment variables
- [ ] Test with curl/Postman
- [ ] Check browser console for errors
- [ ] Verify wallet extension installed
- [ ] Check CORS configuration
- [ ] Monitor rate limits
- [ ] Review database query performance
- [ ] Validate session token
- [ ] Check for clock skew
- [ ] Inspect network tabs in DevTools
