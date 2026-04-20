const crypto = require('crypto');
const WalletConnection = require('../models/WalletConnection');
const WalletSession = require('../models/WalletSession');

const CHALLENGE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// In-memory store for pending wallet connection challenges: nonce → { timestamp, expiresAt }
const pendingChallenges = new Map();

// Purge expired challenges every 15 minutes to prevent unbounded memory growth
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of pendingChallenges) {
    if (now > val.expiresAt) pendingChallenges.delete(key);
  }
}, 15 * 60 * 1000).unref();

let stacksTx;
try {
  stacksTx = require('@stacks/transactions');
} catch {
  stacksTx = null;
}

/**
 * Generate a unique nonce for wallet signature challenge
 */
function generateNonce() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate a unique session ID
 */
function generateSessionId() {
  return `sess_${crypto.randomBytes(16).toString('hex')}`;
}

/**
 * Verify a Stacks wallet signature (Hiro / Xverse VRS format).
 * Returns true if the signature is valid for the given message and public key.
 */
function verifyStacksSignature(message, signature, claimedPublicKey) {
  if (!stacksTx || !stacksTx.publicKeyFromSignatureVrs) {
    throw new Error('Signature verification unavailable: @stacks/transactions not loaded');
  }

  const normalSig = signature.startsWith('0x') ? signature.slice(2) : signature;
  const msgHash = hashSignMessage(message);

  try {
    const recoveredPubKey = stacksTx.publicKeyFromSignatureVrs(msgHash, { data: normalSig });
    const normalClaimed = claimedPublicKey.startsWith('0x') ? claimedPublicKey.slice(2) : claimedPublicKey;
    return recoveredPubKey.toLowerCase() === normalClaimed.toLowerCase();
  } catch {
    return false;
  }
}

/**
 * Reconstruct the exact message that was presented to the user for signing
 */
function buildSignMessage(nonce, timestamp) {
  return `Sign to connect your wallet\n\nNonce: ${nonce}\nTimestamp: ${timestamp}`;
}

/**
 * Hash a plaintext message the same way Stacks wallets do before signing.
 * Stacks personal sign: sha256( sha256("\x18Stacks Signed Message:\n" + len + message) )
 */
function hashSignMessage(message) {
  const prefix = `\x18Stacks Signed Message:\n${message.length}`;
  const prefixed = Buffer.from(prefix + message, 'utf8');
  return crypto.createHash('sha256').update(
    crypto.createHash('sha256').update(prefixed).digest()
  ).digest('hex');
}

/**
 * Create a connection request with nonce
 * User receives this challenge from wallet to sign
 */
async function createConnectionRequest(network = 'mainnet') {
  const nonce = generateNonce();
  const timestamp = Date.now();

  pendingChallenges.set(nonce, { timestamp, expiresAt: timestamp + CHALLENGE_TTL_MS });

  return {
    nonce,
    timestamp,
    message: `Sign to connect your wallet\n\nNonce: ${nonce}\nTimestamp: ${timestamp}`,
    network
  };
}

/**
 * Connect a wallet (Hiro or Xverse)
 * Called after user signs the challenge
 */
