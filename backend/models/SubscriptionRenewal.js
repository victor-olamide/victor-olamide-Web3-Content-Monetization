const mongoose = require('mongoose');

const subscriptionRenewalSchema = new mongoose.Schema({
  subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', required: true },
  user: { type: String, required: true },
  creator: { type: String, required: true },
  tierId: { type: Number, required: true },
  previousExpiryDate: { type: Date, required: true },
  newExpiryDate: { type: Date, required: true },
  renewalAmount: { type: Number, required: true },
  platformFee: { type: Number, default: 0 },
  creatorAmount: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'], default: 'pending' },
  renewalType: { type: String, enum: ['automatic', 'manual', 'grace-period-recovery'], default: 'automatic' },
  transactionId: { type: String, default: null },
  failureReason: { type: String, default: null },
  attemptNumber: { type: Number, default: 1 },
  maxAttempts: { type: Number, default: 3 },
  nextRetryDate: { type: Date, default: null },
  processedAt: { type: Date, default: null },
  notes: { type: String, default: null },
  graceUsed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes for efficient querying
subscriptionRenewalSchema.index({ subscriptionId: 1 });
subscriptionRenewalSchema.index({ user: 1, creator: 1 });
subscriptionRenewalSchema.index({ status: 1 });
subscriptionRenewalSchema.index({ renewalType: 1 });
subscriptionRenewalSchema.index({ createdAt: -1 });
subscriptionRenewalSchema.index({ nextRetryDate: 1 });

module.exports = mongoose.model('SubscriptionRenewal', subscriptionRenewalSchema);
