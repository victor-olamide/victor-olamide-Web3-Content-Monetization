/**
 * Moderation Notification Service
 * Handles notifications for moderation actions to creators, moderators, and admins
 */

const emailService = require('./emailService');
const notificationService = require('./notificationService');

class ModerationNotificationService {
  /**
   * Notify creator of flag submission
   */
  async notifyCreatorOfFlag(contentId, creator, flagDetails) {
    try {
      const subject = 'Your content has been reported';
      const message = `Content "${flagDetails.contentTitle}" has been reported for ${flagDetails.reason}.`;
      const details = {
        contentId,
        reason: flagDetails.reason,
        severity: flagDetails.severity,
        reviewLink: `/content/${contentId}/review`
      };

      // Send notification in-app
      if (notificationService) {
        await notificationService.createNotification({
          userId: creator,
          type: 'content-flagged',
          title: subject,
          message,
          data: details,
          priority: 'high'
        });
      }

      // Send email if severity is high or critical
      if (flagDetails.severity === 'high' || flagDetails.severity === 'critical') {
        await emailService.sendEmail({
          to: creator.email,
          subject,
          template: 'content-flagged',
          data: {
            contentTitle: flagDetails.contentTitle,
            reason: flagDetails.reason,
            reviewLink: details.reviewLink,
            severity: flagDetails.severity
          }
        });
      }

      return { notified: true };
    } catch (error) {
      console.error('Error notifying creator of flag:', error);
      // Don't throw - notifications shouldn't block operations
    }
  }

  /**
   * Notify moderator of new queue item
   */
  async notifyModeratorOfQueueItem(moderatorId, queueData) {
    try {
      const subject = `New moderation queue item (Priority: ${queueData.priority}/5)`;
      const message = `${queueData.flagCount} flag(s) for content "${queueData.contentTitle}"`;
      const details = {
        queueId: queueData.queueId,
        contentId: queueData.contentId,
        severity: queueData.severity,
        priority: queueData.priority,
        flagCount: queueData.flagCount,
        reviewLink: `/moderation/queue/${queueData.queueId}`
      };

      // Send notification
      if (notificationService) {
        await notificationService.createNotification({
          userId: moderatorId,
          type: 'queue-item-assigned',
          title: subject,
          message,
          data: details,
          priority: queueData.priority >= 4 ? 'urgent' : 'high'
        });
      }

      return { notified: true };
    } catch (error) {
      console.error('Error notifying moderator:', error);
    }
  }

  /**
   * Notify creator of content approval
   */
  async notifyCreatorOfApproval(creator, contentData) {
    try {
      const subject = 'Update on your reported content';
      const message = `Content "${contentData.contentTitle}" has been reviewed and approved.`;
      const details = {
        contentId: contentData.contentId,
        status: 'approved'
      };

      // Send notification
      if (notificationService) {
        await notificationService.createNotification({
          userId: creator,
          type: 'moderation-approved',
          title: subject,
          message,
          data: details,
          priority: 'medium'
        });
      }

      // Send email
      if (creator.email) {
        await emailService.sendEmail({
          to: creator.email,
          subject,
          template: 'moderation-approved',
          data: {
            contentTitle: contentData.contentTitle,
            status: 'approved'
          }
        });
      }

      return { notified: true };
    } catch (error) {
      console.error('Error notifying creator of approval:', error);
    }
  }

  /**
   * Notify creator of content removal
   */
  async notifyCreatorOfRemoval(creator, contentData, removalReason, appealDeadline) {
    try {
      const subject = 'Your content has been removed';
      const message = `Content "${contentData.contentTitle}" was removed for violating our policies (${removalReason}).`;
      const details = {
        contentId: contentData.contentId,
        reason: removalReason,
        appealDeadline,
        appealLink: `/moderation/appeal/${contentData.contentId}`,
        supportLink: '/support'
      };

      // Send notification
      if (notificationService) {
        await notificationService.createNotification({
          userId: creator,
          type: 'content-removed',
          title: subject,
          message,
          data: details,
          priority: 'urgent'
        });
      }

      // Send email
      if (creator.email) {
        await emailService.sendEmail({
          to: creator.email,
          subject,
          template: 'content-removed',
          data: {
            contentTitle: contentData.contentTitle,
            reason: removalReason,
            appealDeadline: new Date(appealDeadline).toLocaleDateString(),
            appealLink: details.appealLink,
            supportLink: details.supportLink
          }
        });
      }

      return { notified: true };
    } catch (error) {
      console.error('Error notifying creator of removal:', error);
    }
  }

