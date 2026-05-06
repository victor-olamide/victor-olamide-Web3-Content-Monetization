/**
 * Admin Authorization Middleware
 * Validates admin access and permissions
 */

const jwt = require('jsonwebtoken');

/**
 * Verify admin token and admin role
 */
const adminAuthMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No authorization token provided',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

    if (decoded.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions. Admin access required.',
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
      error: error.message,
    });
  }
};

/**
 * Optional admin auth - checks admin status but doesn't fail if not present
 */
const optionalAdminAuth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      if (decoded.role === 'admin') {
        req.user = decoded;
        req.isAdmin = true;
      }
    }
  } catch (error) {
    // Continue without admin status
  }

  next();
};

module.exports = {
  adminAuthMiddleware,
  optionalAdminAuth,
};
