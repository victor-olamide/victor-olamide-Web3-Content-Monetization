/**
 * Moderation System Helpers
 * Utility functions for moderation operations
 */

/**
 * Format severity as display-friendly text
 */
function formatSeverity(severity) {
  const formats = {
    'low': '⚠️ Low',
    'medium': '⚠️⚠️ Medium',
    'high': '⚠️⚠️⚠️ High',
    'critical': '🚨 Critical'
  };
  return formats[severity] || severity;
}

/**
 * Format status with emoji
 */
function formatStatus(status) {
  const formats = {
    'pending': '⏳ Pending',
    'under-review': '👀 Under Review',
    'approved': '✅ Approved',
    'rejected': '❌ Rejected',
    'removed': '🗑️ Removed',
    'appealed': '📤 Appealed'
  };
  return formats[status] || status;
}

/**
 * Calculate priority badge
 */
function getPriorityBadge(priority) {
  if (priority >= 5) return '🔴 Critical';
  if (priority >= 4) return '🟠 High';
  if (priority >= 3) return '🟡 Medium';
  return '🟢 Normal';
}

/**
 * Validate removal reason
 */
function isValidRemovalReason(reason) {
  const validReasons = [
    'copyright-violation',
    'adult-content',
    'hate-speech',
    'violence',
    'misinformation',
    'spam',
    'harassment',
    'illegal-content',
    'other'
  ];
  return validReasons.includes(reason);
}

/**
 * Validate flag reason
 */
function isValidFlagReason(reason) {
  const validReasons = [
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
  ];
  return validReasons.includes(reason);
}

/**
 * Calculate days until appeal deadline
 */
function daysUntilAppealDeadline(deadline) {
  if (!deadline) return null;
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const diffMs = deadlineDate - now;
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Check if appeal is still available
 */
function isAppealAvailable(deadline) {
  if (!deadline) return false;
  return new Date() < new Date(deadline);
}

/**
 * Generate moderation summary
 */
function generateModerationSummary(queue) {
  return {
    queueId: queue.queueId,
    contentTitle: queue.contentTitle,
    flagCount: queue.flagCount,
    severity: formatSeverity(queue.severity),
    status: formatStatus(queue.status),
    priority: getPriorityBadge(queue.priority),
    flaggedSince: queue.firstFlaggedAt,
    daysPending: Math.ceil((new Date() - queue.firstFlaggedAt) / (1000 * 60 * 60 * 24)),
    reasons: queue.tags || [],
    decision: queue.decision,
    appealDeadlineIn: daysUntilAppealDeadline(queue.appealDeadline)
  };
}

/**
 * Get recommended next action
 */
function getRecommendedAction(queue) {
  if (queue.severity === 'critical' && queue.flagCount >= 3) {
    return 'IMMEDIATE_REMOVAL';
  }
  if (queue.severity === 'high' && queue.flagCount >= 5) {
    return 'EXPEDITED_REVIEW';
  }
  if (queue.status === 'appealed') {
    return 'APPEAL_REVIEW';
  }
  return 'STANDARD_REVIEW';
}

/**
 * Calculate expected review time
 */
function calculateExpectedReviewTime(severity, flagCount) {
  const baseTimes = {
    'critical': 4, // hours
    'high': 8,
    'medium': 24,
    'low': 48
  };

  let expectedHours = baseTimes[severity] || 24;

  // Reduce for multiple flags (indicates higher priority)
  if (flagCount >= 5) {
    expectedHours = Math.ceil(expectedHours * 0.5);
  }

  return expectedHours;
}

module.exports = {
  formatSeverity,
  formatStatus,
  getPriorityBadge,
  isValidRemovalReason,
  isValidFlagReason,
  daysUntilAppealDeadline,
  isAppealAvailable,
  generateModerationSummary,
  getRecommendedAction,
  calculateExpectedReviewTime
};