  /**
   * Notify creator of appeal decision
   */
  async notifyCreatorOfAppealDecision(creator, contentData, decision, notes) {
    try {
      const subject = `Your appeal has been ${decision === 'approved' ? 'approved' : 'rejected'}`;
      const message = decision === 'approved'
        ? `Your appeal for "${contentData.contentTitle}" has been approved. Your content will be restored.`
        : `Your appeal for "${contentData.contentTitle}" was not approved after review.`;
      
      const details = {
        contentId: contentData.contentId,
        decision,
        notes,
        supportLink: '/support'
      };

      // Send notification
      if (notificationService) {
        await notificationService.createNotification({
          userId: creator,
          type: `appeal-${decision}`,
          title: subject,
          message,
          data: details,
          priority: 'high'
        });
      }

      // Send email
      if (creator.email) {
        await emailService.sendEmail({
          to: creator.email,
          subject,
          template: `appeal-${decision}`,
          data: {
            contentTitle: contentData.contentTitle,
            decision,
            notes,
            supportLink: details.supportLink
          }
        });
      }

      return { notified: true };
    } catch (error) {
      console.error('Error notifying creator of appeal decision:', error);
    }
  }

  /**
   * Notify admin of high-severity content
   */
  async notifyAdminOfHighSeverity(adminIds, queueData) {
    try {
      const subject = `URGENT: High severity content - ${queueData.contentTitle}`;
      const message = `Critical severity flag(s) detected on content "${queueData.contentTitle}"`;
      const details = {
        queueId: queueData.queueId,
        contentId: queueData.contentId,
        severity: queueData.severity,
        flagCount: queueData.flagCount,
        reasons: queueData.tags || [],
        reviewLink: `/moderation/queue/${queueData.queueId}`
      };

      // Send notifications to all admins
      for (const adminId of adminIds) {
        if (notificationService) {
          await notificationService.createNotification({
            userId: adminId,
            type: 'high-severity-alert',
            title: subject,
            message,
            data: details,
            priority: 'urgent'
          });
        }
      }

      return { notified: true };
    } catch (error) {
      console.error('Error notifying admin of high severity:', error);
    }
  }

  /**
   * Send moderation summary report
   */
  async sendModerationSummary(moderatorId, summaryData) {
    try {
      const subject = 'Weekly Moderation Summary';
      const details = {
        itemsReviewed: summaryData.itemsReviewed,
        approvalsCount: summaryData.approvalsCount,
        removalsCount: summaryData.removalsCount,
        pendingCount: summaryData.pendingCount,
        averageReviewTime: summaryData.averageReviewTime,
        topReasons: summaryData.topReasons
      };

      // Send email with summary
      const moderator = await require('../models/User').findById(moderatorId);
      if (moderator && moderator.email) {
        await emailService.sendEmail({
          to: moderator.email,
          subject,
          template: 'moderation-summary',
          data: details
        });
      }

      return { sent: true };
    } catch (error) {
      console.error('Error sending moderation summary:', error);
    }
  }

  /**
   * Notify about auto-flagged content
   */
  async notifyAboutAutoFlaggedContent(contentData, filterResult) {
    try {
      const summary = `Auto-flagged for: ${filterResult.assessment.reasons.join(', ')}`;

      // Notify admins
      const adminIds = []; // Should be fetched from a proper source
      const subject = `Auto-flagged content: ${contentData.title}`;
      const details = {
        contentId: contentData.contentId,
        title: contentData.title,
        risks: filterResult.assessment.risk_level,
        reasons: filterResult.assessment.reasons,
        confidence: filterResult.assessment.confidence,
        reviewLink: `/moderation/queue`
      };

      if (notificationService) {
        for (const adminId of adminIds) {
          await notificationService.createNotification({
            userId: adminId,
            type: 'auto-flagged-content',
            title: subject,
            message: summary,
            data: details,
            priority: filterResult.assessment.risk_level === 'critical' ? 'urgent' : 'high'
          });
        }
      }

      return { notified: true };
    } catch (error) {
      console.error('Error notifying about auto-flagged content:', error);
    }
  }

  /**
   * Batch notify users
   */
  async batchNotifyUsers(userIds, notification) {
    try {
      const results = [];

      for (const userId of userIds) {
        try {
          if (notificationService) {
            const result = await notificationService.createNotification({
              userId,
              type: notification.type,
              title: notification.title,
              message: notification.message,
              data: notification.data,
              priority: notification.priority || 'normal'
            });
            results.push({ userId, success: true, result });
          }
        } catch (error) {
          console.error(`Error notifying user ${userId}:`, error);
          results.push({ userId, success: false, error: error.message });
        }
      }

      return results;
    } catch (error) {
      console.error('Error in batch notification:', error);
      throw error;
    }
  }
}

module.exports = new ModerationNotificationService();
