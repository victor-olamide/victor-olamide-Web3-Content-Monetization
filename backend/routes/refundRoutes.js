const express = require('express');
const router = express.Router();
const Refund = require('../models/Refund');
const Purchase = require('../models/Purchase');
const { 
  approveRefund, 
  completeRefund, 
  rejectRefund, 
  getRefundHistory,
  autoProcessRefundsForRemovedContent 
} = require('../services/refundService');

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
