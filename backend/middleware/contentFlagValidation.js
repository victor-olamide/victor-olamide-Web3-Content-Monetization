/**
 * Content Flag Validation Middleware
 * Validates flag submission data
 */

/**
 * Validate flag submission
 */
function validateFlagSubmission(req, res, next) {
  try {
    const { contentId, reason, description, evidence, userContact } = req.body;
    const errors = [];

    // Required fields
    if (!contentId) {
      errors.push('Content ID is required');
    } else if (isNaN(parseInt(contentId))) {
      errors.push('Content ID must be a number');
    }

    if (!reason) {
      errors.push('Flag reason is required');
    } else {
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
      if (!validReasons.includes(reason)) {
        errors.push(`Invalid reason. Must be one of: ${validReasons.join(', ')}`);
      }
    }

    // Description -optional but if provided, validate length
    if (description && typeof description !== 'string') {
      errors.push('Description must be a string');
    } else if (description && description.length > 2000) {
      errors.push('Description must be less than 2000 characters');
    }

    // Evidence - optional but if provided, validate structure
    if (evidence) {
      if (evidence.links && !Array.isArray(evidence.links)) {
        errors.push('Evidence links must be an array');
      }
      if (evidence.timestamps && !Array.isArray(evidence.timestamps)) {
        errors.push('Evidence timestamps must be an array');
      }
    }

    // User contact - optional
    if (userContact) {
      if (userContact.email && !isValidEmail(userContact.email)) {
        errors.push('Invalid email format');
      }
      if (typeof userContact.preferNotification !== 'undefined' && typeof userContact.preferNotification !== 'boolean') {
        errors.push('preferNotification must be a boolean');
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        errors
      });
    }

    next();
  } catch (error) {
    console.error('Flag validation error:', error);
    res.status(500).json({
      success: false,
      error: 'Flag validation failed'
    });
  }
}

/**
 * Validate moderator decision
 */
function validateModerationDecision(req, res, next) {
  try {
    const { decision, removalReason, decisionNotes } = req.body;
    const errors = [];

    if (!decision) {
      errors.push('Decision is required');
    } else {
      const validDecisions = ['approved', 'removed', 'rejected'];
      if (!validDecisions.includes(decision)) {
        errors.push(`Decision must be one of: ${validDecisions.join(', ')}`);
      }
    }

    // If removing content, require removal reason
    if (decision === 'removed' || decision === 'rejected') {
      if (!removalReason) {
        errors.push('Removal reason is required for removal decisions');
      } else {
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
        if (!validReasons.includes(removalReason)) {
          errors.push(`Invalid removal reason. Must be one of: ${validReasons.join(', ')}`);
        }
      }
    }

    // Decision notes - optional but if provided validate
    if (decisionNotes && typeof decisionNotes !== 'string') {
      errors.push('Decision notes must be a string');
    } else if (decisionNotes && decisionNotes.length > 1000) {
      errors.push('Decision notes must be less than 1000 characters');
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        errors
      });
    }

    next();
  } catch (error) {
    console.error('Moderation decision validation error:', error);
    res.status(500).json({
      success: false,
      error: 'Validation failed'
    });
  }
}

/**
 * Validate appeal submission
 */
function validateAppealSubmission(req, res, next) {
  try {
    const { appealNotes } = req.body;
    const errors = [];

    if (!appealNotes) {
      errors.push('Appeal notes are required');
    } else if (typeof appealNotes !== 'string') {
      errors.push('Appeal notes must be a string');
    } else if (appealNotes.length < 50) {
      errors.push('Appeal notes must be at least 50 characters');
    } else if (appealNotes.length > 2000) {
      errors.push('Appeal notes must be less than 2000 characters');
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        errors
      });
    }

    next();
  } catch (error) {
    console.error('Appeal validation error:', error);
    res.status(500).json({
      success: false,
      error: 'Appeal validation failed'
    });
  }
}

/**
 * Validate queue filtering parameters
 */
function validateQueueFilters(req, res, next) {
  try {
    const { status, severity, limit, skip } = req.query;
    const errors = [];

    if (status) {
      const validStatuses = ['pending', 'under-review', 'approved', 'rejected', 'removed', 'appealed'];
      if (!validStatuses.includes(status) && !status.split(',').every(s => validStatuses.includes(s))) {
        errors.push(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
      }
    }

    if (severity) {
      const validSeverities = ['low', 'medium', 'high', 'critical'];
      if (!validSeverities.includes(severity) && !severity.split(',').every(s => validSeverities.includes(s))) {
        errors.push(`Invalid severity. Must be one of: ${validSeverities.join(', ')}`);
      }
    }

    if (limit && isNaN(parseInt(limit))) {
      errors.push('Limit must be a number');
    } else if (limit && parseInt(limit) > 100) {
      errors.push('Limit cannot exceed 100');
    }

    if (skip && isNaN(parseInt(skip))) {
      errors.push('Skip must be a number');
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        errors
      });
    }

    next();
  } catch (error) {
    console.error('Queue filter validation error:', error);
    res.status(500).json({
      success: false,
      error: 'Validation failed'
    });
  }
}

/**
 * Helper to validate email format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

module.exports = {
  validateFlagSubmission,
  validateModerationDecision,
  validateAppealSubmission,
  validateQueueFilters
};
