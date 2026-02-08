const express = require('express');
const router = express.Router();
const Subscription = require('../models/Subscription');
const ProRataRefund = require('../models/ProRataRefund');
const {
  calculateProRataRefund,
  checkRefundEligibility,
  cancelSubscriptionWithRefund,
  getProRataRefundDetails,
  approveProRataRefund,
  completeProRataRefund,
  rejectProRataRefund,
  getPendingRefundsForCreator,
  getUserRefunds,
  getRefundStatistics
} = require('../services/proRataRefundService');

/**
 * POST /subscriptions/:subscriptionId/cancel-with-refund
 * Cancel subscription and calculate pro-rata refund
 */
router.post('/subscriptions/:subscriptionId/cancel-with-refund', async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { reason = 'User requested cancellation', cancellationDate, refundMethod = 'blockchain' } = req.body;

    const result = await cancelSubscriptionWithRefund(subscriptionId, {
      reason,
      cancellationDate: cancellationDate ? new Date(cancellationDate) : new Date(),
      refundMethod,
      initiatedBy: 'user'
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      message: 'Subscription cancelled with refund initiated',
      ...result
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to cancel subscription',
      error: error.message
    });
  }
});

/**
 * GET /subscriptions/:subscriptionId/refund-preview
 * Preview pro-rata refund without cancelling
 */
router.get('/subscriptions/:subscriptionId/refund-preview', async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { cancellationDate } = req.query;

    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    const eligibility = checkRefundEligibility(subscription, cancellationDate ? new Date(cancellationDate) : new Date());
    
    let refundData = null;
    if (eligibility.isEligible) {
      try {
        refundData = calculateProRataRefund(subscription, cancellationDate ? new Date(cancellationDate) : new Date());
      } catch (error) {
        return res.status(400).json({
          message: 'Failed to calculate refund',
          error: error.message
        });
      }
    }

    res.json({
      subscriptionId,
      eligibility,
      refund: refundData ? {
        originalAmount: refundData.originalAmount,
        refundAmount: refundData.refundAmount,
        refundPercentage: refundData.refundPercentage,
        breakdown: refundData.breakdown,
        daysUsed: refundData.usedDays,
        daysRemaining: refundData.unusedDays,
        totalDays: refundData.totalDays
      } : null
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to preview refund',
      error: error.message
    });
  }
});

/**
 * GET /refunds/pro-rata/:refundId
 * Get pro-rata refund details
 */
router.get('/refunds/pro-rata/:refundId', async (req, res) => {
  try {
    const { refundId } = req.params;
    const result = await getProRataRefundDetails(refundId);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({
      message: 'Failed to retrieve refund details',
      error: error.message
    });
  }
});

/**
 * POST /refunds/pro-rata/:refundId/approve
 * Approve pending pro-rata refund
 */
router.post('/refunds/pro-rata/:refundId/approve', async (req, res) => {
  try {
    const { refundId } = req.params;
    const { approvedBy = 'admin' } = req.body;

    const result = await approveProRataRefund(refundId, approvedBy);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      message: 'Refund approved successfully',
      refund: result.refund
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to approve refund',
      error: error.message
    });
  }
});

/**
 * POST /refunds/pro-rata/:refundId/complete
 * Mark refund as completed with transaction ID
 */
router.post('/refunds/pro-rata/:refundId/complete', async (req, res) => {
  try {
    const { refundId } = req.params;
    const { transactionId, blockHeight } = req.body;

    if (!transactionId) {
      return res.status(400).json({
        message: 'Transaction ID is required'
      });
    }

    const result = await completeProRataRefund(refundId, transactionId, blockHeight);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      message: 'Refund completed successfully',
      refund: result.refund
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to complete refund',
      error: error.message
    });
  }
});

/**
 * POST /refunds/pro-rata/:refundId/reject
 * Reject pending pro-rata refund
 */
router.post('/refunds/pro-rata/:refundId/reject', async (req, res) => {
  try {
    const { refundId } = req.params;
    const { reason = 'No reason provided' } = req.body;

    const result = await rejectProRataRefund(refundId, reason);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      message: 'Refund rejected',
      refund: result.refund
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to reject refund',
      error: error.message
    });
  }
});

/**
 * GET /refunds/pro-rata/creator/:creatorId/pending
 * Get all pending refunds for a creator
 */
