const ContentPreview = require('../models/ContentPreview');
const Content = require('../models/Content');

/**
 * Middleware to verify that a user can access preview features
 */
const verifyPreviewAccess = async (req, res, next) => {
  try {
    const { contentId } = req.params;

    if (!contentId) {
      return res.status(400).json({
        success: false,
        error: 'Content ID is required'
      });
    }

    // Verify content exists
    const content = await Content.findOne({ contentId: parseInt(contentId) });
    if (!content) {
      return res.status(404).json({
        success: false,
        error: 'Content not found'
      });
    }

    // Attach content to request
    req.content = content;
    next();
  } catch (error) {
    console.error('Error in verifyPreviewAccess middleware:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify preview access'
    });
  }
};

/**
 * Middleware to verify creator ownership for preview operations
 */
const verifyPreviewOwnership = async (req, res, next) => {
  try {
    const { contentId } = req.params;
    const userAddress = req.user?.address || req.headers['x-user-address'];

    if (!contentId) {
      return res.status(400).json({
        success: false,
        error: 'Content ID is required'
      });
    }

    if (!userAddress) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    // Verify content exists and user is the creator
    const content = await Content.findOne({ contentId: parseInt(contentId) });
    if (!content) {
      return res.status(404).json({
        success: false,
        error: 'Content not found'
      });
    }

    if (content.creator !== userAddress) {
      return res.status(403).json({
        success: false,
        error: 'Only the content creator can modify previews'
      });
    }

    // Attach content to request
    req.content = content;
    next();
  } catch (error) {
    console.error('Error in verifyPreviewOwnership middleware:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify preview ownership'
    });
  }
};

/**
 * Middleware to check if preview is enabled and accessible
 */
const checkPreviewEnabled = async (req, res, next) => {
  try {
    const { contentId } = req.params;

    const preview = await ContentPreview.findOne({ contentId: parseInt(contentId) });
    
    if (!preview || !preview.previewEnabled) {
      return res.status(404).json({
        success: false,
        error: 'Preview is not available for this content'
      });
    }

    // Attach preview to request
    req.preview = preview;
    next();
  } catch (error) {
    console.error('Error in checkPreviewEnabled middleware:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check preview availability'
    });
  }
};

/**
 * Middleware to validate preview upload data
 */
const validatePreviewUpload = (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    // Check file type based on endpoint
    const isTrailer = req.path.includes('trailer');
    const isThumbnail = req.path.includes('thumbnail');

    if (isThumbnail && !req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid file type. Only images are allowed for thumbnails'
      });
    }

    if (isTrailer && !req.file.mimetype.startsWith('video/')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid file type. Only videos are allowed for trailers'
      });
    }

    // Check file size
    const maxThumbnailSize = 10 * 1024 * 1024; // 10MB
    const maxTrailerSize = 500 * 1024 * 1024;  // 500MB
    const maxSize = isThumbnail ? maxThumbnailSize : maxTrailerSize;

    if (req.file.size > maxSize) {
      return res.status(400).json({
        success: false,
        error: `File size exceeds limit. Maximum size is ${maxSize / 1024 / 1024}MB`
      });
    }

    next();
  } catch (error) {
    console.error('Error in validatePreviewUpload middleware:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate file upload'
    });
  }
};

/**
 * Middleware to rate limit preview uploads
 */
const rateLimitPreviewUploads = (() => {
  const uploadCounts = new Map();
  const MAX_UPLOADS_PER_HOUR = 10;

  return (req, res, next) => {
    try {
      const userAddress = req.user?.address || req.headers['x-user-address'];
      
      if (!userAddress) {
        return next();
      }

      const key = `${userAddress}:${req.path}`;
      const now = Date.now();
      const hourAgo = now - (60 * 60 * 1000);

      // Get previous uploads for this user
      const uploads = uploadCounts.get(key) || [];
      
      // Filter out old uploads (older than 1 hour)
      const recentUploads = uploads.filter(timestamp => timestamp > hourAgo);

      if (recentUploads.length >= MAX_UPLOADS_PER_HOUR) {
        return res.status(429).json({
          success: false,
          error: 'Upload rate limit exceeded. Please try again later.'
        });
      }

      // Add current upload
      recentUploads.push(now);
      uploadCounts.set(key, recentUploads);

      next();
    } catch (error) {
      console.error('Error in rateLimitPreviewUploads middleware:', error);
      next();
    }
  };
})();

/**
 * Middleware to log preview operations
 */
const logPreviewOperation = (operation) => {
  return (req, res, next) => {
    const userAddress = req.user?.address || req.headers['x-user-address'] || 'anonymous';
    const contentId = req.params.contentId || 'unknown';
    const timestamp = new Date().toISOString();

    console.log(`[Preview] ${operation} - Content: ${contentId}, User: ${userAddress}, Time: ${timestamp}`);
    next();
  };
};

/**
 * Middleware to validate preview metadata
 */
const validatePreviewMetadata = (req, res, next) => {
  try {
    const { previewText, previewImageUrl } = req.body;

    if (previewText && previewText.length > 500) {
      return res.status(400).json({
        success: false,
        error: 'Preview text must not exceed 500 characters'
      });
    }

    if (previewImageUrl && !isValidUrl(previewImageUrl)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid preview image URL'
      });
    }

    next();
  } catch (error) {
    console.error('Error in validatePreviewMetadata middleware:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate metadata'
    });
  }
};

/**
 * Helper function to validate URL
 */
function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * Middleware to add CORS headers for preview files
 */
const addPreviewCorsHeaders = (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Cache-Control', 'public, max-age=3600');
  next();
};

/**
 * Middleware to track preview analytics
 */
const trackPreviewAnalytics = async (req, res, next) => {
  try {
    const { contentId } = req.params;
    const userAddress = req.headers['x-user-address'] || 'anonymous';
    const operation = req.method;

    // Log analytics event (can be extended to store in database)
    const analyticsEvent = {
      contentId: parseInt(contentId) || null,
      userAddress,
      operation,
      timestamp: new Date(),
      ip: req.ip,
      userAgent: req.headers['user-agent']
    };

    // Could extend this to save to analytics collection
    // await AnalyticsLog.create(analyticsEvent);

    next();
  } catch (error) {
    console.error('Error tracking analytics:', error);
    next();
  }
};

module.exports = {
  verifyPreviewAccess,
  verifyPreviewOwnership,
  checkPreviewEnabled,
  validatePreviewUpload,
  rateLimitPreviewUploads,
  logPreviewOperation,
  validatePreviewMetadata,
  addPreviewCorsHeaders,
  trackPreviewAnalytics
};
