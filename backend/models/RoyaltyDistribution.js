const mongoose = require('mongoose');

const royaltyDistributionSchema = new mongoose.Schema({
  purchaseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Purchase', required: true },
  contentId: { type: Number, required: true },
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
