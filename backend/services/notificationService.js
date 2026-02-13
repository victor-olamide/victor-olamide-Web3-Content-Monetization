/**
 * Notification Service
 * Manages user notifications for purchases, errors, and system events
 */

const Notification = require('../models/Notification');
const logger = require('../utils/logger');

/**
 * Create a new notification
 */
async function createNotification(data) {
  try {
    const notification = new Notification({
      userId: data.userId,
      type: data.type, // 'purchase_success', 'purchase_error', 'refund', 'listing_update', 'system'
      title: data.title,
      message: data.message,
      icon: data.icon || null,
      actionUrl: data.actionUrl || null,
      metadata: data.metadata || {},
      isRead: false,
      isArchived: false
    });

    await notification.save();
    logger.info(`Notification created for user ${data.userId}: ${data.type}`);
    return notification;
  } catch (error) {
    logger.error('Error creating notification:', error);
    throw error;
  }
}

/**
 * Get user notifications with pagination
 */
async function getUserNotifications(userId, options = {}) {
  try {
    const {
      page = 1,
      limit = 20,
      unreadOnly = false,
      type = null,
      sort = '-createdAt'
    } = options;

    let query = Notification.find({ userId });

    if (unreadOnly) {
      query = query.where('isRead', false);
    }

    if (type) {
      query = query.where('type', type);
    }

    const skip = (page - 1) * limit;
    const notifications = await query
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Notification.countDocuments(
      unreadOnly ? { userId, isRead: false } : { userId }
    );

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    logger.error('Error fetching user notifications:', error);
    throw error;
  }
}

/**
 * Get unread notification count
 */
async function getUnreadCount(userId) {
  try {
    const count = await Notification.countDocuments({
      userId,
      isRead: false,
      isArchived: false
    });
    return count;
  } catch (error) {
    logger.error('Error getting unread count:', error);
    throw error;
  }
}

/**
 * Mark notification as read
 */
async function markAsRead(notificationId) {
  try {
    const notification = await Notification.findByIdAndUpdate(
      notificationId,
      { isRead: true, readAt: new Date() },
      { new: true }
    );
    return notification;
  } catch (error) {
    logger.error('Error marking notification as read:', error);
    throw error;
  }
}

/**
 * Mark multiple notifications as read
 */
async function markMultipleAsRead(notificationIds) {
  try {
    const result = await Notification.updateMany(
      { _id: { $in: notificationIds } },
      { isRead: true, readAt: new Date() }
    );
    return result;
  } catch (error) {
    logger.error('Error marking multiple notifications as read:', error);
    throw error;
  }
}

/**
 * Mark all notifications as read for user
 */
async function markAllAsRead(userId) {
  try {
    const result = await Notification.updateMany(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );
    return result;
  } catch (error) {
    logger.error('Error marking all notifications as read:', error);
    throw error;
  }
}

/**
 * Archive notification
 */
async function archiveNotification(notificationId) {
  try {
    const notification = await Notification.findByIdAndUpdate(
      notificationId,
      { isArchived: true, archivedAt: new Date() },
      { new: true }
    );
    return notification;
  } catch (error) {
    logger.error('Error archiving notification:', error);
    throw error;
  }
}

/**
 * Delete notification
 */
async function deleteNotification(notificationId) {
  try {
    await Notification.findByIdAndDelete(notificationId);
    logger.info(`Notification ${notificationId} deleted`);
  } catch (error) {
    logger.error('Error deleting notification:', error);
    throw error;
  }
}

/**
 * Delete multiple notifications
 */
async function deleteMultiple(notificationIds) {
  try {
    const result = await Notification.deleteMany({
      _id: { $in: notificationIds }
    });
    return result;
  } catch (error) {
    logger.error('Error deleting multiple notifications:', error);
    throw error;
  }
}

/**
 * Create purchase success notification
 */
