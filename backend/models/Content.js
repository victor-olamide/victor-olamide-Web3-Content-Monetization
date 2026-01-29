const mongoose = require('mongoose');

const contentSchema = new mongoose.Schema({
  contentId: { type: Number, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String },
  contentType: { type: String, enum: ['video', 'article', 'image', 'music'], default: 'video' },
  price: { type: Number, required: true },
  creator: { type: String, required: true },
  url: { type: String, required: true }, // IPFS or Gaia URL
  storageType: { type: String, enum: ['ipfs', 'gaia'], default: 'ipfs' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Content', contentSchema);
