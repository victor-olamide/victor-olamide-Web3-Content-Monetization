const express = require('express');
const router = express.Router();
const GatingRule = require('../models/GatingRule');
const contentGateMiddleware = require('../middleware/contentGateVerificationMiddleware');
const contentGateService = require('../services/contentGateService');

/**
 * GET /gating/:contentId
 * Retrieve gating rule for specific content
 * Checks both database and on-chain contract
 */
router.get('/:contentId', async (req, res) => {
  try {
    const { contentId } = req.params;
    
    // First check on-chain contract
    const onChainRule = await contentGateService.getGatingRule(contentId);
    
    if (onChainRule) {
      return res.json({
        contentId,
        source: 'on-chain',
        rule: {
          type: onChainRule.gating_type === 0 ? 'FT' : 'NFT',
          tokenContract: onChainRule.token_contract,
          threshold: onChainRule.threshold,
        },
        success: true,
      });
    }

    // Fall back to database
    const dbRule = await GatingRule.findOne({ contentId });
    if (!dbRule) {
      return res.status(404).json({
        error: 'Gating rule not found',
        contentId,
        success: false,
      });
    }

    res.json({
      contentId,
      source: 'database',
      rule: dbRule,
      success: true,
    });
  } catch (err) {
    console.error('Error fetching gating rule:', err.message);
    res.status(500).json({
      error: err.message,
      success: false,
    });
  }
});

/**
 * GET /gating/
 * Retrieve all gating rules from database
 */
router.get('/', async (req, res) => {
  try {
    const rules = await GatingRule.find();
    res.json({
      count: rules.length,
      rules,
      success: true,
    });
  } catch (err) {
    console.error('Error fetching gating rules:', err.message);
    res.status(500).json({
      error: err.message,
      success: false,
    });
  }
});

/**
 * POST /gating/verify
 * Verify user access for gated content
 * Checks NFT/token ownership against gating rules
 */
router.post('/verify', contentGateMiddleware.verifyAccessBeforeDelivery, async (req, res) => {
  try {
    const { contentId, userAddress } = req.body;

    if (!contentId || !userAddress) {
      return res.status(400).json({
        error: 'contentId and userAddress required',
        success: false,
      });
    }

    const verification = await contentGateService.getGatingRule(contentId);
    
    if (!verification) {
      return res.json({
        contentId,
        userAddress,
        verified: true,
        reason: 'no-gating-rule',
        success: true,
      });
    }

    let accessResult;
    if (verification.gating_type === 0) {
      // FT verification
      accessResult = await contentGateService.verifyFTAccess(
        contentId,
        userAddress,
        verification.token_contract
      );
    } else {
      // NFT verification
      accessResult = await contentGateService.verifyNFTAccess(
        contentId,
        userAddress
      );
    }

    res.json({
      contentId,
      userAddress,
      verified: accessResult.verified,
      reason: accessResult.reason,
      type: verification.gating_type === 0 ? 'FT' : 'NFT',
      success: true,
    });
  } catch (error) {
    console.error('Error verifying access:', error.message);
    res.status(500).json({
      error: error.message,
      success: false,
    });
  }
});

/**
 * GET /gating/:contentId/status
 * Check gating status for content
 */
router.get('/:contentId/status', contentGateMiddleware.checkGatingStatus, async (req, res) => {
  try {
    // Middleware already populated the response
    const result = req.gatingStatus || {
      contentId: req.params.contentId,
      hasGating: false,
    };

    res.json({
      ...result,
      success: true,
    });
  } catch (error) {
    console.error('Error getting gating status:', error.message);
    res.status(500).json({
      error: error.message,
      success: false,
    });
  }
});

/**
 * GET /gating/metrics
 * Get gating service metrics
 */
router.get('/metrics/all', (req, res) => {
  try {
    const metrics = contentGateMiddleware.getGatingMetrics();
    res.json({
      metrics,
      success: true,
    });
  } catch (error) {
    console.error('Error getting metrics:', error.message);
    res.status(500).json({
      error: error.message,
      success: false,
    });
  }
});

module.exports = router;
