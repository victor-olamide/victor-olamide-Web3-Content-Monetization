// Pro-Rata Refund Helper Utilities
// Utility functions for refund calculations, formatting, and data processing

const ProRataRefund = require('../models/ProRataRefund');
const Subscription = require('../models/Subscription');

/**
 * Format refund amount with currency symbol
 * @param {number} amount - Refund amount in dollars
 * @param {string} currency - Currency code (default: USD)
 * @returns {string} Formatted currency string
 */
const formatRefundAmount = (amount, currency = 'USD') => {
  const symbol = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    CAD: 'C$',
    AUD: 'A$'
  }[currency] || '$';
  
  return `${symbol}${(amount || 0).toFixed(2)}`;
};

/**
 * Format refund percentage with decimal places
 * @param {number} percentage - Percentage value (0-100)
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted percentage string
 */
const formatRefundPercentage = (percentage, decimals = 2) => {
  return `${(percentage || 0).toFixed(decimals)}%`;
};

/**
 * Format date for display
 * @param {Date} date - Date to format
 * @param {string} format - Format type (short/long/iso)
 * @returns {string} Formatted date string
 */
const formatRefundDate = (date, format = 'short') => {
  if (!date) return 'N/A';
  
  const d = new Date(date);
  
  switch (format) {
    case 'short':
      return d.toLocaleDateString('en-US');
    case 'long':
      return d.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    case 'iso':
      return d.toISOString();
    default:
      return d.toLocaleDateString('en-US');
  }
};

/**
 * Calculate days between two dates
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {number} Number of days between dates
 */
const calculateDaysDifference = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffMs = end - start;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
};

/**
 * Validate refund amount for currency precision
 * @param {number} amount - Amount to validate
 * @returns {number} Validated amount rounded to 2 decimals
 */
const validateRefundAmount = (amount) => {
  if (isNaN(amount) || amount < 0) {
    return 0;
  }
  return parseFloat(amount.toFixed(2));
};

/**
 * Create refund summary object for API responses
 * @param {Object} refund - Refund document
 * @returns {Object} Summary object with formatted values
 */
const createRefundSummary = (refund) => {
  return {
    id: refund._id.toString(),
    subscriptionId: refund.subscriptionId.toString(),
    userId: refund.userId.toString(),
    creatorId: refund.creatorId.toString(),
    originalAmount: formatRefundAmount(refund.originalAmount),
    refundAmount: formatRefundAmount(refund.refundAmount),
    refundPercentage: formatRefundPercentage(refund.refundPercentage),
    status: refund.refundStatus,
    daysUsed: refund.usedDays,
    daysRemaining: refund.unusedDays,
    totalDays: refund.totalDays,
    createdAt: formatRefundDate(refund.createdAt, 'long'),
    cancellationDate: formatRefundDate(refund.actualCancellationDate, 'short'),
    transactionId: refund.transactionId || 'Processing...',
    method: refund.refundMethod
  };
};

/**
 * Batch format multiple refunds for API response
 * @param {Array} refunds - Array of refund documents
 * @returns {Array} Array of formatted refund summaries
 */
const batchFormatRefunds = (refunds) => {
  return (refunds || []).map(refund => createRefundSummary(refund));
};

/**
 * Generate refund breakdown message for user
 * @param {Object} subscription - Subscription document
 * @param {Date} cancellationDate - When cancelled
 * @param {number} refundAmount - Refund amount
 * @returns {string} Human-readable breakdown message
 */
const generateRefundBreakdown = (subscription, cancellationDate, refundAmount) => {
  const daysUsed = calculateDaysDifference(subscription.startDate, cancellationDate);
  const totalDays = calculateDaysDifference(subscription.startDate, subscription.expiryDate);
  const daysRemaining = totalDays - daysUsed;
  
  return {
    message: `Subscription used for ${daysUsed} of ${totalDays} days (${((daysUsed / totalDays) * 100).toFixed(1)}%)`,
    refundMessage: `Refund for ${daysRemaining} unused days: ${formatRefundAmount(refundAmount)}`
  };
};

/**
 * Check if refund is within refund window deadline
 * @param {Date} subscriptionStartDate - When subscription started
 * @param {number} refundWindowDays - Days in refund window
 * @param {Date} cancellationDate - When cancellation requested
 * @returns {Object} Object with window information
 */
