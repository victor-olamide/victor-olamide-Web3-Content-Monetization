# Wallet Connection - Client Implementation Examples

## Overview

This guide provides complete client-side implementation examples for integrating wallet authentication into your frontend application. Includes examples for React, Vue, and vanilla JavaScript.

## React Integration Example

### Setup and Initialization

```bash
npm install @stacks/connect @stacks/network axios
```

### Complete React Component

```javascript
// src/components/WalletAuth.jsx
import React, { useState, useEffect } from 'react';
import { authenticate } from '@stacks/connect';
import { StacksMainnet, StacksTestnet } from '@stacks/network';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const WalletAuth = () => {
  const [walletType, setWalletType] = useState(null);
  const [address, setAddress] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  // Initialize session on mount
  useEffect(() => {
    const savedSessionId = localStorage.getItem('sessionId');
    if (savedSessionId) {
      verifySession(savedSessionId);
    }
  }, []);

  // Verify existing session
  const verifySession = async (sessId) => {
    try {
      const response = await axios.get(
        `${API_BASE}/wallet/verify/${sessId}`,
        {
          headers: {
            'X-Session-ID': sessId
          }
        }
      );

      if (response.data.success && response.data.data.valid) {
        setSessionId(sessId);
        setAddress(response.data.data.address);
        setWalletType(response.data.data.walletType);
        setIsAuthenticated(true);
        await fetchWalletProfile(sessId);
      } else {
        localStorage.removeItem('sessionId');
      }
    } catch (error) {
      console.error('Session verification failed:', error);
      localStorage.removeItem('sessionId');
    }
  };

  // Fetch wallet profile
  const fetchWalletProfile = async (sessId) => {
    try {
      const response = await axios.get(`${API_BASE}/wallet/me`, {
        headers: {
          'X-Session-ID': sessId
        }
      });

      if (response.data.success) {
        setUser(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    }
  };

  // Connect with Hiro wallet
  const connectHiro = async () => {
    setLoading(true);
    setError(null);

    try {
      // Step 1: Get connection request
      const requestResponse = await axios.post(
        `${API_BASE}/wallet/connection-request`,
        {
          network: 'mainnet'
        }
      );

      const { nonce, message, timestamp } = requestResponse.data.data;

      // Step 2: Authenticate with Hiro Wallet
      const userSession = await authenticate({
        manifestPath: '/manifest.json',
        appDetails: {
          name: 'Your App',
          icon: window.location.origin + '/logo.png'
        },
        onFinish: (payload) => {
          return payload;
        },
        userSession: null,
        network: new StacksMainnet()
      });

      const publicKey = userSession.profile.publicKey;
      const principal = userSession.profile.stxAddress.mainnet;

      // Step 3: Sign the message
      const signature = await signMessage(message, publicKey);

      // Step 4: Connect wallet
      const connectResponse = await axios.post(
        `${API_BASE}/wallet/connect`,
        {
          address: principal,
          walletType: 'hiro',
          publicKey,
          signature,
          nonce,
          network: 'mainnet'
        }
      );

      if (!connectResponse.data.success) {
        throw new Error(connectResponse.data.message || 'Connection failed');
      }

      // Step 5: Create session
      await authenticateSession(principal, 'hiro', publicKey);
    } catch (error) {
      setError(error.message || 'Hiro wallet connection failed');
      console.error('Hiro connection error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Connect with Xverse wallet
  const connectXverse = async () => {
    setLoading(true);
    setError(null);

    try {
      // Check Xverse availability
      if (!window.XverseProviders?.BitcoinProvider) {
        throw new Error('Xverse wallet not installed');
      }

      // Step 1: Get connection request
      const requestResponse = await axios.post(
        `${API_BASE}/wallet/connection-request`,
        {
          network: 'mainnet'
        }
      );

      const { nonce, message } = requestResponse.data.data;

      // Step 2: Get address from Xverse
      const addressResponse = await window.XverseProviders.BitcoinProvider.request(
        'getAddress'
      );

      const address = addressResponse.result.address;

      // Step 3: Sign message with Xverse
      const signResponse = await window.XverseProviders.BitcoinProvider.request(
        'signMessage',
        {
          address,
          message
        }
      );

      const signature = signResponse.result;

      // Step 4: Connect wallet
      const connectResponse = await axios.post(
        `${API_BASE}/wallet/connect`,
        {
          address,
          walletType: 'xverse',
          publicKey: addressResponse.result.publicKey,
          signature,
          nonce,
          network: 'mainnet'
        }
      );

      if (!connectResponse.data.success) {
        throw new Error(connectResponse.data.message || 'Connection failed');
      }

      // Step 5: Create session
      await authenticateSession(
        address,
        'xverse',
        addressResponse.result.publicKey
      );
    } catch (error) {
      setError(error.message || 'Xverse wallet connection failed');
      console.error('Xverse connection error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Authenticate and create session
  const authenticateSession = async (userAddress, type, publicKey) => {
    try {
      const response = await axios.post(
        `${API_BASE}/wallet/authenticate`,
        {
          address: userAddress,
          walletType: type,
          publicKey,
          network: 'mainnet'
        }
      );

      if (response.data.success) {
        const newSessionId = response.data.data.sessionId;
        localStorage.setItem('sessionId', newSessionId);
        setSessionId(newSessionId);
        setAddress(userAddress);
        setWalletType(type);
        setIsAuthenticated(true);
        await fetchWalletProfile(newSessionId);
      }
    } catch (error) {
      setError('Session creation failed');
      console.error('Session error:', error);
    }
  };

  // Sign message (placeholder - use actual signing)
  const signMessage = async (message, publicKey) => {
    // This is a placeholder. In production, use actual signing mechanism
    return 'signed_message_placeholder';
  };

  // Logout
  const logout = async () => {
    try {
      if (sessionId) {
        await axios.post(
          `${API_BASE}/wallet/logout`,
          {},
          {
            headers: { 'X-Session-ID': sessionId }
          }
        );
      }
      localStorage.removeItem('sessionId');
      setSessionId(null);
      setAddress(null);
      setWalletType(null);
      setIsAuthenticated(false);
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Update profile
  const updateProfile = async (profileData) => {
    if (!sessionId) return;

    try {
      const response = await axios.put(
        `${API_BASE}/wallet/profile`,
        profileData,
        {
          headers: { 'X-Session-ID': sessionId }
        }
      );

      if (response.data.success) {
        setUser(response.data.data.profile);
      }
    } catch (error) {
      setError('Failed to update profile');
      console.error('Profile update error:', error);
    }
  };

  if (isAuthenticated && user) {
    return (
      <div className="wallet-connected">
        <h2>Connected Wallet</h2>
        <div className="wallet-info">
          <p><strong>Wallet Type:</strong> {walletType}</p>
          <p><strong>Address:</strong> {address?.substring(0, 20)}...</p>
          <p><strong>Profile:</strong> {user.username || 'Not set'}</p>
        </div>
        <button onClick={logout}>Disconnect</button>
      </div>
    );
  }

  return (
    <div className="wallet-auth">
      <h2>Connect Your Wallet</h2>
      {error && <div className="error">{error}</div>}
      <div className="button-group">
        <button
          onClick={connectHiro}
          disabled={loading}
          className="btn-hiro"
        >
          {loading ? 'Connecting...' : 'Connect Hiro Wallet'}
        </button>
        <button
          onClick={connectXverse}
          disabled={loading}
          className="btn-xverse"
        >
          {loading ? 'Connecting...' : 'Connect Xverse Wallet'}
        </button>
      </div>
    </div>
  );
};

export default WalletAuth;
```

