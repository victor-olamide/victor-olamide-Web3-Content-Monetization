const express = require('express');
const router = express.Router();
const Refund = require('../models/Refund');
const Purchase = require('../models/Purchase');
const ProRataRefund = require('../models/ProRataRefund');
const { 
  approveRefund, 
  completeRefund, 
  rejectRefund, 
  getRefundHistory,
  autoProcessRefundsForRemovedContent,
  initiateSubscriptionRefund,
  triggerOnChainRefund
} = require('../services/refundService');

/**
 * GET /api/refunds/pro-rata/:id
 * Get a specific ProRataRefund record by ID
 */
router.get('/pro-rata/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const refund = await ProRataRefund.findById(id);

    if (!refund) {
      return res.status(404).json({ message: 'ProRataRefund not found' });
    }

    res.json(refund);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch pro-rata refund', error: err.message });
  }
});

/**
 * GET /api/refunds/pro-rata/subscription/:subscriptionId
 * Get ProRataRefund for a specific subscription
 */
router.get('/pro-rata/subscription/:subscriptionId', async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const refund = await ProRataRefund.findOne({ subscriptionId });

    if (!refund) {
      return res.status(404).json({ message: 'No pro-rata refund found for this subscription' });
    }

    res.json(refund);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch pro-rata refund', error: err.message });
  }
});

/**
 * GET /api/refunds/user/:address
 * Get refund history for a specific user
 */
router.get('/user/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const refunds = await Refund.find({ user: address }).sort({ createdAt: -1 });
    
    res.json({
      user: address,
      totalRefunds: refunds.length,
      refunds: refunds
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch refund history', error: err.message });
  }
});

/**
 * GET /api/refunds/user/:address/content/:contentId
 * Get refund history for a specific user and content
 */
router.get('/user/:address/content/:contentId', async (req, res) => {
  try {
    const { address, contentId } = req.params;
    const refunds = await getRefundHistory(address, parseInt(contentId));
    
    res.json({
      user: address,
      contentId: parseInt(contentId),
      totalRefunds: refunds.length,
      refunds: refunds
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch refund history', error: err.message });
  }
});

/**
 * GET /api/refunds/creator/:address
 * Get all refunds for a creator (pending, approved, processing)
 */
router.get('/creator/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const refunds = await Refund.find({
      creator: address
    }).sort({ createdAt: -1 });
    
    const byStatus = {
      pending: refunds.filter(r => r.status === 'pending'),
      approved: refunds.filter(r => r.status === 'approved'),
      processing: refunds.filter(r => r.status === 'processing'),
      completed: refunds.filter(r => r.status === 'completed'),
      rejected: refunds.filter(r => r.status === 'rejected')
    };
    
    res.json({
      creator: address,
      total: refunds.length,
      byStatus: {
        pending: byStatus.pending.length,
        approved: byStatus.approved.length,
        processing: byStatus.processing.length,
        completed: byStatus.completed.length,
        rejected: byStatus.rejected.length
      },
      refunds: refunds
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch refunds', error: err.message });
  }
});

/**
 * GET /api/refunds/:id
 * Get a specific refund by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const refund = await Refund.findById(id);
    
    if (!refund) {
      return res.status(404).json({ message: 'Refund not found' });
    }
    
    res.json(refund);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch refund', error: err.message });
  }
});

/**
 * POST /api/refunds
 * Cancel subscription and initiate pro-rata refund processing.
 * Triggers on-chain refund automatically when refundMethod is 'blockchain'
 * and PLATFORM_PRIVATE_KEY env var is set.
 */
