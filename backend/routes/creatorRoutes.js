const express = require('express');
const router = express.Router();
const Purchase = require('../models/Purchase');
const Subscription = require('../models/Subscription');

/**
 * Get earnings summary for a creator
 * Aggregates revenue from both direct purchases and subscriptions
 */
router.get('/earnings/:address', async (req, res) => {
  try {
    const { address } = req.params;

    // Aggregate PPV revenue
    const ppvResult = await Purchase.aggregate([
      { $match: { creator: address } },
      { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }
    ]);

    // Aggregate Subscription revenue
    const subResult = await Subscription.aggregate([
      { $match: { creator: address } },
      { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }
    ]);

    const ppvTotal = ppvResult.length > 0 ? ppvResult[0].total : 0;
    const subTotal = subResult.length > 0 ? subResult[0].total : 0;
    const ppvCount = ppvResult.length > 0 ? ppvResult[0].count : 0;
    const subCount = subResult.length > 0 ? subResult[0].count : 0;

    res.json({
      totalEarnings: ppvTotal + subTotal,
      ppvEarnings: ppvTotal,
      subscriptionEarnings: subTotal,
      ppvCount,
      subCount,
      currency: 'STX'
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * Get active subscribers for a creator
 */
router.get('/subscribers/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const now = new Date();

    const subscribers = await Subscription.find({ 
      creator: address,
      expiry: { $gt: now }
    }).sort({ timestamp: -1 });

    res.json({
      count: subscribers.length,
      subscribers
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * Get revenue history (combined stream of transactions)
 */
router.get('/history/:address', async (req, res) => {
  try {
    const { address } = req.params;

    const purchases = await Purchase.find({ creator: address })
      .select('user amount timestamp txId contentId')
      .lean();
    
    const formattedPurchases = purchases.map(p => ({
      ...p,
      type: 'purchase',
      id: p.txId
    }));

    const subscriptions = await Subscription.find({ creator: address })
      .select('user amount timestamp transactionId tierId')
      .lean();

    const formattedSubscriptions = subscriptions.map(s => ({
      ...s,
      type: 'subscription',
      id: s.transactionId,
      txId: s.transactionId
    }));

    const history = [...formattedPurchases, ...formattedSubscriptions]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json(history);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
