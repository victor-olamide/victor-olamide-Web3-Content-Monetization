const BatchOperation = require('../models/BatchOperation');
const Content = require('../models/Content');
const { updateContentPrice } = require('./contractService');

/**
 * Create and execute batch price update operation
 * @param {string} creator - Creator address
 * @param {Array<number>} contentIds - Content IDs to update
 * @param {number} newPrice - New price for all items
 * @param {string} creatorPrivateKey - Private key for on-chain updates
 * @returns {Promise<Object>} BatchOperation record
 */
const batchUpdatePrice = async (creator, contentIds, newPrice, creatorPrivateKey) => {
  try {
    if (!Array.isArray(contentIds) || contentIds.length === 0) {
      throw new Error('contentIds must be a non-empty array');
    }

    if (contentIds.length > 100) {
      throw new Error('Batch size limited to 100 items');
    }

    const batchOp = new BatchOperation({
      creator,
      operationType: 'update-price',
      totalItems: contentIds.length,
      contentIds,
      updatePayload: { newPrice }
    });

    await batchOp.save();

    // Execute asynchronously
    executeBatchPriceUpdate(batchOp._id, creator, contentIds, newPrice, creatorPrivateKey);

    return batchOp;
  } catch (error) {
    throw new Error(`Failed to create batch update price: ${error.message}`);
  }
};

/**
 * Execute batch price update (async worker)
 */
const executeBatchPriceUpdate = async (batchId, creator, contentIds, newPrice, creatorPrivateKey) => {
  try {
    const batch = await BatchOperation.findById(batchId);
    batch.status = 'processing';
    await batch.save();

    for (const contentId of contentIds) {
      try {
        const content = await Content.findOne({ contentId, creator });

        if (!content) {
          batch.results.push({
            contentId,
            success: false,
            error: 'Content not found or not owned by creator'
          });
          batch.failureCount += 1;
          continue;
        }

        // Update in database
        content.price = newPrice;
        await content.save();

        // Try on-chain update
        try {
          if (creatorPrivateKey) {
            await updateContentPrice(contentId, newPrice, creatorPrivateKey);
          }
        } catch (chainErr) {
          console.warn(`On-chain update failed for content ${contentId}:`, chainErr.message);
          // Continue despite on-chain failure
        }

        batch.results.push({
          contentId,
          success: true,
          message: 'Price updated successfully'
        });
        batch.successCount += 1;
      } catch (err) {
        batch.results.push({
          contentId,
          success: false,
          error: err.message
        });
        batch.failureCount += 1;
      }
    }

    batch.status = batch.failureCount > 0 ? 'partial-failure' : 'completed';
    batch.completedAt = new Date();
    await batch.save();
  } catch (error) {
    console.error('Batch price update error:', error);
    const batch = await BatchOperation.findById(batchId);
    batch.status = 'failed';
    batch.completedAt = new Date();
    await batch.save();
  }
};

/**
 * Create and execute batch content removal
 * @param {string} creator - Creator address
 * @param {Array<number>} contentIds - Content IDs to remove
 * @param {string} removalReason - Reason for removal
 * @param {string} creatorPrivateKey - Private key for on-chain removal
 * @returns {Promise<Object>} BatchOperation record
 */
const batchRemoveContent = async (creator, contentIds, removalReason, creatorPrivateKey) => {
  try {
    if (!Array.isArray(contentIds) || contentIds.length === 0) {
      throw new Error('contentIds must be a non-empty array');
    }

    if (contentIds.length > 100) {
      throw new Error('Batch size limited to 100 items');
    }

    const batchOp = new BatchOperation({
      creator,
      operationType: 'remove-content',
      totalItems: contentIds.length,
      contentIds,
      updatePayload: { removalReason }
    });

    await batchOp.save();

    executeBatchRemove(batchOp._id, creator, contentIds, removalReason, creatorPrivateKey);

    return batchOp;
  } catch (error) {
    throw new Error(`Failed to create batch remove: ${error.message}`);
  }
};

/**
 * Execute batch content removal (async worker)
 */
const executeBatchRemove = async (batchId, creator, contentIds, removalReason, creatorPrivateKey) => {
  try {
    const batch = await BatchOperation.findById(batchId);
    batch.status = 'processing';
    await batch.save();

    for (const contentId of contentIds) {
      try {
        const content = await Content.findOne({ contentId, creator });

        if (!content) {
          batch.results.push({
            contentId,
            success: false,
            error: 'Content not found or not owned by creator'
          });
          batch.failureCount += 1;
          continue;
        }

        content.isRemoved = true;
        content.removedAt = new Date();
        content.removalReason = removalReason || 'Batch removal by creator';
        await content.save();

        batch.results.push({
          contentId,
          success: true,
          message: 'Content removed successfully'
        });
        batch.successCount += 1;
      } catch (err) {
        batch.results.push({
          contentId,
          success: false,
          error: err.message
        });
        batch.failureCount += 1;
      }
    }

    batch.status = batch.failureCount > 0 ? 'partial-failure' : 'completed';
    batch.completedAt = new Date();
    await batch.save();
  } catch (error) {
    console.error('Batch remove error:', error);
    const batch = await BatchOperation.findById(batchId);
    batch.status = 'failed';
    batch.completedAt = new Date();
    await batch.save();
  }
};

