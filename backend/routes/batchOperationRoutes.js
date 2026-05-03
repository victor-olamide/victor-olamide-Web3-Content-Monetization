const express = require('express');
const router = express.Router();
const { verifyCreatorOwnership } = require('../middleware/creatorAuth');
const {
  batchUpdatePrice,
  batchRemoveContent,
  batchUpdateMetadata,
  getBatchOperation,
  getCreatorBatchOperations
} = require('../services/batchOperationService');

// Get batch operation details
router.get('/:batchId', async (req, res) => {
  try {
    const batch = await getBatchOperation(req.params.batchId);
    res.json(batch);
  } catch (err) {
    res.status(404).json({ message: 'Batch operation not found', error: err.message });
  }
});

// Get creator's batch operations
router.get('/creator/:creator', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const skip = parseInt(req.query.skip) || 0;

    const result = await getCreatorBatchOperations(req.params.creator, { limit, skip });
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch batch operations', error: err.message });
  }
});

// Batch update prices (creator only)
router.post('/batch-update-price', async (req, res) => {
  try {
    const { contentIds, newPrice, creator } = req.body;

    if (!Array.isArray(contentIds) || contentIds.length === 0) {
      return res.status(400).json({ message: 'contentIds must be a non-empty array' });
    }

    if (contentIds.length > 100) {
      return res.status(400).json({ message: 'Batch size limited to 100 items' });
    }

    if (!newPrice || newPrice < 0) {
      return res.status(400).json({ message: 'Valid newPrice is required' });
    }

    if (!creator) {
      return res.status(400).json({ message: 'Creator address is required' });
    }

    const creatorPrivateKey = process.env.CREATOR_PRIVATE_KEY;

    const batch = await batchUpdatePrice(
      creator,
      contentIds,
      parseInt(newPrice),
      creatorPrivateKey
    );

    res.status(201).json({
      message: 'Batch price update initiated',
      batchId: batch._id,
      status: batch.status,
      totalItems: batch.totalItems
    });
  } catch (err) {
    res.status(400).json({ message: 'Failed to initiate batch update', error: err.message });
  }
});

// Batch remove content (creator only)
router.post('/batch-remove', async (req, res) => {
  try {
    const { contentIds, removalReason, creator } = req.body;

    if (!Array.isArray(contentIds) || contentIds.length === 0) {
      return res.status(400).json({ message: 'contentIds must be a non-empty array' });
    }

    if (contentIds.length > 100) {
      return res.status(400).json({ message: 'Batch size limited to 100 items' });
    }

    if (!creator) {
      return res.status(400).json({ message: 'Creator address is required' });
    }

    const creatorPrivateKey = process.env.CREATOR_PRIVATE_KEY;

    const batch = await batchRemoveContent(
      creator,
      contentIds,
      removalReason || 'Batch removal by creator',
      creatorPrivateKey
    );

    res.status(201).json({
      message: 'Batch removal initiated',
      batchId: batch._id,
      status: batch.status,
      totalItems: batch.totalItems
    });
  } catch (err) {
    res.status(400).json({ message: 'Failed to initiate batch removal', error: err.message });
  }
});

// Batch update metadata (creator only)
router.post('/batch-update-metadata', async (req, res) => {
  try {
    const { contentIds, updates, creator } = req.body;

    if (!Array.isArray(contentIds) || contentIds.length === 0) {
      return res.status(400).json({ message: 'contentIds must be a non-empty array' });
    }

    if (contentIds.length > 100) {
      return res.status(400).json({ message: 'Batch size limited to 100 items' });
    }

    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'updates object with at least one field is required' });
    }

    if (!creator) {
      return res.status(400).json({ message: 'Creator address is required' });
    }

    const batch = await batchUpdateMetadata(
      creator,
      contentIds,
      updates
    );

    res.status(201).json({
      message: 'Batch metadata update initiated',
      batchId: batch._id,
      status: batch.status,
      totalItems: batch.totalItems
    });
  } catch (err) {
    res.status(400).json({ message: 'Failed to initiate batch update', error: err.message });
  }
});

module.exports = router;
