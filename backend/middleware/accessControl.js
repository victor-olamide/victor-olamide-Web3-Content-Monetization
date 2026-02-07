const { verifyAccess } = require('../services/accessService');
const { logAccess } = require('../services/accessLogger');

/**
 * Middleware to verify access before serving content
 */
async function verifyContentAccess(req, res, next) {
  try {
    const { contentId } = req.params;
    const userAddress = req.headers['x-stacks-address'] || req.query.user;

    if (!userAddress) {
      return res.status(401).json({ 
        message: 'Authentication required',
        error: 'No Stacks address provided' 
      });
    }

    const result = await verifyAccess(parseInt(contentId), userAddress);

    // Log access attempt
    await logAccess({
      userAddress,
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
    req.userAddress = userAddress;
    next();
  } catch (err) {
    console.error('Access verification middleware error:', err);
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

module.exports = {
  verifyContentAccess,
  rateLimitMiddleware
};