### Hook for Wallet State Management

```javascript
// src/hooks/useWallet.js
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const useWallet = () => {
  const [wallet, setWallet] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Initialize from localStorage
  useEffect(() => {
    const savedSessionId = localStorage.getItem('sessionId');
    if (savedSessionId) {
      verifySession(savedSessionId);
    }
  }, []);

  const verifySession = useCallback(async (sessId) => {
    try {
      const response = await axios.get(`${API_BASE}/wallet/verify/${sessId}`);
      if (response.data.data?.valid) {
        setSessionId(sessId);
        setIsAuthenticated(true);
        fetchWalletData(sessId);
      }
    } catch (error) {
      localStorage.removeItem('sessionId');
      setIsAuthenticated(false);
    }
  }, []);

  const fetchWalletData = useCallback(async (sessId) => {
    try {
      const response = await axios.get(`${API_BASE}/wallet/me`, {
        headers: { 'X-Session-ID': sessId }
      });
      if (response.data.success) {
        setWallet(response.data.data);
      }
    } catch (error) {
      setError('Failed to fetch wallet data');
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      if (sessionId) {
        await axios.post(`${API_BASE}/wallet/logout`, {}, {
          headers: { 'X-Session-ID': sessionId }
        });
      }
      localStorage.removeItem('sessionId');
      setSessionId(null);
      setWallet(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, [sessionId]);

  return {
    wallet,
    sessionId,
    isAuthenticated,
    loading,
    error,
    logout,
    verifySession
  };
};
```

