/**
 * Moderation Configuration Helper
 * Utilities for managing moderation system configuration
 */

const moderationConfig = {
  // Flag severity levels
  SEVERITY_LEVELS: {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical'
  },

  // Queue status values
  QUEUE_STATUS: {
    PENDING: 'pending',
    UNDER_REVIEW: 'under-review',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    REMOVED: 'removed',
    APPEALED: 'appealed',
    RESOLVED: 'resolved'
  },

  // Flag status values
  FLAG_STATUS: {
    SUBMITTED: 'submitted',
    RECEIVED: 'received',
    IN_REVIEW: 'in-review',
    ACTED_UPON: 'acted-upon',
    DISMISSED: 'dismissed',
    RESOLVED: 'resolved'
  },

  // Flag types
  FLAG_TYPE: {
    USER_REPORT: 'user-report',
    AUTOMATED_DETECTION: 'automated-detection',
    CREATOR_REMOVAL: 'creator-removal',
    SYSTEM_INITIATED: 'system-initiated'
  },

  // Content violation reasons for flagging
  VIOLATION_REASONS: {
    COPYRIGHT: 'copyright-violation',
    ADULT: 'adult-content',
    HATE_SPEECH: 'hate-speech',
    VIOLENCE: 'violence',
    MISINFORMATION: 'misinformation',
    SPAM: 'spam',
    HARASSMENT: 'harassment',
    ILLEGAL: 'illegal-content',
    LOW_QUALITY: 'low-quality',
    MISLEADING_TITLE: 'misleading-title',
    OTHER: 'other'
  },

  // Moderation decisions
  DECISIONS: {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    REMOVED: 'removed',
    SUSPENDED: 'suspended'
  },

  // Actor types for audit logs
  ACTORS: {
    SYSTEM: 'system',
    MODERATOR: 'moderator',
    ADMIN: 'admin',
    CREATOR: 'creator',
    USER: 'user'
  },

  // Audit actions
  AUDIT_ACTIONS: {
    FLAG_SUBMITTED: 'flag-submitted',
    QUEUE_CREATED: 'queue-created',
    QUEUE_ASSIGNED: 'queue-assigned',
    REVIEW_STARTED: 'review-started',
    REVIEW_COMPLETED: 'review-completed',
    CONTENT_APPROVED: 'content-approved',
    CONTENT_REJECTED: 'content-rejected',
    CONTENT_REMOVED: 'content-removed',
    CONTENT_RESTORED: 'content-restored',
    APPEAL_FILED: 'appeal-filed',
    APPEAL_REVIEWED: 'appeal-reviewed',
    APPEAL_APPROVED: 'appeal-approved',
    APPEAL_REJECTED: 'appeal-rejected',
    REASSIGNED: 'reassigned',
    PRIORITY_CHANGED: 'priority-changed',
    SEVERITY_CHANGED: 'severity-changed',
    NOTES_ADDED: 'notes-added',
    FLAGS_MERGED: 'flags-merged',
    DEADLINE_EXTENDED: 'deadline-extended'
  },

  // Default configuration
  DEFAULTS: {
    APPEAL_WINDOW_DAYS: 30,
    REVIEW_TIMEOUT_HOURS: 72,
    MAX_DUPLICATE_REPORTS_HOURS: 24,
    MIN_APPEAL_NOTES_LENGTH: 50,
    MAX_APPEAL_NOTES_LENGTH: 2000,
    MAX_DESCRIPTION_LENGTH: 2000,
    PRIORITY_MAX: 5,
    PRIORITY_MIN: 1,
    RESULTS_PER_PAGE: 50,
    MAX_RESULTS_PER_PAGE: 100,
    DEFAULT_SORT: '-priority -createdAt'
  },

  // Severity mapping for reasons
  SEVERITY_BY_REASON: {
    'illegal-content': 'critical',
    'adult-content': 'critical',
    'hate-speech': 'high',
    'violence': 'high',
    'harassment': 'high',
    'copyright-violation': 'high',
    'misinformation': 'medium',
    'spam': 'medium',
    'low-quality': 'low',
    'misleading-title': 'low',
    'other': 'medium'
  },

  // Priority adjustment rules
  PRIORITY_ADJUSTMENTS: {
    MULTIPLE_FLAGS_THRESHOLD: 5,
    MULTIPLE_FLAGS_BONUS: 1,
    CRITICAL_SEVERITY_BASE: 5,
    HIGH_SEVERITY_BASE: 4,
    MEDIUM_SEVERITY_BASE: 3,
    LOW_SEVERITY_BASE: 2
  },

  // Removal reasons (for when content is removed)
  REMOVAL_REASONS: {
    COPYRIGHT: 'copyright-violation',
    ADULT: 'adult-content',
    HATE_SPEECH: 'hate-speech',
    VIOLENCE: 'violence',
    MISINFORMATION: 'misinformation',
    SPAM: 'spam',
    HARASSMENT: 'harassment',
    ILLEGAL: 'illegal-content',
    OTHER: 'other'
  },

  // Content types
  CONTENT_TYPES: ['video', 'article', 'image', 'music'],

  // Result status codes
  RESULT_STATUS: {
    SUCCESS: 'success',
    FAILURE: 'failure',
    PARTIAL: 'partial'
  }
};

