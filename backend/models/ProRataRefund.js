const mongoose = require('mongoose');

const proRataRefundSchema = new mongoose.Schema({
  subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', required: true },
  userId: { type: String, required: true },
  creatorId: { type: String, required: true },
  
  // Original subscription details
  originalAmount: { type: Number, required: true }, // Total subscription cost
  originalStartDate: { type: Date, required: true }, // When subscription started
  originalExpiryDate: { type: Date, required: true }, // When subscription was supposed to expire
  actualCancellationDate: { type: Date, required: true }, // When user cancelled
  
  // Pro-rata calculation
  totalDays: { type: Number, required: true }, // Total subscription duration in days
  usedDays: { type: Number, required: true }, // Days actually used
  unusedDays: { type: Number, required: true }, // Days remaining (refundable)
  usagePercentage: { type: Number, required: true }, // Percentage of subscription used (0-100)
  
  // Refund details
  refundAmount: { type: Number, required: true }, // Pro-rata refund amount
  refundStatus: { 
    type: String, 
    enum: ['pending', 'approved', 'processing', 'completed', 'failed', 'rejected'], 
    default: 'pending' 
  },
  refundReason: { type: String, required: true }, // Reason for cancellation
  
  // Blockchain integration
  transactionId: { type: String, default: null }, // Blockchain tx ID for refund
  blockHeight: { type: Number, default: null }, // Block where transaction was confirmed
  blockTimestamp: { type: Date, default: null }, // Timestamp of block
  
  // Processing details
  processedBy: { type: String, default: null }, // Admin ID who approved/processed
  processedAt: { type: Date, default: null }, // When refund was processed
  failureReason: { type: String, default: null }, // If failed, why
  
  // Additional context
  refundMethod: { 
    type: String, 
    enum: ['blockchain', 'platform_credit', 'manual'], 
    default: 'blockchain' 
  }, // How refund will be issued
  notes: { type: String, default: null }, // Additional notes
  
  // Audit trail
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes for efficient querying
proRataRefundSchema.index({ subscriptionId: 1 });
proRataRefundSchema.index({ userId: 1 });
proRataRefundSchema.index({ creatorId: 1 });
proRataRefundSchema.index({ refundStatus: 1 });
proRataRefundSchema.index({ createdAt: -1 });
proRataRefundSchema.index({ userId: 1, refundStatus: 1 });
proRataRefundSchema.index({ creatorId: 1, refundStatus: 1 });
proRataRefundSchema.index({ transactionId: 1 });
proRataRefundSchema.index({ actualCancellationDate: 1 });

// Virtual for refund percentage
proRataRefundSchema.virtual('refundPercentage').get(function() {
  return (this.unusedDays / this.totalDays) * 100;
});

// Method to validate refund eligibility
proRataRefundSchema.methods.isEligibleForRefund = function() {
  return this.refundAmount > 0 && this.unusedDays > 0;
};

// Method to mark as completed
proRataRefundSchema.methods.markAsCompleted = function(transactionId, blockHeight = null, blockTimestamp = null) {
  this.refundStatus = 'completed';
  this.transactionId = transactionId;
  if (blockHeight) this.blockHeight = blockHeight;
  if (blockTimestamp) this.blockTimestamp = blockTimestamp;
  this.processedAt = new Date();
  return this.save();
};

// Method to mark as failed
proRataRefundSchema.methods.markAsFailed = function(reason) {
  this.refundStatus = 'failed';
  this.failureReason = reason;
  this.processedAt = new Date();
  return this.save();
};

module.exports = mongoose.model('ProRataRefund', proRataRefundSchema);
