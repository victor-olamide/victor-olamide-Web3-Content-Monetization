const { verifySession } = require('../services/walletService');
const WalletSession = require('../models/WalletSession');

/**
 * Middleware to verify wallet is authenticated
 * Checks for valid session token in header or cookies
 */
async function verifyWalletAuth(req, res, next) {
  try {
    // Get session ID from header or cookie
    const sessionId = req.headers['x-session-id'] || req.cookies?.sessionId;

    if (!sessionId) {
      return res.status(401).json({
        message: 'Authentication required',
        error: 'No session ID provided'
      });
    }

    // Verify session
    const verification = await verifySession(sessionId);

    if (!verification.valid) {
      return res.status(401).json({
        message: 'Authentication failed',
        error: verification.reason
      });
    }

    // Attach session info to request
    req.sessionId = sessionId;
    req.walletAddress = verification.address;
    req.walletType = verification.walletType;
    req.expiresAt = verification.expiresAt;

    next();
  } catch (error) {
    console.error('Wallet auth middleware error:', error);
    res.status(500).json({
      message: 'Authentication error',
      error: error.message
    });
  }
}

/**
 * Middleware for optional wallet authentication
 * Does not fail if wallet not authenticated, just attaches data if available
 */
async function optionalWalletAuth(req, res, next) {
  try {
    const sessionId = req.headers['x-session-id'] || req.cookies?.sessionId;

    if (sessionId) {
      const verification = await verifySession(sessionId);

      if (verification.valid) {
        req.sessionId = sessionId;
        req.walletAddress = verification.address;
        req.walletType = verification.walletType;
        req.isAuthenticated = true;
      }
    }

    next();
  } catch (error) {
    // Log error but don't fail
    console.warn('Optional wallet auth warning:', error.message);
    next();
  }
}

/**
 * Middleware to check if wallet is connected (basic check)
 * Verifies wallet address is provided
 */
function requireWalletAddress(req, res, next) {
  const address = req.headers['x-wallet-address'] || req.body?.walletAddress || req.query?.address;

  if (!address) {
    return res.status(400).json({
      message: 'Wallet address required',
      error: 'No wallet address provided'
    });
  }

  req.walletAddress = address.toLowerCase();
  next();
}

/**
 * Middleware to match wallet address in request to authenticated wallet
 */
async function verifyWalletOwnership(req, res, next) {
  try {
    const { address } = req.params || {};
    const requestAddress = req.walletAddress;

    if (!requestAddress) {
      return res.status(401).json({
        message: 'Authentication required',
        error: 'Wallet not authenticated'
      });
    }

    if (address && address.toLowerCase() !== requestAddress.toLowerCase()) {
      return res.status(403).json({
        message: 'Access denied',
        error: 'You can only access your own wallet data'
      });
    }

    next();
  } catch (error) {
    console.error('Wallet ownership verification error:', error);
    res.status(500).json({
      message: 'Verification error',
      error: error.message
    });
  }
}

/**
 * Middleware to check if request has valid wallet type
 */
function validateWalletType(req, res, next) {
  const { walletType } = req.body || req.query || req.params;

  if (!walletType) {
    return res.status(400).json({
      message: 'Invalid request',
      error: 'Wallet type is required'
    });
  }

  if (!['hiro', 'xverse'].includes(walletType.toLowerCase())) {
    return res.status(400).json({
      message: 'Invalid wallet type',
      error: `Wallet type must be 'hiro' or 'xverse', got '${walletType}'`
    });
  }

  req.walletType = walletType.toLowerCase();
  next();
}

/**
 * Middleware to validate network parameter
 */
function validateNetwork(req, res, next) {
  const network = req.headers['x-network'] || req.body?.network || req.query?.network || 'mainnet';

  if (!['mainnet', 'testnet', 'devnet'].includes(network.toLowerCase())) {
    return res.status(400).json({
      message: 'Invalid network',
      error: `Network must be 'mainnet', 'testnet', or 'devnet', got '${network}'`
    });
  }

  req.network = network.toLowerCase();
  next();
}

/**
 * Middleware to check session expiration and warn if close to expiring
 */
async function checkSessionExpiration(req, res, next) {
  try {
    const sessionId = req.sessionId;

    if (!sessionId) {
      return next();
    }

    const session = await WalletSession.findOne({ sessionId });

    if (!session) {
      return next();
    }

    const now = new Date();
    const timeToExpire = session.expiresAt - now;
    const warningThreshold = 30 * 60 * 1000; // 30 minutes

    if (timeToExpire < warningThreshold && timeToExpire > 0) {
      res.set('X-Session-Expires-Soon', 'true');
      res.set('X-Session-Expires-In', Math.floor(timeToExpire / 1000).toString());
    }

    next();
  } catch (error) {
    console.warn('Session expiration check error:', error);
    next();
  }
}

/**
 * Middleware to attach client metadata to request
 */
function attachClientMetadata(req, res, next) {
  req.clientMetadata = {
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.headers['user-agent'],
    browser: req.headers['x-browser'] || 'unknown',
    os: req.headers['x-os'] || 'unknown',
    appVersion: req.headers['x-app-version'] || 'unknown'
  };

  next();
}

module.exports = {
  verifyWalletAuth,
  optionalWalletAuth,
  requireWalletAddress,
  verifyWalletOwnership,
  validateWalletType,
  validateNetwork,
  checkSessionExpiration,
  attachClientMetadata
};
