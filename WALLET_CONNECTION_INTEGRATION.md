# Wallet Connection - Integration Guide

## Integrating Hiro Wallet

### Installation

```bash
npm install @stacks/connect
```

### Frontend Implementation

```javascript
import { AppConfig, UserSession, showConnect } from '@stacks/connect';
import { StacksTestnet } from '@stacks/network';

// Configure app
const appConfig = new AppConfig(['store_write', 'publish_data']);
const userSession = new UserSession({ appConfig });

// Connect wallet
async function connectHiroWallet() {
  showConnect({
    appDetails: {
      name: 'Content Monetization',
      icon: 'https://example.com/logo.png'
    },
    redirectTo: '/',
    onFinish: async () => {
      const userData = userSession.loadUserData();
      
      // Get challenge from backend
      const challengeResponse = await fetch('/api/wallet/connection-request', {
        method: 'POST',
        body: JSON.stringify({ network: 'mainnet' })
      });
      const { data: challenge } = await challengeResponse.json();
      
      // Sign message
      const signature = await userSession.signMessage({
        message: challenge.message
      });
      
      // Connect wallet
      const connectResponse = await fetch('/api/wallet/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: userData.profile.stxAddress.mainnet,
          walletType: 'hiro',
          publicKey: userData.appPrivateKey,
          signature,
          nonce: challenge.nonce
        })
      });
      
      const { data: connectionData } = await connectResponse.json();
      console.log('Wallet connected:', connectionData);
      
      // Create session
      const sessionResponse = await fetch('/api/wallet/authenticate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: userData.profile.stxAddress.mainnet,
          walletType: 'hiro',
          publicKey: userData.appPrivateKey
        })
      });
      
      const { data: sessionData } = await sessionResponse.json();
      localStorage.setItem('sessionId', sessionData.sessionId);
    }
  });
}
```

## Integrating Xverse Wallet

### Installation

```bash
npm install @stacks/connect
```

### Frontend Implementation

```javascript
import { requestSignMessage } from '@stacks/connect';
import { StacksNetwork } from '@stacks/network';

async function connectXverseWallet() {
  try {
    // Get challenge from backend
    const challengeResponse = await fetch('/api/wallet/connection-request', {
      method: 'POST',
      body: JSON.stringify({ network: 'mainnet' })
    });
    const { data: challenge } = await challengeResponse.json();
    
    // Request signature from Xverse
    const signatureResponse = await requestSignMessage({
      message: challenge.message,
      domain: 'content.example.com',
      network: new StacksNetwork({ url: 'https://api.mainnet.hiro.so' })
    });
    
    // Get wallet info from Xverse
    const walletInfo = await window.XverseProviders?.StacksProvider?.request('getAddress');
    
    // Connect wallet
    const connectResponse = await fetch('/api/wallet/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address: walletInfo.address,
        walletType: 'xverse',
        publicKey: walletInfo.publicKey,
        signature: signatureResponse.signature,
        nonce: challenge.nonce
      })
    });
    
    const { data: connectionData } = await connectResponse.json();
    
    // Create session
    const sessionResponse = await fetch('/api/wallet/authenticate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address: walletInfo.address,
        walletType: 'xverse',
        publicKey: walletInfo.publicKey
      })
    });
    
    const { data: sessionData } = await sessionResponse.json();
    localStorage.setItem('sessionId', sessionData.sessionId);
  } catch (error) {
    console.error('Xverse connection failed:', error);
  }
}
```

## Backend Integration

### Making Authenticated Requests

```javascript
// From frontend
const sessionId = localStorage.getItem('sessionId');

const response = await fetch('/api/wallet/me', {
  headers: {
    'X-Session-Id': sessionId
  }
});

const walletInfo = await response.json();
console.log('Current wallet:', walletInfo.data);
```

### Protecting Routes

```javascript
// In backend
const { verifyWalletAuth } = require('./middleware/walletAuth');

app.get('/protected-route', verifyWalletAuth, (req, res) => {
  // req.walletAddress contains wallet address
  // req.walletType contains wallet type
  // req.sessionId contains session ID
  res.json({ address: req.walletAddress });
});
```

## Network-Specific Implementation

### Mainnet
```javascript
// Frontend
const network = 'mainnet';

// Backend request
const response = await fetch('/api/wallet/connection-request', {
  method: 'POST',
  body: JSON.stringify({ network: 'mainnet' })
});
```

### Testnet
```javascript
// Frontend
const network = 'testnet';

// Backend request
const response = await fetch('/api/wallet/connection-request', {
  method: 'POST',
  body: JSON.stringify({ network: 'testnet' })
});
```

### Devnet (Local)
```javascript
// Frontend
const network = 'devnet';

// Backend request
const response = await fetch('/api/wallet/connection-request', {
  method: 'POST',
  body: JSON.stringify({ network: 'devnet' })
});
```

## Session Management

### Check Session Validity

```javascript
async function isSessionValid(sessionId) {
  const response = await fetch(`/api/wallet/verify/${sessionId}`);
  const { data } = await response.json();
  return data.valid;
}

// Usage
const sessionId = localStorage.getItem('sessionId');
const isValid = await isSessionValid(sessionId);
if (!isValid) {
  // Redirect to login
  window.location.href = '/login';
}
```

### Handle Session Expiration

