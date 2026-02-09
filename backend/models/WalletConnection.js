const mongoose = require('mongoose');

const WalletConnectionSchema = new mongoose.Schema(
  {
    // User/creator wallet address
    address: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true
    },

    // Wallet type: 'hiro' or 'xverse'
    walletType: {
      type: String,
      enum: ['hiro', 'xverse'],
      required: true,
      index: true
    },

    // Public key for signature verification
    publicKey: {
      type: String,
      required: true,
      index: true
    },

    // Connection status
    isConnected: {
      type: Boolean,
      default: true,
      index: true
    },

    // When wallet was connected
    connectedAt: {
      type: Date,
      default: Date.now,
      index: true
    },

    // Last time wallet was verified (signature verified)
    lastVerifiedAt: {
      type: Date,
      default: null
    },

    // Last authentication time
    lastAuthenticatedAt: {
      type: Date,
      default: null
    },

    // Network: 'mainnet', 'testnet', 'devnet'
    network: {
      type: String,
      enum: ['mainnet', 'testnet', 'devnet'],
      default: 'mainnet',
      required: true,
      index: true
    },

    // Optional display name from wallet
    displayName: {
      type: String,
      default: null
    },

    // Profile information (optional)
    profile: {
      avatar: String,
      username: String,
      bio: String
    },

    // Connection metadata
    metadata: {
      appVersion: String,
      browser: String,
      os: String,
      lastIpAddress: String
    },

    // Disconnect reason (if disconnected)
    disconnectReason: {
      type: String,
      default: null
    },

    // When wallet was disconnected (if applicable)
    disconnectedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    collection: 'wallet_connections'
  }
);

// Index for efficient querying by address and wallet type
WalletConnectionSchema.index({ address: 1, walletType: 1 }, { unique: true });

// Index for finding connected wallets
WalletConnectionSchema.index({ isConnected: 1, connectedAt: -1 });

// Index for user sessions
WalletConnectionSchema.index({ address: 1, lastAuthenticatedAt: -1 });

module.exports = mongoose.model('WalletConnection', WalletConnectionSchema);
