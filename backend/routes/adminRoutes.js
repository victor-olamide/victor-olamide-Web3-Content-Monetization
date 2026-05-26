const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { protect, authorize } = require('../middleware/auth');
const adminService = require('../services/adminService');
const {
  getStats,
  getDashboardOverview,
  getStatistics,
  getUserStatistics,
  getContentStatistics,
  getRevenueStatistics,
  getSystemHealth,
} = require('../controllers/adminDashboardController');

// All admin routes require a valid JWT AND admin role
router.use(protect, authorize('admin'));

// ---------------------------------------------------------------------------
// Platform-wide stats (issue #182 primary endpoint)
// GET /api/admin/stats
// Returns: totalUsers, totalRevenue, totalContent, activeSubscriptions
// ---------------------------------------------------------------------------
router.get('/stats', getStats);

// ---------------------------------------------------------------------------
// Dashboard overview — latest persisted snapshot
// GET /api/admin/dashboard/overview
// ---------------------------------------------------------------------------
router.get('/dashboard/overview', getDashboardOverview);

// ---------------------------------------------------------------------------
// Historical statistics by date range
// GET /api/admin/statistics?startDate=&endDate=
// ---------------------------------------------------------------------------
router.get('/statistics', getStatistics);

// ---------------------------------------------------------------------------
// User statistics
// GET /api/admin/users/stats
// ---------------------------------------------------------------------------
router.get('/users/stats', getUserStatistics);

// ---------------------------------------------------------------------------
// Content statistics
// GET /api/admin/content/stats
// ---------------------------------------------------------------------------
router.get('/content/stats', getContentStatistics);

// ---------------------------------------------------------------------------
// Revenue statistics
// GET /api/admin/revenue/stats
// ---------------------------------------------------------------------------
router.get('/revenue/stats', getRevenueStatistics);

// ---------------------------------------------------------------------------
// System health
// GET /api/admin/health
// ---------------------------------------------------------------------------
router.get('/health', getSystemHealth);

// ---------------------------------------------------------------------------
// Audit logs
// GET /api/admin/audit-logs?page=&limit=&action=&resourceType=
// ---------------------------------------------------------------------------
router.get('/audit-logs', async (req, res) => {
  try {
    const AdminAuditLog = require('../models/AdminAuditLog');
    const { page = 1, limit = 20, action, resourceType } = req.query;
    const query = {};
    if (action) query.action = action;
    if (resourceType) query.resourceType = resourceType;

    const [logs, total] = await Promise.all([
      AdminAuditLog.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit)),
      AdminAuditLog.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    logger.error('Failed to get audit logs', { err: error });
    res.status(500).json({ success: false, error: 'Failed to get audit logs' });
  }
});

// ---------------------------------------------------------------------------
// Platform status (lightweight)
// GET /api/admin/status
// ---------------------------------------------------------------------------
router.get('/status', async (req, res) => {
  try {
    const status = await adminService.getPlatformStatus();
    res.json({ success: true, data: status });
  } catch (error) {
    logger.error('Failed to get platform status', { err: error });
    res.status(500).json({ success: false, error: 'Failed to get platform status' });
  }
});

// ---------------------------------------------------------------------------
// Aggregated metrics (purchases last 7 days)
// GET /api/admin/metrics
// ---------------------------------------------------------------------------
router.get('/metrics', async (req, res) => {
  try {
    const metrics = await adminService.getMetrics();
    res.json({ success: true, data: metrics });
  } catch (error) {
    logger.error('Failed to get metrics', { err: error });
    res.status(500).json({ success: false, error: 'Failed to get metrics' });
  }
});

// ---------------------------------------------------------------------------
// Admin maintenance action — rebuild indexes
// POST /api/admin/action/rebuild-indexes
// ---------------------------------------------------------------------------
router.post('/action/rebuild-indexes', async (req, res) => {
  try {
    const result = await adminService.rebuildIndexes();
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Failed to perform admin action', { err: error });
    res.status(500).json({ success: false, error: 'Failed to perform admin action' });
  }
});

module.exports = router;
