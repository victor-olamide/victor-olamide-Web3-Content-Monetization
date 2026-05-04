const express = require('express');
const router = express.Router();
const {
  createConnectionRequest,
  connectWallet,
  createSession,
  getWalletConnection,
  getConnectedWallets,
  disconnectWallet,
  revokeSession,
  updateWalletProfile
} = require('../services/walletService');
const {
  verifyWalletAuth,
  optionalWalletAuth,
  requireWalletAddress,
  validateWalletType,
  validateNetwork,
  checkSessionExpiration,
  attachClientMetadata
} = require('../middleware/walletAuth');

// Apply middleware to all routes
router.use(attachClientMetadata);
router.use(validateNetwork);

// POST /api/wallet/connection-request
// Get a nonce and challenge for wallet to sign
router.post('/connection-request', (req, res) => {
  try {
    const { network } = req.body;
    const request = createConnectionRequest(network || req.network);

    res.json({
      success: true,
      data: request,
      message: 'Connection request created. Sign the message with your wallet.'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/wallet/connect
// Connect wallet with signature
router.post('/connect', validateWalletType, async (req, res) => {
  try {
    const { address, walletType, publicKey, signature, nonce } = req.body;

    if (!address || !publicKey || !signature) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: address, publicKey, signature'
      });
    }

    const result = await connectWallet(
      address,
      walletType.toLowerCase(),
      publicKey,
      signature,
      nonce,
      req.network,
      req.clientMetadata
    );

    res.status(201).json({
      success: true,
      data: result,
      message: 'Wallet connected successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/wallet/authenticate
// Create a session after wallet is connected
router.post('/authenticate', validateWalletType, async (req, res) => {
  try {
    const { address, walletType, publicKey, sessionDurationHours } = req.body;

    if (!address || !publicKey) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: address, publicKey'
      });
    }

    const result = await createSession(
      address,
      walletType.toLowerCase(),
      publicKey,
      req.network,
      req.clientMetadata,
      sessionDurationHours || 24
    );

    // Set session cookie (secure in production)
    res.cookie('sessionId', result.sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: (sessionDurationHours || 24) * 60 * 60 * 1000
    });

    res.status(201).json({
      success: true,
      data: result,
      message: 'Session created successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/wallet/me
// Get current authenticated wallet info
router.get(
  '/me',
  verifyWalletAuth,
  checkSessionExpiration,
  async (req, res) => {
    try {
      const connection = await getWalletConnection(req.walletAddress, req.walletType);

      if (!connection) {
        return res.status(404).json({
          success: false,
          error: 'Wallet connection not found'
        });
      }

      res.json({
        success: true,
        data: connection,
        message: 'Wallet information retrieved'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

// GET /api/wallet/:address
// Get wallet connection details (with optional wallet auth)
router.get('/:address', optionalWalletAuth, async (req, res) => {
  try {
    const { address } = req.params;
    const { walletType } = req.query;

    // Check if requesting own wallet or public info
    const connection = await getWalletConnection(address, walletType);

    if (!connection) {
      return res.status(404).json({
        success: false,
        error: 'Wallet not found'
      });
    }

    // Return limited info unless authenticated as owner
    const isOwner = req.isAuthenticated && req.walletAddress.toLowerCase() === address.toLowerCase();

    res.json({
      success: true,
      data: {
        address: connection.address,
        walletType: connection.walletType,
        ...(isOwner && {
          isConnected: connection.isConnected,
          connectedAt: connection.connectedAt,
          lastVerifiedAt: connection.lastVerifiedAt,
          lastAuthenticatedAt: connection.lastAuthenticatedAt
        }),
        network: connection.network,
        displayName: connection.displayName
      },
      message: 'Wallet information retrieved'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/wallet/wallets/all
// Get all connected wallets for authenticated user
router.get(
  '/wallets/all',
  verifyWalletAuth,
  async (req, res) => {
    try {
      const wallets = await getConnectedWallets(req.walletAddress);

      res.json({
        success: true,
        data: {
          address: req.walletAddress,
          connectedWallets: wallets,
          totalConnected: wallets.length
        },
        message: 'Connected wallets retrieved'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

// POST /api/wallet/disconnect
// Disconnect a wallet
router.post('/disconnect', validateWalletType, async (req, res) => {
  try {
    const { address, walletType, reason } = req.body;

    if (!address) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: address'
      });
    }

    const result = await disconnectWallet(
      address,
      walletType.toLowerCase(),
      reason
    );

    res.json({
      success: result.success,
      data: result,
      message: result.message
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/wallet/disconnect/:address
// Disconnect authenticated wallet
router.post(
  '/disconnect/:address',
  verifyWalletAuth,
  async (req, res) => {
    try {
      const { address } = req.params;
      const { reason } = req.body;

      // Verify ownership
      if (address.toLowerCase() !== req.walletAddress.toLowerCase()) {
        return res.status(403).json({
          success: false,
          error: 'You can only disconnect your own wallet'
        });
      }

      const result = await disconnectWallet(
        address,
        req.walletType,
        reason || 'User initiated'
      );

      res.json({
        success: result.success,
        data: result,
        message: result.message
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

// POST /api/wallet/logout
// Logout/revoke current session
router.post(
  '/logout',
  verifyWalletAuth,
  async (req, res) => {
    try {
      const result = await revokeSession(
        req.sessionId,
        'User logged out'
      );

      // Clear session cookie
      res.clearCookie('sessionId');

      res.json({
        success: result.success,
        data: result,
        message: 'Logged out successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

// PUT /api/wallet/profile
// Update wallet profile
router.put(
  '/profile',
  verifyWalletAuth,
  async (req, res) => {
    try {
      const { displayName, avatar, username, bio } = req.body;

      const result = await updateWalletProfile(
        req.walletAddress,
        req.walletType,
        {
          displayName,
          avatar,
          username,
          bio
        }
      );

      res.json({
        success: result.success,
        data: result,
        message: result.message
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

// GET /api/wallet/verify/:sessionId
// Verify a session without full authentication
router.get('/verify/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { verifySession } = require('../services/walletService');

    const verification = await verifySession(sessionId);

    res.json({
      success: verification.valid,
      data: verification,
      message: verification.valid ? 'Session is valid' : 'Session is invalid'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
