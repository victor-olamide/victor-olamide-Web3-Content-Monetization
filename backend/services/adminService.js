const Purchase = require('../models/Purchase');
const Content = require('../models/Content');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const AdminDashboardStats = require('../models/AdminDashboardStats');
const mongoose = require('mongoose');

/**
 * Build the standardized API response payload for admin dashboard stats.
 */
function buildPlatformStatsPayload(snapshot) {
  if (!snapshot) return null;

  const {
    totalUsers = 0,
    totalContent = 0,
    activeSubscriptions = 0,
    totalRevenue = 0,
    activeUsers = 0,
    newUsers = 0,
    suspendedUsers = 0,
    publishedContent = 0,
    deletedContent = 0,
    platformFees = 0,
    creatorPayouts = 0,
    totalTransactions = 0,
    purchasesToday = 0,
    date,
    generatedAt,
  } = snapshot;

  return {
    totalUsers,
    totalRevenue,
    totalContent,
    activeSubscriptions,
    generatedAt: generatedAt || date || new Date(),
    users: {
      total: totalUsers,
      active: activeUsers,
      new: newUsers,
      suspended: suspendedUsers,
    },
    content: {
      total: totalContent,
      active: publishedContent,
      removed: deletedContent,
    },
    revenue: {
      total: totalRevenue,
      platformFees,
      creatorPayouts,
      totalTransactions,
    },
    subscriptions: {
      active: activeSubscriptions,
    },
    activity: {
      purchasesToday,
    },
  };
}

/**
 * Compute live platform-wide metrics and persist a snapshot to AdminDashboardStats.
 * Returns: totalUsers, totalRevenue, totalContent, activeSubscriptions + breakdowns.
 */
async function getPlatformStats() {
  const now = new Date();
  const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    activeUsers,
    newUsers,
    suspendedUsers,
    totalContent,
    removedContent,
    activeSubscriptions,
    revenueAgg,
    purchasesToday,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ isActive: { $ne: false } }),
    User.countDocuments({ createdAt: { $gte: last30Days } }),
    User.countDocuments({ isSuspended: true }),
    Content.countDocuments(),
    Content.countDocuments({ isRemoved: true }),
    Subscription.countDocuments({
      renewalStatus: { $in: ['active', 'expiring-soon'] },
      expiry: { $gte: now },
    }),
    Purchase.aggregate([
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
          platformFees: { $sum: '$platformFee' },
          creatorPayouts: { $sum: '$creatorAmount' },
          totalTransactions: { $sum: 1 },
        },
      },
    ]),
    Purchase.countDocuments({ timestamp: { $gte: last24h } }),
  ]);

  const revenue = revenueAgg[0] || {
    totalRevenue: 0,
    platformFees: 0,
    creatorPayouts: 0,
    totalTransactions: 0,
  };

  const snapshot = {
    date: now,
    totalUsers,
    activeUsers,
    newUsers,
    suspendedUsers,
    totalContent,
    publishedContent: totalContent - removedContent,
    deletedContent: removedContent,
    activeSubscriptions,
    totalRevenue: revenue.totalRevenue,
    platformFees: revenue.platformFees,
    creatorPayouts: revenue.creatorPayouts,
    totalTransactions: revenue.totalTransactions,
    systemHealth: 'HEALTHY',
  };

  // Persist snapshot (non-fatal if it fails)
  try {
    await AdminDashboardStats.updateStats(snapshot);
  } catch (_) { /* ignore */ }

  return buildPlatformStatsPayload({
    ...snapshot,
    purchasesToday,
  });
}

/**
 * Return the most recently persisted AdminDashboardStats snapshot.
 * Falls back to live computation if no snapshot exists.
 */
async function getLatestStats() {
  const cached = await AdminDashboardStats.getLatestStats();
  if (cached) return buildPlatformStatsPayload(cached);
  return getPlatformStats();
}

/**
 * Return AdminDashboardStats snapshots for a date range.
 */
async function getStatsByDateRange(startDate, endDate) {
  return AdminDashboardStats.getStatsByDateRange(new Date(startDate), new Date(endDate));
}

/**
 * Purchases-by-day aggregation for the last 7 days.
 */
async function getMetrics() {
  const start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const agg = await Purchase.aggregate([
    { $match: { timestamp: { $gte: start } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
        count: { $sum: 1 },
        revenue: { $sum: '$amount' },
      },
    },
    { $sort: { _id: 1 } },
  ]);
  return { purchasesLast7Days: agg };
}

/**
 * Overall platform status (lightweight — used by health-check style endpoints).
 */
async function getPlatformStatus() {
  const [purchasesToday, totalContents, totalUsers] = await Promise.all([
    Purchase.countDocuments({ timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }),
    Content.countDocuments(),
    User.countDocuments(),
  ]);

  return {
    purchasesToday,
    totalContents,
    totalUsers,
    mongo: { readyState: mongoose.connection.readyState },
    timestamp: new Date(),
  };
}

/**
 * Rebuild key indexes (admin maintenance action).
 */
async function rebuildIndexes() {
  try {
    await Purchase.collection.createIndex({ timestamp: -1 }, { name: 'timestamp_index' });
    return { success: true, message: 'Indexes rebuilt' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Top creators by total revenue (purchases).
 * @param {number} limit - Number of creators to return (default 10)
 */
async function getTopCreators(limit = 10) {
  const results = await Purchase.aggregate([
    {
      $group: {
        _id: '$creator',
        totalRevenue: { $sum: '$amount' },
        totalSales: { $sum: 1 },
        creatorEarnings: { $sum: '$creatorAmount' },
      },
    },
    { $sort: { totalRevenue: -1 } },
    { $limit: parseInt(limit) },
    {
      $project: {
        creator: '$_id',
        totalRevenue: 1,
        totalSales: 1,
        creatorEarnings: 1,
        _id: 0,
      },
    },
  ]);
  return results;
}

/**
 * Revenue by day for the last N days (default 30).
 */
async function getRevenueByDay(days = 30) {
  const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return Purchase.aggregate([
    { $match: { timestamp: { $gte: start } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
        revenue: { $sum: '$amount' },
        platformFees: { $sum: '$platformFee' },
        transactions: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);
}

module.exports = {
  getPlatformStats,
  getLatestStats,
  getStatsByDateRange,
  getMetrics,
  getPlatformStatus,
  rebuildIndexes,
  getTopCreators,
  getRevenueByDay,
};
