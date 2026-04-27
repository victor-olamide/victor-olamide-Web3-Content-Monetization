// Bulk Operations Routes
// API endpoints for bulk tier operations

const express = require('express');
const router = express.Router();
const subscriptionTierService = require('../services/subscriptionTierService');
const { validateBulkTierCreation, validateBulkTierUpdate } = require('../middleware/subscriptionTierValidation');
const { verifyToken, isCreator } = require('../middleware/subscriptionTierAuth');
const { tierAsyncHandler, tierRateLimiter, tierTimeoutHandler } = require('../middleware/tierErrorHandling');

/**
 * POST /tiers/bulk/create
 * Create multiple subscription tiers in bulk
 * @body {Array} tiers - Array of tier objects to create
 */
router.post('/bulk/create', tierRateLimiter, tierTimeoutHandler(), verifyToken, isCreator, validateBulkTierCreation, tierAsyncHandler(async (req, res) => {
  try {
    const { tiers } = req.body;
    const creatorId = req.user.id;

    const result = await subscriptionTierService.createBulkTiers(tiers, creatorId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error,
        failedTiers: result.failedTiers
      });
    }

    res.status(201).json({
      success: true,
      message: `Successfully created ${result.createdTiers.length} tiers`,
      createdTiers: result.createdTiers,
      failedTiers: result.failedTiers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating bulk tiers',
      error: error.message
    });
  }
}));

/**
 * PUT /tiers/bulk/update
 * Update multiple subscription tiers in bulk
 * @body {Array} updates - Array of tier update objects
 */
router.put('/bulk/update', verifyToken, isCreator, validateBulkTierUpdate, async (req, res) => {
  try {
    const { updates } = req.body;
    const creatorId = req.user.id;

    const result = await subscriptionTierService.updateBulkTiers(updates, creatorId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error,
        failedUpdates: result.failedUpdates
      });
    }

    res.json({
      success: true,
      message: `Successfully updated ${result.updatedTiers.length} tiers`,
      updatedTiers: result.updatedTiers,
      failedUpdates: result.failedUpdates
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating bulk tiers',
      error: error.message
    });
  }
});

/**
 * DELETE /tiers/bulk/delete
 * Delete multiple subscription tiers in bulk
 * @body {Array} tierIds - Array of tier IDs to delete
 */
router.delete('/bulk/delete', tierRateLimiter, tierTimeoutHandler(), verifyToken, isCreator, tierAsyncHandler(async (req, res) => {
  try {
    const { tierIds } = req.body;
    const creatorId = req.user.id;

    if (!tierIds || !Array.isArray(tierIds) || tierIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'tierIds array is required and must not be empty'
      });
    }

    const result = await subscriptionTierService.deleteBulkTiers(tierIds, creatorId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error,
        failedDeletions: result.failedDeletions
      });
    }

    res.json({
      success: true,
      message: `Successfully deleted ${result.deletedTiers.length} tiers`,
      deletedTiers: result.deletedTiers,
      failedDeletions: result.failedDeletions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting bulk tiers',
      error: error.message
    });
  }
}));

/**
 * POST /tiers/bulk/duplicate
 * Duplicate multiple subscription tiers
 * @body {Array} tierIds - Array of tier IDs to duplicate
 * @body {Object} modifications - Optional modifications to apply to duplicates
 */
router.post('/bulk/duplicate', verifyToken, isCreator, async (req, res) => {
  try {
    const { tierIds, modifications = {} } = req.body;
    const creatorId = req.user.id;

    if (!tierIds || !Array.isArray(tierIds) || tierIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'tierIds array is required and must not be empty'
      });
    }

    const result = await subscriptionTierService.duplicateBulkTiers(tierIds, creatorId, modifications);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error,
        failedDuplications: result.failedDuplications
      });
    }

    res.status(201).json({
      success: true,
      message: `Successfully duplicated ${result.duplicatedTiers.length} tiers`,
      duplicatedTiers: result.duplicatedTiers,
      failedDuplications: result.failedDuplications
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error duplicating bulk tiers',
      error: error.message
    });
  }
});

/**
 * POST /tiers/bulk/archive
 * Archive multiple subscription tiers
 * @body {Array} tierIds - Array of tier IDs to archive
 */
router.post('/bulk/archive', verifyToken, isCreator, async (req, res) => {
  try {
    const { tierIds } = req.body;
    const creatorId = req.user.id;

    if (!tierIds || !Array.isArray(tierIds) || tierIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'tierIds array is required and must not be empty'
      });
    }

    const result = await subscriptionTierService.archiveBulkTiers(tierIds, creatorId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error,
        failedArchives: result.failedArchives
      });
    }

    res.json({
      success: true,
      message: `Successfully archived ${result.archivedTiers.length} tiers`,
      archivedTiers: result.archivedTiers,
      failedArchives: result.failedArchives
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error archiving bulk tiers',
      error: error.message
    });
  }
});

/**
 * POST /tiers/bulk/unarchive
 * Unarchive multiple subscription tiers
 * @body {Array} tierIds - Array of tier IDs to unarchive
 */
router.post('/bulk/unarchive', verifyToken, isCreator, async (req, res) => {
  try {
    const { tierIds } = req.body;
    const creatorId = req.user.id;

    if (!tierIds || !Array.isArray(tierIds) || tierIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'tierIds array is required and must not be empty'
      });
    }

    const result = await subscriptionTierService.unarchiveBulkTiers(tierIds, creatorId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error,
        failedUnarchives: result.failedUnarchives
      });
    }

    res.json({
      success: true,
      message: `Successfully unarchived ${result.unarchivedTiers.length} tiers`,
      unarchivedTiers: result.unarchivedTiers,
      failedUnarchives: result.failedUnarchives
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error unarchiving bulk tiers',
      error: error.message
    });
  }
});

module.exports = router;
