const ModerationQueue = require('../models/ModerationQueue');
const ModerationFlag = require('../models/ModerationFlag');
const moderationService = require('./moderationService');
const moderationNotificationService = require('./moderationNotificationService');
const moderationAuditLoggingService = require('./moderationAuditLoggingService');

class ModerationBatchService {
  /**
   * Bulk approve multiple queue entries
   */
  async bulkApproveContent(queueIds, moderatorId, reason, auditMetadata = {}) {
    try {
      const results = { succeeded: [], failed: [] };
      
      for (const queueId of queueIds) {
        try {
          const queueEntry = await ModerationQueue.findById(queueId);
          if (!queueEntry) {
            results.failed.push({ queueId, error: 'Queue entry not found' });
            continue;
          }

          // Approve the content
          await moderationService.approveContent(queueId, moderatorId, reason);
          
          // Notify creator
          await moderationNotificationService.notifyCreatorOfApproval(
            queueEntry.contentId,
            queueEntry.creatorId
          );

          // Log audit
          await moderationAuditLoggingService.logModerationDecision(
            queueId,
            moderatorId,
            'approved',
            reason,
            {
              batchOperation: true,
              ...auditMetadata
            }
          );

          results.succeeded.push({ queueId, status: 'approved' });
        } catch (error) {
          results.failed.push({ queueId, error: error.message });
        }
      }

      // Log batch operation
      await moderationAuditLoggingService.logBatchOperation(
        'bulk_approve',
        moderatorId,
        {
          totalRequested: queueIds.length,
          succeeded: results.succeeded.length,
          failed: results.failed.length,
          ...auditMetadata
        }
      );

      return results;
    } catch (error) {
      throw new Error(`Batch approve failed: ${error.message}`);
    }
  }

  /**
   * Bulk reject multiple queue entries
   */
  async bulkRejectContent(queueIds, moderatorId, removalReason, auditMetadata = {}) {
    try {
      const results = { succeeded: [], failed: [] };

      for (const queueId of queueIds) {
        try {
          const queueEntry = await ModerationQueue.findById(queueId);
          if (!queueEntry) {
            results.failed.push({ queueId, error: 'Queue entry not found' });
            continue;
          }

          // Reject the content
          await moderationService.rejectContent(queueId, moderatorId, removalReason);

          // Notify creator of removal
          await moderationNotificationService.notifyCreatorOfRemoval(
            queueEntry.contentId,
            queueEntry.creatorId,
            removalReason
          );

          // Log audit
          await moderationAuditLoggingService.logModerationDecision(
            queueId,
            moderatorId,
            'rejected',
            removalReason,
            {
              batchOperation: true,
              ...auditMetadata
            }
          );

          results.succeeded.push({ queueId, status: 'rejected' });
        } catch (error) {
          results.failed.push({ queueId, error: error.message });
        }
      }

      // Log batch operation
      await moderationAuditLoggingService.logBatchOperation(
        'bulk_reject',
        moderatorId,
        {
          totalRequested: queueIds.length,
          succeeded: results.succeeded.length,
          failed: results.failed.length,
          removalReason,
          ...auditMetadata
        }
      );

      return results;
    } catch (error) {
      throw new Error(`Batch reject failed: ${error.message}`);
    }
  }

  /**
   * Bulk reassign queue entries to different moderators
   */
  async bulkAssignModerators(assignments, reassignedBy, auditMetadata = {}) {
    try {
      const results = { succeeded: [], failed: [] };

      for (const { queueId, newModeratorId } of assignments) {
        try {
          const queueEntry = await ModerationQueue.findById(queueId);
          if (!queueEntry) {
            results.failed.push({ queueId, error: 'Queue entry not found' });
            continue;
          }

          // Update assignment
          queueEntry.assignedModerator = newModeratorId;
          queueEntry.assignedAt = new Date();
          await queueEntry.save();

          // Log audit
          await moderationAuditLoggingService.logQueueAssignment(
            queueId,
            newModeratorId,
            'batch_reassignment',
            {
              previousModerator: queueEntry.assignedModerator,
              reassignedBy,
              ...auditMetadata
            }
          );

          results.succeeded.push({ queueId, moderatorId: newModeratorId });
        } catch (error) {
          results.failed.push({ queueId, error: error.message });
        }
      }

      // Log batch operation
      await moderationAuditLoggingService.logBatchOperation(
        'bulk_reassign',
        reassignedBy,
        {
          totalRequested: assignments.length,
          succeeded: results.succeeded.length,
          failed: results.failed.length,
          ...auditMetadata
        }
      );

      return results;
    } catch (error) {
      throw new Error(`Batch reassign failed: ${error.message}`);
    }
  }

