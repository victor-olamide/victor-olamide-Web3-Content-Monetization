// Tier Upgrade Routes
// API endpoints for subscription tier upgrade/downgrade operations

const express = require('express');
const router = express.Router();
const tierUpgradeRulesService = require('../services/tierUpgradeRulesService');
const { validateTierId, validateCreatorId } = require('../middleware/subscriptionTierValidation');
const { verifyToken, isAuthenticated } = require('../middleware/subscriptionTierAuth');

/**
 * GET /users/:userId/creators/:creatorId/upgrades
 * Get available upgrade/downgrade options for a user
 */
router.get('/users/:userId/creators/:creatorId/upgrades', verifyToken, isAuthenticated, async (req, res) => {
  try {
    const { userId, creatorId } = req.params;

    // Ensure user can only view their own upgrades
    if (req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to view upgrades for this user'
      });
    }

    const result = await tierUpgradeRulesService.getAvailableUpgrades(userId, creatorId);

    if (!result.success) {
      return res.status(result.hasSubscription === false ? 404 : 400).json({
        success: false,
        message: result.error || result.message
      });
    }

    res.json({
      success: true,
      upgrades: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching available upgrades',
      error: error.message
    });
  }
});

/**
 * POST /users/:userId/upgrade
 * Process a tier upgrade for a user
 */
router.post('/users/:userId/upgrade', verifyToken, isAuthenticated, async (req, res) => {
  try {
    const { userId } = req.params;
    const { currentTierId, targetTierId, paymentDetails } = req.body;

    // Ensure user can only upgrade their own subscription
    if (req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to process upgrades for this user'
      });
    }

    if (!currentTierId || !targetTierId) {
      return res.status(400).json({
        success: false,
        message: 'Current tier ID and target tier ID are required'
      });
    }

    const result = await tierUpgradeRulesService.processTierUpgrade(
      userId,
      currentTierId,
      targetTierId,
      paymentDetails
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }

    res.json({
      success: true,
      message: result.message,
      upgrade: result.upgrade
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error processing tier upgrade',
      error: error.message
    });
  }
});

/**
 * POST /upgrade/validate
 * Validate if a tier upgrade is allowed
 */
router.post('/upgrade/validate', verifyToken, isAuthenticated, async (req, res) => {
  try {
    const { currentTierId, targetTierId, userId } = req.body;

    if (!currentTierId || !targetTierId) {
      return res.status(400).json({
        success: false,
        message: 'Current tier ID and target tier ID are required'
      });
    }

    // Use provided userId or current user
    const targetUserId = userId || req.user.id;

    const result = await tierUpgradeRulesService.validateTierUpgrade(
      currentTierId,
      targetTierId,
      targetUserId
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }

    res.json({
      success: true,
      valid: result.valid,
      upgradeDetails: result.upgradeDetails
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error validating tier upgrade',
      error: error.message
    });
  }
});

/**
 * GET /users/:userId/upgrade-history
 * Get upgrade history for a user
 */
router.get('/users/:userId/upgrade-history', verifyToken, isAuthenticated, async (req, res) => {
  try {
    const { userId } = req.params;
    const { creatorId } = req.query;

    // Ensure user can only view their own history
    if (req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to view upgrade history for this user'
      });
    }

    const result = await tierUpgradeRulesService.getUpgradeHistory(userId, creatorId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }

    res.json({
      success: true,
      history: result.history,
      totalUpgrades: result.totalUpgrades
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching upgrade history',
      error: error.message
    });
  }
});

/**
 * GET /tiers/:tierId/upgrade-paths
 * Get upgrade/downgrade paths from a specific tier
 */
router.get('/tiers/:tierId/upgrade-paths', validateTierId, async (req, res) => {
  try {
    const { tierId } = req.params;

    const tier = await require('../models/SubscriptionTier').findById(tierId);
    if (!tier) {
      return res.status(404).json({
        success: false,
        message: 'Tier not found'
      });
    }

    // Get all other active tiers from the same creator
    const relatedTiers = await require('../models/SubscriptionTier').find({
      creatorId: tier.creatorId,
      isActive: true,
      isVisible: true,
      _id: { $ne: tierId }
    }).sort({ position: 1 });

    const upgradePaths = relatedTiers.map(relatedTier => ({
      tierId: relatedTier._id,
      name: relatedTier.name,
      price: relatedTier.price,
      isUpgrade: relatedTier.price > tier.price,
      priceDifference: relatedTier.price - tier.price,
      benefits: relatedTier.benefits.filter(b => b.included),
      subscriberCount: relatedTier.subscriberCount,
      isPopular: relatedTier.isPopular
    }));

    // Separate upgrades and downgrades
    const upgrades = upgradePaths.filter(path => path.isUpgrade);
    const downgrades = upgradePaths.filter(path => !path.isUpgrade);

    res.json({
      success: true,
      currentTier: {
        id: tier._id,
        name: tier.name,
        price: tier.price
      },
      upgradePaths: {
        upgrades: upgrades.sort((a, b) => a.price - b.price),
        downgrades: downgrades.sort((a, b) => b.price - a.price)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching upgrade paths',
      error: error.message
    });
  }
});

module.exports = router;