router.post('/', async (req, res) => {
  try {
    const {
      subscriptionId,
      reason = 'User requested cancellation',
      cancellationDate,
      refundMethod = 'blockchain',
      initiatedBy = 'user',
      subscriberPrincipal,
      creatorPrincipal,
      tierId
    } = req.body;

    if (!subscriptionId) {
      return res.status(400).json({ message: 'subscriptionId is required' });
    }

    const result = await initiateSubscriptionRefund(subscriptionId, {
      reason,
      cancellationDate: cancellationDate ? new Date(cancellationDate) : new Date(),
      refundMethod,
      initiatedBy
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    // Trigger on-chain refund when applicable
    let onChainResult = null;
    const proRataRefund = result.refund && result.refund._id ? result.refund : null;
    const senderKey = process.env.PLATFORM_PRIVATE_KEY;

    if (
      proRataRefund &&
      refundMethod === 'blockchain' &&
      senderKey &&
      subscriberPrincipal &&
      creatorPrincipal &&
      tierId !== undefined
    ) {
      onChainResult = await triggerOnChainRefund(proRataRefund._id.toString(), {
        subscriberPrincipal,
        creatorPrincipal,
        tierId: Number(tierId),
        senderKey
      });
    }

    res.status(201).json({
      ...result,
      onChain: onChainResult
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to initiate subscription refund', error: err.message });
  }
});

/**
 * POST /api/refunds/:id/trigger-onchain
 * Manually trigger on-chain refund for an approved ProRataRefund
 */
router.post('/:id/trigger-onchain', async (req, res) => {
  try {
    const { id } = req.params;
    const { subscriberPrincipal, creatorPrincipal, tierId } = req.body;
    const senderKey = process.env.PLATFORM_PRIVATE_KEY;

    if (!subscriberPrincipal || !creatorPrincipal || tierId === undefined) {
      return res.status(400).json({
        message: 'subscriberPrincipal, creatorPrincipal, and tierId are required'
      });
    }

    if (!senderKey) {
      return res.status(500).json({ message: 'Platform private key not configured' });
    }

    const result = await triggerOnChainRefund(id, {
      subscriberPrincipal,
      creatorPrincipal,
      tierId: Number(tierId),
      senderKey
    });

    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Failed to trigger on-chain refund', error: err.message });
  }
});

/**
 * POST /api/refunds/:id/approve
 * Approve a pending refund (creator or admin only)
 */
router.post('/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { approvedBy } = req.body;
    
    if (!approvedBy) {
      return res.status(400).json({ message: 'approvedBy field is required' });
    }
    
    const result = await approveRefund(id, approvedBy);
    
    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }
    
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Failed to approve refund', error: err.message });
  }
});

/**
 * POST /api/refunds/:id/complete
 * Mark refund as completed after on-chain confirmation
 */
router.post('/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    const { txId } = req.body;
    
    if (!txId) {
      return res.status(400).json({ message: 'txId field is required' });
    }
    
    const result = await completeRefund(id, txId);
    
    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }
    
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Failed to complete refund', error: err.message });
  }
});

/**
 * POST /api/refunds/:id/reject
 * Reject a pending refund with optional notes
 */
router.post('/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { notes = '' } = req.body;
    
    const result = await rejectRefund(id, notes);
    
    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }
    
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Failed to reject refund', error: err.message });
  }
});

/**
 * POST /api/refunds/auto-process/removed-content
 * Auto-process all pending refunds for removed content
 * This can be called by a cron job or admin endpoint
 */
router.post('/auto-process/removed-content', async (req, res) => {
  try {
    const result = await autoProcessRefundsForRemovedContent();
    
    if (!result.success) {
      return res.status(500).json({ message: result.message });
    }
    
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Failed to auto-process refunds', error: err.message });
  }
});

/**
 * GET /api/refunds/status/summary
 * Get summary of all refunds by status
 */
router.get('/status/summary', async (req, res) => {
  try {
    const refunds = await Refund.find({});
    
    const summary = {
      total: refunds.length,
      byStatus: {
        pending: refunds.filter(r => r.status === 'pending').length,
        approved: refunds.filter(r => r.status === 'approved').length,
        processing: refunds.filter(r => r.status === 'processing').length,
        completed: refunds.filter(r => r.status === 'completed').length,
        rejected: refunds.filter(r => r.status === 'rejected').length
      },
      byReason: {
        'content-removed': refunds.filter(r => r.reason === 'content-removed').length,
        'manual-request': refunds.filter(r => r.reason === 'manual-request').length,
        'partial': refunds.filter(r => r.reason === 'partial').length,
        'dispute': refunds.filter(r => r.reason === 'dispute').length
      },
      totalAmount: refunds.reduce((sum, r) => sum + r.refundAmount, 0)
    };
    
    res.json(summary);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch summary', error: err.message });
  }
});

module.exports = router;
