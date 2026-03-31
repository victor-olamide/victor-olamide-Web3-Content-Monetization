/**
 * Notification Service
 * Manages user notifications for purchases, errors, and system events
 * @module services/notificationService
 */

const Notification = require('../models/Notification');
const logger = require('../utils/logger');
const UserProfile = require('../models/UserProfile');
const { sendEmail } = require('./emailService');
const { emailConfig } = require('../config/emailConfig');

/**
 * Notification data object
 * @typedef {Object} NotificationData
 * @property {string} userId - User ID to notify
 * @property {string} type - Notification type ('purchase_success', 'purchase_error', 'refund', 'listing_update', 'system')
 * @property {string} title - Notification title
 * @property {string} message - Notification message
 * @property {string} [icon] - Optional icon identifier
 * @property {string} [actionUrl] - Optional action URL
 * @property {Object} [metadata] - Optional metadata object
 */

/**
 * Create a new notification
 * @param {NotificationData} data - Notification data
 * @returns {Promise<Object>} Created notification
 * @throws {Error} When validation fails or database error occurs
 */
async function createNotification(data) {
  // Input validation
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid notification data: expected object');
  }
  if (!data.userId || typeof data.userId !== 'string') {
    throw new Error('Invalid userId: expected non-empty string');
  }
  if (!data.type || typeof data.type !== 'string') {
    throw new Error('Invalid type: expected non-empty string');
  }
  if (!data.title || typeof data.title !== 'string') {
    throw new Error('Invalid title: expected non-empty string');
  }
  if (!data.message || typeof data.message !== 'string') {
    throw new Error('Invalid message: expected non-empty string');
  }
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
 * Pagination options object
 * @typedef {Object} PaginationOptions
 * @property {number} [page=1] - Page number (default: 1)
 * @property {number} [limit=20] - Items per page (default: 20)
 * @property {boolean} [unreadOnly=false] - Filter unread only (default: false)
 * @property {string} [type] - Filter by notification type
 * @property {string} [sort='-createdAt'] - Sort order (default: '-createdAt')
 */

/**
 * Paginated notifications result
 * @typedef {Object} PaginatedNotifications
 * @property {Array<Object>} notifications - Array of notification objects
 * @property {Object} pagination - Pagination info
 * @property {number} pagination.page - Current page
 * @property {number} pagination.limit - Items per page
 * @property {number} pagination.total - Total items
 * @property {number} pagination.pages - Total pages
 */

/**
 * Get user notifications with pagination
 * @param {string} userId - User ID
 * @param {PaginationOptions} [options={}] - Pagination options
 * @returns {Promise<PaginatedNotifications>} Paginated notifications
 * @throws {Error} When userId is invalid or database error occurs
 */