## Vue Integration Example

```vue
<!-- src/components/WalletAuth.vue -->
<template>
  <div class="wallet-auth">
    <div v-if="isAuthenticated" class="wallet-connected">
      <h2>Connected Wallet</h2>
      <p>{{ walletType }} - {{ address?.substring(0, 20) }}...</p>
      <button @click="logout">Disconnect</button>
    </div>
    <div v-else class="wallet-connect">
      <h2>Connect Your Wallet</h2>
      <button 
        @click="connectHiro" 
        :disabled="loading"
      >
        {{ loading ? 'Connecting...' : 'Connect Hiro' }}
      </button>
      <button 
        @click="connectXverse" 
        :disabled="loading"
      >
        {{ loading ? 'Connecting...' : 'Connect Xverse' }}
      </button>
      <p v-if="error" class="error">{{ error }}</p>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import axios from 'axios';

const API_BASE = process.env.VUE_APP_API_URL || 'http://localhost:5000/api';

export default {
  name: 'WalletAuth',
  setup() {
    const isAuthenticated = ref(false);
    const walletType = ref(null);
    const address = ref(null);
    const sessionId = ref(null);
    const loading = ref(false);
    const error = ref(null);

    onMounted(() => {
      const savedSessionId = localStorage.getItem('sessionId');
      if (savedSessionId) {
        verifySession(savedSessionId);
      }
    });

    const verifySession = async (sessId) => {
      try {
        const response = await axios.get(`${API_BASE}/wallet/verify/${sessId}`);
        if (response.data.data?.valid) {
          sessionId.value = sessId;
          address.value = response.data.data.address;
          walletType.value = response.data.data.walletType;
          isAuthenticated.value = true;
        }
      } catch (err) {
        localStorage.removeItem('sessionId');
      }
    };

    const connectHiro = async () => {
      loading.value = true;
      error.value = null;

      try {
        // Get connection request
        const reqRes = await axios.post(
          `${API_BASE}/wallet/connection-request`,
          { network: 'mainnet' }
        );
        const { nonce, message } = reqRes.data.data;

        // Here you would interact with Hiro wallet
        // For demo purposes, showing structure only
        
        // Connect wallet
        const connRes = await axios.post(
          `${API_BASE}/wallet/connect`,
          {
            address: 'SP...',
            walletType: 'hiro',
            publicKey: 'PUB...',
            signature: 'SIG...',
            nonce,
            network: 'mainnet'
          }
        );

        if (connRes.data.success) {
          // Create session
          const sessRes = await axios.post(
            `${API_BASE}/wallet/authenticate`,
            {
              address: 'SP...',
              walletType: 'hiro',
              publicKey: 'PUB...',
              network: 'mainnet'
            }
          );

          if (sessRes.data.success) {
            const newSessionId = sessRes.data.data.sessionId;
            localStorage.setItem('sessionId', newSessionId);
            sessionId.value = newSessionId;
            isAuthenticated.value = true;
          }
        }
      } catch (err) {
        error.value = err.message || 'Connection failed';
      } finally {
        loading.value = false;
      }
    };

    const connectXverse = async () => {
      // Similar to connectHiro but for Xverse wallet
      loading.value = true;
      error.value = null;

      try {
        // Implementation similar to Hiro but using Xverse API
      } catch (err) {
        error.value = err.message || 'Xverse connection failed';
      } finally {
        loading.value = false;
      }
    };

    const logout = async () => {
      try {
        if (sessionId.value) {
          await axios.post(
            `${API_BASE}/wallet/logout`,
            {},
            { headers: { 'X-Session-ID': sessionId.value } }
          );
        }
        localStorage.removeItem('sessionId');
        sessionId.value = null;
        address.value = null;
        walletType.value = null;
        isAuthenticated.value = false;
      } catch (err) {
        console.error('Logout failed:', err);
      }
    };

    return {
      isAuthenticated,
      walletType,
      address,
      loading,
      error,
      connectHiro,
      connectXverse,
      logout
    };
  }
};
</script>

<style scoped>
.wallet-auth {
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.wallet-connected {
  background: #e8f5e9;
  padding: 15px;
  border-radius: 4px;
}

button {
  margin: 10px 10px 10px 0;
  padding: 10px 20px;
  background: #1976d2;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.error {
  color: #d32f2f;
  margin-top: 10px;
}
</style>
```

