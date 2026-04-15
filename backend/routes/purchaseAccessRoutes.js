const express = require('express');
const router = express.Router();
const Purchase = require('../models/Purchase');
const Content = require('../models/Content');
const TransactionHistory = require('../models/TransactionHistory');
const {
  validatePayPerViewPurchaseRequest,
  validateAccessCheckRequest,
  validateContentIdParam,
  validateUserAddressParam,
  validatePaginationParams
} = require('../middleware/purchaseValidation');
const {
  grantAccessToContent,
  revokeAccessToContent,
  getAccessInfo,
  hasAccessToContent,
  getAccessibleContent,
  transferAccess,
  getPurchaseStats
} = require('../services/purchaseAccessService');

/**
 * Check if user has access to content
 * GET /purchases/access/:contentId/:userAddress
 */
router.get('/access/:contentId/:userAddress', validateContentIdParam, validateUserAddressParam, async (req, res) => {
  try {
    const hasAccess = await hasAccessToContent(req.parsedContentId, req.params.userAddress);
    const accessInfo = await getAccessInfo(req.parsedContentId, req.params.userAddress);

    res.json({
      contentId: req.parsedContentId,
      userAddress: req.params.userAddress,
      hasAccess,
      details: accessInfo
    });
  } catch (err) {
    console.error('Error checking access:', err);
    res.status(500).json({ message: 'Failed to check access', error: err.message });
  }
});

/**
 * Get all accessible content for user
 * GET /purchases/accessible/:userAddress
 */
router.get('/accessible/:userAddress', validateUserAddressParam, validatePaginationParams, async (req, res) => {
  try {
    const accessibleContent = await getAccessibleContent(req.params.userAddress, req.pagination);

    res.json(accessibleContent);
  } catch (err) {
    console.error('Error fetching accessible content:', err);
    res.status(500).json({ message: 'Failed to fetch accessible content', error: err.message });
  }
});

/**
 * Get access info for content
 * GET /purchases/info/:contentId/:userAddress
 */
router.get('/info/:contentId/:userAddress', validateContentIdParam, validateUserAddressParam, async (req, res) => {
  try {
    const accessInfo = await getAccessInfo(req.parsedContentId, req.params.userAddress);

    res.json(accessInfo);
  } catch (err) {
    console.error('Error fetching access info:', err);
    res.status(500).json({ message: 'Failed to fetch access info', error: err.message });
  }
});

/**
 * Get purchase statistics for content
 * GET /purchases/stats/:contentId
 */
router.get('/stats/:contentId', validateContentIdParam, async (req, res) => {
  try {
    const stats = await getPurchaseStats(req.parsedContentId);

    res.json(stats);
  } catch (err) {
    console.error('Error fetching purchase stats:', err);
    res.status(500).json({ message: 'Failed to fetch purchase stats', error: err.message });
  }
});

/**
 * Grant access to content (admin endpoint)
 * POST /purchases/grant-access
 */
router.post('/grant-access', async (req, res) => {
  const { contentId, userAddress } = req.body;

  if (!contentId || !userAddress) {
    return res.status(400).json({
      message: 'contentId and userAddress are required'
    });
  }

  try {
    const purchase = await Purchase.findOne({
      contentId,
      user: userAddress
    });

    if (!purchase) {
      return res.status(404).json({
        message: 'Purchase not found for this user and content'
      });
    }

    const result = await grantAccessToContent(contentId, userAddress, purchase);

    res.json(result);
  } catch (err) {
    console.error('Error granting access:', err);
    res.status(500).json({ message: 'Failed to grant access', error: err.message });
  }
});

/**
 * Revoke access to content (admin endpoint)
 * POST /purchases/revoke-access
 */
router.post('/revoke-access', async (req, res) => {
  const { contentId, userAddress } = req.body;

  if (!contentId || !userAddress) {
    return res.status(400).json({
      message: 'contentId and userAddress are required'
    });
  }

  try {
    const result = await revokeAccessToContent(contentId, userAddress);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json(result);
  } catch (err) {
    console.error('Error revoking access:', err);
    res.status(500).json({ message: 'Failed to revoke access', error: err.message });
  }
});

/**
 * Transfer access (admin endpoint for corrections)
 * POST /purchases/transfer-access
 */
router.post('/transfer-access', async (req, res) => {
  const { fromAddress, toAddress, contentId } = req.body;

  if (!fromAddress || !toAddress || !contentId) {
    return res.status(400).json({
      message: 'fromAddress, toAddress, and contentId are required'
    });
  }

  try {
    const result = await transferAccess(fromAddress, toAddress, contentId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (err) {
    console.error('Error transferring access:', err);
    res.status(500).json({ message: 'Failed to transfer access', error: err.message });
  }
});

/**
 * Get purchase history for user
 * GET /purchases/history/:userAddress
 */
router.get('/history/:userAddress', validateUserAddressParam, validatePaginationParams, async (req, res) => {
  try {
    const purchases = await Purchase.find({ user: req.params.userAddress })
      .sort({ timestamp: -1 })
      .skip(req.pagination.skip)
      .limit(req.pagination.limit)
      .lean()
      .exec();

    const total = await Purchase.countDocuments({ user: req.params.userAddress });

    res.json({
      data: purchases,
      total,
      skip: req.pagination.skip,
      limit: req.pagination.limit,
      pages: Math.ceil(total / req.pagination.limit)
    });
  } catch (err) {
    console.error('Error fetching purchase history:', err);
    res.status(500).json({ message: 'Failed to fetch purchase history', error: err.message });
  }
});

/**
 * Get all purchases for content
 * GET /purchases/content/:contentId
 */
router.get('/content/:contentId', validateContentIdParam, validatePaginationParams, async (req, res) => {
  try {
    const purchases = await Purchase.find({ contentId: req.parsedContentId })
      .sort({ timestamp: -1 })
      .skip(req.pagination.skip)
      .limit(req.pagination.limit)
      .lean()
      .exec();

    const total = await Purchase.countDocuments({ contentId: req.parsedContentId });

    res.json({
      data: purchases,
      total,
      skip: req.pagination.skip,
      limit: req.pagination.limit,
      pages: Math.ceil(total / req.pagination.limit)
    });
  } catch (err) {
    console.error('Error fetching content purchases:', err);
    res.status(500).json({ message: 'Failed to fetch content purchases', error: err.message });
  }
});

module.exports = router;
