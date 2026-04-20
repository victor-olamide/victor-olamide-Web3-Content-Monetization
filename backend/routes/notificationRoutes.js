const logger = require('../utils/logger');
/**
 * Notification Routes
 * REST API endpoints for notification management
 */

const express = require('express');
const router = express.Router();
const notificationService = require('../services/notificationService');
const { authMiddleware } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');

// Middleware: Require authentication for all notification routes
router.use(authMiddleware);

/**
 * GET /api/notifications
 * Get user's notifications with pagination
 * Query params: page, limit, unreadOnly, type
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const { page, limit, unreadOnly, type } = req.query;

    const result = await notificationService.getUserNotifications(userId, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      unreadOnly: unreadOnly === 'true',
      type: type || null
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error fetching notifications', { err: error });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notifications'
    });
  }
});

/**
 * GET /api/notifications/stats
 * Get notification statistics for user
 */
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.id;
    const stats = await notificationService.getUserNotificationStats(userId);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error getting notification stats', { err: error });
    res.status(500).json({
      success: false,
      error: 'Failed to get notification statistics'
    });
  }
});

/**
 * GET /api/notifications/unread-count
 * Get unread notification count
 */
router.get('/unread-count', async (req, res) => {
  try {
    const userId = req.user.id;
    const count = await notificationService.getUnreadCount(userId);

    res.json({
      success: true,
      data: { unreadCount: count }
    });
  } catch (error) {
    logger.error('Error getting unread count', { err: error });
    res.status(500).json({
      success: false,
      error: 'Failed to get unread count'
    });
  }
});

/**
 * GET /api/notifications/:id
 * Get a specific notification
 */
router.get('/:id', async (req, res) => {
  try {
    const Notification = require('../models/Notification');
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    // Verify ownership
    if (notification.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    res.json({
      success: true,
      data: notification
    });
  } catch (error) {
    logger.error('Error fetching notification', { err: error });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notification'
    });
  }
});

/**
 * PUT /api/notifications/:id/read
 * Mark notification as read
 */
router.put('/:id/read', async (req, res) => {
  try {
    const notification = await notificationService.markAsRead(req.params.id);

    res.json({
      success: true,
      data: notification
    });
  } catch (error) {
    logger.error('Error marking notification as read', { err: error });
    res.status(500).json({
      success: false,
      error: 'Failed to mark notification as read'
    });
  }
});

/**
 * PUT /api/notifications/mark-all-read
 * Mark all notifications as read
 */
router.put('/mark-all-read', async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await notificationService.markAllAsRead(userId);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error marking all notifications as read', { err: error });
    res.status(500).json({
      success: false,
      error: 'Failed to mark all notifications as read'
    });
  }
});

/**
 * POST /api/notifications/mark-multiple-read
 * Mark multiple notifications as read
 */
router.post('/mark-multiple-read', async (req, res) => {
  try {
    const { notificationIds } = req.body;

    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'notificationIds must be a non-empty array'
      });
    }

    const result = await notificationService.markMultipleAsRead(notificationIds);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error marking multiple notifications as read', { err: error });
    res.status(500).json({
      success: false,
      error: 'Failed to mark multiple notifications as read'
    });
  }
});

/**
 * PUT /api/notifications/:id/archive
 * Archive notification
 */
router.put('/:id/archive', async (req, res) => {
  try {
    const notification = await notificationService.archiveNotification(req.params.id);

    res.json({
      success: true,
      data: notification
    });
  } catch (error) {
    logger.error('Error archiving notification', { err: error });
    res.status(500).json({
      success: false,
      error: 'Failed to archive notification'
    });
  }
});

/**
 * DELETE /api/notifications/:id
 * Delete notification
 */
router.delete('/:id', async (req, res) => {
  try {
    await notificationService.deleteNotification(req.params.id);

    res.json({
      success: true,
      message: 'Notification deleted'
    });
  } catch (error) {
    logger.error('Error deleting notification', { err: error });
    res.status(500).json({
      success: false,
      error: 'Failed to delete notification'
    });
  }
});

/**
 * POST /api/notifications/delete-multiple
 * Delete multiple notifications
 */
router.post('/delete-multiple', async (req, res) => {
  try {
    const { notificationIds } = req.body;

    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'notificationIds must be a non-empty array'
      });
    }

    const result = await notificationService.deleteMultiple(notificationIds);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error deleting multiple notifications', { err: error });
    res.status(500).json({
      success: false,
      error: 'Failed to delete multiple notifications'
    });
  }
});

/**
 * POST /api/notifications/test
 * Test endpoint to create a test notification (development only)
 */
router.post('/test', async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        error: 'Test endpoint disabled in production'
      });
    }

    const notification = await notificationService.createNotification({
      userId: req.user.id,
      type: req.body.type || 'system',
      title: req.body.title || 'Test Notification',
      message: req.body.message || 'This is a test notification',
      icon: req.body.icon || 'info'
    });

    res.json({
      success: true,
      data: notification
    });
  } catch (error) {
    logger.error('Error creating test notification', { err: error });
    res.status(500).json({
      success: false,
      error: 'Failed to create test notification'
    });
  }
});

module.exports = router;
