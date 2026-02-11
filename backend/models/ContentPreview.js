const mongoose = require('mongoose');

const contentPreviewSchema = new mongoose.Schema({
  contentId: { type: Number, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String },
  contentType: { type: String, enum: ['video', 'article', 'image', 'music'], required: true },
  price: { type: Number, required: true },
  creator: { type: String, required: true },
  
  // Preview-specific fields
  thumbnailUrl: { type: String }, // IPFS or storage URL for thumbnail
  thumbnailStorageType: { type: String, enum: ['ipfs', 'gaia'], default: 'ipfs' },
  
  trailerUrl: { type: String }, // IPFS or storage URL for trailer/preview video
  trailerStorageType: { type: String, enum: ['ipfs', 'gaia'], default: 'ipfs' },
  trailerDuration: { type: Number }, // Duration in seconds
  trailerSize: { type: Number }, // File size in bytes
  
  previewText: { type: String }, // Short preview text for articles
  previewImageUrl: { type: String }, // Preview image for articles
  
  // Preview metadata
  previewEnabled: { type: Boolean, default: true },
  totalViews: { type: Number, default: 0 },
  totalPreviewDownloads: { type: Number, default: 0 },
  
  // Preview quality information
  thumbnailQuality: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'ultra'], 
    default: 'high' 
  },
  trailerQuality: { 
    type: String, 
    enum: ['360p', '480p', '720p', '1080p'], 
    default: '720p' 
  },
  
  // Content access restriction
  contentAccessType: { 
    type: String, 
    enum: ['purchase_required', 'subscription_required', 'token_gated', 'free'], 
    default: 'purchase_required' 
  },
  
  // Preview analytics
  previewAnalytics: {
    dailyViews: { type: Map, of: Number, default: new Map() },
    dailyDownloads: { type: Map, of: Number, default: new Map() },
    lastAnalyticsUpdate: { type: Date },
    conversionRate: { type: Number, default: 0 },
    averageWatchTime: { type: Number, default: 0 } // in seconds for videos
  },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Index for efficient queries
contentPreviewSchema.index({ contentId: 1 });
contentPreviewSchema.index({ creator: 1 });
contentPreviewSchema.index({ previewEnabled: 1 });
contentPreviewSchema.index({ contentType: 1 });

module.exports = mongoose.model('ContentPreview', contentPreviewSchema);