## Vanilla JavaScript Example

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Wallet Connection - Vanilla JS</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; }
    .wallet-auth { padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
    button { margin: 10px 10px 10px 0; padding: 10px 20px; background: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer; }
    button:disabled { background: #ccc; cursor: not-allowed; }
    .connected { background: #e8f5e9; padding: 15px; border-radius: 4px; }
    .error { color: #d32f2f; margin-top: 10px; }
  </style>
</head>
<body>
  <div class="wallet-auth" id="walletAuth">
    <h2>Connect Your Wallet</h2>
    <button id="hiroBtn" onclick="connectHiro()">Connect Hiro Wallet</button>
    <button id="xverseBtn" onclick="connectXverse()">Connect Xverse Wallet</button>
    <div id="error" class="error"></div>
    <div id="userInfo"></div>
  </div>

  <script>
    const API_BASE = 'http://localhost:5000/api';
    let sessionId = null;
    let address = null;
    let walletType = null;

    // Initialize
    document.addEventListener('DOMContentLoaded', () => {
      const savedSessionId = localStorage.getItem('sessionId');
      if (savedSessionId) {
        verifySession(savedSessionId);
      }
    });

    async function verifySession(sessId) {
      try {
        const response = await fetch(`${API_BASE}/wallet/verify/${sessId}`);
        const data = await response.json();
        
        if (data.data?.valid) {
          sessionId = sessId;
          address = data.data.address;
          walletType = data.data.walletType;
          showConnected();
        } else {
          localStorage.removeItem('sessionId');
        }
      } catch (error) {
        console.error('Session verification failed:', error);
      }
    }

    async function connectHiro() {
      setLoading(true);
      clearError();

      try {
        // Get connection request
        const requestResponse = await fetch(
          `${API_BASE}/wallet/connection-request`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ network: 'mainnet' })
          }
        );

        const { data: { nonce, message } } = await requestResponse.json();

        // Sign message (placeholder - implement actual signing)
        const signature = 'signed_message_placeholder';
        const publicKey = 'public_key_placeholder';
        const userAddress = 'SP..._placeholder';

        // Connect wallet
        const connectResponse = await fetch(
          `${API_BASE}/wallet/connect`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              address: userAddress,
              walletType: 'hiro',
              publicKey,
              signature,
              nonce,
              network: 'mainnet'
            })
          }
        );

        const connectData = await connectResponse.json();
        if (!connectData.success) {
          throw new Error(connectData.message || 'Connection failed');
        }

        // Create session
        await authenticateSession(userAddress, 'hiro', publicKey);
      } catch (error) {
        showError(error.message || 'Connection failed');
      } finally {
        setLoading(false);
      }
    }

    async function connectXverse() {
      // Similar to connectHiro but for Xverse
      setLoading(true);
      clearError();

      try {
        if (!window.XverseProviders?.BitcoinProvider) {
          throw new Error('Xverse wallet not installed');
        }

        // Get connection request
        const requestResponse = await fetch(
          `${API_BASE}/wallet/connection-request`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ network: 'mainnet' })
          }
        );

        const { data: { nonce, message } } = await requestResponse.json();

        // Rest of implementation...
      } catch (error) {
        showError(error.message || 'Xverse connection failed');
      } finally {
        setLoading(false);
      }
    }

    async function authenticateSession(userAddress, type, publicKey) {
      try {
        const response = await fetch(
          `${API_BASE}/wallet/authenticate`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              address: userAddress,
              walletType: type,
              publicKey,
              network: 'mainnet'
            })
          }
        );

        const data = await response.json();
        if (data.success) {
          sessionId = data.data.sessionId;
          address = userAddress;
          walletType = type;
          localStorage.setItem('sessionId', sessionId);
          showConnected();
        }
      } catch (error) {
        showError('Session creation failed');
      }
    }

    function showConnected() {
      document.getElementById('walletAuth').innerHTML = `
        <div class="connected">
          <h2>Connected Wallet</h2>
          <p><strong>Wallet Type:</strong> ${walletType}</p>
          <p><strong>Address:</strong> ${address?.substring(0, 20)}...</p>
          <button onclick="logout()">Disconnect</button>
        </div>
      `;
    }

    async function logout() {
      try {
        if (sessionId) {
          await fetch(`${API_BASE}/wallet/logout`, {
            method: 'POST',
            headers: { 'X-Session-ID': sessionId }
          });
        }
        localStorage.removeItem('sessionId');
        sessionId = null;
        address = null;
        walletType = null;
        location.reload();
      } catch (error) {
        showError('Logout failed');
      }
    }

    function setLoading(isLoading) {
      const btnHiro = document.getElementById('hiroBtn');
      const btnXverse = document.getElementById('xverseBtn');
      btnHiro.disabled = isLoading;
      btnXverse.disabled = isLoading;
      btnHiro.textContent = isLoading ? 'Connecting...' : 'Connect Hiro Wallet';
      btnXverse.textContent = isLoading ? 'Connecting...' : 'Connect Xverse Wallet';
    }

    function showError(message) {
      document.getElementById('error').textContent = message;
    }

    function clearError() {
      document.getElementById('error').textContent = '';
    }
  </script>
