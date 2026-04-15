const express = require('express');
const {
  verifyTransactionStatus,
  verifyPurchase,
  verifySubscription,
  batchVerifyTransactionStatuses,
  batchVerifyPurchases,
  determineAccess,
  detectTransactionType,
  getCacheStats,
  getVerificationMetrics,
  evictExpiredCache
} = require('../services/blockchainVerification');

const router = express.Router();

/**
 * GET /api/blockchain/tx/:txId
 * Check on-chain status of a single transaction
 */
router.get('/tx/:txId', async (req, res) => {
  try {
    const { txId } = req.params;
    const minConfirmations = parseInt(req.query.minConfirmations || '1', 10);

    if (!txId || typeof txId !== 'string') {
      return res.status(400).json({ success: false, message: 'Invalid transaction ID' });
    }

    const result = await verifyTransactionStatus(txId, minConfirmations);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('TX status error:', err);
    res.status(500).json({ success: false, message: 'Failed to verify transaction' });
  }
});

/**
 * POST /api/blockchain/tx/batch
 * Verify multiple transactions at once
 * Body: { txIds: string[], minConfirmations?: number }
 */
router.post('/tx/batch', async (req, res) => {
  try {
    const { txIds, minConfirmations = 1 } = req.body;

    if (!Array.isArray(txIds) || txIds.length === 0) {
      return res.status(400).json({ success: false, message: 'txIds must be a non-empty array' });
    }
    if (txIds.length > 50) {
      return res.status(400).json({ success: false, message: 'Maximum 50 transactions per batch' });
    }

    const results = await batchVerifyTransactionStatuses(txIds, minConfirmations);
    res.json({ success: true, data: results });
  } catch (err) {
    console.error('Batch TX verify error:', err);
    res.status(500).json({ success: false, message: 'Failed to batch verify transactions' });
  }
});

/**
 * GET /api/blockchain/tx/:txId/type
 * Detect whether a transaction is a purchase or subscription
 */
router.get('/tx/:txId/type', async (req, res) => {
  try {
    const { txId } = req.params;
    const txType = await detectTransactionType(txId);
    res.json({ success: true, data: { txId, txType } });
  } catch (err) {
    console.error('TX type detection error:', err);
    res.status(500).json({ success: false, message: 'Failed to detect transaction type' });
  }
});

/**
 * GET /api/blockchain/purchase/:userAddress/:contentId
 * Verify on-chain purchase for a user and content
 */
router.get('/purchase/:userAddress/:contentId', async (req, res) => {
  try {
    const { userAddress, contentId } = req.params;
    const id = parseInt(contentId, 10);

    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid content ID' });
    }

    const verified = await verifyPurchase(userAddress, id);
    res.json({ success: true, data: { userAddress, contentId: id, verified } });
  } catch (err) {
    console.error('Purchase verify error:', err);
    res.status(500).json({ success: false, message: 'Failed to verify purchase' });
  }
});

/**
 * POST /api/blockchain/purchase/batch
 * Verify multiple content purchases for a user
 * Body: { userAddress: string, contentIds: number[] }
 */
router.post('/purchase/batch', async (req, res) => {
  try {
    const { userAddress, contentIds } = req.body;

    if (!userAddress || !Array.isArray(contentIds) || contentIds.length === 0) {
      return res.status(400).json({ success: false, message: 'userAddress and contentIds array required' });
    }

    const results = await batchVerifyPurchases(userAddress, contentIds);
    res.json({ success: true, data: results });
  } catch (err) {
    console.error('Batch purchase verify error:', err);
    res.status(500).json({ success: false, message: 'Failed to batch verify purchases' });
  }
});

/**
 * GET /api/blockchain/subscription/:userAddress/:creatorAddress/:tierId
 * Verify on-chain subscription
 */
router.get('/subscription/:userAddress/:creatorAddress/:tierId', async (req, res) => {
  try {
    const { userAddress, creatorAddress, tierId } = req.params;
    const id = parseInt(tierId, 10);

    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid tier ID' });
    }

    const verified = await verifySubscription(userAddress, creatorAddress, id);
    res.json({ success: true, data: { userAddress, creatorAddress, tierId: id, verified } });
  } catch (err) {
    console.error('Subscription verify error:', err);
    res.status(500).json({ success: false, message: 'Failed to verify subscription' });
  }
});

/**
 * POST /api/blockchain/access
 * Determine if a user should be granted access to content
 * Body: { userAddress, contentId, creatorAddress, tierId }
 */
router.post('/access', async (req, res) => {
  try {
    const { userAddress, contentId, creatorAddress, tierId } = req.body;

    if (!userAddress || contentId === undefined) {
      return res.status(400).json({ success: false, message: 'userAddress and contentId are required' });
    }

    const result = await determineAccess(userAddress, parseInt(contentId, 10), creatorAddress, tierId);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('Access determination error:', err);
    res.status(500).json({ success: false, message: 'Failed to determine access' });
  }
});

/**
 * GET /api/blockchain/cache/stats
 * Return cache statistics
 */
router.get('/cache/stats', (req, res) => {
  const stats = getCacheStats();
  res.json({ success: true, data: stats });
});

/**
 * DELETE /api/blockchain/cache
 * Evict expired cache entries
 */
router.delete('/cache', (req, res) => {
  evictExpiredCache();
  res.json({ success: true, message: 'Expired cache entries evicted' });
});

/**
 * GET /api/blockchain/metrics
 * Return verification metrics
 */
router.get('/metrics', (req, res) => {
  const data = getVerificationMetrics();
  res.json({ success: true, data });
});

module.exports = router;