/**
 * Batch update metadata on multiple contents
 * @param {string} creator - Creator address
 * @param {Array<number>} contentIds - Content IDs to update
 * @param {Object} updates - Object with fields to update (title, description, etc)
 * @returns {Promise<Object>} BatchOperation record
 */
const batchUpdateMetadata = async (creator, contentIds, updates) => {
  try {
    if (!Array.isArray(contentIds) || contentIds.length === 0) {
      throw new Error('contentIds must be a non-empty array');
    }

    if (contentIds.length > 100) {
      throw new Error('Batch size limited to 100 items');
    }

    const batchOp = new BatchOperation({
      creator,
      operationType: 'update-metadata',
      totalItems: contentIds.length,
      contentIds,
      updatePayload: updates
    });

    await batchOp.save();

    executeBatchMetadataUpdate(batchOp._id, creator, contentIds, updates);

    return batchOp;
  } catch (error) {
    throw new Error(`Failed to create batch metadata update: ${error.message}`);
  }
};

/**
 * Execute batch metadata update (async worker)
 */
const executeBatchMetadataUpdate = async (batchId, creator, contentIds, updates) => {
  try {
    const batch = await BatchOperation.findById(batchId);
    batch.status = 'processing';
    await batch.save();

    const allowedFields = ['title', 'description', 'contentType', 'tokenGating', 'refundable', 'refundWindowDays'];
    const safeUpdates = {};
    Object.keys(updates).forEach(k => {
      if (allowedFields.includes(k)) {
        safeUpdates[k] = updates[k];
      }
    });

    for (const contentId of contentIds) {
      try {
        const content = await Content.findOne({ contentId, creator });

        if (!content) {
          batch.results.push({
            contentId,
            success: false,
            error: 'Content not found or not owned by creator'
          });
          batch.failureCount += 1;
          continue;
        }

        Object.assign(content, safeUpdates);
        await content.save();

        batch.results.push({
          contentId,
          success: true,
          message: 'Metadata updated successfully'
        });
        batch.successCount += 1;
      } catch (err) {
        batch.results.push({
          contentId,
          success: false,
          error: err.message
        });
        batch.failureCount += 1;
      }
    }

    batch.status = batch.failureCount > 0 ? 'partial-failure' : 'completed';
    batch.completedAt = new Date();
    await batch.save();
  } catch (error) {
    console.error('Batch metadata update error:', error);
    const batch = await BatchOperation.findById(batchId);
    batch.status = 'failed';
    batch.completedAt = new Date();
    await batch.save();
  }
};

/**
 * Get batch operation details
 * @param {string} batchId - Batch operation ID
 * @returns {Promise<Object>} Batch operation
 */
const getBatchOperation = async (batchId) => {
  try {
    const batch = await BatchOperation.findById(batchId);
    if (!batch) {
      throw new Error('Batch operation not found');
    }
    return batch;
  } catch (error) {
    throw new Error(`Failed to fetch batch operation: ${error.message}`);
  }
};

/**
 * Get batch operations for a creator
 * @param {string} creator - Creator address
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Batch operations list
 */
const getCreatorBatchOperations = async (creator, options = {}) => {
  try {
    const limit = options.limit || 50;
    const skip = options.skip || 0;

    const operations = await BatchOperation.find({ creator })
      .sort({ startedAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await BatchOperation.countDocuments({ creator });

    return {
      creator,
      total,
      operations,
      limit,
      skip
    };
  } catch (error) {
    throw new Error(`Failed to fetch batch operations: ${error.message}`);
  }
};

/**
 * Get pending batch operations
 * @returns {Promise<Array>} Pending batch operations
 */
const getPendingBatchOperations = async () => {
  try {
    const pending = await BatchOperation.find({ status: 'pending' }).sort({ startedAt: 1 });
    return pending;
  } catch (error) {
    throw new Error(`Failed to fetch pending operations: ${error.message}`);
  }
};

module.exports = {
  batchUpdatePrice,
  batchRemoveContent,
  batchUpdateMetadata,
  getBatchOperation,
  getCreatorBatchOperations,
  getPendingBatchOperations
};
