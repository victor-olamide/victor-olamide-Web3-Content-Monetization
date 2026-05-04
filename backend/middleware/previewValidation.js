/**
 * Preview Validation Middleware
 * Validates preview data and endpoints
 */

const validateContentId = (req, res, next) => {
  const { contentId } = req.params;
  const id = parseInt(contentId);

  if (isNaN(id) || id <= 0) {
    return res.status(400).json({
      success: false,
      error: 'Invalid contentId - must be a positive integer'
    });
  }

  req.params.contentId = id;
  next();
};

const validatePreviewData = (req, res, next) => {
  const {
    thumbnailUrl,
    trailerUrl,
    previewText,
    previewImageUrl,
    thumbnailQuality,
    trailerQuality,
    contentAccessType
  } = req.body;

  const errors = [];

  if (thumbnailQuality && !['low', 'medium', 'high', 'ultra'].includes(thumbnailQuality)) {
    errors.push('Invalid thumbnailQuality - must be low, medium, high, or ultra');
  }

  if (trailerQuality && !['360p', '480p', '720p', '1080p'].includes(trailerQuality)) {
    errors.push('Invalid trailerQuality - must be 360p, 480p, 720p, or 1080p');
  }

  if (contentAccessType && !['purchase_required', 'subscription_required', 'token_gated', 'free'].includes(contentAccessType)) {
    errors.push('Invalid contentAccessType');
  }

  if (thumbnailUrl && typeof thumbnailUrl !== 'string') {
    errors.push('thumbnailUrl must be a string');
  }

  if (trailerUrl && typeof trailerUrl !== 'string') {
    errors.push('trailerUrl must be a string');
  }

  if (previewText && typeof previewText !== 'string') {
    errors.push('previewText must be a string');
  }

  if (previewImageUrl && typeof previewImageUrl !== 'string') {
    errors.push('previewImageUrl must be a string');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      errors
    });
  }

  next();
};

const validateBatchContentIds = (req, res, next) => {
  const { contentIds } = req.body;

  if (!Array.isArray(contentIds)) {
    return res.status(400).json({
      success: false,
      error: 'contentIds must be an array'
    });
  }

  if (contentIds.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'contentIds array cannot be empty'
    });
  }

  if (contentIds.length > 100) {
    return res.status(400).json({
      success: false,
      error: 'Maximum 100 content items can be requested at once'
    });
  }

  const validIds = contentIds.every(id => typeof id === 'number' && id > 0);
  if (!validIds) {
    return res.status(400).json({
      success: false,
      error: 'All contentIds must be positive numbers'
    });
  }

  next();
};

const validateEventType = (req, res, next) => {
  const { eventType } = req.params;

  if (!['view', 'download'].includes(eventType)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid eventType - must be view or download'
    });
  }

  next();
};

const validatePaginationParams = (req, res, next) => {
  const skip = parseInt(req.query.skip) || 0;
  const limit = parseInt(req.query.limit) || 10;

  if (skip < 0) {
    return res.status(400).json({
      success: false,
      error: 'skip must be non-negative'
    });
  }

  if (limit < 1 || limit > 100) {
    return res.status(400).json({
      success: false,
      error: 'limit must be between 1 and 100'
    });
  }

  req.pagination = { skip, limit };
  next();
};

const validateContentType = (req, res, next) => {
  const { contentType } = req.params;
  const validTypes = ['video', 'article', 'image', 'music'];

  if (!validTypes.includes(contentType)) {
    return res.status(400).json({
      success: false,
      error: `Invalid contentType - must be one of: ${validTypes.join(', ')}`
    });
  }

  next();
};

module.exports = {
  validateContentId,
  validatePreviewData,
  validateBatchContentIds,
  validateEventType,
  validatePaginationParams,
  validateContentType
};
