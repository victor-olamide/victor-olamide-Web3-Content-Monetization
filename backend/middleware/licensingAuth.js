const { getActiveLicense } = require('../services/licensingService');

/**
 * Middleware to check if user has valid license for content access
 */
async function checkContentLicense(req, res, next) {
  try {
    const { contentId, user } = req.params;

    if (!contentId || !user) {
      return res.status(400).json({ message: 'contentId and user are required' });
    }

    const license = await getActiveLicense(parseInt(contentId), user);

    if (!license) {
      return res.status(403).json({
        message: 'Access denied - no active license for this content',
        contentId: parseInt(contentId),
        user
      });
    }

    const now = new Date();
    const timeRemaining = license.expiresAt - now;

    req.license = {
      id: license._id,
      type: license.licenseType,
      expiresAt: license.expiresAt,
      timeRemainingMs: timeRemaining,
      timeRemainingHours: (timeRemaining / (60 * 60 * 1000)).toFixed(2)
    };

    next();
  } catch (err) {
    res.status(500).json({ message: 'Failed to verify license', error: err.message });
  }
}

/**
 * Middleware to optionally check license (allows access even without license)
 * Useful for routes that provide different responses based on license status
 */
async function optionalCheckContentLicense(req, res, next) {
  try {
    const { contentId, user } = req.params || req.body;

    if (!contentId || !user) {
      next();
      return;
    }

    const license = await getActiveLicense(parseInt(contentId), user);

    if (license) {
      const now = new Date();
      const timeRemaining = license.expiresAt - now;

      req.license = {
        id: license._id,
        type: license.licenseType,
        expiresAt: license.expiresAt,
        timeRemainingMs: timeRemaining,
        hasAccess: true
      };
    } else {
      req.license = { hasAccess: false };
    }

    next();
  } catch (err) {
    req.license = { hasAccess: false };
    next();
  }
}

module.exports = {
  checkContentLicense,
  optionalCheckContentLicense
};
