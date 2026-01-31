const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  user: { type: String, required: true },
  creator: { type: String, required: true },
  tierId: { type: Number, required: true },
  amount: { type: Number, required: true, default: 0 },
  expiry: { type: Date, required: true },
  transactionId: { type: String, required: true, unique: true },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Subscription', subscriptionSchema);