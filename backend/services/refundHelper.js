/**
 * Refund utility helper functions
 */

const Content = require('../models/Content');
const Purchase = require('../models/Purchase');
const Refund = require('../models/Refund');
const { calculateRefundEligibility } = require('./refundService');

/**
 * Bulk check refund eligibility for multiple purchases
 * @param {Array} purchases - Array of purchase documents
 * @returns {Promise<Array>}
 */
async function bulkCheckRefundEligibility(purchases) {
  const results = [];

  for (const purchase of purchases) {
    try {
      const content = await Content.findOne({ contentId: purchase.contentId });
      if (!content) continue;

      const eligibility = calculateRefundEligibility(purchase, content);
      results.push({
        purchaseId: purchase._id,
        contentId: purchase.contentId,
        user: purchase.user,
        ...eligibility
      });
    } catch (error) {
      console.error(`Error checking eligibility for purchase ${purchase._id}:`, error);
    }
  }

  return results;
}

/**
 * Get refund statistics for a content piece
 * @param {number} contentId - Content ID
 * @returns {Promise<Object>}
 */
async function getContentRefundStats(contentId) {
  try {
    const content = await Content.findOne({ contentId });
    if (!content) {
      return { error: 'Content not found' };
    }

    const refunds = await Refund.find({ contentId });
    const purchases = await Purchase.find({ contentId });

    const byStatus = {
      pending: refunds.filter(r => r.status === 'pending'),
      approved: refunds.filter(r => r.status === 'approved'),
      processing: refunds.filter(r => r.status === 'processing'),
      completed: refunds.filter(r => r.status === 'completed'),
      rejected: refunds.filter(r => r.status === 'rejected')
    };

    return {
      contentId,
      title: content.title,
      isRemoved: content.isRemoved,
      removedAt: content.removedAt,
      totalPurchases: purchases.length,
      totalRefunds: refunds.length,
      totalRefundAmount: refunds.reduce((sum, r) => sum + r.refundAmount, 0),
      byStatus: {
        pending: byStatus.pending.length,
        approved: byStatus.approved.length,
        processing: byStatus.processing.length,
        completed: byStatus.completed.length,
        rejected: byStatus.rejected.length
      },
      refundRate: purchases.length > 0 ? ((refunds.length / purchases.length) * 100).toFixed(2) + '%' : '0%'
    };
  } catch (error) {
    console.error('Error getting content refund stats:', error);
    return { error: error.message };
  }
}

/**
 * Get creator refund analytics
 * @param {string} creator - Creator address
 * @returns {Promise<Object>}
 */
async function getCreatorRefundAnalytics(creator) {
  try {
    const contents = await Content.find({ creator });
    const purchases = await Purchase.find({ creator });
    const refunds = await Refund.find({ creator });

    const contentRefundStats = await Promise.all(
      contents.map(c => getContentRefundStats(c.contentId))
    );

    const totalRefundAmount = refunds.reduce((sum, r) => sum + r.refundAmount, 0);
    const avgRefundAmount = refunds.length > 0 ? (totalRefundAmount / refunds.length).toFixed(2) : 0;

    return {
      creator,
      totalContents: contents.length,
      removedContents: contents.filter(c => c.isRemoved).length,
      totalPurchases: purchases.length,
      totalRefunds: refunds.length,
      totalRefundAmount,
      avgRefundAmount,
      refundRate: purchases.length > 0 ? ((refunds.length / purchases.length) * 100).toFixed(2) + '%' : '0%',
      contentStats: contentRefundStats
    };
  } catch (error) {
    console.error('Error getting creator refund analytics:', error);
    return { error: error.message };
  }
}

/**
 * Find refunds eligible for automatic completion
 * (approved but not yet completed)
 * @returns {Promise<Array>}
 */
async function findEligibleForCompletion() {
  try {
    const approved = await Refund.find({
      status: 'approved',
      txId: null,
      approvedAt: {
        $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) // Approved more than 24 hours ago
      }
    });

    return approved;
  } catch (error) {
    console.error('Error finding eligible refunds:', error);
    return [];
  }
}

/**
 * Get monthly refund trend data
 * @returns {Promise<Object>}
 */
async function getMonthlyRefundTrend() {
  try {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000);

    const refunds = await Refund.find({
      createdAt: { $gte: sixMonthsAgo }
    });

    const trend = {};
    for (let i = 0; i < 6; i++) {
      const date = new Date(now.getTime() - i * 30 * 24 * 60 * 60 * 1000);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      trend[monthKey] = {
        count: 0,
        amount: 0
      };
    }

    refunds.forEach(refund => {
      const date = new Date(refund.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (trend[monthKey]) {
        trend[monthKey].count++;
        trend[monthKey].amount += refund.refundAmount;
      }
    });

    return {
      period: '6 months',
      trend: Object.keys(trend).reverse().reduce((result, key) => {
        result[key] = trend[key];
        return result;
      }, {})
    };
  } catch (error) {
    console.error('Error getting refund trend:', error);
    return { error: error.message };
  }
}

/**
 * Validate refund request data
 * @param {Object} refundData - Refund request data
 * @returns {Object} { valid: boolean, errors: Array }
 */
function validateRefundRequest(refundData) {
  const errors = [];

  if (!refundData.purchaseId) {
    errors.push('purchaseId is required');
  }

  if (!refundData.reason) {
    errors.push('reason is required');
  } else {
    const validReasons = ['content-removed', 'manual-request', 'partial', 'dispute'];
    if (!validReasons.includes(refundData.reason)) {
      errors.push(`reason must be one of: ${validReasons.join(', ')}`);
    }
  }

  if (refundData.amount !== undefined && typeof refundData.amount !== 'number') {
    errors.push('amount must be a number');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Format refund data for API response
 * @param {Object} refund - Refund document
 * @returns {Object}
 */
function formatRefundResponse(refund) {
  return {
    id: refund._id,
    contentId: refund.contentId,
    user: refund.user,
    creator: refund.creator,
    amount: refund.refundAmount,
    originalAmount: refund.originalPurchaseAmount,
    status: refund.status,
    reason: refund.reason,
    transactionId: refund.txId,
    approvedAt: refund.approvedAt,
    completedAt: refund.processedAt,
    createdAt: refund.createdAt
  };
}

module.exports = {
  bulkCheckRefundEligibility,
  getContentRefundStats,
  getCreatorRefundAnalytics,
  findEligibleForCompletion,
  getMonthlyRefundTrend,
  validateRefundRequest,
  formatRefundResponse
};
