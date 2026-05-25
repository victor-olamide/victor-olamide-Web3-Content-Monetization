// Tier Benefits Routes
// API endpoints for managing subscription tier benefits/features

const express = require('express');
const router = express.Router();
const tierBenefitsService = require('../services/tierBenefitsService');
const { validateTierId } = require('../middleware/subscriptionTierValidation');
const { verifyToken, verifyTierOwnership } = require('../middleware/subscriptionTierAuth');

/**
 * GET /tiers/:tierId/benefits
 * Get all benefits for a tier
 */
router.get('/tiers/:tierId/benefits', validateTierId, async (req, res) => {
  try {
    const { tierId } = req.params;

    const result = await tierBenefitsService.getTierBenefits(tierId);

    if (!result.success) {
      return res.status(404).json({ success: false, message: result.error });
    }

    res.json({
      success: true,
      tierName: result.tierName,
      benefits: result.benefits,
      count: result.benefits.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching benefits',
      error: error.message
    });
  }
});

/**
 * GET /tiers/:tierId/benefits/included
 * Get only included benefits for a tier
 */
router.get('/tiers/:tierId/benefits/included', validateTierId, async (req, res) => {
  try {
    const { tierId } = req.params;

    const result = await tierBenefitsService.getIncludedBenefits(tierId);

    if (!result.success) {
      return res.status(404).json({ success: false, message: result.error });
    }

    res.json({
      success: true,
      tierName: result.tierName,
      benefits: result.benefits,
      count: result.benefits.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching included benefits',
      error: error.message
    });
  }
});

/**
 * POST /tiers/:tierId/benefits
 * Add a benefit to a tier
 * @body {string} feature - Feature name
 * @body {string} description - Feature description
 * @body {boolean} included - Whether this feature is included
 */
router.post('/tiers/:tierId/benefits', validateTierId, verifyToken, verifyTierOwnership, async (req, res) => {
  try {
    const { tierId } = req.params;
    const { feature, description, included } = req.body;

    if (!feature || typeof feature !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Feature name is required and must be a string'
      });
    }

    const result = await tierBenefitsService.addBenefitToTier(tierId, {
      feature,
      description: description || null,
      included: included !== false
    });

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.error });
    }

    res.status(201).json({
      success: true,
      message: result.message,
      tier: result.tier
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error adding benefit',
      error: error.message
    });
  }
});

/**
 * PUT /tiers/:tierId/benefits/:benefitIndex
 * Update a benefit in a tier
 */
router.put('/tiers/:tierId/benefits/:benefitIndex', validateTierId, verifyToken, verifyTierOwnership, async (req, res) => {
  try {
    const { tierId, benefitIndex } = req.params;
    const updateData = req.body;

    if (!Number.isInteger(Number(benefitIndex)) || Number(benefitIndex) < 0) {
      return res.status(400).json({
        success: false,
        message: 'Benefit index must be a non-negative integer'
      });
    }

    const result = await tierBenefitsService.updateBenefitInTier(tierId, Number(benefitIndex), updateData);

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.error });
    }

    res.json({
      success: true,
      message: result.message,
      tier: result.tier
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating benefit',
      error: error.message
    });
  }
});

/**
 * DELETE /tiers/:tierId/benefits/:benefitIndex
 * Remove a benefit from a tier
 */
router.delete('/tiers/:tierId/benefits/:benefitIndex', validateTierId, verifyToken, verifyTierOwnership, async (req, res) => {
  try {
    const { tierId, benefitIndex } = req.params;

    if (!Number.isInteger(Number(benefitIndex)) || Number(benefitIndex) < 0) {
      return res.status(400).json({
        success: false,
        message: 'Benefit index must be a non-negative integer'
      });
    }

    const result = await tierBenefitsService.removeBenefitFromTier(tierId, Number(benefitIndex));

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.error });
    }

    res.json({
      success: true,
      message: result.message,
      tier: result.tier
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error removing benefit',
      error: error.message
    });
  }
});

/**
 * PUT /tiers/:tierId/benefits
 * Bulk update all benefits for a tier
 * @body {Array} benefits - Array of benefit objects
 */
router.put('/tiers/:tierId/benefits', validateTierId, verifyToken, verifyTierOwnership, async (req, res) => {
  try {
    const { tierId } = req.params;
    const { benefits } = req.body;

    if (!Array.isArray(benefits)) {
      return res.status(400).json({
        success: false,
        message: 'Benefits must be an array'
      });
    }

    const result = await tierBenefitsService.setBenefitsForTier(tierId, benefits);

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.error });
    }

    res.json({
      success: true,
      message: result.message,
      tier: result.tier
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating benefits',
      error: error.message
    });
  }
});

module.exports = router;
