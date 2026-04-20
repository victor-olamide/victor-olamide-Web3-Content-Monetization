const mongoose = require('mongoose');

const transactionVerificationSchema = new mongoose.Schema({
  txId: { type: String, required: true, unique: true, index: true },
  status: { type: String, required: true },
  verified: { type: Boolean, required: true, default: false },
  confirmations: { type: Number, default: 0 },
  blockHeight: { type: Number, default: null },
  blockTime: { type: String, default: null },
  txType: { type: String, enum: ['purchase', 'subscription', 'unknown', null], default: null },
  senderAddress: { type: String, default: null },
  verifiedAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

transactionVerificationSchema.index({ verified: 1 });
transactionVerificationSchema.index({ verifiedAt: -1 });

module.exports = mongoose.model('TransactionVerification', transactionVerificationSchema);
