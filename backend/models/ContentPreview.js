const mongoose = require('mongoose');

const urlValidator = function (v) {
  if (!v) return true; // allow empty
  // Allow https://, http://, ipfs://, or raw IPFS hashes (Qm... or bafy...)
  return /^(https?:\/\/|ipfs:\/\/|Qm[1-9A-HJ-NP-Za-km-z]{44}|bafy[0-9a-z]{50,})/.test(v);
};

const contentPreviewSchema = new mongoose.Schema({
  contentId: { type: Number, required: true, unique: true },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  description: { type: String, trim: true, maxlength: 2000 },
  contentType: { type: String, enum: ['video', 'article', 'image', 'music'], required: true },
  price: { type: Number, required: true, min: 0 },
  creator: { type: String, required: true, trim: true, maxlength: 100 },
  
  // Preview-specific fields
  thumbnailUrl: { type: String, validate: { validator: urlValidator, message: 'Invalid thumbnailUrl' } }, // IPFS or storage URL for thumbnail
  thumbnailStorageType: { type: String, enum: ['ipfs', 'gaia'], default: 'ipfs' },
  
  trailerUrl: { type: String, validate: { validator: urlValidator, message: 'Invalid trailerUrl' } }, // IPFS or storage URL for trailer/preview video
  trailerStorageType: { type: String, enum: ['ipfs', 'gaia'], default: 'ipfs' },
  trailerDuration: { type: Number, min: 0 }, // Duration in seconds
  trailerSize: { type: Number, min: 0 }, // File size in bytes
  
  previewText: { type: String, trim: true, maxlength: 500 }, // Short preview text for articles
  previewImageUrl: { type: String, validate: { validator: urlValidator, message: 'Invalid previewImageUrl' } }, // Preview image for articles
  
  // Preview metadata
  previewEnabled: { type: Boolean, default: true },
  totalViews: { type: Number, default: 0, min: 0 },
  totalPreviewDownloads: { type: Number, default: 0, min: 0 },
  
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
    conversionRate: { type: Number, default: 0, min: 0 },
    averageWatchTime: { type: Number, default: 0, min: 0 } // in seconds for videos
  },
  
  // IPFS Pinning information for preview assets
  pinningInfo: {
    thumbnail: {
      primaryHash: { type: String },
      replicas: [{
        provider: { type: String },
        hash: { type: String },
        url: { type: String },
        timestamp: { type: Date },
        size: { type: Number }
      }],
      pinnedAt: { type: Date }
    },
    trailer: {
      primaryHash: { type: String },
      replicas: [{
        provider: { type: String },
        hash: { type: String },
        url: { type: String },
        timestamp: { type: Date },
        size: { type: Number }
      }],
      pinnedAt: { type: Date }
    },
    pinnedAt: { type: Date }, // Overall pinning timestamp
    errors: [{ type: Object }] // Any pinning errors
  },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Ensure updatedAt is kept current
contentPreviewSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Index for efficient queries
contentPreviewSchema.index({ contentId: 1 });
contentPreviewSchema.index({ creator: 1 });
contentPreviewSchema.index({ previewEnabled: 1 });
contentPreviewSchema.index({ contentType: 1 });

module.exports = mongoose.model('ContentPreview', contentPreviewSchema);