router.get('/refunds/pro-rata/creator/:creatorId/pending', async (req, res) => {
  try {
    const { creatorId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const result = await getPendingRefundsForCreator(creatorId);

    if (!result.success) {
      return res.status(500).json(result);
    }

    const refunds = result.refunds.slice(offset, offset + parseInt(limit));

    res.json({
      creatorId,
      totalPending: result.totalPending,
      limit: parseInt(limit),
      offset: parseInt(offset),
      returned: refunds.length,
      refunds
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to retrieve pending refunds',
      error: error.message
    });
  }
});

/**
 * GET /refunds/pro-rata/user/:userId
 * Get all pro-rata refunds for a user
 */
router.get('/refunds/pro-rata/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, limit = 50, offset = 0 } = req.query;

    let result = await getUserRefunds(userId);

    if (!result.success) {
      return res.status(500).json(result);
    }

    let refunds = result.refunds;

    // Filter by status if provided
    if (status) {
      refunds = refunds.filter(r => r.refundStatus === status);
    }

    // Pagination
    const paginated = refunds.slice(offset, offset + parseInt(limit));

    res.json({
      userId,
      summary: result.summary,
      filter: status ? { status } : null,
      limit: parseInt(limit),
      offset: parseInt(offset),
      returned: paginated.length,
      refunds: paginated
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to retrieve user refunds',
      error: error.message
    });
  }
});

/**
 * GET /refunds/pro-rata/status/:status
 * Get refunds by status
 */
router.get('/refunds/pro-rata/status/:status', async (req, res) => {
  try {
    const { status } = req.params;
    const validStatuses = ['pending', 'approved', 'processing', 'completed', 'failed', 'rejected'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        message: `Invalid status. Allowed: ${validStatuses.join(', ')}`
      });
    }

    const refunds = await ProRataRefund.find({ refundStatus: status })
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({
      status,
      totalCount: refunds.length,
      refunds
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to retrieve refunds',
      error: error.message
    });
  }
});

/**
 * GET /refunds/pro-rata/statistics
 * Get refund statistics
 */
router.get('/refunds/pro-rata/statistics', async (req, res) => {
  try {
    const { creatorId, status, dateFrom, dateTo } = req.query;

    const result = await getRefundStatistics({
      creatorId,
      status,
      dateFrom,
      dateTo
    });

    if (!result.success) {
      return res.status(500).json(result);
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({
      message: 'Failed to retrieve statistics',
      error: error.message
    });
  }
});

/**
 * GET /refunds/pro-rata/subscription/:subscriptionId
 * Get refund for a specific subscription
 */
router.get('/refunds/pro-rata/subscription/:subscriptionId', async (req, res) => {
  try {
    const { subscriptionId } = req.params;

    const refund = await ProRataRefund.findOne({ subscriptionId });
    
    if (!refund) {
      return res.status(404).json({
        message: 'No refund found for this subscription'
      });
    }

    res.json({
      subscriptionId,
      refund
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to retrieve refund',
      error: error.message
    });
  }
});

/**
 * GET /refunds/pro-rata/pending/all
 * Get all pending pro-rata refunds (admin endpoint)
 */
router.get('/refunds/pro-rata/pending/all', async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;

    const refunds = await ProRataRefund.find({
      refundStatus: { $in: ['pending', 'approved', 'processing'] }
    })
      .sort({ createdAt: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit));

    const total = await ProRataRefund.countDocuments({
      refundStatus: { $in: ['pending', 'approved', 'processing'] }
    });

    res.json({
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
      returned: refunds.length,
      refunds
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to retrieve pending refunds',
      error: error.message
    });
  }
});

/**
 * POST /refunds/pro-rata/bulk-approve
 * Bulk approve refunds (admin endpoint)
 */
router.post('/refunds/pro-rata/bulk-approve', async (req, res) => {
  try {
    const { refundIds, approvedBy = 'admin' } = req.body;

    if (!Array.isArray(refundIds) || refundIds.length === 0) {
      return res.status(400).json({
        message: 'refundIds array is required'
      });
    }

    const results = await Promise.all(
      refundIds.map(id => approveProRataRefund(id, approvedBy))
    );

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    res.json({
      message: `Bulk approval completed: ${successful} approved, ${failed} failed`,
      successful,
      failed,
      results
    });
  } catch (error) {
    res.status(500).json({
      message: 'Bulk approval failed',
      error: error.message
    });
  }
});

module.exports = router;
