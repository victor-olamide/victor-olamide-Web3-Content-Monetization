const ModerationQueue = require('../models/ModerationQueue');
const ModerationFlag = require('../models/ModerationFlag');
const moderationNotificationService = require('./moderationNotificationService');
const moderationAuditLoggingService = require('./moderationAuditLoggingService');

class ModerationEscalationService {
  constructor() {
    this.escalationRules = [
      {
        name: 'high_severity_auto_escalate',
        condition: (flag) => flag.severity === 'critical',
        action: 'escalate_to_admin',
        priority: 1
      },
      {
        name: 'multiple_flags_escalate',
        condition: (flag) => flag.flagCount >= 5,
        action: 'escalate_to_admin',
        priority: 2
      },
      {
        name: 'violent_content_escalate',
        condition: (flag) => flag.category === 'violence' && flag.severity === 'high',
        action: 'escalate_to_legal',
        priority: 1
      },
      {
        name: 'copyrighted_content_escalate',
        condition: (flag) => flag.category === 'copyright',
        action: 'escalate_to_legal',
        priority: 1
      },
      {
        name: 'illegal_content_escalate',
        condition: (flag) => flag.reason === 'illegal_content' || flag.reason === 'child_safety',
        action: 'escalate_to_legal',
        priority: 1
      },
      {
        name: 'overdue_review_escalate',
        condition: (queueEntry) => this._isReviewOverdue(queueEntry),
        action: 'escalate_to_supervisor',
        priority: 3
      }
    ];
  }

  /**
   * Check if content should be escalated based on rules
   */
  async checkEscalationRules(contentItem) {
    try {
      const applicableRules = [];

      for (const rule of this.escalationRules) {
        try {
          if (rule.condition(contentItem)) {
            applicableRules.push(rule);
          }
        } catch (err) {
          // Continue checking other rules
          continue;
        }
      }

      if (applicableRules.length > 0) {
        // Sort by priority (lower number = higher priority)
        applicableRules.sort((a, b) => a.priority - b.priority);
        return applicableRules[0]; // Return highest priority rule
      }

      return null;
    } catch (error) {
      throw new Error(`Escalation check failed: ${error.message}`);
    }
  }

  /**
   * Escalate content to admin level
   */
  async escalateToAdmin(queueId, reason, escalatedBy) {
    try {
      const queueEntry = await ModerationQueue.findById(queueId);
      if (!queueEntry) {
        throw new Error('Queue entry not found');
      }

      queueEntry.escalationLevel = 'admin';
      queueEntry.escalationReason = reason;
      queueEntry.escalatedBy = escalatedBy;
      queueEntry.escalatedAt = new Date();
      queueEntry.status = 'escalated';
      await queueEntry.save();

      // Notify admin team
      await moderationNotificationService.notifyAdminOfEscalation(
        queueId,
        'admin',
        reason,
        'critical'
      );

      // Log escalation
      await moderationAuditLoggingService.logEscalation(
        queueId,
        escalatedBy,
        'admin',
        reason
      );

      return { success: true, escalationLevel: 'admin' };
    } catch (error) {
      throw new Error(`Admin escalation failed: ${error.message}`);
    }
  }

  /**
   * Escalate to legal team (for copyright, illegal content, etc.)
   */
  async escalateToLegal(queueId, reason, escalatedBy, legalCategory = 'unknown') {
    try {
      const queueEntry = await ModerationQueue.findById(queueId);
      if (!queueEntry) {
        throw new Error('Queue entry not found');
      }

      queueEntry.escalationLevel = 'legal';
      queueEntry.escalationReason = reason;
      queueEntry.legalCategory = legalCategory;
      queueEntry.escalatedBy = escalatedBy;
      queueEntry.escalatedAt = new Date();
      queueEntry.status = 'escalated_legal';
      await queueEntry.save();

      // Notify legal team
      await moderationNotificationService.notifyLegalTeamOfEscalation(
        queueId,
        reason,
        legalCategory
      );

      // Log escalation
      await moderationAuditLoggingService.logEscalation(
        queueId,
        escalatedBy,
        'legal',
        reason,
        { legalCategory }
      );

      return { success: true, escalationLevel: 'legal' };
    } catch (error) {
      throw new Error(`Legal escalation failed: ${error.message}`);
    }
  }

  /**
   * Escalate to supervisor for deadline review
   */
  async escalateToSupervisor(queueId, reason, escalatedBy) {
    try {
      const queueEntry = await ModerationQueue.findById(queueId);
      if (!queueEntry) {
        throw new Error('Queue entry not found');
      }

      queueEntry.escalationLevel = 'supervisor';
      queueEntry.escalationReason = reason;
      queueEntry.escalatedBy = escalatedBy;
      queueEntry.escalatedAt = new Date();
      queueEntry.status = 'escalated_supervisor';
      await queueEntry.save();

      // Notify supervisor
      await moderationNotificationService.notifySupervisorOfEscalation(
        queueId,
        reason,
        queueEntry.daysPending || 0
      );

      // Log escalation
      await moderationAuditLoggingService.logEscalation(
        queueId,
        escalatedBy,
        'supervisor',
        reason
      );

      return { success: true, escalationLevel: 'supervisor' };
    } catch (error) {
      throw new Error(`Supervisor escalation failed: ${error.message}`);
    }
  }

