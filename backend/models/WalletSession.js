const mongoose = require('mongoose');

const WalletSessionSchema = new mongoose.Schema(
  {
    // Session token/ID
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },

    // Wallet address
    address: {
      type: String,
      required: true,
      lowercase: true,
      index: true
    },

    // Wallet type
    walletType: {
      type: String,
      enum: ['hiro', 'xverse'],
      required: true
    },

    // Public key used for verification
    publicKey: {
      type: String,
      required: true
    },

    // Session status: 'active', 'expired', 'revoked'
    status: {
      type: String,
      enum: ['active', 'expired', 'revoked', 'inactive'],
      default: 'active',
      index: true
    },

    // When session expires
    expiresAt: {
      type: Date,
      required: true,
      index: true
    },

    // Session metadata
    metadata: {
      ipAddress: String,
      userAgent: String,
      browser: String,
      os: String,
      appVersion: String
    },

    // Challenge nonce used for signature
    nonce: {
      type: String,
      required: true
    },

    // Scope of permissions for this session
    scopes: {
      type: [String],
      default: ['stacks_wallet_sign'],
      enum: ['stacks_wallet_sign', 'stacks_wallet_read', 'stacks_wallet_admin']
    },

    // Network: 'mainnet', 'testnet', 'devnet'
    network: {
      type: String,
      enum: ['mainnet', 'testnet', 'devnet'],
      default: 'mainnet',
      required: true
    },

    // Revocation reason (if applicable)
    revocationReason: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true,
    collection: 'wallet_sessions'
  }
);

// Index for active sessions
WalletSessionSchema.index({ address: 1, status: 1, expiresAt: 1 });

// Index for session lookup
WalletSessionSchema.index({ sessionId: 1, status: 1 });

// Index for cleanup - find expired sessions
WalletSessionSchema.index({ expiresAt: 1, status: 1 });

module.exports = mongoose.model('WalletSession', WalletSessionSchema);
