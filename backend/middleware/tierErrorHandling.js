// Enhanced Error Handling Middleware
// Comprehensive error handling for subscription tier operations

const logger = require('../utils/subscriptionTierLogger');

const tierErrorHandler = (error, req, res, next) => {
  const tierLogger = new logger('TierErrorHandler');

  // Log the error with context
  tierLogger.logError('tierErrorHandler', req.params?.tierId || req.body?.tierId || 'unknown', error);

  // Handle different types of errors
  if (error.name === 'ValidationError') {
    // Mongoose validation error
    const errors = Object.values(error.errors).map(err => err.message);
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  if (error.name === 'CastError') {
    // Invalid ObjectId
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format'
    });
  }

  if (error.code === 11000) {
    // Duplicate key error
    const field = Object.keys(error.keyValue)[0];
    return res.status(409).json({
      success: false,
      message: `Duplicate ${field}: ${error.keyValue[field]}`
    });
  }

  if (error.name === 'JsonWebTokenError') {
    // JWT error
    return res.status(401).json({
      success: false,
      message: 'Invalid authentication token'
    });
  }

  if (error.name === 'TokenExpiredError') {
    // JWT expired
    return res.status(401).json({
      success: false,
      message: 'Authentication token expired'
    });
  }

  // Default error response
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
};

const tierAsyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

const tierRateLimiter = (req, res, next) => {
  // Simple in-memory rate limiting for tier operations
  const clientId = req.user?.id || req.ip;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 100; // Max requests per window

  if (!global.tierRateLimit) {
    global.tierRateLimit = new Map();
  }

  const clientRequests = global.tierRateLimit.get(clientId) || [];
  const validRequests = clientRequests.filter(time => now - time < windowMs);

  if (validRequests.length >= maxRequests) {
    return res.status(429).json({
      success: false,
      message: 'Too many tier operations. Please try again later.'
    });
  }

  validRequests.push(now);
  global.tierRateLimit.set(clientId, validRequests);

  next();
};

const tierTimeoutHandler = (timeoutMs = 30000) => {
  return (req, res, next) => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        res.status(408).json({
          success: false,
          message: 'Request timeout'
        });
      }
    }, timeoutMs);

    res.on('finish', () => {
      clearTimeout(timeout);
    });

    next();
  };
};

const tierRequestLogger = (req, res, next) => {
  const tierLogger = new logger('TierRequestLogger');
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logData = {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    };

    if (res.statusCode >= 400) {
      tierLogger.logError('tierRequestLogger', 'request', new Error(`HTTP ${res.statusCode}`), logData);
    } else {
      tierLogger.logTierFetched('request', 'completed', logData);
    }
  });

  next();
};

const tierValidationErrorHandler = (error, req, res, next) => {
  if (error.name === 'ValidationError') {
    const tierLogger = new logger('TierValidationErrorHandler');
    tierLogger.logValidationFailure('tierValidationErrorHandler', error.message);

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message,
        value: err.value
      }))
    });
  }

  next(error);
};

const tierNotFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: 'Tier not found',
    requestedId: req.params?.tierId
  });
};

const tierUnauthorizedHandler = (req, res, next) => {
  res.status(403).json({
    success: false,
    message: 'Unauthorized to perform this action on the tier'
  });
};

const tierConflictHandler = (error, req, res, next) => {
  if (error.code === 11000) {
    const tierLogger = new logger('TierConflictHandler');
    const field = Object.keys(error.keyValue)[0];
    const value = error.keyValue[field];

    tierLogger.logDuplicateTierName('unknown', `${field}: ${value}`);

    return res.status(409).json({
      success: false,
      message: `A tier with ${field} '${value}' already exists`
    });
  }

  next(error);
};

module.exports = {
  tierErrorHandler,
  tierAsyncHandler,
  tierRateLimiter,
  tierTimeoutHandler,
  tierRequestLogger,
  tierValidationErrorHandler,
  tierNotFoundHandler,
  tierUnauthorizedHandler,
  tierConflictHandler
};
