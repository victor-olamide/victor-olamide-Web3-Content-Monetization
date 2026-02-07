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
  tokenGating: {
    enabled: { type: Boolean, default: false },
    tokenType: { type: String, enum: ['sip-009', 'sip-010'], default: 'sip-009' },
    tokenContract: { type: String }, // Contract address
    minBalance: { type: Number, default: 1 } // Minimum tokens/NFTs required
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Content', contentSchema);
