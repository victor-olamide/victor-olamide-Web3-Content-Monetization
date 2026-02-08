const Subscription = require('../models/Subscription');
const ProRataRefund = require('../models/ProRataRefund');

/**
 * Calculate pro-rata refund amount based on unused subscription time
 * @param {Object} subscription - Subscription document
 * @param {Date} cancellationDate - Date of cancellation
 * @returns {Object} Refund calculation details
 */
const calculateProRataRefund = (subscription, cancellationDate = new Date()) => {
  try {
    // Validate inputs
    if (!subscription || !subscription.amount || !subscription.timestamp) {
      throw new Error('Invalid subscription data');
    }

    const startDate = new Date(subscription.timestamp);
    const expiryDate = new Date(subscription.expiry);
    const cancellation = new Date(cancellationDate);

    // Ensure cancellation date is valid
    if (cancellation < startDate) {
      throw new Error('Cancellation date cannot be before subscription start date');
    }

    if (cancellation > expiryDate) {
      throw new Error('Cancellation date cannot be after subscription expiry date');
    }

    // Calculate days
    const totalMilliseconds = expiryDate.getTime() - startDate.getTime();
    const usedMilliseconds = cancellation.getTime() - startDate.getTime();
    const unusedMilliseconds = totalMilliseconds - usedMilliseconds;

    // Convert to days (more readable)
    const totalDays = Math.ceil(totalMilliseconds / (1000 * 60 * 60 * 24));
    const usedDays = Math.floor(usedMilliseconds / (1000 * 60 * 60 * 24));
    const unusedDays = Math.ceil(unusedMilliseconds / (1000 * 60 * 60 * 24));

    // Calculate usage percentage
    const usagePercentage = (usedDays / totalDays) * 100;

    // Calculate refund amount (proportional to unused time)
    const refundAmount = (unusedDays / totalDays) * subscription.amount;

    // Round to 2 decimal places
    const refundRounded = Math.round(refundAmount * 100) / 100;

    return {
      eligible: true,
      originalAmount: subscription.amount,
      refundAmount: refundRounded,
      totalDays,
      usedDays,
      unusedDays,
      usagePercentage: Math.round(usagePercentage * 100) / 100,
      refundPercentage: Math.round(((unusedDays / totalDays) * 100) * 100) / 100,
      startDate,
      expiryDate,
      cancellationDate: cancellation,
      breakdown: {
        message: `Subscription used for ${usedDays} of ${totalDays} days (${usagePercentage.toFixed(1)}%)`,
        refundMessage: `Refund for ${unusedDays} unused days: $${refundRounded.toFixed(2)}`
      }
    };
  } catch (error) {
    throw new Error(`Pro-rata refund calculation failed: ${error.message}`);
  }
};

/**
 * Check if subscription is within refund window
 * @param {Object} subscription - Subscription document
 * @param {Date} cancellationDate - Date of cancellation
 * @returns {Object} Eligibility details
 */
const checkRefundEligibility = (subscription, cancellationDate = new Date()) => {
  try {
    const startDate = new Date(subscription.timestamp);
    const refundWindowDays = subscription.refundWindowDays || 30;
    const refundWindowDeadline = new Date(startDate.getTime() + refundWindowDays * 24 * 60 * 60 * 1000);
    const cancellation = new Date(cancellationDate);

    return {
      isEligible: cancellation <= refundWindowDeadline && subscription.refundEligible,
      withinWindow: cancellation <= refundWindowDeadline,
      refundEnabled: subscription.refundEligible,
      refundWindowDeadline,
      daysUntilDeadline: Math.ceil((refundWindowDeadline - cancellation) / (1000 * 60 * 60 * 24)),
      reason: cancellation > refundWindowDeadline ? 
        `Cancellation is outside ${refundWindowDays}-day refund window` : 
        !subscription.refundEligible ? 
        'Refunds not available for this subscription' : 
        'Eligible for pro-rata refund'
    };
  } catch (error) {
    throw new Error(`Refund eligibility check failed: ${error.message}`);
  }
};

/**
 * Initiate subscription cancellation with pro-rata refund
 * @param {string} subscriptionId - Subscription ID
 * @param {Object} options - Cancellation options
 * @returns {Promise<Object>} Result with refund details
 */
