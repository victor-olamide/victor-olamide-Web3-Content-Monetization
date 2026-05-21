/**
 * Content Moderation Middleware
 * Validates and auto-flags content during upload/creation
 */

const moderationService = require('../services/moderationService');
const moderationNotificationService = require('../services/moderationNotificationService');

/**
 * Middleware to validate content during upload
 * Auto-flags content if necessary
 */
const validateContentModeration = async (req, res, next) => {
  try {
    const content = req.body?.content || req.body;

    if (!content || !content.title) {
      return next(); // Skip validation if no content
    }

    // Prepare content for analysis
    const contentForAnalysis = {
      contentId: content.contentId,
      title: content.title,
      description: content.description || '',
      caption: content.caption || '',
      tags: content.tags || []
    };

    // Run moderation validation
    const validationResult = await moderationService.validateContentOnUpload(contentForAnalysis);

    // Attach result to request
    req.moderationResult = validationResult;

    // If auto-flagged
    if (validationResult.autoFlagged) {
      console.log(`[Moderation] Content auto-flagged on upload: ${content.contentId}`);
      // Continue anyway - content can be reviewed
      req.autoFlagged = true;
      req.flagReason = validationResult.flagReason;
    }

    next();
  } catch (error) {
    console.error('Error in content moderation validation:', error);
    // Don't block uploads on validation errors
    next();
  }
};

/**
 * Middleware to check if content has been auto-flagged
 * Optionally block publication based on configuration
 */
const checkAutoFlagStatus = async (req, res, next) => {
  try {
    if (!req.moderationResult) {
      return next();
    }

    // Attach flag status to response data
    if (!req.responseData) {
      req.responseData = {};
    }

    req.responseData.moderation = {
      autoFlagged: req.moderationResult.autoFlagged,
      queueId: req.moderationResult.queueId,
      recommendation: req.moderationResult.recommendation
    };

    // Log auto-flagged content
    if (req.moderationResult.autoFlagged) {
      const auditLog = require('../services/moderationAuditLoggingService');
      await auditLog.logBulkOperation('auto-flag-on-upload', {
        contentId: req.body.contentId,
        reason: req.moderationResult.flagReason,
        queueId: req.moderationResult.queueId
      }, 1);
    }

    next();
  } catch (error) {
    console.error('Error checking auto-flag status:', error);
    next();
  }
};

/**
 * Middleware to attach moderation warnings to response
 */
const attachModerationWarnings = async (req, res, next) => {
  try {
    const originalJson = res.json;

    res.json = function(data) {
      const response = {
        ...data,
      };

      if (req.moderationResult && req.moderationResult.autoFlagged) {
        response.moderation = {
          autoFlagged: true,
          queueId: req.moderationResult.queueId,
          message: 'Your content has been flagged for review and will be accessible during the review process.',
          estimatedReviewTime: '24-48 hours'
        };
      }

      return originalJson.call(this, response);
    };

    next();
  } catch (error) {
    console.error('Error attaching moderation warnings:', error);
    next();
  }
};

/**
 * Middleware for admin manual content check
 */
const adminContentCheck = async (req, res, next) => {
  try {
    const { contentId } = req.params;
    const Content = require('../models/Content');

    const content = await Content.findOne({ contentId: parseInt(contentId) });
    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Content not found'
      });
    }

    // Run auto-filter analysis
    const autoFilterResult = await moderationService.autoFilterContent(content);

    // Attach to request for next handler
    req.filterAnalysis = autoFilterResult;
    next();
  } catch (error) {
    console.error('Error in admin content check:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking content',
      error: error.message
    });
  }
};

/**
 * Middleware to enforce strict moderation for flagged content
 */
const strictModerationMode = async (req, res, next) => {
  try {
    // Check if system is in strict moderation mode (based on config or environment)
    const STRICT_MODE = process.env.MODERATION_STRICT_MODE === 'true';

    if (!STRICT_MODE) {
      return next();
    }

    const content = req.body?.content || req.body;
    if (!content) {
      return next();
    }

    const contentForAnalysis = {
      title: content.title,
      description: content.description || '',
      caption: content.caption || ''
    };

    // Run analysis
    const analysis = await moderationService.autoFilterContent(contentForAnalysis);

    // In strict mode, reject high-risk content immediately
    if (analysis.assessment.risk_level === 'critical') {
      return res.status(403).json({
        success: false,
        message: 'Content does not meet community guidelines',
        reason: 'Critical violation detected',
        contactSupport: true
      });
    }

    if (analysis.assessment.risk_level === 'high' && analysis.assessment.confidence > 90) {
      return res.status(403).json({
        success: false,
        message: 'Content may violate community guidelines',
        reason: 'High severity violation detected with high confidence',
        contactSupport: true
      });
    }

    next();
  } catch (error) {
    console.error('Error in strict moderation mode:', error);
    // Don't block on error
    next();
  }
};

module.exports = {
  validateContentModeration,
  checkAutoFlagStatus,
  attachModerationWarnings,
  adminContentCheck,
  strictModerationMode
};
