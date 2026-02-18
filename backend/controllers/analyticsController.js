/**
 * Analytics Controller
 * Handles analytics data collection and reporting endpoints
 */

const analyticsService = require('../services/analyticsService');
const AdminAuditLog = require('../models/AdminAuditLog');

/**
 * Track analytics event
 */
const trackEvent = async (req, res) => {
  try {
    const {
      eventType,
      userId,
      sessionId,
      contentId,
      transactionId,
      metadata = {},
    } = req.body;

    // Validate required fields
    if (!eventType) {
      return res.status(400).json({
        success: false,
        message: 'eventType is required',
      });
    }

    // Prepare event data
    const eventData = {
      eventType,
      userId: userId || req.user?.id,
      sessionId: sessionId || req.sessionID,
      contentId,
      transactionId,
      metadata,
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
      referrer: req.headers.referer,
      url: req.originalUrl,
    };

    // Add geographic data if available (from middleware)
    if (req.geo) {
      eventData.country = req.geo.country;
      eventData.city = req.geo.city;
    }

    // Track the event
    const event = await analyticsService.trackEvent(eventData);

    res.status(200).json({
      success: true,
      message: 'Event tracked successfully',
      data: {
        eventId: event._id,
        eventType: event.eventType,
        timestamp: event.timestamp,
      },
    });
  } catch (error) {
    console.error('Error tracking analytics event:', error);

    res.status(500).json({
      success: false,
      message: 'Error tracking analytics event',
      error: error.message,
    });
  }
};

/**
 * Get analytics dashboard data
 */
const getDashboardData = async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      granularity = 'daily',
    } = req.query;

    // Validate date parameters
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required',
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Validate date range
    if (start > end) {
      return res.status(400).json({
        success: false,
        message: 'startDate must be before endDate',
      });
    }

    // Check date range limits (max 1 year for daily, max 5 years for monthly)
    const maxRange = granularity === 'monthly' ? 5 * 365 : 365;
    const daysDiff = (end - start) / (1000 * 60 * 60 * 24);

    if (daysDiff > maxRange) {
      return res.status(400).json({
        success: false,
        message: `Date range too large. Maximum ${maxRange} days allowed for ${granularity} granularity`,
      });
    }

    const dashboardData = await analyticsService.getDashboardData(start, end, granularity);

    // Log admin access
    await AdminAuditLog.logAction(
      req.user.id,
      req.user.email,
      'VIEW',
      'ANALYTICS',
      'DASHBOARD',
      { startDate, endDate, granularity },
      req.ip,
      req.headers['user-agent']
    );

    res.status(200).json({
      success: true,
      data: dashboardData,
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);

    res.status(500).json({
      success: false,
      message: 'Error fetching analytics dashboard data',
      error: error.message,
    });
  }
};

/**
 * Get real-time analytics metrics
 */
const getRealTimeMetrics = async (req, res) => {
  try {
    // In a real implementation, this would fetch from Redis cache
    // For now, return mock real-time data
    const realTimeData = {
      activeUsers: Math.floor(Math.random() * 100) + 50,
      currentSessions: Math.floor(Math.random() * 200) + 100,
      recentPageViews: Math.floor(Math.random() * 500) + 200,
      recentTransactions: Math.floor(Math.random() * 10) + 1,
      timestamp: new Date(),
    };

    res.status(200).json({
      success: true,
      data: realTimeData,
    });
  } catch (error) {
    console.error('Error fetching real-time metrics:', error);

    res.status(500).json({
      success: false,
      message: 'Error fetching real-time metrics',
      error: error.message,
    });
  }
};

/**
 * Get user behavior analytics
 */
const getUserBehaviorAnalytics = async (req, res) => {
  try {
    const { userId, startDate, endDate } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required',
      });
    }

    // In a real implementation, this would aggregate user-specific data
    const userAnalytics = {
      userId,
      totalSessions: Math.floor(Math.random() * 50) + 10,
      totalPageViews: Math.floor(Math.random() * 200) + 50,
      totalContentViews: Math.floor(Math.random() * 100) + 20,
      totalPurchases: Math.floor(Math.random() * 10),
      avgSessionDuration: Math.floor(Math.random() * 1800) + 300, // 5-35 minutes
      favoriteContentTypes: ['video', 'image', 'document'],
      lastActivity: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
    };

    await AdminAuditLog.logAction(
      req.user.id,
      req.user.email,
      'VIEW',
      'ANALYTICS',
      'USER_BEHAVIOR',
      { userId, startDate, endDate },
      req.ip,
      req.headers['user-agent']
    );

    res.status(200).json({
      success: true,
      data: userAnalytics,
    });
  } catch (error) {
    console.error('Error fetching user behavior analytics:', error);

    res.status(500).json({
      success: false,
      message: 'Error fetching user behavior analytics',
      error: error.message,
    });
  }
};

/**
 * Get content performance analytics
 */
