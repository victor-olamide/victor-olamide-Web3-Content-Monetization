/**
 * ModerationAuditLog Model
 * Tracks all moderation actions and decisions
 */

const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  logId: {
    type: String,
    unique: true,
    required: true,
    index: true
  },
  queueId: {
    type: Number,
    index: true,
    ref: 'ModerationQueue'
  },
  contentId: {
    type: Number,
    index: true,
    ref: 'Content'
  },
  actor: {
    type: String,
    required: true,
    lowercase: true,
    index: true,
    enum: ['system', 'moderator', 'admin', 'creator', 'user']
  },
  actorAddress: {
    type: String,
    lowercase: true,
    index: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'flag-submitted',
      'queue-created',
      'queue-assigned',
      'review-started',
      'review-completed',
      'content-approved',
      'content-rejected',
      'content-removed',
      'content-restored',
      'appeal-filed',
      'appeal-reviewed',
      'appeal-approved',
      'appeal-rejected',
      'reassigned',
      'priority-changed',
      'severity-changed',
      'notes-added',
      'flags-merged',
      'deadline-extended'
    ],
    required: true,
    index: true
  },
  actionDetails: {
    previousStatus: String,
    newStatus: String,
    previousAssignee: String,
    newAssignee: String,
    previousPriority: Number,
    newPriority: Number,
    previousSeverity: String,
    newSeverity: String,
    decision: String,
    decisionReason: String
  },
  notes: String,
  affectedEntities: {
    queueIds: [Number],
    flagIds: [String],
    contentIds: [Number]
  },
  ipAddress: String,
  userAgent: String,
  result: {
    type: String,
    enum: ['success', 'failure', 'partial'],
    default: 'success'
  },
  errorMessage: String,
  dataSnapshot: {
    beforeState: mongoose.Schema.Types.Mixed,
    afterState: mongoose.Schema.Types.Mixed
  },
  performanceMetrics: {
    processingTimeMs: Number,
    reviewDurationHours: Number
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'moderation_audit_logs'
});

// Index for common audit queries
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ actorAddress: 1, timestamp: -1 });
auditLogSchema.index({ contentId: 1, timestamp: -1 });
auditLogSchema.index({ queueId: 1, timestamp: -1 });
auditLogSchema.index({ actor: 1, action: 1 });

module.exports = mongoose.model('ModerationAuditLog', auditLogSchema);