async function getUserNotifications(userId, options = {}) {
  // Input validation
  if (!userId || typeof userId !== 'string') {
    throw new Error('Invalid userId: expected non-empty string');
  }
  if (options && typeof options !== 'object') {
    throw new Error('Invalid options: expected object');
  }
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
 * @param {string} userId - User ID
 * @returns {Promise<number>} Count of unread notifications
 * @throws {Error} When userId is invalid or database error occurs
 */
async function getUnreadCount(userId) {
  // Input validation
  if (!userId || typeof userId !== 'string') {
    throw new Error('Invalid userId: expected non-empty string');
  }
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
 * @param {string} notificationId - Notification ID (MongoDB ObjectId)
 * @returns {Promise<Object|null>} Updated notification or null if not found
 * @throws {Error} When notificationId is invalid or database error occurs
 */
async function markAsRead(notificationId) {
  // Input validation
  if (!notificationId || typeof notificationId !== 'string') {
    throw new Error('Invalid notificationId: expected non-empty string');
  }
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
 * @param {Array<string>} notificationIds - Array of notification IDs
 * @returns {Promise<Object>} MongoDB update result
 * @throws {Error} When notificationIds is invalid or database error occurs
 */
async function markMultipleAsRead(notificationIds) {
  // Input validation
  if (!Array.isArray(notificationIds)) {
    throw new Error('Invalid notificationIds: expected array');
  }
  if (notificationIds.length === 0) {
    throw new Error('Invalid notificationIds: expected non-empty array');
  }
  if (!notificationIds.every(id => typeof id === 'string' && id.length > 0)) {
    throw new Error('Invalid notificationIds: expected array of non-empty strings');
  }
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
 * @param {string} userId - User ID
 * @returns {Promise<Object>} MongoDB update result
 * @throws {Error} When userId is invalid or database error occurs
 */
async function markAllAsRead(userId) {
  // Input validation
  if (!userId || typeof userId !== 'string') {
    throw new Error('Invalid userId: expected non-empty string');
  }
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
 * @param {string} notificationId - Notification ID (MongoDB ObjectId)
 * @returns {Promise<Object|null>} Updated notification or null if not found
 * @throws {Error} When notificationId is invalid or database error occurs
 */
async function archiveNotification(notificationId) {
  // Input validation
  if (!notificationId || typeof notificationId !== 'string') {
    throw new Error('Invalid notificationId: expected non-empty string');
  }
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
 * @param {string} notificationId - Notification ID (MongoDB ObjectId)
 * @returns {Promise<void>}
 * @throws {Error} When notificationId is invalid or database error occurs
 */
async function deleteNotification(notificationId) {
  // Input validation
  if (!notificationId || typeof notificationId !== 'string') {
    throw new Error('Invalid notificationId: expected non-empty string');
  }
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
 * @param {Array<string>} notificationIds - Array of notification IDs
 * @returns {Promise<Object>} MongoDB delete result
 * @throws {Error} When notificationIds is invalid or database error occurs
 */
async function deleteMultiple(notificationIds) {
  // Input validation
  if (!Array.isArray(notificationIds)) {
    throw new Error('Invalid notificationIds: expected array');
  }
  if (notificationIds.length === 0) {
    return { deletedCount: 0 };
  }
  if (!notificationIds.every(id => typeof id === 'string' && id.length > 0)) {
    throw new Error('Invalid notificationIds: expected array of non-empty strings');
  }
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
 * Purchase data object
 * @typedef {Object} PurchaseData
 * @property {string} contentId - Content ID
 * @property {string} contentTitle - Content title
 * @property {number} price - Purchase price
 * @property {string} transactionId - Transaction ID
 * @property {string} [email] - User email
 * @property {string} [userEmail] - Alternative user email
 */

/**
 * Create purchase success notification
 * @param {string} userId - User ID
 * @param {PurchaseData} purchaseData - Purchase data
 * @returns {Promise<Object>} Created notification
 * @throws {Error} When userId or purchaseData is invalid
 */
async function notifyPurchaseSuccess(userId, purchaseData) {
  // Input validation
  if (!userId || typeof userId !== 'string') {
    throw new Error('Invalid userId: expected non-empty string');
  }
  if (!purchaseData || typeof purchaseData !== 'object') {
    throw new Error('Invalid purchaseData: expected object');
  }
  if (!purchaseData.contentId || typeof purchaseData.contentId !== 'string') {
    throw new Error('Invalid purchaseData.contentId: expected non-empty string');
  }
  if (!purchaseData.contentTitle || typeof purchaseData.contentTitle !== 'string') {
    throw new Error('Invalid purchaseData.contentTitle: expected non-empty string');
  }
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
      // Attempt to send an email notification if email is available and user prefers
      try {
        const profile = userId ? await UserProfile.findOne({ address: userId }) : null;
        const allowEmail = profile ? (profile.preferences && profile.preferences.emailNotifications) : true;
        const toEmail = purchaseData.email || purchaseData.userEmail || (profile && (profile.email || profile.contactEmail));

        if (emailConfig.enabled && toEmail && allowEmail) {
          const subject = emailConfig.templates.purchase.subject;
          const text = emailConfig.templates.purchase.body({
            userName: profile && (profile.displayName || profile.username) ? (profile.displayName || profile.username) : undefined,
            itemName: purchaseData.contentTitle,
            transactionId: purchaseData.transactionId
          });
          await sendEmail({ to: toEmail, subject, text });
        }
      } catch (emailErr) {
        logger.error('Error sending purchase email notification:', emailErr);
      }

      return notification;
  } catch (error) {
    logger.error('Error creating purchase success notification:', error);
    throw error;
  }
}

  /**
   * Send a subscription email notification (best-effort)
   */
  async function sendSubscriptionEmail(userId, subscriptionData) {
    try {
      const profile = userId ? await UserProfile.findOne({ address: userId }) : null;
      const allowEmail = profile ? (profile.preferences && profile.preferences.emailNotifications) : true;
      const toEmail = subscriptionData.email || subscriptionData.userEmail || (profile && (profile.email || profile.contactEmail));

      if (!emailConfig.enabled) return { success: false, error: 'Email disabled' };
      if (!toEmail) return { success: false, error: 'No recipient email available' };
      if (!allowEmail) return { success: false, error: 'User opted out of email notifications' };

      const subject = emailConfig.templates.subscription.subject;
      const text = emailConfig.templates.subscription.body({
        userName: profile && (profile.displayName || profile.username) ? (profile.displayName || profile.username) : undefined,
        planName: subscriptionData.planName,
        subscriptionId: subscriptionData.subscriptionId
      });

      const result = await sendEmail({ to: toEmail, subject, text });
      return { success: true, result };
    } catch (error) {
      logger.error('Error sending subscription email:', error);
      return { success: false, error: error.message };
    }
  }

/**
 * Error data object
 * @typedef {Object} ErrorData
 * @property {string} [contentId] - Content ID
 * @property {string} [contentTitle] - Content title
 * @property {string} [errorCode] - Error code
 * @property {boolean} [retryable] - Whether the error is retryable
 * @property {string} [message] - Error message
 */

/**
 * Create purchase error notification
 * @param {string} userId - User ID
 * @param {ErrorData} errorData - Error data
 * @returns {Promise<Object>} Created notification
 * @throws {Error} When userId is invalid
 */
async function notifyPurchaseError(userId, errorData) {
  // Input validation
  if (!userId || typeof userId !== 'string') {
    throw new Error('Invalid userId: expected non-empty string');
  }
  if (errorData && typeof errorData !== 'object') {
    throw new Error('Invalid errorData: expected object');
  }
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
 * Refund data object
 * @typedef {Object} RefundData
 * @property {string} contentId - Content ID
 * @property {string} contentTitle - Content title
 * @property {number} refundAmount - Refund amount
 * @property {string} [reason] - Refund reason
 * @property {string} [transactionId] - Transaction ID
 */

/**
 * Create refund notification
 * @param {string} userId - User ID
 * @param {RefundData} refundData - Refund data
 * @returns {Promise<Object>} Created notification
 * @throws {Error} When userId or refundData is invalid
 */
async function notifyRefund(userId, refundData) {
  // Input validation
  if (!userId || typeof userId !== 'string') {
    throw new Error('Invalid userId: expected non-empty string');
  }
  if (!refundData || typeof refundData !== 'object') {
    throw new Error('Invalid refundData: expected object');
  }
  if (!refundData.contentId || typeof refundData.contentId !== 'string') {
    throw new Error('Invalid refundData.contentId: expected non-empty string');
  }
  if (!refundData.contentTitle || typeof refundData.contentTitle !== 'string') {
    throw new Error('Invalid refundData.contentTitle: expected non-empty string');
  }
  if (typeof refundData.refundAmount !== 'number') {
    throw new Error('Invalid refundData.refundAmount: expected number');
  }
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
