const express = require('express');
const router = express.Router();
const Subscription = require('../models/Subscription');
const SubscriptionRenewal = require('../models/SubscriptionRenewal');
const {
  initiateRenewal,
  completeRenewal,
  handleRenewalFailure,
  cancelSubscription,
  getRenewalHistory,
  getUserSubscriptionStatus,
  calculateRenewalStatus,
  applyGracePeriod
} = require('../services/renewalService');

// Get all subscriptions for a user
router.get('/:user', async (req, res) => {
  try {
    const subscriptions = await Subscription.find({ user: req.params.user });
    res.json(subscriptions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get subscription status with renewal info
router.get('/:user/status', async (req, res) => {
  try {
    const status = await getUserSubscriptionStatus(req.params.user);
    res.json(status);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get specific subscription with renewal details
router.get('/subscription/:id', async (req, res) => {
  try {
    const subscription = await Subscription.findById(req.params.id);
    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    const renewalStatus = calculateRenewalStatus(subscription);
    const renewalHistory = await getRenewalHistory(subscription._id);

    res.json({
      subscription,
      renewalStatus,
      renewalHistory
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Initiate manual renewal
router.post('/:id/renew', async (req, res) => {
  try {
    const { id } = req.params;
    const { renewalType = 'manual' } = req.body;

    const subscription = await Subscription.findById(id);
    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    const result = await initiateRenewal(id, renewalType);

    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    res.json({
      message: 'Renewal initiated successfully',
      renewal: result.renewal
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Complete renewal with transaction
router.post('/renewal/:renewalId/complete', async (req, res) => {
  try {
    const { renewalId } = req.params;
    const { txId } = req.body;

    if (!txId) {
      return res.status(400).json({ message: 'Transaction ID is required' });
    }

    const result = await completeRenewal(renewalId, txId);

    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    res.json({
      message: 'Renewal completed successfully',
      renewal: result.renewal
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Handle renewal failure
router.post('/renewal/:renewalId/fail', async (req, res) => {
  try {
    const { renewalId } = req.params;
    const { failureReason = 'Unknown error' } = req.body;

    const result = await handleRenewalFailure(renewalId, failureReason);

    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    res.json({
      message: result.message,
      renewal: result.renewal,
      willRetry: result.willRetry
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get renewal history for subscription
router.get('/:id/renewals', async (req, res) => {
  try {
    const subscription = await Subscription.findById(req.params.id);
    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    const renewals = await getRenewalHistory(req.params.id);

    res.json({
      subscriptionId: req.params.id,
      totalRenewals: renewals.length,
      renewals
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Cancel subscription
router.post('/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason = 'User requested cancellation' } = req.body;

    const result = await cancelSubscription(id, reason);

    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    res.json({
      message: 'Subscription cancelled successfully',
      subscription: result.subscription
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Apply grace period manually
router.post('/:id/grace-period', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await applyGracePeriod(id);

    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    res.json({
      message: result.message,
      subscription: result.subscription,
      gracePeriod: result.gracePeriod
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get renewal records by status
router.get('/renewals/status/:status', async (req, res) => {
  try {
    const { status } = req.params;
    const validStatuses = ['pending', 'processing', 'completed', 'failed', 'cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        message: `Invalid status. Allowed: ${validStatuses.join(', ')}`
      });
    }

    const renewals = await SubscriptionRenewal.find({ status }).sort({ createdAt: -1 });

    res.json({
      status,
      totalRenewals: renewals.length,
      renewals
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all pending renewals
router.get('/pending/all', async (req, res) => {
  try {
    const renewals = await SubscriptionRenewal.find({
      status: { $in: ['pending', 'processing'] }
    }).sort({ createdAt: -1 });

    res.json({
      totalPending: renewals.length,
      renewals
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;