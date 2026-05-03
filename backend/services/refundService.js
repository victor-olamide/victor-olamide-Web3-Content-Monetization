const Purchase = require('../models/Purchase');
const Refund = require('../models/Refund');
const Content = require('../models/Content');

/**
 * Validate refund eligibility parameters
 * @param {Object} purchase - Purchase document
 * @param {Object} content - Content document
 * @returns {Object} { valid: boolean, error?: string }
 */
function validateRefundEligibility(purchase, content) {
  if (!purchase) {
    return { valid: false, error: 'Purchase not found' };
  }
  
  if (!content) {
    return { valid: false, error: 'Content not found' };
  }
  
  if (typeof content.refundable !== 'boolean') {
    return { valid: false, error: 'Invalid content refundability status' };
  }
  
  if (typeof content.refundWindowDays !== 'number' || content.refundWindowDays < 0) {
    return { valid: false, error: 'Invalid refund window configuration' };
  }
  
  if (!['none', 'pending', 'processing', 'completed', 'failed'].includes(purchase.refundStatus)) {
    return { valid: false, error: 'Invalid purchase refund status' };
  }
  
  return { valid: true };
}

/**
 * Calculate if a purchase is eligible for refund based on time window
 * @param {Object} purchase - Purchase document from DB
 * @param {Object} content - Content document from DB
 * @returns {Object} { eligible: boolean, reason: string, refundAmount: number }
 */
function calculateRefundEligibility(purchase, content) {
  if (!content.refundable) {
    return {
      eligible: false,
      reason: 'content-not-refundable',
      refundAmount: 0
    };
  }

  if (purchase.refundStatus !== 'none') {
    return {
      eligible: false,
      reason: 'refund-already-processed',
      refundAmount: 0
    };
  }

  const now = new Date();
  const purchaseDate = new Date(purchase.timestamp);
  const refundWindowMs = content.refundWindowDays * 24 * 60 * 60 * 1000;
  const timeElapsed = now - purchaseDate;

  if (timeElapsed > refundWindowMs) {
    return {
      eligible: false,
      reason: 'refund-window-expired',
      refundAmount: 0
    };
  }

  return {
    eligible: true,
    reason: 'within-refund-window',
    refundAmount: purchase.amount
  };
}

/**
 * Create a refund record and update purchase status
 * @param {string} purchaseId - MongoDB ObjectId of purchase
 * @param {string} reason - Reason for refund
 * @returns {Promise<Object>}
 */
