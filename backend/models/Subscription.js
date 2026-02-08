const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  user: { type: String, required: true },
  creator: { type: String, required: true },
  tierId: { type: Number, required: true },
  amount: { type: Number, required: true, default: 0 },
  expiry: { type: Date, required: true },
  transactionId: { type: String, required: true, unique: true },
  renewalStatus: { type: String, enum: ['active', 'expiring-soon', 'expired', 'renewal-pending', 'renewal-failed'], default: 'active' },
  autoRenewal: { type: Boolean, default: true },
  gracePeriodDays: { type: Number, default: 7 },
  graceExpiresAt: { type: Date, default: null },
  renewalAttempts: { type: Number, default: 0 },
  lastRenewalAttempt: { type: Date, default: null },
  nextRenewalDate: { type: Date, default: null },
  renewalTxId: { type: String, default: null },
  cancelledAt: { type: Date, default: null },
  cancelReason: { type: String, default: null },
  timestamp: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Index for efficient querying
subscriptionSchema.index({ user: 1, creator: 1 });
subscriptionSchema.index({ renewalStatus: 1 });
subscriptionSchema.index({ expiry: 1 });
subscriptionSchema.index({ nextRenewalDate: 1 });
subscriptionSchema.index({ graceExpiresAt: 1 });

module.exports = mongoose.model('Subscription', subscriptionSchema);