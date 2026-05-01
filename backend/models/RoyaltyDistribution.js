const mongoose = require('mongoose');

const royaltyDistributionSchema = new mongoose.Schema({
  purchaseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Purchase', default: null },
  subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', default: null },
  subscriptionRenewalId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionRenewal', default: null },
  sourceType: { type: String, enum: ['purchase', 'subscription', 'subscription-renewal'], default: 'purchase' },
  contentId: { type: Number, default: null },
  collaboratorAddress: { type: String, required: true },
  royaltyPercentage: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  royaltyAmount: { type: Number, required: true },
  txId: { type: String, default: null },
  status: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
  distributedAt: { type: Date, default: null },
  failureReason: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('RoyaltyDistribution', royaltyDistributionSchema);