  /**
   * Bulk change severity levels on multiple flags
   */
  async bulkUpdateSeverity(flagIds, newSeverity, updatedBy, auditMetadata = {}) {
    try {
      const validSeverities = ['critical', 'high', 'medium', 'low'];
      if (!validSeverities.includes(newSeverity)) {
        throw new Error(`Invalid severity: ${newSeverity}`);
      }

      const results = { succeeded: [], failed: [] };

      for (const flagId of flagIds) {
        try {
          const flag = await ModerationFlag.findById(flagId);
          if (!flag) {
            results.failed.push({ flagId, error: 'Flag not found' });
            continue;
          }

          const oldSeverity = flag.severity;
          flag.severity = newSeverity;
          flag.lastModifiedAt = new Date();
          flag.lastModifiedBy = updatedBy;
          await flag.save();

          // Log severity change
          await moderationAuditLoggingService.logFlagModification(
            flagId,
            updatedBy,
            {
              oldSeverity,
              newSeverity,
              batchOperation: true,
              ...auditMetadata
            }
          );

          results.succeeded.push({ flagId, oldSeverity, newSeverity });
        } catch (error) {
          results.failed.push({ flagId, error: error.message });
        }
      }

      // Log batch operation
      await moderationAuditLoggingService.logBatchOperation(
        'bulk_severity_update',
        updatedBy,
        {
          totalRequested: flagIds.length,
          succeeded: results.succeeded.length,
          failed: results.failed.length,
          newSeverity,
          ...auditMetadata
        }
      );

      return results;
    } catch (error) {
      throw new Error(`Batch severity update failed: ${error.message}`);
    }
  }

  /**
   * Get batch operation status and history
   */
  async getBatchOperationStatus(batchId) {
    try {
      const operation = await moderationAuditLoggingService.getBatchOperationById(batchId);
      if (!operation) {
        throw new Error('Batch operation not found');
      }
      return operation;
    } catch (error) {
      throw new Error(`Failed to retrieve batch status: ${error.message}`);
    }
  }

  /**
   * Export batch operation results
   */
  async exportBatchResults(batchId, format = 'json') {
    try {
      const operation = await this.getBatchOperationStatus(batchId);
      
      if (format === 'csv') {
        return this._formatAsCSV(operation);
      } else if (format === 'json') {
        return operation;
      } else {
        throw new Error(`Unsupported format: ${format}`);
      }
    } catch (error) {
      throw new Error(`Failed to export batch results: ${error.message}`);
    }
  }

  /**
   * Format batch results as CSV
   */
  _formatAsCSV(operation) {
    const header = ['itemId', 'status', 'result', 'error'].join(',');
    const rows = (operation.items || []).map(item => {
      return [
        item.queueId || item.flagId,
        item.status || 'pending',
        item.status === 'succeeded' ? 'success' : item.status,
        item.error || ''
      ].join(',');
    });
    return [header, ...rows].join('\n');
  }

  /**
   * Cancel ongoing batch operation
   */
  async cancelBatchOperation(batchId, cancelledBy, reason) {
    try {
      const operation = await moderationAuditLoggingService.getBatchOperationById(batchId);
      if (!operation) {
        throw new Error('Batch operation not found');
      }

      if (operation.status === 'completed') {
        throw new Error('Cannot cancel completed batch operation');
      }

      operation.status = 'cancelled';
      operation.cancelledBy = cancelledBy;
      operation.cancelReason = reason;
      operation.cancelledAt = new Date();
      await operation.save();

      return { success: true, message: 'Batch operation cancelled' };
    } catch (error) {
      throw new Error(`Failed to cancel batch operation: ${error.message}`);
    }
  }

  /**
   * Get all batch operations for a moderator
   */
  async getModeratorBatchHistory(moderatorId, limit = 50) {
    try {
      const operations = await moderationAuditLoggingService.getModeratorBatchOperations(
        moderatorId,
        limit
      );
      return operations;
    } catch (error) {
      throw new Error(`Failed to retrieve batch history: ${error.message}`);
    }
  }
}

module.exports = new ModerationBatchService();