const checkRefundWindow = (subscriptionStartDate, refundWindowDays, cancellationDate) => {
  const deadline = new Date(subscriptionStartDate);
  deadline.setDate(deadline.getDate() + refundWindowDays);
  
  const now = cancellationDate || new Date();
  const isWithinWindow = now <= deadline;
  const daysRemaining = calculateDaysDifference(now, deadline);
  
  return {
    deadline,
    isWithinWindow,
    daysRemaining,
    daysUsed: calculateDaysDifference(subscriptionStartDate, now)
  };
};

/**
 * Generate CSV export of refunds
 * @param {Array} refunds - Array of refund documents
 * @returns {string} CSV formatted string
 */
const generateRefundCSV = (refunds) => {
  const headers = [
    'Refund ID',
    'Subscription ID',
    'User ID',
    'Creator ID',
    'Original Amount',
    'Refund Amount',
    'Refund %',
    'Status',
    'Days Used',
    'Days Remaining',
    'Total Days',
    'Created Date',
    'Cancellation Date',
    'Transaction ID'
  ];
  
  const rows = (refunds || []).map(refund => [
    refund._id.toString(),
    refund.subscriptionId.toString(),
    refund.userId.toString(),
    refund.creatorId.toString(),
    `$${refund.originalAmount.toFixed(2)}`,
    `$${refund.refundAmount.toFixed(2)}`,
    `${(refund.refundPercentage || 0).toFixed(2)}%`,
    refund.refundStatus,
    refund.usedDays,
    refund.unusedDays,
    refund.totalDays,
    new Date(refund.createdAt).toISOString().split('T')[0],
    new Date(refund.actualCancellationDate).toISOString().split('T')[0],
    refund.transactionId || ''
  ]);
  
  return [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');
};

/**
 * Generate JSON export of refunds
 * @param {Array} refunds - Array of refund documents
 * @returns {string} JSON formatted string
 */
const generateRefundJSON = (refunds) => {
  return JSON.stringify((refunds || []).map(refund => ({
    refundId: refund._id.toString(),
    subscriptionId: refund.subscriptionId.toString(),
    userId: refund.userId.toString(),
    creatorId: refund.creatorId.toString(),
    originalAmount: refund.originalAmount,
    refundAmount: refund.refundAmount,
    refundPercentage: refund.refundPercentage,
    status: refund.refundStatus,
    daysUsed: refund.usedDays,
    daysRemaining: refund.unusedDays,
    totalDays: refund.totalDays,
    createdAt: refund.createdAt.toISOString(),
    cancellationDate: refund.actualCancellationDate.toISOString(),
    transactionId: refund.transactionId || null,
    refundMethod: refund.refundMethod
  })), null, 2);
};

/**
 * Calculate refund statistics from array of refunds
 * @param {Array} refunds - Array of refund documents
 * @returns {Object} Statistics object
 */
const calculateRefundStats = (refunds) => {
  if (!refunds || refunds.length === 0) {
    return {
      totalRefunds: 0,
      totalAmount: 0,
      averageRefund: 0,
      averagePercentage: 0,
      minRefund: 0,
      maxRefund: 0,
      byStatus: {}
    };
  }
  
  const totalAmount = refunds.reduce((sum, r) => sum + r.refundAmount, 0);
  const averageRefund = totalAmount / refunds.length;
  const averagePercentage = refunds.reduce((sum, r) => sum + (r.refundPercentage || 0), 0) / refunds.length;
  const amounts = refunds.map(r => r.refundAmount).sort((a, b) => a - b);
  
  const byStatus = {};
  refunds.forEach(r => {
    byStatus[r.refundStatus] = (byStatus[r.refundStatus] || 0) + 1;
  });
  
  return {
    totalRefunds: refunds.length,
    totalAmount: validateRefundAmount(totalAmount),
    averageRefund: validateRefundAmount(averageRefund),
    averagePercentage: parseFloat(averagePercentage.toFixed(2)),
    minRefund: validateRefundAmount(amounts[0]),
    maxRefund: validateRefundAmount(amounts[amounts.length - 1]),
    byStatus
  };
};

/**
 * Validate refund eligibility before processing
 * @param {Object} subscription - Subscription document
 * @param {Date} cancellationDate - Cancellation date
 * @returns {Object} Validation result with details
 */
const validateRefundEligibility = (subscription, cancellationDate = new Date()) => {
  const errors = [];
  const warnings = [];
  
  if (!subscription) {
    errors.push('Subscription not found');
    return { isValid: false, errors, warnings };
  }
  
  if (subscription.status === 'cancelled') {
    errors.push('Subscription is already cancelled');
  }
  
  if (!subscription.refundEligible) {
    errors.push('Refund not available for this subscription tier');
  }
  
  const window = checkRefundWindow(
    subscription.startDate,
    subscription.refundWindowDays || 30,
    cancellationDate
  );
  
  if (!window.isWithinWindow) {
    errors.push(`Refund window expired. Deadline was ${formatRefundDate(window.deadline, 'short')}`);
  }
  
  if (window.daysRemaining <= 3) {
    warnings.push(`Refund window expires in ${window.daysRemaining} days`);
  }
  
  if (calculateDaysDifference(subscription.startDate, cancellationDate) < 1) {
    warnings.push('Subscription has been active for less than 1 day');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    window
  };
};

/**
 * Format refund for email notification
 * @param {Object} refund - Refund document
 * @param {Object} subscription - Subscription document
 * @returns {Object} Email-formatted refund object
 */
const formatRefundForEmail = (refund, subscription) => {
  return {
    refundId: refund._id.toString(),
    subscriptionId: subscription._id.toString(),
    originalPrice: formatRefundAmount(refund.originalAmount),
    refundAmount: formatRefundAmount(refund.refundAmount),
    refundPercentage: formatRefundPercentage(refund.refundPercentage),
    daysUsed: refund.usedDays,
    daysRemaining: refund.unusedDays,
    totalDays: refund.totalDays,
    subscriptionName: subscription.name || 'Subscription',
    creatorName: subscription.creatorId.name || 'Creator',
    cancellationDate: formatRefundDate(refund.actualCancellationDate, 'long'),
    status: refund.refundStatus.charAt(0).toUpperCase() + refund.refundStatus.slice(1),
    processingTime: '1-3 business days',
    transactionId: refund.transactionId || 'Pending'
  };
};

/**
 * Get refund status badge color for UI
 * @param {string} status - Refund status
 * @returns {string} Color code or Bootstrap class
 */
const getRefundStatusColor = (status) => {
  const colors = {
    pending: 'warning',      // yellow
    approved: 'info',        // blue
    processing: 'primary',   // dark blue
    completed: 'success',    // green
    failed: 'danger',        // red
    rejected: 'secondary'    // gray
  };
  
  return colors[status] || 'secondary';
};

/**
 * Get refund status display name
 * @param {string} status - Refund status
 * @returns {string} Display name
 */
const getRefundStatusDisplay = (status) => {
  const displays = {
    pending: 'Awaiting Review',
    approved: 'Approved',
    processing: 'Processing',
    completed: 'Completed',
    failed: 'Failed',
    rejected: 'Rejected'
  };
  
  return displays[status] || status;
};

/**
 * Estimate refund processing time
 * @param {string} refundMethod - Refund method (blockchain/platform_credit/manual)
 * @returns {Object} Processing time estimate
 */
const estimateProcessingTime = (refundMethod = 'blockchain') => {
  const estimates = {
    blockchain: {
      min: '2-3 business days',
      max: '5-7 business days',
      description: 'Blockchain transaction confirmation may vary'
    },
    platform_credit: {
      min: 'Immediate',
      max: '1 business day',
      description: 'Platform credit issued automatically'
    },
    manual: {
      min: '1-3 business days',
      max: '5-7 business days',
      description: 'Manual processing by support team'
    }
  };
  
  return estimates[refundMethod] || estimates.blockchain;
};

module.exports = {
  // Formatting utilities
  formatRefundAmount,
  formatRefundPercentage,
  formatRefundDate,
  
  // Calculation utilities
  calculateDaysDifference,
  validateRefundAmount,
  checkRefundWindow,
  calculateRefundStats,
  
  // Refund data utilities
  createRefundSummary,
  batchFormatRefunds,
  generateRefundBreakdown,
  validateRefundEligibility,
  
  // Export utilities
  generateRefundCSV,
  generateRefundJSON,
  
  // UI utilities
  formatRefundForEmail,
  getRefundStatusColor,
  getRefundStatusDisplay,
  estimateProcessingTime
};