async function notifyPurchaseSuccess(userId, purchaseData) {
  try {
    const notification = await createNotification({
      userId,
      type: 'purchase_success',
      title: 'Purchase Successful!',
      message: `You successfully purchased "${purchaseData.contentTitle}"`,
      icon: 'success',
      actionUrl: `/library/${purchaseData.contentId}`,
      metadata: {
        contentId: purchaseData.contentId,
        contentTitle: purchaseData.contentTitle,
        price: purchaseData.price,
        transactionId: purchaseData.transactionId
      }
    });
    return notification;
  } catch (error) {
    logger.error('Error creating purchase success notification:', error);
    throw error;
  }
}

/**
 * Create purchase error notification
 */
async function notifyPurchaseError(userId, errorData) {
  try {
    const notification = await createNotification({
      userId,
      type: 'purchase_error',
      title: 'Purchase Failed',
      message: errorData.message || 'Your purchase could not be completed. Please try again.',
      icon: 'error',
      metadata: {
        contentId: errorData.contentId,
        contentTitle: errorData.contentTitle,
        errorCode: errorData.errorCode,
        retryable: errorData.retryable || false
      }
    });
    return notification;
  } catch (error) {
    logger.error('Error creating purchase error notification:', error);
    throw error;
  }
}

/**
 * Create refund notification
 */
async function notifyRefund(userId, refundData) {
  try {
    const notification = await createNotification({
      userId,
      type: 'refund',
      title: 'Refund Processed',
      message: `Your refund for "${refundData.contentTitle}" has been processed. Amount: ${refundData.refundAmount} STX`,
      icon: 'info',
      actionUrl: '/transactions',
      metadata: {
        contentId: refundData.contentId,
        refundAmount: refundData.refundAmount,
        refundReason: refundData.reason,
        transactionId: refundData.transactionId
      }
    });
    return notification;
  } catch (error) {
    logger.error('Error creating refund notification:', error);
    throw error;
  }
}

/**
 * Create listing update notification
 */
async function notifyListingUpdate(userId, listingData) {
  try {
    const notification = await createNotification({
      userId,
      type: 'listing_update',
      title: 'Content Updated',
      message: `"${listingData.title}" has been updated`,
      icon: 'info',
      actionUrl: `/content/${listingData.contentId}`,
      metadata: {
        contentId: listingData.contentId,
        updateType: listingData.updateType // 'price_change', 'metadata_update', 'availability_change'
      }
    });
    return notification;
  } catch (error) {
    logger.error('Error creating listing update notification:', error);
    throw error;
  }
}

/**
 * Create system notification
 */
async function notifySystem(userId, systemData) {
  try {
    const notification = await createNotification({
      userId,
      type: 'system',
      title: systemData.title,
      message: systemData.message,
      icon: systemData.icon || 'info',
      actionUrl: systemData.actionUrl || null,
      metadata: systemData.metadata || {}
    });
    return notification;
  } catch (error) {
    logger.error('Error creating system notification:', error);
    throw error;
  }
}

/**
 * Clear old notifications (older than 30 days)
 */
async function clearOldNotifications(daysOld = 30) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await Notification.deleteMany({
      createdAt: { $lt: cutoffDate },
      isArchived: true
    });

    logger.info(`Cleared ${result.deletedCount} old notifications`);
    return result;
  } catch (error) {
    logger.error('Error clearing old notifications:', error);
    throw error;
  }
}

/**
 * Get notification statistics for user
 */
async function getUserNotificationStats(userId) {
  try {
    const total = await Notification.countDocuments({ userId });
    const unread = await Notification.countDocuments({ userId, isRead: false });
    const archived = await Notification.countDocuments({ userId, isArchived: true });

    const typeBreakdown = await Notification.aggregate([
      { $match: { userId } },
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);

    return {
      total,
      unread,
      archived,
      read: total - unread,
      typeBreakdown: typeBreakdown.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {})
    };
  } catch (error) {
    logger.error('Error getting notification statistics:', error);
    throw error;
  }
}

module.exports = {
  createNotification,
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markMultipleAsRead,
  markAllAsRead,
  archiveNotification,
  deleteNotification,
  deleteMultiple,
  notifyPurchaseSuccess,
  notifyPurchaseError,
  notifyRefund,
  notifyListingUpdate,
  notifySystem,
  clearOldNotifications,
  getUserNotificationStats
};
