const mongoose = require('mongoose');

const gatingRuleSchema = new mongoose.Schema({
  contentId: { type: Number, required: true, unique: true },
  tokenContract: { type: String, required: true },
  threshold: { type: String, required: true }, // Using String for large numbers/uints
  creator: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('GatingRule', gatingRuleSchema);
