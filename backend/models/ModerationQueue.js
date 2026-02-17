/**
 * ModerationQueue Model
 * Manages content flagged for moderation review
 */

const mongoose = require('mongoose');

const moderationQueueSchema = new mongoose.Schema({
  queueId: {
    type: Number,
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
  contentTitle: {
    type: String,
    required: true
  },
  creator: {
    type: String,
    required: true,
    lowercase: true,
    index: true
  },
  contentType: {
    type: String,
    enum: ['video', 'article', 'image', 'music'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'under-review', 'approved', 'rejected', 'removed', 'appealed'],
    default: 'pending',
    index: true
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
    index: true
  },
  priority: {
    type: Number,
    default: 1,
    min: 1,
    max: 5,
    index: true
  },
  flagCount: {
    type: Number,
    default: 1,
    min: 1,
    index: true
  },
  firstFlaggedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  lastFlaggedAt: {
    type: Date,
    default: Date.now
  },
  assignedModerator: {
    type: String,
    lowercase: true,
    index: true
  },
  assignedAt: Date,
  reviewStartedAt: Date,
  reviewCompletedAt: Date,
  decision: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'removed', 'suspended'],
    default: 'pending'
  },
  decisionReason: String,
  decisionNotes: String,
  removalReason: {
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
      'other'
    ]
  },
  appealDeadline: Date,
  appealCount: {
    type: Number,
    default: 0
  },
  lastAppealAt: Date,
  tags: {
    type: [String],
    default: [],
    index: true
  },
  flags: [
    {
      flagId: mongoose.Schema.Types.ObjectId,
      flaggedBy: {
        type: String,
        lowercase: true
      },
      reason: String,
      details: String,
      flaggedAt: {
        type: Date,
        default: Date.now
      }
    }
  ],
  reviewHistory: [
    {
      reviewerAddress: {
        type: String,
        lowercase: true
      },
      action: {
        type: String,
        enum: ['assigned', 'reviewed', 'approved', 'rejected', 'removed', 'reassigned']
      },
      notes: String,
      timestamp: {
        type: Date,
        default: Date.now
      },
      changes: mongoose.Schema.Types.Mixed
    }
  ],
  contentSnapshot: {
    title: String,
    description: String,
    url: String,
    price: Number,
    isRemoved: Boolean,
    removedAt: Date,
    removalReason: String
  },
  metrics: {
    viewsAtFlagging: {
      type: Number,
      default: 0
    },
    purchasesAtFlagging: {
      type: Number,
      default: 0
    },
    totalRevenueAtFlagging: {
      type: Number,
      default: 0
    }
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
  collection: 'moderation_queue'
});

// Index for common queries
moderationQueueSchema.index({ status: 1, priority: -1, createdAt: -1 });
moderationQueueSchema.index({ assignedModerator: 1, status: 1 });
moderationQueueSchema.index({ creator: 1, status: 1 });
moderationQueueSchema.index({ severity: 1, status: 1 });
moderationQueueSchema.index({ reviewCompletedAt: 1 });

// Middleware to update timestamps
moderationQueueSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('ModerationQueue', moderationQueueSchema);
