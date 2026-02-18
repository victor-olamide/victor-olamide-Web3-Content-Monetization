const express = require('express');
const router = express.Router();
const adminService = require('../services/adminService');
const { authMiddleware } = require('../middleware/auth');

// Simple admin check middleware
async function requireAdmin(req, res, next) {
  try {
    // If authMiddleware populated req.user, check role; otherwise allow if DEV_ADMIN env set
    if (req.user && req.user.role === 'admin') return next();
    if (process.env.DEV_ADMIN === 'true') return next();
    return res.status(403).json({ success: false, error: 'Admin access required' });
  } catch (err) {
    console.error('Admin check failed', err);
    return res.status(500).json({ success: false, error: 'Admin check failed' });
  }
}

// GET /api/admin/status - overall platform status
router.get('/status', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const status = await adminService.getPlatformStatus();
    res.json({ success: true, data: status });
  } catch (error) {
    console.error('Failed to get platform status:', error);
    res.status(500).json({ success: false, error: 'Failed to get platform status' });
  }
});

// GET /api/admin/metrics - aggregated metrics
router.get('/metrics', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const metrics = await adminService.getMetrics();
    res.json({ success: true, data: metrics });
  } catch (error) {
    console.error('Failed to get metrics:', error);
    res.status(500).json({ success: false, error: 'Failed to get metrics' });
  }
});

// POST /api/admin/action/rebuild-indexes - example admin action
router.post('/action/rebuild-indexes', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const result = await adminService.rebuildIndexes();
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Failed to perform admin action:', error);
    res.status(500).json({ success: false, error: 'Failed to perform admin action' });
  }
});

module.exports = router;
