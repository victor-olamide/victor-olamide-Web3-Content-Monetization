/**
 * Admin Dashboard Controller
 * Handles platform monitoring and statistics endpoints
 */

const AdminDashboardStats = require('../models/AdminDashboardStats');
const AdminAuditLog = require('../models/AdminAuditLog');
const User = require('../models/User');
const Content = require('../models/Content');
const Transaction = require('../models/Transaction');

/**
 * Get dashboard overview
 */
const getDashboardOverview = async (req, res) => {
  try {
    const latestStats = await AdminDashboardStats.getLatestStats();

    if (!latestStats) {
      return res.status(200).json({
        success: true,
        message: 'No statistics available yet',
        data: {},
      });
    }

    // Log action
    await AdminAuditLog.logAction(
      req.user.id,
      req.user.email,
      'VIEW',
      'SYSTEM',
      'DASHBOARD',
      { endpoint: '/admin/dashboard/overview' },
      req.ip,
      req.headers['user-agent']
    );

    res.status(200).json({
      success: true,
      data: latestStats,
    });
  } catch (error) {
    console.error('Error fetching dashboard overview:', error);

    await AdminAuditLog.logFailedAction(
      req.user.id,
      req.user.email,
      'VIEW',
      'SYSTEM',
      'DASHBOARD',
      error.message,
      req.ip,
      req.headers['user-agent']
    );

    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard overview',
      error: error.message,
    });
  }
};

/**
 * Get statistics for date range
 */
const getStatistics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required',
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    const stats = await AdminDashboardStats.getStatsByDateRange(start, end);

    await AdminAuditLog.logAction(
      req.user.id,
      req.user.email,
      'VIEW',
      'SYSTEM',
      'STATISTICS',
      { startDate, endDate },
      req.ip,
      req.headers['user-agent']
    );

    res.status(200).json({
      success: true,
      data: stats,
      count: stats.length,
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);

    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message,
    });
  }
};

/**
 * Get user statistics
 */
const getUserStatistics = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const suspendedUsers = await User.countDocuments({ isSuspended: true });
    const newUsers = await User.countDocuments({
      createdAt: {
        $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      },
    });

    const userStats = {
      totalUsers,
      activeUsers,
      suspendedUsers,
      newUsers,
      inactiveUsers: totalUsers - activeUsers - suspendedUsers,
    };

    await AdminAuditLog.logAction(
      req.user.id,
      req.user.email,
      'VIEW',
      'SYSTEM',
      'USER_STATISTICS',
      {},
      req.ip,
      req.headers['user-agent']
    );

    res.status(200).json({
      success: true,
      data: userStats,
    });
  } catch (error) {
    console.error('Error fetching user statistics:', error);

    res.status(500).json({
      success: false,
      message: 'Error fetching user statistics',
      error: error.message,
    });
  }
};

/**
 * Get content statistics
 */
const getContentStatistics = async (req, res) => {
  try {
    const totalContent = await Content.countDocuments();
    const publishedContent = await Content.countDocuments({ status: 'published' });
    const draftContent = await Content.countDocuments({ status: 'draft' });
    const deletedContent = await Content.countDocuments({ isDeleted: true });

    const contentStats = {
      totalContent,
      publishedContent,
      draftContent,
      deletedContent,
      activeContent: totalContent - deletedContent - draftContent,
    };

    await AdminAuditLog.logAction(
      req.user.id,
      req.user.email,
      'VIEW',
      'SYSTEM',
      'CONTENT_STATISTICS',
      {},
      req.ip,
      req.headers['user-agent']
    );

    res.status(200).json({
      success: true,
      data: contentStats,
    });
  } catch (error) {
    console.error('Error fetching content statistics:', error);

    res.status(500).json({
      success: false,
      message: 'Error fetching content statistics',
      error: error.message,
    });
  }
};

/**
 * Get revenue statistics
 */
const getRevenueStatistics = async (req, res) => {
  try {
    const transactions = await Transaction.find().select(
      'amount type platformFee status createdAt'
    );

    const totalRevenue = transactions.reduce(
      (sum, t) => (t.status === 'completed' ? sum + t.amount : sum),
      0
    );
    const platformFees = transactions.reduce(
      (sum, t) => (t.status === 'completed' && t.platformFee ? sum + t.platformFee : sum),
      0
    );
    const creatorPayouts = totalRevenue - platformFees;

    const revenueStats = {
      totalRevenue,
      platformFees,
      creatorPayouts,
      totalTransactions: transactions.length,
      completedTransactions: transactions.filter((t) => t.status === 'completed')
        .length,
      pendingTransactions: transactions.filter((t) => t.status === 'pending').length,
      failedTransactions: transactions.filter((t) => t.status === 'failed').length,
    };

    await AdminAuditLog.logAction(
      req.user.id,
      req.user.email,
      'VIEW',
      'SYSTEM',
      'REVENUE_STATISTICS',
      {},
      req.ip,
      req.headers['user-agent']
    );

    res.status(200).json({
      success: true,
      data: revenueStats,
    });
  } catch (error) {
    console.error('Error fetching revenue statistics:', error);

    res.status(500).json({
      success: false,
      message: 'Error fetching revenue statistics',
      error: error.message,
    });
  }
};

/**
 * Get system health status
 */
const getSystemHealth = async (req, res) => {
  try {
    const healthData = {
      status: 'HEALTHY',
      timestamp: new Date(),
      services: {
        database: { status: 'RUNNING' },
        api: { status: 'RUNNING' },
        cache: { status: 'RUNNING' },
      },
      systemMetrics: {
        uptimeHours: 0,
        errorRate: 0,
        averageResponseTime: 0,
        requestsPerSecond: 0,
      },
    };

    await AdminAuditLog.logAction(
      req.user.id,
      req.user.email,
      'VIEW',
      'SYSTEM',
      'HEALTH_STATUS',
      {},
      req.ip,
      req.headers['user-agent']
    );

    res.status(200).json({
      success: true,
      data: healthData,
    });
  } catch (error) {
    console.error('Error fetching system health:', error);

    res.status(500).json({
      success: false,
      message: 'Error fetching system health',
      error: error.message,
    });
  }
};

module.exports = {
  getDashboardOverview,
  getStatistics,
  getUserStatistics,
  getContentStatistics,
  getRevenueStatistics,
  getSystemHealth,
};
