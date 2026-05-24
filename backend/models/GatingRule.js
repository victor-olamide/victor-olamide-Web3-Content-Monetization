const mongoose = require('mongoose');

const gatingRuleSchema = new mongoose.Schema({
  contentId: { type: Number, required: true, unique: true },
  tokenContract: { type: String, required: true },
  tokenType: { type: String, enum: ['FT', 'NFT'], default: 'FT' },
  tokenSymbol: { type: String },
  tokenDecimals: { type: Number, default: 6 },
  threshold: { type: String, required: true }, // Using String for large numbers/uints
  description: { type: String },
  isActive: { type: Boolean, default: true },
  creator: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('GatingRule', gatingRuleSchema);