</body>
</html>
```

## Testing Examples

### Unit Tests with Jest

```javascript
// tests/walletAuth.test.js
import axios from 'axios';
import { connectWallet, createSession, verifySession } from '../src/services/walletService';

jest.mock('axios');

describe('Wallet Authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should connect wallet successfully', async () => {
    const mockData = {
      address: 'SP123...',
      walletType: 'hiro',
      publicKey: 'PUB...',
      signature: 'SIG...'
    };

    axios.post.mockResolvedValue({
      data: { success: true, data: mockData }
    });

    const result = await connectWallet(mockData);
    expect(result.success).toBe(true);
    expect(axios.post).toHaveBeenCalled();
  });

  test('should create session with valid credentials', async () => {
    const mockSession = {
      sessionId: 'sess_xxx',
      address: 'SP123...',
      expiresAt: new Date(Date.now() + 86400000)
    };

    axios.post.mockResolvedValue({
      data: { success: true, data: mockSession }
    });

    const result = await createSession('SP123...', 'hiro');
    expect(result.sessionId).toBeDefined();
  });

  test('should verify active sessions', async () => {
    axios.get.mockResolvedValue({
      data: { success: true, data: { valid: true } }
    });

    const result = await verifySession('sess_xxx');
    expect(result.valid).toBe(true);
  });
});
```

## Error Handling

```javascript
// src/utils/errorHandler.js
export const handleWalletError = (error) => {
  const errorMap = {
    'WALLET_NOT_INSTALLED': 'Wallet extension not detected. Please install it.',
    'USER_CANCELLED': 'Connection cancelled by user.',
    'INVALID_SIGNATURE': 'Message signature verification failed.',
    'SESSION_EXPIRED': 'Your session has expired. Please reconnect.',
    'NETWORK_MISMATCH': 'Network mismatch. Please switch to the correct network.',
    'INSUFFICIENT_PERMISSIONS': 'Wallet does not have required permissions.'
  };

  return errorMap[error.code] || error.message || 'An error occurred';
};
```

## Loading States and UX Patterns

```javascript
// src/components/WalletConnectButton.jsx
const WalletConnectButton = ({ onConnect, onError }) => {
  const [state, setState] = useState('idle'); // idle | connecting | connected | error

  const handleConnect = async () => {
    setState('connecting');
    try {
      // Connection logic
      setState('connected');
      onConnect();
    } catch (error) {
      setState('error');
      onError(error);
    }
  };

  return (
    <button 
      onClick={handleConnect}
      disabled={state === 'connecting'}
      className={`btn btn-${state}`}
    >
      {state === 'connecting' && (
        <>
          <Spinner /> Connecting...
        </>
      )}
      {state === 'idle' && 'Connect Wallet'}
      {state === 'connected' && '✓ Connected'}
      {state === 'error' && 'Retry'}
    </button>
  );
};
```

## Session Refresh Pattern

```javascript
// src/hooks/useSessionRefresh.js
export const useSessionRefresh = (sessionId, refreshInterval = 300000) => {
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await axios.get(
          `/api/wallet/verify/${sessionId}`
        );
        
        if (!response.data.data.valid) {
          // Session expired - redirect to login
          window.location.href = '/login';
        }
      } catch (error) {
        console.error('Session refresh failed:', error);
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [sessionId, refreshInterval]);
};
```

## Best Practices

1. **Always validate session before API calls**
   - Check sessionId exists in localStorage
   - Verify session is still valid before making requests
   - Handle expired sessions gracefully

2. **Implement proper error handling**
   - Show user-friendly error messages
   - Log errors for debugging
   - Provide recovery options

3. **Secure storage**
   - Use HttpOnly cookies when possible
   - Clear sensitive data on logout
   - Don't store private keys in frontend

4. **User experience**
   - Show loading states during connection
   - Provide clear status indicators
   - Handle network timeouts gracefully
   - Support multiple wallets

5. **Testing**
   - Test all connection flows
   - Test error scenarios
   - Test session expiration
   - Test concurrent connections
