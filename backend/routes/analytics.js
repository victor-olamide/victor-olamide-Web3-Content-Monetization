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

// Public routes (for event tracking)
router.post('/track', analyticsController.trackEvent);

// Admin-only routes (require authentication)
router.use(adminAuthMiddleware);

router.get('/dashboard', analyticsController.getDashboardData);
router.get('/realtime', analyticsController.getRealTimeMetrics);
router.get('/user-behavior', analyticsController.getUserBehaviorAnalytics);
router.get('/content-performance', analyticsController.getContentPerformanceAnalytics);
router.get('/revenue', analyticsController.getRevenueAnalytics);
router.get('/export', analyticsController.exportAnalyticsData);

module.exports = router;
