const mongoose = require('mongoose');

const licenseSchema = new mongoose.Schema({
  contentId: { type: Number, required: true },
  user: { type: String, required: true },
  licenseType: { type: String, enum: ['rental-24h', 'rental-7d', 'rental-30d', 'permanent'], default: 'rental-24h' },
  purchasePrice: { type: Number, required: true },
  issuedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  isExpired: { type: Boolean, default: false },
  txId: { type: String, required: true },
  creator: { type: String, required: true },
  renewalCount: { type: Number, default: 0 },
  lastRenewedAt: { type: Date, default: null }
});

// Index for fast lookup of active licenses
licenseSchema.index({ user: 1, contentId: 1, expiresAt: 1 });
licenseSchema.index({ expiresAt: 1 });

module.exports = mongoose.model('License', licenseSchema);
