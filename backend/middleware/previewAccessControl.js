/**
 * Preview Access Control Middleware
 * Checks and enforces preview access policies
 */

const Content = require('../models/Content');
const Purchase = require('../models/Purchase');
const Subscription = require('../models/Subscription');

/**
 * Middleware to check if user can view preview
 * All users can view previews by default
 */
const canViewPreview = async (req, res, next) => {
  try {
    const { contentId } = req.params;
    const userAddress = req.user?.address;

    // Previews are public by default
    next();
  } catch (error) {
    console.error('Error in preview access check:', error);
    res.status(500).json({ success: false, error: 'Access check failed' });
  }
};

/**
 * Middleware to check if user can download preview
 * Downloads are limited to non-purchasers
 */
const canDownloadPreview = async (req, res, next) => {
  try {
    const { contentId } = req.params;
    const userAddress = req.user?.address;

    if (!userAddress) {
      // Anonymous users can download previews
      return next();
    }

    // Check if user already has full access
    const content = await Content.findOne({ contentId: parseInt(contentId) });
    if (!content) {
      return res.status(404).json({ success: false, error: 'Content not found' });
    }

    // Check if user purchased or subscribed
    const purchase = await Purchase.findOne({
      contentId: parseInt(contentId),
      buyerAddress: userAddress,
      status: 'completed'
    });

    if (purchase) {
      return res.status(403).json({
        success: false,
        error: 'Users with full access cannot download previews',
        suggestion: 'Download the full content instead'
      });
    }

    const subscription = await Subscription.findOne({
      subscriberAddress: userAddress,
      creatorAddress: content.creator,
      status: 'active'
    });

    if (subscription) {
      return res.status(403).json({
        success: false,
        error: 'Users with subscription access cannot download previews',
        suggestion: 'Download the full content instead'
      });
    }

    next();
  } catch (error) {
    console.error('Error in preview download access check:', error);
    res.status(500).json({ success: false, error: 'Access check failed' });
  }
};

/**
 * Middleware to check if user is creator for preview management
 */
const isCreatorForPreview = async (req, res, next) => {
  try {
    const { contentId } = req.params;
    const userAddress = req.user?.address;

    if (!userAddress) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const content = await Content.findOne({ contentId: parseInt(contentId) });
    if (!content) {
      return res.status(404).json({ success: false, error: 'Content not found' });
    }

    if (content.creator !== userAddress) {
      return res.status(403).json({ success: false, error: 'Only creators can manage previews' });
    }

    next();
  } catch (error) {
    console.error('Error in creator check:', error);
    res.status(500).json({ success: false, error: 'Permission check failed' });
  }
};

/**
 * Middleware to rate limit preview downloads
 */
const rateLimitPreviewDownloads = (options = {}) => {
  const {
    maxDownloads = 5,
    windowMs = 60 * 60 * 1000 // 1 hour
  } = options;

  const downloadCounts = new Map();

  return async (req, res, next) => {
    const userAddress = req.user?.address || req.ip;
    const contentId = req.params.contentId;
    const key = `${userAddress}:${contentId}`;

    const now = Date.now();
    const record = downloadCounts.get(key) || { count: 0, resetTime: now + windowMs };

    if (now > record.resetTime) {
      // Reset window
      record.count = 0;
      record.resetTime = now + windowMs;
    }

    if (record.count >= maxDownloads) {
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil((record.resetTime - now) / 1000)
      });
    }

    record.count++;
    downloadCounts.set(key, record);
    next();
  };
};

/**
 * Middleware to require authentication for analytics endpoints
 */
const requireAuthForAnalytics = (req, res, next) => {
  if (!req.user || !req.user.address) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required to view analytics'
    });
  }
  next();
};

/**
 * Middleware to check content access type
 */
const checkContentAccessType = async (req, res, next) => {
  try {
    const { contentId } = req.params;
    const userAddress = req.user?.address;

    const content = await Content.findOne({ contentId: parseInt(contentId) });
    if (!content) {
      return res.status(404).json({ success: false, error: 'Content not found' });
    }

    // Attach access info to request
    req.contentAccessType = content.contentAccessType || 'purchase_required';
    req.content = content;

    next();
  } catch (error) {
    console.error('Error checking content access type:', error);
    res.status(500).json({ success: false, error: 'Access check failed' });
  }
};

module.exports = {
  canViewPreview,
  canDownloadPreview,
  isCreatorForPreview,
  rateLimitPreviewDownloads,
  requireAuthForAnalytics,
  checkContentAccessType
};