const cancelSubscriptionWithRefund = async (subscriptionId, options = {}) => {
  try {
    const {
      reason = 'User requested cancellation',
      cancellationDate = new Date(),
      refundMethod = 'blockchain',
      initiatedBy = 'user'
    } = options;

    // Find subscription
    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      return {
        success: false,
        message: 'Subscription not found',
        subscriptionId
      };
    }

    // Check if already cancelled
    if (subscription.cancelledAt) {
      return {
        success: false,
        message: 'Subscription is already cancelled',
        cancelledAt: subscription.cancelledAt
      };
    }

    // Check refund eligibility
    const eligibility = checkRefundEligibility(subscription, cancellationDate);

    // Calculate refund
    let refundData = null;
    if (eligibility.isEligible) {
      try {
        refundData = calculateProRataRefund(subscription, cancellationDate);
      } catch (error) {
        return {
          success: false,
          message: 'Failed to calculate refund',
          error: error.message
        };
      }
    }

    // Create pro-rata refund record
    let proRataRefund = null;
    if (refundData) {
      proRataRefund = await ProRataRefund.create({
        subscriptionId: subscription._id,
        userId: subscription.user,
        creatorId: subscription.creator,
        originalAmount: refundData.originalAmount,
        originalStartDate: refundData.startDate,
        originalExpiryDate: refundData.expiryDate,
        actualCancellationDate: cancellationDate,
        totalDays: refundData.totalDays,
        usedDays: refundData.usedDays,
        unusedDays: refundData.unusedDays,
        usagePercentage: refundData.usagePercentage,
        refundAmount: refundData.refundAmount,
        refundReason: reason,
        refundMethod,
        refundStatus: 'pending'
      });
    }

    // Update subscription
    subscription.cancelledAt = cancellationDate;
    subscription.cancelReason = reason;
    subscription.isRefundApplied = refundData ? true : false;
    subscription.refundEligible = eligibility.isEligible;
    subscription.proRataRefundId = proRataRefund ? proRataRefund._id : null;
    subscription.cancellationDetails = {
      reason,
      initiatedBy,
      requestedAt: new Date(),
      effectiveDate: cancellationDate
    };

    await subscription.save();

    return {
      success: true,
      message: 'Subscription cancelled successfully',
      subscription: {
        _id: subscription._id,
        status: 'cancelled',
        cancelledAt: subscription.cancelledAt
      },
      refund: refundData ? {
        eligible: true,
        amount: refundData.refundAmount,
        method: refundMethod,
        breakdown: refundData.breakdown,
        refundId: proRataRefund._id
      } : {
        eligible: false,
        amount: 0,
        reason: eligibility.reason
      }
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to cancel subscription',
      error: error.message
    };
  }
};

/**
 * Get pro-rata refund details
 * @param {string} refundId - Pro-rata refund ID
 * @returns {Promise<Object>} Refund details
 */
const getProRataRefundDetails = async (refundId) => {
  try {
    const refund = await ProRataRefund.findById(refundId);
    if (!refund) {
      return {
        success: false,
        message: 'Refund not found'
      };
    }

    return {
      success: true,
      refund: {
        _id: refund._id,
        subscriptionId: refund.subscriptionId,
        originalAmount: refund.originalAmount,
        refundAmount: refund.refundAmount,
        refundPercentage: refund.refundPercentage,
        refundStatus: refund.refundStatus,
        usedDays: refund.usedDays,
        unusedDays: refund.unusedDays,
        totalDays: refund.totalDays,
        cancellationDate: refund.actualCancellationDate,
        processedAt: refund.processedAt,
        transactionId: refund.transactionId
      }
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to retrieve refund details',
      error: error.message
    };
  }
};

/**
 * Approve pro-rata refund for processing
 * @param {string} refundId - Pro-rata refund ID
 * @param {string} approvedBy - Admin ID
 * @returns {Promise<Object>} Updated refund
 */
const approveProRataRefund = async (refundId, approvedBy = 'system') => {
  try {
    const refund = await ProRataRefund.findById(refundId);
    if (!refund) {
      return {
        success: false,
        message: 'Refund not found'
      };
    }

    if (refund.refundStatus !== 'pending') {
      return {
        success: false,
        message: `Refund cannot be approved. Current status: ${refund.refundStatus}`
      };
    }

    refund.refundStatus = 'approved';
    refund.processedBy = approvedBy;
    refund.processedAt = new Date();

    await refund.save();

    return {
      success: true,
      message: 'Refund approved successfully',
      refund
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to approve refund',
      error: error.message
    };
  }
};

/**
 * Mark pro-rata refund as completed
 * @param {string} refundId - Pro-rata refund ID
 * @param {string} transactionId - Blockchain transaction ID
 * @param {number} blockHeight - Block height (optional)
 * @returns {Promise<Object>} Result
 */
