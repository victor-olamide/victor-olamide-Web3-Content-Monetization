const { verifyAccess, verifyAccessByUserId } = require('../services/accessService');
const { logAccess } = require('../services/accessLogger');
const logger = require('../utils/logger');

/**
 * Role-based access control middleware
 * Provides functions to enforce user roles on routes
 * Supports creator, subscriber, and admin roles
 */

/**
 * Middleware to enforce role-based access control
 * Requires user to be authenticated (req.user must exist)
 * Accepts multiple roles and grants access if user has any of them
 * Returns 403 if role is insufficient
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Check if user's role is allowed
    if (!allowedRoles.includes(req.user.role)) {
      // Log access denial
      logger.warn('Access denied: Insufficient role', {
        userId: req.user._id,
        userRole: req.user.role,
        requiredRoles: allowedRoles
      });
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}`
      });
    }

    // Log successful access
    logger.info('Role-based access granted', {
      userId: req.user._id,
      role: req.user.role,
      allowedRoles
    });
    next();
  };
}

/**
 * Middleware to require admin role
 * Only allows users with 'admin' role to proceed
 */
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  // Check if user has admin role
  if (req.user.role !== 'admin') {
    // Log admin access denial
    logger.warn('Admin access denied', {
      userId: req.user._id,
      role: req.user.role
    });
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }

  // Log admin access grant
  logger.info('Admin access granted', { userId: req.user._id });
  next();
}

/**
 * Middleware to require creator role
 * Only allows users with 'creator' role to proceed
 */
function requireCreator(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  // Check if user has creator role
  if (req.user.role !== 'creator') {
    // Log creator access denial
    logger.warn('Creator access denied', {
      userId: req.user._id,
      role: req.user.role
    });
    return res.status(403).json({
      success: false,
      message: 'Creator access required'
    });
  }

  // Log creator access grant
  logger.info('Creator access granted', { userId: req.user._id });
  next();
}

/**
 * Middleware to require subscriber role
 * Only allows users with 'subscriber' role to proceed
 */
function requireSubscriber(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  // Check if user has subscriber role
  if (req.user.role !== 'subscriber') {
    // Log subscriber access denial
    logger.warn('Subscriber access denied', {
      userId: req.user._id,
      role: req.user.role
    });
    return res.status(403).json({
      success: false,
      message: 'Subscriber access required'
    });
  }

  // Log subscriber access grant
  logger.info('Subscriber access granted', { userId: req.user._id });
  next();
}

/**
 * Middleware to verify access before serving content
 * Supports both wallet-based (legacy) and user-based authentication
 */
async function verifyContentAccess(req, res, next) {
  try {
    const { contentId } = req.params;
    
    let result;
    let userIdentifier;

    if (req.user && req.user._id) {
      // User-based authentication (preferred)
      result = await verifyAccessByUserId(parseInt(contentId), req.user._id);
      userIdentifier = req.user._id;
    } else {
      // Legacy wallet-based authentication
      const userAddress = req.headers['x-stacks-address'] || req.query.user;
      
      if (!userAddress) {
        return res.status(401).json({ 
          message: 'Authentication required',
          error: 'No user authentication or Stacks address provided' 
        });
      }
      
      result = await verifyAccess(parseInt(contentId), userAddress);
      userIdentifier = userAddress;
    }

    // Log access attempt
    await logAccess({
      userIdentifier,
      contentId: parseInt(contentId),
      accessMethod: result.method || 'unknown',
      accessGranted: result.allowed,
      reason: result.reason,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    if (!result.allowed) {
      return res.status(403).json({ 
        message: 'Access denied',
        reason: result.reason,
        hasAccess: false
      });
    }

    req.accessInfo = result;
    req.userIdentifier = userIdentifier;
    next();
  } catch (err) {
    logger.error('Access verification middleware error', { err });
    res.status(500).json({ 
      message: 'Failed to verify access',
      error: err.message 
    });
  }
}

/**
 * Optional middleware for rate limiting per user
 */
const rateLimit = {};
function rateLimitMiddleware(req, res, next) {
  const userAddress = req.userAddress || req.headers['x-stacks-address'];
  
  if (!userAddress) {
    return next();
  }

  const now = Date.now();
  const userLimit = rateLimit[userAddress] || { count: 0, resetTime: now + 60000 };

  if (now > userLimit.resetTime) {
    rateLimit[userAddress] = { count: 1, resetTime: now + 60000 };
    return next();
  }

  if (userLimit.count >= 100) {
    return res.status(429).json({ message: 'Rate limit exceeded' });
  }

  rateLimit[userAddress].count++;
  next();
}

// Export all middleware functions
module.exports = {
  verifyContentAccess,
  rateLimitMiddleware,
  requireRole,
  requireAdmin,
  requireCreator,
  requireSubscriber
};
