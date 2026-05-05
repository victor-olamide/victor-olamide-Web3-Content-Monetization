/**
 * ContentEncryption Model
 * Stores encrypted content URLs and encryption metadata
 */

const mongoose = require('mongoose');

const contentEncryptionSchema = new mongoose.Schema({
  // References
  contentId: { type: Number, required: true, indexed: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, indexed: true },

  // Content metadata
  contentType: { type: String, enum: ['video', 'article', 'image', 'music', 'file'], required: true },

  // Encrypted content URL and metadata
  encryptedUrl: { type: String, required: true },
  encryptionIv: { type: String, required: true }, // Initialization Vector
  encryptionTag: { type: String, required: true }, // Authentication Tag for GCM

  // Access control
  isActive: { type: Boolean, default: true, indexed: true },
  expiresAt: { type: Date, indexed: true }, // Access expiration time
  revokedAt: { type: Date }, // When access was revoked
  expiredAt: { type: Date }, // When access expired automatically

  // Access tracking
  accessAttempts: { type: Number, default: 0 },
  lastAccessedAt: { type: Date },
  failedAccessAttempts: { type: Number, default: 0 },
  lastFailedAccessAt: { type: Date },

  // Purchase information
  purchaseTransactionId: { type: String }, // Link to purchase transaction
  purchasedAt: { type: Date, default: Date.now },

  // Temporary access tokens
  accessTokens: [
    {
      token: { type: String, unique: true },
      createdAt: { type: Date, default: Date.now },
      expiresAt: { type: Date },
      usedAt: { type: Date },
      ipAddress: { type: String }
    }
  ],

  // Encryption metadata
  encryptionAlgorithm: { type: String, default: 'aes-256-gcm' },
  encryptionVersion: { type: Number, default: 1 },

  // Additional metadata
  metadata: { type: Map, of: String },

  // Timestamps
  createdAt: { type: Date, default: Date.now, indexed: true },
  updatedAt: { type: Date, default: Date.now }
});

// Compound indexes for efficient queries
contentEncryptionSchema.index({ contentId: 1, userId: 1, isActive: 1 });
contentEncryptionSchema.index({ userId: 1, isActive: 1, expiresAt: 1 });
contentEncryptionSchema.index({ userId: 1, createdAt: -1 });

// TTL index to automatically delete expired records after 60 days
contentEncryptionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 5184000 });

// Pre-save middleware to update updatedAt
contentEncryptionSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('ContentEncryption', contentEncryptionSchema);