const completeProRataRefund = async (refundId, transactionId, blockHeight = null) => {
  try {
    const refund = await ProRataRefund.findById(refundId);
    if (!refund) {
      return {
        success: false,
        message: 'Refund not found'
      };
    }

    if (refund.refundStatus !== 'approved' && refund.refundStatus !== 'processing') {
      return {
        success: false,
        message: `Refund cannot be completed. Current status: ${refund.refundStatus}`
      };
    }

    await refund.markAsCompleted(transactionId, blockHeight, new Date());

    return {
      success: true,
      message: 'Refund completed successfully',
      refund
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to complete refund',
      error: error.message
    };
  }
};

/**
 * Reject pro-rata refund
 * @param {string} refundId - Pro-rata refund ID
 * @param {string} reason - Rejection reason
 * @returns {Promise<Object>} Result
 */
const rejectProRataRefund = async (refundId, reason = 'No reason provided') => {
  try {
    const refund = await ProRataRefund.findById(refundId);
    if (!refund) {
      return {
        success: false,
        message: 'Refund not found'
      };
    }

    if (refund.refundStatus !== 'pending') {
      return {
        success: false,
        message: `Refund cannot be rejected. Current status: ${refund.refundStatus}`
      };
    }

    refund.refundStatus = 'rejected';
    refund.failureReason = reason;
    refund.processedAt = new Date();

    await refund.save();

    return {
      success: true,
      message: 'Refund rejected',
      refund
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to reject refund',
      error: error.message
    };
  }
};

/**
 * Get all pending refunds for a creator
 * @param {string} creatorId - Creator ID
 * @returns {Promise<Array>} Pending refunds
 */
const getPendingRefundsForCreator = async (creatorId) => {
  try {
    const refunds = await ProRataRefund.find({
      creatorId,
      refundStatus: 'pending'
    }).sort({ createdAt: -1 });

    return {
      success: true,
      creatorId,
      totalPending: refunds.length,
      refunds
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to retrieve pending refunds',
      error: error.message
    };
  }
};

/**
 * Get all refunds for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} User refunds
 */
const getUserRefunds = async (userId) => {
  try {
    const refunds = await ProRataRefund.find({ userId }).sort({ createdAt: -1 });

    const summary = {
      total: refunds.length,
      pending: refunds.filter(r => r.refundStatus === 'pending').length,
      approved: refunds.filter(r => r.refundStatus === 'approved').length,
      completed: refunds.filter(r => r.refundStatus === 'completed').length,
      rejected: refunds.filter(r => r.refundStatus === 'rejected').length,
      totalRefunded: refunds
        .filter(r => r.refundStatus === 'completed')
        .reduce((sum, r) => sum + r.refundAmount, 0)
    };

    return {
      success: true,
      userId,
      summary,
      refunds
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to retrieve user refunds',
      error: error.message
    };
  }
};

/**
 * Get refund statistics
 * @param {Object} filters - Filter options
 * @returns {Promise<Object>} Statistics
 */
const getRefundStatistics = async (filters = {}) => {
  try {
    const { creatorId, status, dateFrom, dateTo } = filters;

    let query = {};
    if (creatorId) query.creatorId = creatorId;
    if (status) query.refundStatus = status;
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    const refunds = await ProRataRefund.find(query);

    const statistics = {
      totalRefunds: refunds.length,
      byStatus: {
        pending: refunds.filter(r => r.refundStatus === 'pending').length,
        approved: refunds.filter(r => r.refundStatus === 'approved').length,
        processing: refunds.filter(r => r.refundStatus === 'processing').length,
        completed: refunds.filter(r => r.refundStatus === 'completed').length,
        failed: refunds.filter(r => r.refundStatus === 'failed').length,
        rejected: refunds.filter(r => r.refundStatus === 'rejected').length
      },
      totalAmount: {
        requested: refunds.reduce((sum, r) => sum + r.refundAmount, 0),
        completed: refunds
          .filter(r => r.refundStatus === 'completed')
          .reduce((sum, r) => sum + r.refundAmount, 0)
      },
      averageRefund: refunds.length > 0 
        ? (refunds.reduce((sum, r) => sum + r.refundAmount, 0) / refunds.length).toFixed(2)
        : 0,
      averageRefundPercentage: refunds.length > 0
        ? (refunds.reduce((sum, r) => sum + r.refundPercentage, 0) / refunds.length).toFixed(2)
        : 0
    };

    return {
      success: true,
      statistics
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to retrieve statistics',
      error: error.message
    };
  }
};

module.exports = {
  calculateProRataRefund,
  checkRefundEligibility,
  cancelSubscriptionWithRefund,
  getProRataRefundDetails,
  approveProRataRefund,
  completeProRataRefund,
  rejectProRataRefund,
  getPendingRefundsForCreator,
  getUserRefunds,
  getRefundStatistics
};
