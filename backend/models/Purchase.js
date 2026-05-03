const mongoose = require('mongoose');

const purchaseSchema = new mongoose.Schema({
  contentId: { type: Number, required: true },
  user: { type: String, required: true },
  creator: { type: String, required: true },
  txId: { type: String, required: true, unique: true },
  amount: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Purchase', purchaseSchema);