```javascript
async function makeAuthenticatedRequest(url, options = {}) {
  const sessionId = localStorage.getItem('sessionId');
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'X-Session-Id': sessionId
    }
  });
  
  if (response.status === 401) {
    // Session expired, redirect to login
    localStorage.removeItem('sessionId');
    window.location.href = '/login';
    return null;
  }
  
  // Check for session expiration warning
  if (response.headers.get('X-Session-Expires-Soon') === 'true') {
    const expiresIn = response.headers.get('X-Session-Expires-In');
    console.warn(`Session expires in ${expiresIn} seconds`);
    // Show warning to user
  }
  
  return response;
}
```

### Logout

```javascript
async function logout() {
  const sessionId = localStorage.getItem('sessionId');
  
  await fetch('/api/wallet/logout', {
    method: 'POST',
    headers: {
      'X-Session-Id': sessionId
    }
  });
  
  localStorage.removeItem('sessionId');
  window.location.href = '/login';
}
```

## Multi-Wallet Support

### List Connected Wallets

```javascript
async function listConnectedWallets() {
  const sessionId = localStorage.getItem('sessionId');
  
  const response = await fetch('/api/wallet/wallets/all', {
    headers: {
      'X-Session-Id': sessionId
    }
  });
  
  const { data } = await response.json();
  console.log('Connected wallets:', data.connectedWallets);
}
```

### Switch Wallets

```javascript
async function switchWallet(newWalletAddress) {
  // Get new wallet session
  const response = await fetch('/api/wallet/authenticate', {
    method: 'POST',
    body: JSON.stringify({
      address: newWalletAddress,
      walletType: 'hiro' // or 'xverse'
    })
  });
  
  const { data } = await response.json();
  localStorage.setItem('sessionId', data.sessionId);
  
  // Refresh app
  window.location.reload();
}
```

### Disconnect Wallet

```javascript
async function disconnectWallet(walletAddress, walletType) {
  const response = await fetch('/api/wallet/disconnect', {
    method: 'POST',
    body: JSON.stringify({
      address: walletAddress,
      walletType: walletType,
      reason: 'User initiated'
    })
  });
  
  const { data } = await response.json();
  return data.success;
}
```

## Profile Management

### Update Profile

```javascript
async function updateProfile(displayName, bio) {
  const sessionId = localStorage.getItem('sessionId');
  
  const response = await fetch('/api/wallet/profile', {
    method: 'PUT',
    headers: {
      'X-Session-Id': sessionId,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      displayName,
      bio,
      avatar: 'https://example.com/avatar.jpg',
      username: 'johndoe'
    })
  });
  
  const { data } = await response.json();
  console.log('Profile updated:', data);
}
```

### Get Profile

```javascript
async function getProfile() {
  const sessionId = localStorage.getItem('sessionId');
  
  const response = await fetch('/api/wallet/me', {
    headers: {
      'X-Session-Id': sessionId
    }
  });
  
  const { data } = await response.json();
  console.log('Profile:', data.profile);
  return data;
}
```

## Error Handling

### Common Errors

```javascript
async function handleWalletConnection(address, walletType) {
  try {
    const response = await fetch('/api/wallet/connect', {
      method: 'POST',
      body: JSON.stringify({
        address,
        walletType,
        // ...other fields
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      
      if (response.status === 400) {
        console.error('Validation error:', error.error);
        // Show user-friendly message
      } else if (response.status === 401) {
        console.error('Authentication failed:', error.error);
        // Redirect to login
      } else if (response.status === 500) {
        console.error('Server error:', error.error);
        // Show error message to user
      }
      return;
    }
    
    const { data } = await response.json();
    console.log('Wallet connected:', data);
  } catch (error) {
    console.error('Connection failed:', error);
  }
}
```

## Testing

### Test Wallet Connection

```bash
# Get connection request
curl -X POST http://localhost:5000/api/wallet/connection-request \
  -H "Content-Type: application/json"

# Connect wallet (mock signature)
curl -X POST http://localhost:5000/api/wallet/connect \
  -H "Content-Type: application/json" \
  -d '{
    "address": "SP2ZNGJ85ENDY6QTHQ4P3KCQJRNYWB43HCUB7QY0J",
    "walletType": "hiro",
    "publicKey": "0x1234",
    "signature": "0xsig",
    "nonce": "abc123"
  }'

# Create session
curl -X POST http://localhost:5000/api/wallet/authenticate \
  -H "Content-Type: application/json" \
  -d '{
    "address": "SP2ZNGJ85ENDY6QTHQ4P3KCQJRNYWB43HCUB7QY0J",
    "walletType": "hiro",
    "publicKey": "0x1234"
  }'

# Get authenticated info
curl -X GET http://localhost:5000/api/wallet/me \
  -H "X-Session-Id: sess_..."
```

## Security Best Practices

1. **Always validate signatures** on backend
2. **Use HTTPS** in production
3. **Set secure cookies** (HttpOnly, Secure, SameSite)
4. **Implement rate limiting** on authentication endpoints
5. **Log authentication events** for audit trail
6. **Rotate sessions** regularly
7. **Validate wallet addresses** format
8. **Implement CSRF protection** for state-changing operations

## Troubleshooting

### Signature Verification Fails
- Ensure wallet is connected first
- Verify nonce matches between request and submission
- Check timestamp is recent

### Session Expired
- Implement session refresh mechanism
- Monitor X-Session-Expires-Soon header
- Redirect to login on 401 response

### Wallet Not Found
- Ensure wallet was connected first
- Check wallet address format (should be lowercase)
- Verify network matches

### CORS Issues
- Ensure backend CORS is configured correctly
- Check frontend domain is whitelisted
- Verify credentials are sent with requests
