const express = require('express');
const router = express.Router();
const License = require('../models/License');
const Content = require('../models/Content');
const {
  createLicense,
  getActiveLicense,
  getUserActiveLicenses,
  renewLicense,
  getLicenseDetails,
  getContentLicenses,
  getLicensePricingTiers
} = require('../services/licensingService');

// Get license pricing tiers (public info)
router.get('/tiers', (req, res) => {
  try {
    const tiers = getLicensePricingTiers();
    res.json(tiers);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch license tiers', error: err.message });
  }
});

// Check if user has active license for content
router.get('/:contentId/:user', async (req, res) => {
  try {
    const license = await getActiveLicense(parseInt(req.params.contentId), req.params.user);

    if (license) {
      const now = new Date();
      const timeRemaining = license.expiresAt - now;

      res.json({
        hasAccess: true,
        license: {
          id: license._id,
          type: license.licenseType,
          expiresAt: license.expiresAt,
          timeRemainingHours: (timeRemaining / (60 * 60 * 1000)).toFixed(2)
        }
      });
    } else {
      res.json({ hasAccess: false });
    }
  } catch (err) {
    res.status(500).json({ message: 'Failed to check license', error: err.message });
  }
});

// Get all active licenses for user
router.get('/user/:userAddress', async (req, res) => {
  try {
    const licenses = await getUserActiveLicenses(req.params.userAddress);

    const enhanced = licenses.map(lic => {
      const now = new Date();
      const timeRemaining = lic.expiresAt - now;
      return {
        id: lic._id,
        contentId: lic.contentId,
        type: lic.licenseType,
        issuedAt: lic.issuedAt,
        expiresAt: lic.expiresAt,
        timeRemainingHours: (timeRemaining / (60 * 60 * 1000)).toFixed(2)
      };
    });

    res.json({
      user: req.params.userAddress,
      totalActive: enhanced.length,
      licenses: enhanced
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch user licenses', error: err.message });
  }
});

// Purchase a license (rental pass)
router.post('/', async (req, res) => {
  try {
    const { contentId, user, licenseType, purchasePrice, creator, txId } = req.body;

    if (!contentId || !user || !licenseType || !purchasePrice || !creator || !txId) {
      return res.status(400).json({
        message: 'Missing required fields: contentId, user, licenseType, purchasePrice, creator, txId'
      });
    }

    const content = await Content.findOne({ contentId: parseInt(contentId) });
    if (!content) {
      return res.status(404).json({ message: 'Content not found' });
    }

    const license = await createLicense(
      parseInt(contentId),
      user,
      licenseType,
      purchasePrice,
      creator,
      txId
    );

    res.status(201).json({
      message: 'License created successfully',
      license: {
        id: license._id,
        contentId: license.contentId,
        licenseType: license.licenseType,
        expiresAt: license.expiresAt,
        txId: license.txId
      }
    });
  } catch (err) {
    res.status(400).json({ message: 'Failed to create license', error: err.message });
  }
});

// Renew an active license
router.post('/:licenseId/renew', async (req, res) => {
  try {
    const { renewalPrice } = req.body;

    if (!renewalPrice || renewalPrice <= 0) {
      return res.status(400).json({ message: 'Valid renewal price is required' });
    }

    const renewed = await renewLicense(req.params.licenseId, renewalPrice);

    res.json({
      message: 'License renewed successfully',
      license: {
        id: renewed._id,
        expiresAt: renewed.expiresAt,
        renewalCount: renewed.renewalCount
      }
    });
  } catch (err) {
    res.status(400).json({ message: 'Failed to renew license', error: err.message });
  }
});

// Get license details
router.get('/details/:licenseId', async (req, res) => {
  try {
    const details = await getLicenseDetails(req.params.licenseId);

    res.json(details);
  } catch (err) {
    res.status(404).json({ message: 'License not found', error: err.message });
  }
});

// Get all licenses for a content (creator analytics)
router.get('/content/:contentId/analytics', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const skip = parseInt(req.query.skip) || 0;

    const result = await getContentLicenses(parseInt(req.params.contentId), { limit, skip });

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch analytics', error: err.message });
  }
});

module.exports = router;