async function initiateRefund(purchaseId, reason = 'content-removed') {
  try {
    // Validate purchaseId
    if (!purchaseId) {
      throw new Error('Purchase ID is required');
    }
    
    // Validate reason
    const validReasons = ['content-removed', 'manual-request', 'partial', 'dispute'];
    if (!validReasons.includes(reason)) {
      throw new Error(`Invalid refund reason. Allowed: ${validReasons.join(', ')}`);
    }

    const purchase = await Purchase.findById(purchaseId);
    if (!purchase) {
      throw new Error('Purchase not found');
    }

    const content = await Content.findOne({ contentId: purchase.contentId });
    if (!content) {
      throw new Error('Content not found');
    }

    // Validate data integrity
    const validation = validateRefundEligibility(purchase, content);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const eligibility = calculateRefundEligibility(purchase, content);

    if (!eligibility.eligible) {
      throw new Error(`Refund ineligible: ${eligibility.reason}`);
    }

    // Create refund record
    const refund = new Refund({
      purchaseId: purchase._id,
      contentId: purchase.contentId,
      user: purchase.user,
      creator: purchase.creator,
      originalPurchaseAmount: purchase.amount,
      refundAmount: eligibility.refundAmount,
      reason: reason,
      status: 'pending'
    });

    const savedRefund = await refund.save();

    // Update purchase with refund status
    purchase.refundStatus = 'pending';
    await purchase.save();

    return {
      success: true,
      refund: savedRefund,
      message: 'Refund initiated successfully'
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Approve a pending refund
 * @param {string} refundId - MongoDB ObjectId of refund
 * @param {string} approvedBy - Address of approver (creator/admin)
 * @returns {Promise<Object>}
 */
async function approveRefund(refundId, approvedBy) {
  try {
    // Validate inputs
    if (!refundId) {
      throw new Error('Refund ID is required');
    }
    
    if (!approvedBy || typeof approvedBy !== 'string') {
      throw new Error('Approver address is required and must be a string');
    }

    const refund = await Refund.findById(refundId);
    if (!refund) {
      throw new Error('Refund not found');
    }

    if (refund.status !== 'pending') {
      throw new Error(`Cannot approve refund with status: ${refund.status}`);
    }

    refund.status = 'approved';
    refund.approvedBy = approvedBy;
    refund.approvedAt = new Date();
    const updatedRefund = await refund.save();

    // Update purchase status
    await Purchase.updateOne(
      { _id: refund.purchaseId },
      { refundStatus: 'processing' }
    );

    return {
      success: true,
      refund: updatedRefund,
      message: 'Refund approved successfully'
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Complete a refund transaction (after on-chain confirmation)
 * @param {string} refundId - MongoDB ObjectId of refund
 * @param {string} txId - Blockchain transaction ID
 * @returns {Promise<Object>}
 */
async function completeRefund(refundId, txId) {
  try {
    // Validate inputs
    if (!refundId) {
      throw new Error('Refund ID is required');
    }
    
    if (!txId || typeof txId !== 'string') {
      throw new Error('Transaction ID is required and must be a string');
    }

    const refund = await Refund.findById(refundId);
    if (!refund) {
      throw new Error('Refund not found');
    }

    if (refund.status !== 'approved') {
      throw new Error(`Cannot complete refund with status: ${refund.status}`);
    }

    refund.status = 'completed';
    refund.txId = txId;
    refund.processedAt = new Date();
    const updatedRefund = await refund.save();

    // Update purchase with final refund details
    await Purchase.updateOne(
      { _id: refund.purchaseId },
      {
        refundStatus: 'completed',
        refundTxId: txId,
        refundAmount: refund.refundAmount,
        refundedAt: new Date()
      }
    );

    return {
      success: true,
      refund: updatedRefund,
      message: 'Refund completed successfully'
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Reject a pending refund
 * @param {string} refundId - MongoDB ObjectId of refund
 * @param {string} notes - Reason for rejection
 * @returns {Promise<Object>}
 */
async function rejectRefund(refundId, notes = '') {
  try {
    // Validate input
    if (!refundId) {
      throw new Error('Refund ID is required');
    }
    
    if (typeof notes !== 'string') {
      throw new Error('Rejection notes must be a string');
    }

    const refund = await Refund.findById(refundId);
    if (!refund) {
      throw new Error('Refund not found');
    }

    if (refund.status !== 'pending') {
      throw new Error(`Cannot reject refund with status: ${refund.status}`);
    }

    refund.status = 'rejected';
    refund.notes = notes;
    const updatedRefund = await refund.save();

    // Update purchase status back to none
    await Purchase.updateOne(
      { _id: refund.purchaseId },
      { refundStatus: 'none' }
    );

    return {
      success: true,
      refund: updatedRefund,
      message: 'Refund rejected'
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Get all pending refunds for a creator
 * @param {string} creator - Creator address
 * @returns {Promise<Array>}
 */
async function getPendingRefundsForCreator(creator) {
  try {
    const refunds = await Refund.find({
      creator,
      status: { $in: ['pending', 'approved', 'processing'] }
    }).sort({ createdAt: -1 });
    return refunds;
  } catch (error) {
    console.error('Error fetching pending refunds:', error);
    return [];
  }
}

/**
 * Get refund history for a specific user and content
 * @param {string} user - User address
 * @param {number} contentId - Content ID
 * @returns {Promise<Array>}
 */
async function getRefundHistory(user, contentId) {
  try {
    const refunds = await Refund.find({
      user,
      contentId
    }).sort({ createdAt: -1 });
    return refunds;
  } catch (error) {
    console.error('Error fetching refund history:', error);
    return [];
  }
}

/**
 * Auto-process refunds for removed content (within refund window)
 * Called periodically to approve and process pending refunds
 * @returns {Promise<Object>}
 */
async function autoProcessRefundsForRemovedContent() {
  try {
    const pendingRefunds = await Refund.find({
      reason: 'content-removed',
      status: 'pending'
    });

    const results = {
      processed: 0,
      approved: 0,
      failed: 0,
      errors: []
    };

    for (const refund of pendingRefunds) {
      try {
        // Auto-approve refunds for removed content
        await approveRefund(refund._id, 'system');
        results.approved++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          refundId: refund._id,
          error: error.message
        });
      }
    }

    return {
      success: true,
      results,
      message: `Auto-processing complete. Approved ${results.approved} refunds, ${results.failed} failed.`
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

module.exports = {
  calculateRefundEligibility,
  validateRefundEligibility,
  initiateRefund,
  approveRefund,
  completeRefund,
  rejectRefund,
  getPendingRefundsForCreator,
  getRefundHistory,
  autoProcessRefundsForRemovedContent
};
