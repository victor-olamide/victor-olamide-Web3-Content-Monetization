/**
 * Viewing History Model
 * Tracks user content viewing history for recommendations
 */

const mongoose = require('mongoose');

const viewingHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  contentId: {
    type: Number,
    required: true,
    index: true
  },
  contentType: {
    type: String,
    enum: ['video', 'article', 'image', 'music'],
    required: true
  },
  creator: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  viewedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  viewDuration: {
    type: Number, // in seconds
    default: 0
  },
  completionRate: {
    type: Number, // 0-100
    default: 0
  },
  liked: {
    type: Boolean,
    default: false
  },
  shared: {
    type: Boolean,
    default: false
  },
  sessionId: {
    type: String,
    index: true
  }
}, { timestamps: true });

// Compound indexes
viewingHistorySchema.index({ userId: 1, viewedAt: -1 });
viewingHistorySchema.index({ userId: 1, contentId: 1 });
viewingHistorySchema.index({ userId: 1, contentType: 1 });

module.exports = mongoose.model('ViewingHistory', viewingHistorySchema);