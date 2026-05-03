const mongoose = require('mongoose');

const purchaseSchema = new mongoose.Schema({
  contentId: { type: Number, required: true },
  user: { type: String, required: true },
  creator: { type: String, required: true },
  txId: { type: String, required: true, unique: true },
  amount: { type: Number, required: true },
  platformFee: { type: Number, default: 0 },
  creatorAmount: { type: Number, required: true },
  refundStatus: { type: String, enum: ['none', 'pending', 'processing', 'completed', 'failed'], default: 'none' },
  refundAmount: { type: Number, default: null },
  refundTxId: { type: String, default: null },
  refundedAt: { type: Date, default: null },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Purchase', purchaseSchema);