async function connectWallet(address, walletType, publicKey, signature, nonce, network = 'mainnet', metadata = {}) {
  try {
    // Validate inputs
    if (!address || !walletType || !publicKey) {
      throw new Error('Missing required fields: address, walletType, publicKey');
    }

    if (!['hiro', 'xverse'].includes(walletType)) {
      throw new Error('Invalid walletType. Must be "hiro" or "xverse"');
    }

    if (!['mainnet', 'testnet', 'devnet'].includes(network)) {
      throw new Error('Invalid network. Must be "mainnet", "testnet", or "devnet"');
    }

    if (!signature) {
      throw new Error('Signature is required');
    }
    const rawSig = signature.startsWith('0x') ? signature.slice(2) : signature;
    if (!/^[0-9a-fA-F]+$/.test(rawSig)) {
      throw new Error('Signature must be a hex-encoded string');
    }
    if (rawSig.length !== 130) {
      throw new Error(`Invalid signature length: expected 130 hex chars (65 bytes), got ${rawSig.length}`);
    }

    const rawPubKey = publicKey.startsWith('0x') ? publicKey.slice(2) : publicKey;
    if (!/^[0-9a-fA-F]{66}$/.test(rawPubKey)) {
      throw new Error('publicKey must be a 33-byte (66 hex char) compressed secp256k1 public key');
    }

    const challenge = pendingChallenges.get(nonce);
    if (!challenge) {
      throw new Error('Invalid or unknown nonce — request a new connection challenge');
    }
    if (Date.now() > challenge.expiresAt) {
      pendingChallenges.delete(nonce);
      throw new Error('Challenge expired — request a new connection challenge');
    }

    const signedMessage = buildSignMessage(nonce, challenge.timestamp);
    const isValid = verifyStacksSignature(signedMessage, signature, publicKey);
    if (!isValid) {
      throw new Error('Signature verification failed — signature does not match the provided public key');
    }

    // Consume nonce: each challenge may only be used once
    pendingChallenges.delete(nonce);

    // Check if wallet already connected
    let walletConnection = await WalletConnection.findOne({
      address: address.toLowerCase(),
      walletType
    });

    if (walletConnection) {
      // Update existing connection
      walletConnection.isConnected = true;
      walletConnection.publicKey = publicKey;
      walletConnection.connectedAt = new Date();
      walletConnection.lastVerifiedAt = new Date();
      walletConnection.network = network;
      walletConnection.metadata = {
        ...walletConnection.metadata,
        ...metadata
      };
      walletConnection.disconnectReason = null;
      walletConnection.disconnectedAt = null;
      await walletConnection.save();
    } else {
      // Create new wallet connection
      walletConnection = new WalletConnection({
        address: address.toLowerCase(),
        walletType,
        publicKey,
        isConnected: true,
        connectedAt: new Date(),
        lastVerifiedAt: new Date(),
        network,
        metadata
      });
      await walletConnection.save();
    }

    return {
      success: true,
      address: walletConnection.address,
      walletType: walletConnection.walletType,
      network: walletConnection.network,
      connectedAt: walletConnection.connectedAt,
      message: `${walletType} wallet connected successfully`
    };
  } catch (error) {
    throw new Error(`Failed to connect wallet: ${error.message}`);
  }
}

/**
 * Authenticate and create a session
 * Called after wallet connection is verified
 */
async function createSession(address, walletType, publicKey, network = 'mainnet', metadata = {}, sessionDurationHours = 24) {
  try {
    // Verify wallet is connected
    const walletConnection = await WalletConnection.findOne({
      address: address.toLowerCase(),
      walletType,
      isConnected: true
    });

    if (!walletConnection) {
      throw new Error('Wallet not connected. Please connect wallet first');
    }

    const sessionId = generateSessionId();
    const nonce = generateNonce();
    const expiresAt = new Date(Date.now() + sessionDurationHours * 60 * 60 * 1000);

    // Create session
    const session = new WalletSession({
      sessionId,
      address: address.toLowerCase(),
      walletType,
      publicKey,
      status: 'active',
      expiresAt,
      metadata,
      nonce,
      network,
      scopes: ['stacks_wallet_sign']
    });

    await session.save();

    // Update last authenticated time
    walletConnection.lastAuthenticatedAt = new Date();
    await walletConnection.save();

    return {
      sessionId,
      address: session.address,
      walletType: session.walletType,
      expiresAt: session.expiresAt,
      expiresIn: sessionDurationHours * 3600, // seconds
      message: 'Session created successfully'
    };
  } catch (error) {
    throw new Error(`Failed to create session: ${error.message}`);
  }
}

/**
 * Verify a session is active and valid
 */
async function verifySession(sessionId) {
  try {
    const session = await WalletSession.findOne({
      sessionId,
      status: 'active'
    });

    if (!session) {
      return { valid: false, reason: 'Session not found' };
    }

    if (new Date() > session.expiresAt) {
      session.status = 'expired';
      await session.save();
      return { valid: false, reason: 'Session expired' };
    }

    return {
      valid: true,
      address: session.address,
      walletType: session.walletType,
      expiresAt: session.expiresAt
    };
  } catch (error) {
    return { valid: false, reason: `Session verification failed: ${error.message}` };
  }
}

/**
 * Get wallet connection details
 */
