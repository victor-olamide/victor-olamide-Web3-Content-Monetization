const Purchase = require('../models/Purchase');
const Content = require('../models/Content');
const UserProfile = require('../models/UserProfile');
const mongoose = require('mongoose');

async function getPlatformStatus() {
  try {
    const purchasesToday = await Purchase.countDocuments({ timestamp: { $gte: new Date(Date.now() - 24*60*60*1000) } });
    const totalContents = await Content.countDocuments({});
    const activeUsers = await UserProfile.countDocuments({ status: 'active' });

    return {
      purchasesToday,
      totalContents,
      activeUsers,
      mongo: {
        readyState: mongoose.connection.readyState
      },
      timestamp: new Date()
    };
  } catch (error) {
    throw error;
  }
}

async function getMetrics() {
  try {
    // example metrics: purchases by day for last 7 days
    const now = new Date();
    const start = new Date(now.getTime() - 7*24*60*60*1000);

    const agg = await Purchase.aggregate([
      { $match: { timestamp: { $gte: start } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }, count: { $sum: 1 }, revenue: { $sum: '$amount' } } },
      { $sort: { _id: 1 } }
    ]);

    return { purchasesLast7Days: agg };
  } catch (error) {
    throw error;
  }
}

async function rebuildIndexes() {
  try {
    // Simple example: create index on Purchase.timestamp if missing
    await Purchase.collection.createIndex({ timestamp: -1 }, { name: 'timestamp_index' });
    return { success: true, message: 'Indexes rebuilt' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = { getPlatformStatus, getMetrics, rebuildIndexes };
