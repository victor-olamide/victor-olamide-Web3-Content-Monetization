const express = require('express');
const router = express.Router();
const RoyaltyDistribution = require('../models/RoyaltyDistribution');
const {
  getPendingDistributions,
  getDistributionHistory
} = require('../services/royaltyService');

// Get pending distributions for a collaborator
router.get('/:collaboratorAddress/pending', async (req, res) => {
  try {
    const distributions = await getPendingDistributions(req.params.collaboratorAddress);

    const totalPending = distributions.reduce((sum, d) => sum + d.royaltyAmount, 0);

    res.json({
      collaboratorAddress: req.params.collaboratorAddress,
      totalPending,
      count: distributions.length,
      distributions
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch pending distributions', error: err.message });
  }
});

// Get distribution history for a collaborator
router.get('/:collaboratorAddress/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const skip = parseInt(req.query.skip) || 0;

    const result = await getDistributionHistory(req.params.collaboratorAddress, { limit, skip });

    res.json({
      collaboratorAddress: req.params.collaboratorAddress,
      ...result
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch distribution history', error: err.message });
  }
});

// Get distribution summary (total earned)
router.get('/:collaboratorAddress/summary', async (req, res) => {
  try {
    const completed = await RoyaltyDistribution.find({
      collaboratorAddress: req.params.collaboratorAddress,
      status: 'completed'
    });

    const pending = await RoyaltyDistribution.find({
      collaboratorAddress: req.params.collaboratorAddress,
      status: 'pending'
    });

    const failed = await RoyaltyDistribution.find({
      collaboratorAddress: req.params.collaboratorAddress,
      status: 'failed'
    });

    const totalCompleted = completed.reduce((sum, d) => sum + d.royaltyAmount, 0);
    const totalPending = pending.reduce((sum, d) => sum + d.royaltyAmount, 0);

    res.json({
      collaboratorAddress: req.params.collaboratorAddress,
      earnings: {
        completed: totalCompleted,
        pending: totalPending,
        failed: failed.length
      },
      counts: {
        completed: completed.length,
        pending: pending.length,
        failed: failed.length
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch summary', error: err.message });
  }
});

// Get specific distribution details
router.get('/distribution/:distributionId', async (req, res) => {
  try {
    const distribution = await RoyaltyDistribution.findById(req.params.distributionId).populate('purchaseId');

    if (!distribution) {
      return res.status(404).json({ message: 'Distribution not found' });
    }

    res.json(distribution);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch distribution', error: err.message });
  }
});

module.exports = router;
