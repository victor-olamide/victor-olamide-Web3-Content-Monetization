const mongoose = require('mongoose');

const batchOperationSchema = new mongoose.Schema({
  creator: { type: String, required: true },
  operationType: { type: String, enum: ['update-price', 'remove-content', 'update-metadata', 'get-status'], required: true },
  status: { type: String, enum: ['pending', 'processing', 'completed', 'partial-failure', 'failed'], default: 'pending' },
  totalItems: { type: Number, required: true },
  successCount: { type: Number, default: 0 },
  failureCount: { type: Number, default: 0 },
  contentIds: [{ type: Number }],
  updatePayload: mongoose.Schema.Types.Mixed, // Contains the update data (price, metadata, etc)
  results: [{
    contentId: Number,
    success: Boolean,
    message: String,
    error: String,
    timestamp: { type: Date, default: Date.now }
  }],
  startedAt: { type: Date, default: Date.now },
  completedAt: { type: Date, default: null },
  retryCount: { type: Number, default: 0 },
  maxRetries: { type: Number, default: 3 }
});

// Index for fast lookup
batchOperationSchema.index({ creator: 1, createdAt: -1 });
batchOperationSchema.index({ status: 1 });

module.exports = mongoose.model('BatchOperation', batchOperationSchema);
