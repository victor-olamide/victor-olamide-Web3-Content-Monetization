const mongoose = require('mongoose');

const refundSchema = new mongoose.Schema({
  purchaseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Purchase', required: true },
  contentId: { type: Number, required: true },
  user: { type: String, required: true },
  creator: { type: String, required: true },
  originalPurchaseAmount: { type: Number, required: true },
  refundAmount: { type: Number, required: true },
  reason: { type: String, enum: ['content-removed', 'manual-request', 'partial', 'dispute'], default: 'content-removed' },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'processing', 'completed', 'failed'], default: 'pending' },
  txId: { type: String, default: null }, // On-chain transaction ID
  approvedBy: { type: String, default: null }, // Admin/Creator who approved
  approvedAt: { type: Date, default: null },
  processedAt: { type: Date, default: null },
  notes: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Index for efficient querying
refundSchema.index({ contentId: 1, user: 1 });
refundSchema.index({ status: 1 });
refundSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Refund', refundSchema);
