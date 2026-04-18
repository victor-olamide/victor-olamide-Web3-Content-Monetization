/**
 * Analytics Routes
 * Defines all analytics API endpoints
 */

const express = require('express');
const router = express.Router();

// Import controllers
const analyticsController = require('../controllers/analyticsController');

// Import middleware
const { adminAuthMiddleware } = require('../middleware/adminAuth');
const { authenticateToken } = require('../middleware/auth');

// Public routes (for event tracking)
router.post('/track', analyticsController.trackEvent);

// Creator routes (require authentication)
router.get('/creator/:id', authenticateToken, analyticsController.getCreatorAnalytics);

// Admin-only routes (require authentication)
router.use(adminAuthMiddleware);

router.get('/dashboard', analyticsController.getDashboardData);
router.get('/realtime', analyticsController.getRealTimeMetrics);
router.get('/user-behavior', analyticsController.getUserBehaviorAnalytics);
router.get('/content-performance', analyticsController.getContentPerformanceAnalytics);
router.get('/revenue', analyticsController.getRevenueAnalytics);
router.get('/export', analyticsController.exportAnalyticsData);

module.exports = router;
