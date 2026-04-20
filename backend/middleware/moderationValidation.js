/**
 * Moderation Validation Schemas
 * Input validation for moderation endpoints
 */

const validateFlagSubmission = (req, res, next) => {
  try {
    const { contentId, reason, description, evidence } = req.body;

    // Validate required fields
    if (!contentId || typeof contentId !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'contentId must be a valid number'
      });
    }

    if (!reason || typeof reason !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'reason is required and must be a string'
      });
    }

    // Validate reason is in allowable list
    const validReasons = [
      'copyright-violation', 'adult-content', 'hate-speech', 'violence',
      'misinformation', 'spam', 'harassment', 'illegal-content',
      'low-quality', 'misleading-title', 'other'
    ];

    if (!validReasons.includes(reason)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid reason provided',
        validReasons
      });
    }

    // Validate optional description
    if (description && (typeof description !== 'string' || description.length > 2000)) {
      return res.status(400).json({
        success: false,
        message: 'description must be a string with max 2000 characters'
      });
    }

    // Validate optional evidence
    if (evidence) {
      if (!Array.isArray(evidence.links)) {
        return res.status(400).json({
          success: false,
          message: 'evidence.links must be an array'
        });
      }

      if (evidence.links.length > 5) {
        return res.status(400).json({
          success: false,
          message: 'Maximum 5 evidence links allowed'
        });
      }

      for (const link of evidence.links) {
        if (typeof link !== 'string' || !isValidUrl(link)) {
          return res.status(400).json({
            success: false,
            message: 'All evidence links must be valid URLs'
          });
        }
      }
    }

    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Validation error',
      error: error.message
    });
  }
};

const validateModerationDecision = (req, res, next) => {
  try {
    const { decisionNotes, removalReason } = req.body;

    // If it's a rejection, validate removal reason
    if (req.path.includes('/reject') && removalReason) {
      const validReasons = [
        'copyright-violation', 'adult-content', 'hate-speech',
        'violence', 'misinformation', 'spam', 'harassment',
        'illegal-content', 'other'
      ];

      if (!validReasons.includes(removalReason)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid removal reason',
          validReasons
        });
      }
    }

    // Validate optional notes
    if (decisionNotes && (typeof decisionNotes !== 'string' || decisionNotes.length > 1000)) {
      return res.status(400).json({
        success: false,
        message: 'decisionNotes must be a string with max 1000 characters'
      });
    }

    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Validation error',
      error: error.message
    });
  }
};

const validateQueueFilters = (req, res, next) => {
  try {
    const { status, severity, limit, page, sortBy } = req.query;

    if (status) {
      const validStatuses = ['pending', 'under-review', 'approved', 'rejected', 'removed', 'appealed'];
      const statuses = Array.isArray(status) ? status : [status];
      for (const s of statuses) {
        if (!validStatuses.includes(s)) {
          return res.status(400).json({
            success: false,
            message: `Invalid status: ${s}`,
            validStatuses
          });
        }
      }
    }

    if (severity) {
      const validSeverities = ['low', 'medium', 'high', 'critical'];
      const severities = Array.isArray(severity) ? severity : [severity];
      for (const s of severities) {
        if (!validSeverities.includes(s)) {
          return res.status(400).json({
            success: false,
            message: `Invalid severity: ${s}`,
            validSeverities
          });
        }
      }
    }

    if (limit) {
      const limitNum = parseInt(limit);
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        return res.status(400).json({
          success: false,
          message: 'limit must be between 1 and 100'
        });
      }
    }

    if (page) {
      const pageNum = parseInt(page);
      if (isNaN(pageNum) || pageNum < 1) {
        return res.status(400).json({
          success: false,
          message: 'page must be a positive number'
        });
      }
    }

    if (sortBy) {
      const validSortBy = ['priority', '-priority', 'createdAt', '-createdAt', 'severity', '-severity'];
      if (!validSortBy.includes(sortBy)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid sortBy parameter',
          validSortBy
        });
      }
    }

    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Validation error',
      error: error.message
    });
  }
};

const validateAppealSubmission = (req, res, next) => {
  try {
    const { appealNotes } = req.body;

    if (appealNotes && (typeof appealNotes !== 'string' || appealNotes.length > 1000)) {
      return res.status(400).json({
        success: false,
        message: 'appealNotes must be a string with max 1000 characters'
      });
    }

    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Validation error',
      error: error.message
    });
  }
};

/**
 * Check if string is valid URL
 */
function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

module.exports = {
  validateFlagSubmission,
  validateModerationDecision,
  validateQueueFilters,
  validateAppealSubmission
};
