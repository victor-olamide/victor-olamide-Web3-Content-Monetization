// Subscription Tier Logger
// Provides comprehensive logging for tier operations

const logger = require('./logger');

class SubscriptionTierLogger {
  constructor(serviceName = 'SubscriptionTierService') {
    this.serviceName = serviceName;
  }

  /**
   * Log tier creation
   */
  logTierCreated(tierId, creatorId, tierData) {
    logger.info(`[${this.serviceName}] Tier created: ${tierId}`, {
      tierId,
      creatorId,
      tierName: tierData.name,
      price: tierData.price,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log tier update
   */
  logTierUpdated(tierId, updatedFields) {
    logger.info(`[${this.serviceName}] Tier updated: ${tierId}`, {
      tierId,
      updatedFields: Object.keys(updatedFields),
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log tier deletion
   */
  logTierDeleted(tierId, hardDelete = false) {
    logger.info(`[${this.serviceName}] Tier deleted: ${tierId}`, {
      tierId,
      hardDelete,
      deleteType: hardDelete ? 'permanent' : 'soft',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log tier retrieval
   */
  logTierFetched(tierId, source = 'direct') {
    logger.debug(`[${this.serviceName}] Tier fetched: ${tierId}`, {
      tierId,
      source,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log creator tiers retrieval
   */
  logCreatorTiersFetched(creatorId, count, options = {}) {
    logger.debug(`[${this.serviceName}] Creator tiers fetched: ${creatorId}`, {
      creatorId,
      tierCount: count,
      options,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log error in operation
   */
  logError(operation, tierId, error) {
    logger.error(`[${this.serviceName}] Error in ${operation}: ${tierId}`, {
      operation,
      tierId,
      errorMessage: error.message,
      errorStack: error.stack,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log purchase recorded
   */
  logPurchaseRecorded(tierId, amount) {
    logger.info(`[${this.serviceName}] Purchase recorded for tier: ${tierId}`, {
      tierId,
      amount,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log cancellation recorded
   */
  logCancellationRecorded(tierId) {
    logger.info(`[${this.serviceName}] Cancellation recorded for tier: ${tierId}`, {
      tierId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log tier reordering
   */
  logTiersReordered(creatorId, tierCount) {
    logger.info(`[${this.serviceName}] Tiers reordered for creator: ${creatorId}`, {
      creatorId,
      tierCount,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log tier status change
   */
  logTierStatusChanged(tierId, status, newValue) {
    logger.info(`[${this.serviceName}] Tier status changed: ${tierId}`, {
      tierId,
      status,
      newValue,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log validation failure
   */
  logValidationFailure(operation, reason, details = {}) {
    logger.warn(`[${this.serviceName}] Validation failed in ${operation}`, {
      operation,
      reason,
      details,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log tier hierarchy retrieved
   */
  logHierarchyRetrieved(creatorId, tierCount, totalRevenue) {
    logger.debug(`[${this.serviceName}] Hierarchy retrieved for creator: ${creatorId}`, {
      creatorId,
      tierCount,
      totalRevenue,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log statistics retrieved
   */
  logStatisticsRetrieved(creatorId, stats) {
    logger.debug(`[${this.serviceName}] Statistics retrieved for creator: ${creatorId}`, {
      creatorId,
      ...stats,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log performance metric
   */
  logPerformanceMetric(operation, duration) {
    logger.debug(`[${this.serviceName}] Performance metric: ${operation}`, {
      operation,
      durationMs: duration,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log bulk operation
   */
  logBulkOperation(operation, itemCount, details = {}) {
    logger.info(`[${this.serviceName}] Bulk operation: ${operation}`, {
      operation,
      itemCount,
      details,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log authorization check
   */
  logAuthorizationCheck(tierId, userId, allowed, reason = '') {
    const logLevel = allowed ? 'debug' : 'warn';
    logger.log(logLevel, `[${this.serviceName}] Authorization check for tier: ${tierId}`, {
      tierId,
      userId,
      allowed,
      reason,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log duplicate tier name detection
   */
  logDuplicateTierName(creatorId, tierName) {
    logger.warn(`[${this.serviceName}] Duplicate tier name detected: ${tierName}`, {
      creatorId,
      tierName,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log purchase recorded
   */
  logPurchaseRecorded(tierId, amount) {
    logger.info(`[${this.serviceName}] Purchase recorded for tier: ${tierId}`, {
      tierId,
      amount,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log cancellation recorded
   */
  logCancellationRecorded(tierId) {
    logger.info(`[${this.serviceName}] Cancellation recorded for tier: ${tierId}`, {
      tierId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log creator tiers fetched
   */
  logCreatorTiersFetched(creatorId, tierCount, options = {}) {
    logger.debug(`[${this.serviceName}] Creator tiers fetched: ${creatorId}`, {
      creatorId,
      tierCount,
      options,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log tier archived
   */
  logTierArchived(tierId) {
    logger.info(`[${this.serviceName}] Tier archived: ${tierId}`, {
      tierId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log tier unarchived
   */
  logTierUnarchived(tierId) {
    logger.info(`[${this.serviceName}] Tier unarchived: ${tierId}`, {
      tierId,
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = SubscriptionTierLogger;
