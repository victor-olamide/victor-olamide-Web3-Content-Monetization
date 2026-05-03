// Subscription Tier Routes
// API endpoints for managing subscription tiers

const express = require('express');
const router = express.Router();
const subscriptionTierService = require('../services/subscriptionTierService');

/**
 * POST /tiers
 * Create a new subscription tier
 */
router.post('/tiers', async (req, res) => {
  try {
    const { creatorId, name, description, price, benefits, icon, position, isPopular, trialDays } = req.body;

    if (!creatorId || !name || !description || price === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Creator ID, name, description, and price are required'
      });
    }

    if (price < 0) {
      return res.status(400).json({
        success: false,
        message: 'Price must be 0 or greater'
      });
    }

    const result = await subscriptionTierService.createSubscriptionTier(creatorId, {
      name,
      description,
      price,
      benefits: benefits || [],
      icon: icon || null,
      position: position !== undefined ? position : undefined,
      isPopular: isPopular || false,
      trialDays: trialDays || 0
    });

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.error });
    }

    res.status(201).json({
      success: true,
      message: 'Subscription tier created successfully',
      tier: result.tier
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating subscription tier',
      error: error.message
    });
  }
});

/**
 * GET /creators/:creatorId/tiers
 * Get all subscription tiers for a creator
 */
router.get('/creators/:creatorId/tiers', async (req, res) => {
  try {
    const { creatorId } = req.params;
    const { includeInactive, onlyVisible, sortBy, ascending } = req.query;

    if (!creatorId) {
      return res.status(400).json({
        success: false,
        message: 'Creator ID is required'
      });
    }

    const result = await subscriptionTierService.getCreatorTiers(creatorId, {
      includeInactive: includeInactive === 'true',
      onlyVisible: onlyVisible !== 'false',
      sortBy: sortBy || 'position',
      ascending: ascending !== 'false'
    });

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.error });
    }

    res.json({
      success: true,
      creatorId,
      count: result.count,
      tiers: result.tiers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching tiers',
      error: error.message
    });
  }
});

/**
 * GET /tiers/:tierId
 * Get a specific tier by ID
 */
router.get('/tiers/:tierId', async (req, res) => {
  try {
    const { tierId } = req.params;

    if (!tierId) {
      return res.status(400).json({
        success: false,
        message: 'Tier ID is required'
      });
    }

    const result = await subscriptionTierService.getTierById(tierId);

    if (!result.success) {
      return res.status(404).json({ success: false, message: result.error });
    }

    res.json({
      success: true,
      tier: result.tier
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching tier',
      error: error.message
    });
  }
});

/**
 * PUT /tiers/:tierId
 * Update a subscription tier
 */
router.put('/tiers/:tierId', async (req, res) => {
  try {
    const { tierId } = req.params;
    const updateData = req.body;

    if (!tierId) {
      return res.status(400).json({
        success: false,
        message: 'Tier ID is required'
      });
    }

    // Validate price if provided
    if (updateData.price !== undefined && updateData.price < 0) {
      return res.status(400).json({
        success: false,
        message: 'Price must be 0 or greater'
      });
    }

    const result = await subscriptionTierService.updateSubscriptionTier(tierId, updateData);

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.error });
    }

    res.json({
      success: true,
      message: 'Tier updated successfully',
      tier: result.tier
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating tier',
      error: error.message
    });
  }
});

/**
 * DELETE /tiers/:tierId
 * Delete a subscription tier
 */
router.delete('/tiers/:tierId', async (req, res) => {
  try {
    const { tierId } = req.params;
    const { hardDelete } = req.query;

    if (!tierId) {
      return res.status(400).json({
        success: false,
        message: 'Tier ID is required'
      });
    }

    const result = await subscriptionTierService.deleteSubscriptionTier(
      tierId,
      hardDelete === 'true'
    );

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.error });
    }

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting tier',
      error: error.message
    });
  }
});

/**
 * GET /tiers/:tierId/hierarchy
 * Get tier hierarchy (breadth view of all tiers)
 */
router.get('/creators/:creatorId/hierarchy', async (req, res) => {
  try {
    const { creatorId } = req.params;

    if (!creatorId) {
      return res.status(400).json({
        success: false,
        message: 'Creator ID is required'
      });
    }

    const result = await subscriptionTierService.getTierHierarchy(creatorId);

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.error });
    }

    res.json({
      success: true,
      hierarchy: result.hierarchy
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching hierarchy',
      error: error.message
    });
  }
});

