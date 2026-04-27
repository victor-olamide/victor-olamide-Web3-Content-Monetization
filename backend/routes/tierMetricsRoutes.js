// Tier Metrics Routes
// API endpoints for subscription tier analytics and metrics

const express = require('express');
const router = express.Router();
const tierMetricsService = require('../services/tierMetricsService');
const { validateTierId, validateCreatorId } = require('../middleware/subscriptionTierValidation');
const { verifyToken, isCreator, optionalAuth } = require('../middleware/subscriptionTierAuth');

/**
 * GET /tiers/:tierId/metrics
 * Get performance metrics for a specific tier
 * @query {string} startDate - Start date for metrics (ISO format)
 * @query {string} endDate - End date for metrics (ISO format)
 */
router.get('/tiers/:tierId/metrics', validateTierId, optionalAuth, async (req, res) => {
  try {
    const { tierId } = req.params;
    const { startDate, endDate } = req.query;

    const result = await tierMetricsService.getTierPerformanceMetrics(tierId, {
      startDate,
      endDate
    });

    if (!result.success) {
      return res.status(404).json({ success: false, message: result.error });
    }

    res.json({
      success: true,
      metrics: result.metrics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching tier metrics',
      error: error.message
    });
  }
});

/**
 * GET /creators/:creatorId/analytics
 * Get comprehensive analytics for all creator tiers
 */
router.get('/creators/:creatorId/analytics', validateCreatorId, verifyToken, isCreator, async (req, res) => {
  try {
    const { creatorId } = req.params;

    const result = await tierMetricsService.getCreatorTierAnalytics(creatorId);

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.error });
    }

    res.json({
      success: true,
      analytics: result.analytics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching creator analytics',
      error: error.message
    });
  }
});

/**
 * GET /tiers/compare/:tierId1/:tierId2/metrics
 * Compare metrics between two tiers
 */
router.get('/tiers/compare/:tierId1/:tierId2/metrics', optionalAuth, async (req, res) => {
  try {
    const { tierId1, tierId2 } = req.params;

    const result = await tierMetricsService.getTierComparisonMetrics(tierId1, tierId2);

    if (!result.success) {
      return res.status(404).json({ success: false, message: result.error });
    }

    res.json({
      success: true,
      comparison: result.comparison
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error comparing tier metrics',
      error: error.message
    });
  }
});

/**
 * GET /tiers/:tierId/trends
 * Get trend data for a tier over time
 * @query {string} period - Time period (daily, weekly, monthly)
 * @query {number} days - Number of days to look back (default: 30)
 */
router.get('/tiers/:tierId/trends', validateTierId, optionalAuth, async (req, res) => {
  try {
    const { tierId } = req.params;
    const { period, days } = req.query;

    const result = await tierMetricsService.getTierTrends(tierId, period, parseInt(days) || 30);

    if (!result.success) {
      return res.status(404).json({ success: false, message: result.error });
    }

    res.json({
      success: true,
      trends: result.trends
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching tier trends',
      error: error.message
    });
  }
});

/**
 * GET /creators/:creatorId/metrics/summary
 * Get a summary of key metrics for creator dashboard
 */
router.get('/creators/:creatorId/metrics/summary', validateCreatorId, verifyToken, isCreator, async (req, res) => {
  try {
    const { creatorId } = req.params;

    // Get analytics and extract key summary metrics
    const analyticsResult = await tierMetricsService.getCreatorTierAnalytics(creatorId);

    if (!analyticsResult.success) {
      return res.status(400).json({ success: false, message: analyticsResult.error });
    }

    const { analytics } = analyticsResult;

    const summary = {
      totalTiers: analytics.totalTiers,
      totalSubscribers: analytics.totalSubscribers,
      totalRevenue: analytics.totalRevenue,
      averageTierPrice: analytics.averageTierPrice,
      topPerformingTier: analytics.tierPerformance.length > 0
        ? analytics.tierPerformance.reduce((prev, current) =>
            (prev.revenue > current.revenue) ? prev : current
          )
        : null,
      mostPopularTier: analytics.tierPerformance.find(t => t.isPopular) || null,
      tiersAtCapacity: analytics.tierPerformance.filter(t => t.isFull).length
    };

    res.json({
      success: true,
      summary
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching metrics summary',
      error: error.message
    });
  }
});

module.exports = router;
