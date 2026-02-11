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
  isRemoved: { type: Boolean, default: false },
  removedAt: { type: Date, default: null },
  removalReason: { type: String, default: null },
  refundable: { type: Boolean, default: true },
  refundWindowDays: { type: Number, default: 30 },
  
  // Preview content integration
  hasPreview: { type: Boolean, default: false },
  previewEnabled: { type: Boolean, default: true },
  previewId: { type: mongoose.Schema.Types.ObjectId, ref: 'ContentPreview' },
  
  createdAt: { type: Date, default: Date.now }
});

// Text index for search on title and description
contentSchema.index({ title: 'text', description: 'text' });
contentSchema.index({ hasPreview: 1 });
contentSchema.index({ previewEnabled: 1 });

module.exports = mongoose.model('Content', contentSchema);
