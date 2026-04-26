// Subscription Tier Authorization Middleware
// Ensures users are authenticated and authorized to manage specific tiers

const jwt = require('jsonwebtoken');
const SubscriptionTier = require('../models/SubscriptionTier');
const User = require('../models/User');

/**
 * Middleware to verify JWT token
 */
const verifyToken = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token is required'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
      error: error.message
    });
  }
};

/**
 * Middleware to check if user is the creator
 */
const isCreator = async (req, res, next) => {
  try {
    const { creatorId } = req.params || req.body;

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (req.user.id !== creatorId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to manage tiers for this creator'
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Authorization check failed',
      error: error.message
    });
  }
};

/**
 * Middleware to verify user owns the tier
 */
const verifyTierOwnership = async (req, res, next) => {
  try {
    const { tierId } = req.params;

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const tier = await SubscriptionTier.findById(tierId).select('creatorId');

    if (!tier) {
      return res.status(404).json({
        success: false,
        message: 'Tier not found'
      });
    }

    // Allow access if user is the tier creator or an admin
    if (tier.creatorId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to manage this tier'
      });
    }

    req.tier = tier;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Tier ownership verification failed',
      error: error.message
    });
  }
};

/**
 * Middleware to check if user is an admin
 */
const isAdmin = (req, res, next) => {
  try {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Admin check failed',
      error: error.message
    });
  }
};

/**
 * Optional authentication middleware - doesn't fail if no token
 */
const optionalAuth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
    }

    next();
  } catch (error) {
    // Silently fail for optional auth
    next();
  }
};

module.exports = {
  verifyToken,
  isCreator,
  verifyTierOwnership,
  isAdmin,
  optionalAuth
};
