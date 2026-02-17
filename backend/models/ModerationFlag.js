/**
 * ModerationFlag Model
 * Tracks individual content flags/reports submitted by users
 */

const mongoose = require('mongoose');

const moderationFlagSchema = new mongoose.Schema({
  flagId: {
    type: String,
    unique: true,
    required: true,
    index: true
  },
  contentId: {
    type: Number,
    required: true,
    index: true,
    ref: 'Content'
  },
  flaggedBy: {
    type: String,
    required: true,
    lowercase: true,
    index: true
  },
  flagType: {
    type: String,
    enum: ['user-report', 'automated-detection', 'creator-removal', 'system-initiated'],
    default: 'user-report',
    index: true
  },
  reason: {
    type: String,
    enum: [
      'copyright-violation',
      'adult-content',
      'hate-speech',
      'violence',
      'misinformation',
      'spam',
      'harassment',
      'illegal-content',
      'low-quality',
      'misleading-title',
      'other'
    ],
    required: true,
    index: true
  },
  description: {
    type: String,
    maxlength: 2000
  },
  evidence: {
    links: [String],
    timestamps: [Number],
    details: String
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['submitted', 'received', 'in-review', 'acted-upon', 'dismissed', 'resolved'],
    default: 'submitted',
    index: true
  },
  actionTaken: {
    type: String,
    enum: ['none', 'content-removed', 'creator-warned', 'creator-suspended', 'merged-queue'],
    default: 'none'
  },
  queueId: {
    type: Number,
    index: true,
    ref: 'ModerationQueue'
  },
  reviewedBy: {
    type: String,
    lowercase: true,
    index: true
  },
  reviewedAt: Date,
  reviewNotes: String,
  reasonForDismissal: String,
  userContact: {
    email: String,
    preferNotification: Boolean
  },
  ipAddress: String,
  reportMetadata: {
    userAgent: String,
    referrer: String,
    contentSnapshot: String
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'moderation_flags'
});

// Index for common queries
moderationFlagSchema.index({ status: 1, createdAt: -1 });
moderationFlagSchema.index({ contentId: 1, flagType: 1 });
moderationFlagSchema.index({ reason: 1, status: 1 });
moderationFlagSchema.index({ flaggedBy: 1, createdAt: -1 });

// Middleware to update timestamps
moderationFlagSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('ModerationFlag', moderationFlagSchema);
