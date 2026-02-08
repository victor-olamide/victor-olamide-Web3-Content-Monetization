const License = require('../models/License');

// License duration presets in hours
const LICENSE_DURATIONS = {
  'rental-24h': 24,
  'rental-7d': 7 * 24,
  'rental-30d': 30 * 24,
  'permanent': null // No expiration
};

/**
 * Create a new license (rental pass) for content
 * @param {number} contentId - Content ID
 * @param {string} user - User address
 * @param {string} licenseType - License type (rental-24h, rental-7d, rental-30d, permanent)
 * @param {number} price - Purchase price
 * @param {string} creator - Creator address
 * @param {string} txId - Transaction ID
 * @returns {Promise<Object>} Created license
 */
const createLicense = async (contentId, user, licenseType, price, creator, txId) => {
  try {
    if (!LICENSE_DURATIONS[licenseType]) {
      throw new Error(`Invalid license type: ${licenseType}`);
    }

    const issuedAt = new Date();
    let expiresAt;

    if (licenseType === 'permanent') {
      // Set permanent expiry far in future (100 years)
      expiresAt = new Date(issuedAt.getTime() + 100 * 365.25 * 24 * 60 * 60 * 1000);
    } else {
      const durationHours = LICENSE_DURATIONS[licenseType];
      expiresAt = new Date(issuedAt.getTime() + durationHours * 60 * 60 * 1000);
    }

    const license = new License({
      contentId,
      user,
      licenseType,
      purchasePrice: price,
      issuedAt,
      expiresAt,
      txId,
      creator
    });

    const saved = await license.save();
    return saved;
  } catch (error) {
    throw new Error(`Failed to create license: ${error.message}`);
  }
};

/**
 * Check if user has valid (non-expired) license for content
 * @param {number} contentId - Content ID
 * @param {string} user - User address
 * @returns {Promise<Object|null>} Valid license or null
 */
const getActiveLicense = async (contentId, user) => {
  try {
    const now = new Date();
    const license = await License.findOne({
      contentId,
      user,
      expiresAt: { $gt: now },
      isExpired: false
    });

    return license || null;
  } catch (error) {
    throw new Error(`Failed to check active license: ${error.message}`);
  }
};

/**
 * Get all active licenses for a user
 * @param {string} user - User address
 * @returns {Promise<Array>} Array of active licenses
 */
const getUserActiveLicenses = async (user) => {
  try {
    const now = new Date();
    const licenses = await License.find({
      user,
      expiresAt: { $gt: now },
      isExpired: false
    }).sort({ expiresAt: 1 });

    return licenses;
  } catch (error) {
    throw new Error(`Failed to fetch user licenses: ${error.message}`);
  }
};

/**
 * Renew a license (extend expiry)
 * @param {string} licenseId - License MongoDB ID
 * @param {number} renewalPrice - Renewal cost
 * @returns {Promise<Object>} Updated license
 */
const renewLicense = async (licenseId, renewalPrice) => {
  try {
    const license = await License.findById(licenseId);
    if (!license) {
      throw new Error('License not found');
    }

    if (license.licenseType === 'permanent') {
      throw new Error('Permanent licenses cannot be renewed');
    }

    const durationHours = LICENSE_DURATIONS[license.licenseType];
    const newExpiresAt = new Date(license.expiresAt.getTime() + durationHours * 60 * 60 * 1000);

    license.expiresAt = newExpiresAt;
    license.renewalCount += 1;
    license.lastRenewedAt = new Date();

    const updated = await license.save();
    return updated;
  } catch (error) {
    throw new Error(`Failed to renew license: ${error.message}`);
  }
};

/**
 * Mark licenses as expired (batch operation for cleanup)
 * @returns {Promise<Object>} Result with count of expired licenses
 */
const markExpiredLicenses = async () => {
  try {
    const now = new Date();
    const result = await License.updateMany(
      {
        expiresAt: { $lte: now },
        isExpired: false
      },
      {
        isExpired: true
      }
    );

    return result;
  } catch (error) {
    throw new Error(`Failed to mark expired licenses: ${error.message}`);
  }
};

/**
 * Get license details
 * @param {string} licenseId - License MongoDB ID
 * @returns {Promise<Object>} License details
 */
const getLicenseDetails = async (licenseId) => {
  try {
    const license = await License.findById(licenseId);
    if (!license) {
      throw new Error('License not found');
    }

    const now = new Date();
    const timeRemaining = license.expiresAt - now;
    const isActive = timeRemaining > 0 && !license.isExpired;

    return {
      ...license.toObject(),
      isActive,
      timeRemainingMs: Math.max(0, timeRemaining),
      timeRemainingHours: Math.max(0, timeRemaining / (60 * 60 * 1000))
    };
  } catch (error) {
    throw new Error(`Failed to get license details: ${error.message}`);
  }
};

/**
 * Get all licenses for a content (for creator analytics)
 * @param {number} contentId - Content ID
 * @param {Object} options - Query options (limit, skip)
 * @returns {Promise<Object>} Licenses and metadata
 */
const getContentLicenses = async (contentId, options = {}) => {
  try {
    const limit = options.limit || 50;
    const skip = options.skip || 0;

    const licenses = await License.find({ contentId })
      .sort({ issuedAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await License.countDocuments({ contentId });
    const active = await License.countDocuments({
      contentId,
      expiresAt: { $gt: new Date() },
      isExpired: false
    });

    return {
      contentId,
      total,
      active,
      licenses,
      limit,
      skip
    };
  } catch (error) {
    throw new Error(`Failed to fetch content licenses: ${error.message}`);
  }
};

/**
 * Get license pricing tiers (configurable per content)
 * @returns {Object} License types with default pricing factors
 */
const getLicensePricingTiers = () => {
  return {
    'rental-24h': {
      description: '24-hour access',
      hours: 24,
      priceFactor: 0.5 // 50% of permanent purchase price
    },
    'rental-7d': {
      description: '7-day access',
      hours: 7 * 24,
      priceFactor: 2.0 // 200% of 24h price
    },
    'rental-30d': {
      description: '30-day access',
      hours: 30 * 24,
      priceFactor: 4.5 // 450% of 24h price
    },
    'permanent': {
      description: 'Permanent ownership',
      hours: null,
      priceFactor: 1.0 // Base price
    }
  };
};

module.exports = {
  createLicense,
  getActiveLicense,
  getUserActiveLicenses,
  renewLicense,
  markExpiredLicenses,
  getLicenseDetails,
  getContentLicenses,
  getLicensePricingTiers,
  LICENSE_DURATIONS
};