/**
 * GET /tiers/compare
 * Compare two tiers
 */
router.get('/tiers/compare', async (req, res) => {
  try {
    const { tierId1, tierId2 } = req.query;

    if (!tierId1 || !tierId2) {
      return res.status(400).json({
        success: false,
        message: 'Both tier IDs are required'
      });
    }

    const result = await subscriptionTierService.compareTiers(tierId1, tierId2);

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.error });
    }

    res.json({
      success: true,
      comparison: result.comparison
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error comparing tiers',
      error: error.message
    });
  }
});

/**
 * GET /creators/:creatorId/tiers/suggestions
 * Get tier optimization suggestions
 */
router.get('/creators/:creatorId/suggestions', async (req, res) => {
  try {
    const { creatorId } = req.params;

    if (!creatorId) {
      return res.status(400).json({
        success: false,
        message: 'Creator ID is required'
      });
    }

    const result = await subscriptionTierService.getTierSuggestions(creatorId);

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.error });
    }

    res.json({
      success: true,
      suggestions: result.suggestions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching suggestions',
      error: error.message
    });
  }
});

/**
 * POST /tiers/reorder
 * Reorder tiers for a creator
 */
router.post('/creators/:creatorId/reorder', async (req, res) => {
  try {
    const { creatorId } = req.params;
    const { tierPositions } = req.body;

    if (!creatorId || !Array.isArray(tierPositions)) {
      return res.status(400).json({
        success: false,
        message: 'Creator ID and tier positions array are required'
      });
    }

    const result = await subscriptionTierService.reorderTiers(creatorId, tierPositions);

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.error });
    }

    res.json({
      success: true,
      message: `${result.updated} tiers reordered successfully`,
      tiers: result.tiers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error reordering tiers',
      error: error.message
    });
  }
});

/**
 * GET /creators/:creatorId/statistics
 * Get tier statistics for a creator
 */
router.get('/creators/:creatorId/statistics', async (req, res) => {
  try {
    const { creatorId } = req.params;

    if (!creatorId) {
      return res.status(400).json({
        success: false,
        message: 'Creator ID is required'
      });
    }

    const result = await subscriptionTierService.getTierStatistics(creatorId);

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.error });
    }

    res.json({
      success: true,
      statistics: result.statistics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message
    });
  }
});

/**
 * POST /tiers/:tierId/activate
 * Activate a tier
 */
router.post('/tiers/:tierId/activate', async (req, res) => {
  try {
    const { tierId } = req.params;

    if (!tierId) {
      return res.status(400).json({
        success: false,
        message: 'Tier ID is required'
      });
    }

    const result = await subscriptionTierService.updateSubscriptionTier(tierId, {
      isActive: true
    });

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.error });
    }

    res.json({
      success: true,
      message: 'Tier activated successfully',
      tier: result.tier
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error activating tier',
      error: error.message
    });
  }
});

/**
 * POST /tiers/:tierId/deactivate
 * Deactivate a tier
 */
router.post('/tiers/:tierId/deactivate', async (req, res) => {
  try {
    const { tierId } = req.params;

    if (!tierId) {
      return res.status(400).json({
        success: false,
        message: 'Tier ID is required'
      });
    }

    const result = await subscriptionTierService.updateSubscriptionTier(tierId, {
      isActive: false
    });

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.error });
    }

    res.json({
      success: true,
      message: 'Tier deactivated successfully',
      tier: result.tier
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deactivating tier',
      error: error.message
    });
  }
});

/**
 * POST /tiers/:tierId/toggle-popular
 * Toggle popular status of a tier
 */
router.post('/tiers/:tierId/toggle-popular', async (req, res) => {
  try {
    const { tierId } = req.params;

    if (!tierId) {
      return res.status(400).json({
        success: false,
        message: 'Tier ID is required'
      });
    }

    // Get current tier to toggle
    const getTierResult = await subscriptionTierService.getTierById(tierId);
    if (!getTierResult.success) {
      return res.status(404).json({ success: false, message: getTierResult.error });
    }

    const currentPopular = getTierResult.tier.isPopular;

    const result = await subscriptionTierService.updateSubscriptionTier(tierId, {
      isPopular: !currentPopular
    });

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.error });
    }

    res.json({
      success: true,
      message: `Tier marked as ${!currentPopular ? 'popular' : 'not popular'}`,
      tier: result.tier
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error toggling popular status',
      error: error.message
    });
  }
});

module.exports = router;