const getContentPerformanceAnalytics = async (req, res) => {
  try {
    const { contentId, startDate, endDate } = req.query;

    if (!contentId) {
      return res.status(400).json({
        success: false,
        message: 'contentId is required',
      });
    }

    // In a real implementation, this would aggregate content-specific data
    const contentAnalytics = {
      contentId,
      totalViews: Math.floor(Math.random() * 1000) + 100,
      uniqueViews: Math.floor(Math.random() * 800) + 80,
      totalLikes: Math.floor(Math.random() * 100) + 10,
      totalShares: Math.floor(Math.random() * 50) + 5,
      totalPurchases: Math.floor(Math.random() * 20),
      totalRevenue: Math.floor(Math.random() * 500) + 50,
      avgViewDuration: Math.floor(Math.random() * 600) + 120, // 2-12 minutes
      bounceRate: Math.random() * 0.5, // 0-50%
      conversionRate: Math.random() * 0.1, // 0-10%
      topReferrers: [
        { source: 'direct', count: Math.floor(Math.random() * 50) + 10 },
        { source: 'social', count: Math.floor(Math.random() * 30) + 5 },
        { source: 'search', count: Math.floor(Math.random() * 20) + 3 },
      ],
    };

    await AdminAuditLog.logAction(
      req.user.id,
      req.user.email,
      'VIEW',
      'ANALYTICS',
      'CONTENT_PERFORMANCE',
      { contentId, startDate, endDate },
      req.ip,
      req.headers['user-agent']
    );

    res.status(200).json({
      success: true,
      data: contentAnalytics,
    });
  } catch (error) {
    console.error('Error fetching content performance analytics:', error);

    res.status(500).json({
      success: false,
      message: 'Error fetching content performance analytics',
      error: error.message,
    });
  }
};

/**
 * Get revenue analytics
 */
const getRevenueAnalytics = async (req, res) => {
  try {
    const { startDate, endDate, breakdown = 'daily' } = req.query;

    // In a real implementation, this would aggregate revenue data
    const revenueAnalytics = {
      totalRevenue: Math.floor(Math.random() * 10000) + 1000,
      platformFees: Math.floor(Math.random() * 2000) + 200,
      creatorRevenue: Math.floor(Math.random() * 8000) + 800,
      transactionCount: Math.floor(Math.random() * 500) + 50,
      avgTransactionValue: Math.floor(Math.random() * 100) + 20,
      revenueByContentType: {
        video: Math.floor(Math.random() * 4000) + 500,
        image: Math.floor(Math.random() * 3000) + 300,
        document: Math.floor(Math.random() * 2000) + 200,
        audio: Math.floor(Math.random() * 1000) + 100,
      },
      revenueByPaymentMethod: {
        credit_card: Math.floor(Math.random() * 5000) + 500,
        crypto: Math.floor(Math.random() * 3000) + 300,
        paypal: Math.floor(Math.random() * 2000) + 200,
      },
      topEarningContent: [
        { contentId: 'content1', title: 'Premium Video Course', revenue: 500 },
        { contentId: 'content2', title: 'Digital Art Collection', revenue: 350 },
        { contentId: 'content3', title: 'E-book Bundle', revenue: 200 },
      ],
    };

    await AdminAuditLog.logAction(
      req.user.id,
      req.user.email,
      'VIEW',
      'ANALYTICS',
      'REVENUE',
      { startDate, endDate, breakdown },
      req.ip,
      req.headers['user-agent']
    );

    res.status(200).json({
      success: true,
      data: revenueAnalytics,
    });
  } catch (error) {
    console.error('Error fetching revenue analytics:', error);

    res.status(500).json({
      success: false,
      message: 'Error fetching revenue analytics',
      error: error.message,
    });
  }
};

/**
 * Export analytics data
 */
const exportAnalyticsData = async (req, res) => {
  try {
    const { dataType, format = 'json', startDate, endDate } = req.query;

    if (!dataType) {
      return res.status(400).json({
        success: false,
        message: 'dataType is required',
      });
    }

    // In a real implementation, this would generate and return export data
    const exportData = {
      dataType,
      format,
      startDate,
      endDate,
      exportedAt: new Date(),
      recordCount: Math.floor(Math.random() * 10000) + 1000,
      fileUrl: `https://api.example.com/analytics/exports/${dataType}_${Date.now()}.${format}`,
    };

    await AdminAuditLog.logAction(
      req.user.id,
      req.user.email,
      'VIEW',
      'ANALYTICS',
      'EXPORT',
      { dataType, format, startDate, endDate },
      req.ip,
      req.headers['user-agent']
    );

    res.status(200).json({
      success: true,
      message: 'Analytics data export initiated successfully',
      data: exportData,
    });
  } catch (error) {
    console.error('Error exporting analytics data:', error);

    res.status(500).json({
      success: false,
      message: 'Error exporting analytics data',
      error: error.message,
    });
  }
};

module.exports = {
  trackEvent,
  getDashboardData,
  getRealTimeMetrics,
  getUserBehaviorAnalytics,
  getContentPerformanceAnalytics,
  getRevenueAnalytics,
  exportAnalyticsData,
};