  /**
   * Check if review is overdue
   */
  _isReviewOverdue(queueEntry) {
    const maxReviewTime = 3 * 24 * 60 * 60 * 1000; // 3 days in milliseconds
    const createdTime = new Date(queueEntry.createdAt).getTime();
    const currentTime = new Date().getTime();
    return (currentTime - createdTime) > maxReviewTime;
  }

  /**
   * Automatically escalate content based on rules
   */
  async autoEscalateContent(contentItem, escalatedBy = 'system') {
    try {
      const applicableRule = await this.checkEscalationRules(contentItem);
      
      if (!applicableRule) {
        return { escalated: false, reason: 'No escalation rules matched' };
      }

      let result;
      const reason = `Auto-escalation: ${applicableRule.name}`;

      switch (applicableRule.action) {
        case 'escalate_to_admin':
          result = await this.escalateToAdmin(contentItem._id, reason, escalatedBy);
          break;
        case 'escalate_to_legal':
          const legalCategory = contentItem.category === 'copyright' ? 'copyright' : 'illegal_content';
          result = await this.escalateToLegal(
            contentItem._id,
            reason,
            escalatedBy,
            legalCategory
          );
          break;
        case 'escalate_to_supervisor':
          result = await this.escalateToSupervisor(contentItem._id, reason, escalatedBy);
          break;
        default:
          return { escalated: false, reason: 'Unknown escalation action' };
      }

      return { escalated: true, ...result };
    } catch (error) {
      throw new Error(`Auto-escalation failed: ${error.message}`);
    }
  }

  /**
   * Get escalation statistics
   */
  async getEscalationStats(timeframe = '30d') {
    try {
      const startDate = this._getStartDate(timeframe);

      const stats = await ModerationQueue.aggregate([
        {
          $match: {
            escalatedAt: { $gte: startDate },
            escalationLevel: { $exists: true, $ne: null }
          }
        },
        {
          $group: {
            _id: '$escalationLevel',
            count: { $sum: 1 }
          }
        }
      ]);

      const escalationReasons = await ModerationQueue.aggregate([
        {
          $match: {
            escalatedAt: { $gte: startDate },
            escalationLevel: { $exists: true, $ne: null }
          }
        },
        {
          $group: {
            _id: '$escalationReason',
            count: { $sum: 1 }
          }
        },
        { $limit: 10 }
      ]);

      return {
        timeframe,
        byLevel: Object.fromEntries(
          stats.map(s => [s._id, s.count])
        ),
        topReasons: escalationReasons,
        total: stats.reduce((sum, s) => sum + s.count, 0)
      };
    } catch (error) {
      throw new Error(`Failed to get escalation stats: ${error.message}`);
    }
  }

  /**
   * Get escalation history for content
   */
  async getEscalationHistory(contentId) {
    try {
      const queueEntries = await ModerationQueue.findOne({ contentId }).select(
        'escalationLevel escalationReason escalatedBy escalatedAt status'
      );

      if (!queueEntries) {
        return { history: [] };
      }

      const auditLogs = await moderationAuditLoggingService.getEscalationHistory(contentId);

      return {
        current: {
          level: queueEntries.escalationLevel,
          reason: queueEntries.escalationReason,
          escalatedBy: queueEntries.escalatedBy,
          escalatedAt: queueEntries.escalatedAt
        },
        history: auditLogs
      };
    } catch (error) {
      throw new Error(`Failed to get escalation history: ${error.message}`);
    }
  }

  /**
   * Update escalation rule
   */
  updateEscalationRule(ruleName, newCondition, newAction) {
    try {
      const ruleIndex = this.escalationRules.findIndex(r => r.name === ruleName);
      if (ruleIndex === -1) {
        throw new Error(`Rule not found: ${ruleName}`);
      }

      this.escalationRules[ruleIndex].condition = newCondition;
      this.escalationRules[ruleIndex].action = newAction;

      return { success: true, message: `Rule ${ruleName} updated` };
    } catch (error) {
      throw new Error(`Failed to update escalation rule: ${error.message}`);
    }
  }

  /**
   * Get all escalation rules
   */
  getEscalationRules() {
    return this.escalationRules.map(rule => ({
      name: rule.name,
      action: rule.action,
      priority: rule.priority
    }));
  }

  /**
   * Get start date based on timeframe
   */
  _getStartDate(timeframe) {
    const now = new Date();
    const matches = timeframe.match(/(\d+)([dhm])/);
    
    if (!matches) return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // Default 30 days

    const [, amount, unit] = matches;
    const actualAmount = parseInt(amount);

    switch (unit) {
      case 'd':
        return new Date(now.getTime() - actualAmount * 24 * 60 * 60 * 1000);
      case 'h':
        return new Date(now.getTime() - actualAmount * 60 * 60 * 1000);
      case 'm':
        return new Date(now.getTime() - actualAmount * 60 * 1000);
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }
}

module.exports = new ModerationEscalationService();
