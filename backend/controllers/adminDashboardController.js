/**
 * Admin Dashboard Controller
 * Handles platform monitoring and statistics endpoints.
 * All handlers require admin role (enforced at route level).
 */

const AdminDashboardStats = require('../models/AdminDashboardStats');
const AdminAuditLog = require('../models/AdminAuditLog');
const User = require('../models/User');
const Content = require('../models/Content');
const adminService = require('../services/adminService');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Fire-and-forget audit log — never throws so it can't break a response.
 */
async function audit(req, action, resourceId, details = {}) {
  try {
    await AdminAuditLog.logAction(
      req.user._id || req.user.id,
      req.user.email,
      action,
      'SYSTEM',
      resourceId,
      details,
      req.ip,
      req.headers['user-agent']
    );
  } catch (_) { /* non-fatal */ }
}

// ---------------------------------------------------------------------------
// GET /admin/stats
// Returns platform-wide metrics: total users, revenue, content count,
// active subscriptions. Computes live and persists a snapshot.
// ---------------------------------------------------------------------------
const getStats = async (req, res) => {
  try {
    const stats = await adminService.getPlatformStats();
    await audit(req, 'VIEW', 'STATS', { endpoint: '/admin/stats' });
    return res.status(200).json({ success: true, data: stats });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error fetching platform stats', error: error.message });
  }
};

// ---------------------------------------------------------------------------
// GET /admin/dashboard/overview  — latest persisted snapshot
// ---------------------------------------------------------------------------
const getDashboardOverview = async (req, res) => {
  try {
    const latestStats = await AdminDashboardStats.getLatestStats();
    await audit(req, 'VIEW', 'DASHBOARD', { endpoint: '/admin/dashboard/overview' });

    if (!latestStats) {
      return res.status(200).json({ success: true, message: 'No statistics available yet', data: {} });
    }

    return res.status(200).json({ success: true, data: latestStats });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error fetching dashboard overview', error: error.message });
  }
};

// ---------------------------------------------------------------------------
// GET /admin/statistics?startDate=&endDate=
// ---------------------------------------------------------------------------
const getStatistics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'startDate and endDate are required' });
    }

    const stats = await adminService.getStatsByDateRange(startDate, endDate);
    await audit(req, 'VIEW', 'STATISTICS', { startDate, endDate });

    return res.status(200).json({ success: true, data: stats, count: stats.length });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error fetching statistics', error: error.message });
  }
};

// ---------------------------------------------------------------------------
// GET /admin/users/stats
// ---------------------------------------------------------------------------
const getUserStatistics = async (req, res) => {
  try {
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [totalUsers, activeUsers, suspendedUsers, newUsers] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: { $ne: false } }),
      User.countDocuments({ isSuspended: true }),
      User.countDocuments({ createdAt: { $gte: last30Days } }),
    ]);

    await audit(req, 'VIEW', 'USER_STATISTICS');
    return res.status(200).json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        suspendedUsers,
        newUsers,
        inactiveUsers: totalUsers - activeUsers - suspendedUsers,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error fetching user statistics', error: error.message });
  }
};

// ---------------------------------------------------------------------------
// GET /admin/content/stats
// ---------------------------------------------------------------------------
const getContentStatistics = async (req, res) => {
  try {
    const [totalContent, removedContent] = await Promise.all([
      Content.countDocuments(),
      Content.countDocuments({ isRemoved: true }),
    ]);

    await audit(req, 'VIEW', 'CONTENT_STATISTICS');
    return res.status(200).json({
      success: true,
      data: {
        totalContent,
        activeContent: totalContent - removedContent,
        removedContent,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error fetching content statistics', error: error.message });
  }
};

// ---------------------------------------------------------------------------
// GET /admin/revenue/stats
// ---------------------------------------------------------------------------
const getRevenueStatistics = async (req, res) => {
  try {
    const Purchase = require('../models/Purchase');
    const agg = await Purchase.aggregate([
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
          platformFees: { $sum: '$platformFee' },
          creatorPayouts: { $sum: '$creatorAmount' },
          totalTransactions: { $sum: 1 },
        },
      },
    ]);

    const data = agg[0] || { totalRevenue: 0, platformFees: 0, creatorPayouts: 0, totalTransactions: 0 };
    await audit(req, 'VIEW', 'REVENUE_STATISTICS');
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error fetching revenue statistics', error: error.message });
  }
};

// ---------------------------------------------------------------------------
// GET /admin/health
// ---------------------------------------------------------------------------
const getSystemHealth = async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const dbState = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    const healthData = {
      status: 'HEALTHY',
      timestamp: new Date(),
      services: {
        database: { status: mongoose.connection.readyState === 1 ? 'RUNNING' : 'DOWN', state: dbState[mongoose.connection.readyState] },
        api: { status: 'RUNNING', uptime: process.uptime() },
      },
    };

    await audit(req, 'VIEW', 'HEALTH_STATUS');
    return res.status(200).json({ success: true, data: healthData });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error fetching system health', error: error.message });
  }
};

module.exports = {
  getStats,
  getDashboardOverview,
  getStatistics,
  getUserStatistics,
  getContentStatistics,
  getRevenueStatistics,
  getSystemHealth,
};
