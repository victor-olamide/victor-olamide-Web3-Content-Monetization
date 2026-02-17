const { TIER_LEVELS } = require('../config/rateLimitConfig');
const { isValidTier } = require('../utils/rateLimitUtils');

/**
 * Rate Limit Validation Middleware
 * 
 * Validates rate limit-related request parameters.
 * 
 * @module middleware/rateLimitValidation
 */

/**
 * Validate tier parameter in request body
 */
function validateTierParam(req, res, next) {
  const { tier } = req.body;

  if (tier && !isValidTier(tier)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid tier',
      message: `Tier must be one of: ${Object.values(TIER_LEVELS).join(', ')}`,
      validTiers: Object.values(TIER_LEVELS)
    });
  }

  next();
}

/**
 * Validate rate limit key parameter
 */
function validateKeyParam(req, res, next) {
  const key = req.body.key || req.query.key;

  if (!key) {
    return res.status(400).json({
      success: false,
      error: 'Missing key',
      message: 'A rate limit key is required'
    });
  }

  // Validate key format (should be prefixed with wallet:, ip:, combined:, or apikey:)
  const validPrefixes = ['wallet:', 'ip:', 'combined:', 'apikey:'];
  const hasValidPrefix = validPrefixes.some(prefix => key.startsWith(prefix));

  if (!hasValidPrefix) {
    return res.status(400).json({
      success: false,
      error: 'Invalid key format',
      message: `Key must start with one of: ${validPrefixes.join(', ')}`,
      validPrefixes
    });
  }

  next();
}

/**
 * Validate tier comparison query parameters
 */
function validateTierComparison(req, res, next) {
  const { tierA, tierB } = req.query;

  if (!tierA || !tierB) {
    return res.status(400).json({
      success: false,
      error: 'Missing parameters',
      message: 'Both tierA and tierB query parameters are required'
    });
  }

  if (!isValidTier(tierA)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid tierA',
      message: `tierA must be one of: ${Object.values(TIER_LEVELS).join(', ')}`
    });
  }

  if (!isValidTier(tierB)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid tierB',
      message: `tierB must be one of: ${Object.values(TIER_LEVELS).join(', ')}`
    });
  }

  next();
}

/**
 * Validate endpoint query parameter
 */
function validateEndpointParam(req, res, next) {
  const { endpoint } = req.query;

  if (endpoint && !endpoint.startsWith('/')) {
    return res.status(400).json({
      success: false,
      error: 'Invalid endpoint',
      message: 'Endpoint must start with /'
    });
  }

  next();
}

/**
 * Require admin access for rate limit management operations
 */
function requireRateLimitAdmin(req, res, next) {
  // Check if user has admin tier or admin role
  const tier = req.userTier || req.session?.tier || req.user?.tier;
  const role = req.user?.role || req.session?.role;

  if (tier !== TIER_LEVELS.ADMIN && role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      message: 'Admin access required for this operation'
    });
  }

  next();
}

module.exports = {
  validateTierParam,
  validateKeyParam,
  validateTierComparison,
  validateEndpointParam,
  requireRateLimitAdmin
};
