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

/**
 * Get revenue analytics by time period
 */
router.get('/analytics/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const { period = '7d' } = req.query;
    
    const days = period === '30d' ? 30 : 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const purchases = await Purchase.find({ 
      creator: address,
      timestamp: { $gte: startDate }
    });

    const subscriptions = await Subscription.find({ 
      creator: address,
      timestamp: { $gte: startDate }
    });

    const dailyData = {};
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = date.toISOString().split('T')[0];
      dailyData[key] = { ppv: 0, subscription: 0, total: 0 };
    }

    purchases.forEach(p => {
      const key = new Date(p.timestamp).toISOString().split('T')[0];
      if (dailyData[key]) {
        dailyData[key].ppv += p.amount;
        dailyData[key].total += p.amount;
      }
    });

    subscriptions.forEach(s => {
      const key = new Date(s.timestamp).toISOString().split('T')[0];
      if (dailyData[key]) {
        dailyData[key].subscription += s.amount;
        dailyData[key].total += s.amount;
      }
    });

    res.json(dailyData);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * Get subscriber growth metrics
 */
router.get('/growth/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const now = new Date();
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    const currentSubs = await Subscription.countDocuments({ 
      creator: address,
      expiry: { $gt: now }
    });

    const lastMonthSubs = await Subscription.countDocuments({ 
      creator: address,
      timestamp: { $lt: lastMonth },
      expiry: { $gt: lastMonth }
    });

    const growth = lastMonthSubs > 0 
      ? ((currentSubs - lastMonthSubs) / lastMonthSubs * 100).toFixed(1)
      : 0;

    res.json({ current: currentSubs, previous: lastMonthSubs, growth });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * Get top performing content by revenue
 */
router.get('/top-content/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const { limit = 5 } = req.query;

    const topContent = await Purchase.aggregate([
      { $match: { creator: address } },
      { $group: { 
        _id: '$contentId', 
        revenue: { $sum: '$amount' },
        sales: { $sum: 1 }
      }},
      { $sort: { revenue: -1 } },
      { $limit: parseInt(limit) }
    ]);

    res.json(topContent);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * Export earnings data as CSV
 */
router.get('/export/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const { startDate, endDate } = req.query;

    const query = { creator: address };
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const purchases = await Purchase.find(query).lean();
    const subscriptions = await Subscription.find(query).lean();

    const allTransactions = [
      ...purchases.map(p => ({ ...p, type: 'purchase' })),
      ...subscriptions.map(s => ({ ...s, type: 'subscription' }))
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json(allTransactions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