async function getWalletConnection(address, walletType = null) {
  try {
    let query = { address: address.toLowerCase() };
    if (walletType) {
      query.walletType = walletType;
    }

    const connection = await WalletConnection.findOne(query);

    if (!connection) {
      return null;
    }

    return {
      address: connection.address,
      walletType: connection.walletType,
      isConnected: connection.isConnected,
      connectedAt: connection.connectedAt,
      lastVerifiedAt: connection.lastVerifiedAt,
      lastAuthenticatedAt: connection.lastAuthenticatedAt,
      network: connection.network,
      displayName: connection.displayName,
      profile: connection.profile
    };
  } catch (error) {
    throw new Error(`Failed to get wallet connection: ${error.message}`);
  }
}

/**
 * Get all wallets connected by an address
 */
async function getConnectedWallets(address) {
  try {
    const wallets = await WalletConnection.find({
      address: address.toLowerCase(),
      isConnected: true
    });

    return wallets.map(w => ({
      address: w.address,
      walletType: w.walletType,
      connectedAt: w.connectedAt,
      network: w.network,
      displayName: w.displayName
    }));
  } catch (error) {
    throw new Error(`Failed to get connected wallets: ${error.message}`);
  }
}

/**
 * Disconnect a wallet
 */
async function disconnectWallet(address, walletType, reason = 'User initiated disconnect') {
  try {
    const walletConnection = await WalletConnection.findOne({
      address: address.toLowerCase(),
      walletType
    });

    if (!walletConnection) {
      return { success: false, message: 'Wallet not found' };
    }

    walletConnection.isConnected = false;
    walletConnection.disconnectReason = reason;
    walletConnection.disconnectedAt = new Date();
    await walletConnection.save();

    // Revoke all active sessions for this wallet
    await WalletSession.updateMany(
      {
        address: address.toLowerCase(),
        walletType,
        status: 'active'
      },
      {
        status: 'revoked',
        revocationReason: reason
      }
    );

    return {
      success: true,
      message: `${walletType} wallet disconnected successfully`
    };
  } catch (error) {
    throw new Error(`Failed to disconnect wallet: ${error.message}`);
  }
}

/**
 * Revoke a session
 */
async function revokeSession(sessionId, reason = 'User initiated revoke') {
  try {
    const session = await WalletSession.findOne({ sessionId });

    if (!session) {
      return { success: false, message: 'Session not found' };
    }

    session.status = 'revoked';
    session.revocationReason = reason;
    await session.save();

    return {
      success: true,
      message: 'Session revoked successfully'
    };
  } catch (error) {
    throw new Error(`Failed to revoke session: ${error.message}`);
  }
}

/**
 * Clean up expired sessions
 */
async function cleanupExpiredSessions() {
  try {
    const result = await WalletSession.updateMany(
      {
        status: 'active',
        expiresAt: { $lt: new Date() }
      },
      {
        status: 'expired'
      }
    );

    return {
      modifiedCount: result.modifiedCount,
      message: `Cleaned up ${result.modifiedCount} expired sessions`
    };
  } catch (error) {
    throw new Error(`Failed to cleanup expired sessions: ${error.message}`);
  }
}

/**
 * Update wallet metadata (profile, display name, etc)
 */
async function updateWalletProfile(address, walletType, profileData) {
  try {
    const walletConnection = await WalletConnection.findOne({
      address: address.toLowerCase(),
      walletType,
      isConnected: true
    });

    if (!walletConnection) {
      throw new Error('Wallet connection not found');
    }

    // Whitelist allowed profile fields
    const allowedFields = ['avatar', 'username', 'bio'];
    const safeProfile = {};

    for (const field of allowedFields) {
      if (field in profileData) {
        safeProfile[field] = profileData[field];
      }
    }

    walletConnection.profile = {
      ...walletConnection.profile,
      ...safeProfile
    };

    if (profileData.displayName) {
      walletConnection.displayName = profileData.displayName;
    }

    await walletConnection.save();

    return {
      success: true,
      profile: walletConnection.profile,
      displayName: walletConnection.displayName,
      message: 'Profile updated successfully'
    };
  } catch (error) {
    throw new Error(`Failed to update wallet profile: ${error.message}`);
  }
}

module.exports = {
  generateNonce,
  generateSessionId,
  createConnectionRequest,
  connectWallet,
  createSession,
  verifySession,
  getWalletConnection,
  getConnectedWallets,
  disconnectWallet,
  revokeSession,
  cleanupExpiredSessions,
  updateWalletProfile
};