/**
 * Get severity level for a violation reason
 */
function getSeverityForReason(reason) {
  return moderationConfig.SEVERITY_BY_REASON[reason] || 'medium';
}

/**
 * Get base priority from severity
 */
function getBasePriority(severity) {
  const adjustments = moderationConfig.PRIORITY_ADJUSTMENTS;
  switch (severity) {
    case 'critical':
      return adjustments.CRITICAL_SEVERITY_BASE;
    case 'high':
      return adjustments.HIGH_SEVERITY_BASE;
    case 'medium':
      return adjustments.MEDIUM_SEVERITY_BASE;
    case 'low':
      return adjustments.LOW_SEVERITY_BASE;
    default:
      return adjustments.MEDIUM_SEVERITY_BASE;
  }
}

/**
 * Calculate priority based on severity and flag count
 */
function calculatePriority(severity, flagCount = 1) {
  let basePriority = getBasePriority(severity);
  const threshold = moderationConfig.PRIORITY_ADJUSTMENTS.MULTIPLE_FLAGS_THRESHOLD;
  const bonus = moderationConfig.PRIORITY_ADJUSTMENTS.MULTIPLE_FLAGS_BONUS;

  if (flagCount >= threshold) {
    basePriority = Math.min(
      moderationConfig.DEFAULTS.PRIORITY_MAX,
      basePriority + bonus
    );
  }

  return basePriority;
}

/**
 * Is severity critical enough for immediate action
 */
function isCriticalSeverity(severity) {
  return severity === moderationConfig.SEVERITY_LEVELS.CRITICAL;
}

/**
 * Is reason illegal content
 */
function isIllegalContent(reason) {
  return reason === moderationConfig.VIOLATION_REASONS.ILLEGAL ||
         reason === moderationConfig.VIOLATION_REASONS.ADULT;
}

/**
 * Validate violation reason
 */
function isValidReason(reason) {
  return Object.values(moderationConfig.VIOLATION_REASONS).includes(reason);
}

/**
 * Validate severity level
 */
function isValidSeverity(severity) {
  return Object.values(moderationConfig.SEVERITY_LEVELS).includes(severity);
}

/**
 * Validate queue status
 */
function isValidQueueStatus(status) {
  return Object.values(moderationConfig.QUEUE_STATUS).includes(status);
}

/**
 * Validate decision
 */
function isValidDecision(decision) {
  return Object.values(moderationConfig.DECISIONS).includes(decision);
}

/**
 * Validate content type
 */
function isValidContentType(contentType) {
  return moderationConfig.CONTENT_TYPES.includes(contentType);
}

/**
 * Get human-readable label for reason
 */
function getReasonLabel(reason) {
  const labels = {
    'copyright-violation': 'Copyright Violation',
    'adult-content': 'Adult Content',
    'hate-speech': 'Hate Speech',
    'violence': 'Violence',
    'misinformation': 'Misinformation',
    'spam': 'Spam',
    'harassment': 'Harassment',
    'illegal-content': 'Illegal Content',
    'low-quality': 'Low Quality',
    'misleading-title': 'Misleading Title',
    'other': 'Other'
  };
  return labels[reason] || reason;
}

/**
 * Get human-readable label for severity
 */
function getSeverityLabel(severity) {
  const labels = {
    'low': 'Low',
    'medium': 'Medium',
    'high': 'High',
    'critical': 'Critical'
  };
  return labels[severity] || severity;
}

/**
 * Format confidence percentage
 */
function formatConfidence(value) {
  return `${Math.round(value * 100)}%`;
}

/**
 * Get color for severity (for UI)
 */
function getSeverityColor(severity) {
  const colors = {
    'low': '#FFA500',      // Orange
    'medium': '#FFB84D',   // Light Orange
    'high': '#FF6B6B',     // Red
    'critical': '#DC143C'  // Crimson
  };
  return colors[severity] || '#808080';
}

module.exports = {
  moderationConfig,
  getSeverityForReason,
  getBasePriority,
  calculatePriority,
  isCriticalSeverity,
  isIllegalContent,
  isValidReason,
  isValidSeverity,
  isValidQueueStatus,
  isValidDecision,
  isValidContentType,
  getReasonLabel,
  getSeverityLabel,
  formatConfidence,
  getSeverityColor
};
