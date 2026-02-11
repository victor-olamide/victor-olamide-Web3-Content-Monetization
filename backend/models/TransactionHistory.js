const mongoose = require('mongoose');

const TransactionHistorySchema = new mongoose.Schema(
  {
    userAddress: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
      description: 'User wallet address who made the transaction'
    },

    transactionType: {
      type: String,
      enum: [
        'purchase',
        'subscription',
        'refund',
        'payout',
        'transfer',
        'deposit',
        'withdrawal',
        'renewal',
        'upgrade',
        'downgrade',
        'fee',
        'tip',
        'reward'
      ],
      required: true,
      index: true,
      description: 'Type of transaction'
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
      description: 'STX amount involved in transaction'
    },

    amountUsd: {
      type: Number,
      default: 0,
      min: 0,
      description: 'USD equivalent at time of transaction'
    },

    stxPrice: {
      type: Number,
      default: 0,
      min: 0,
      description: 'STX/USD price at time of transaction for reference'
    },

    txHash: {
      type: String,
      sparse: true,
      index: true,
      description: 'Stacks blockchain transaction hash'
    },

    blockHeight: {
      type: Number,
      sparse: true,
      index: true,
      description: 'Block height where transaction was confirmed'
    },

    blockTime: {
      type: Date,
      sparse: true,
      description: 'Time when block was mined'
    },

    status: {
      type: String,
      enum: ['pending', 'confirmed', 'failed', 'cancelled'],
      default: 'pending',
      index: true,
      description: 'Transaction status on blockchain'
    },

    confirmations: {
      type: Number,
      default: 0,
      min: 0,
      description: 'Number of blockchain confirmations'
    },

    relatedContentId: {
      type: String,
      sparse: true,
      description: 'Content ID if transaction is related to content'
    },

    relatedContentTitle: {
      type: String,
      sparse: true,
      description: 'Content title for reference'
    },

    relatedAddress: {
      type: String,
      sparse: true,
      lowercase: true,
      description: 'Other address involved (seller, creator, recipient)'
    },

    relatedAddressType: {
      type: String,
      enum: ['creator', 'seller', 'buyer', 'platform', 'other'],
      sparse: true,
      description: 'Type of related address'
    },

    relatedAddressName: {
      type: String,
      sparse: true,
      description: 'Display name of related address'
    },

    description: {
      type: String,
      maxlength: 500,
      description: 'Human-readable description of transaction'
    },

    metadata: {
      subscriptionTier: {
        type: String,
        enum: ['basic', 'pro', 'enterprise'],
        sparse: true
      },
      subscriptionDuration: {
        type: Number,
        sparse: true,
        description: 'Duration in days'
      },
      refundReason: {
        type: String,
        enum: ['user_requested', 'content_removed', 'subscription_cancelled', 'pro_rata'],
        sparse: true
      },
      feeType: {
        type: String,
        enum: ['platform_fee', 'transaction_fee', 'service_fee'],
        sparse: true
      },
      payoutMethod: {
        type: String,
        enum: ['stacks_wallet', 'bank_transfer', 'cryptocurrency'],
        sparse: true
      },
      contractAddress: {
        type: String,
        sparse: true,
        description: 'Smart contract address if applicable'
      },
      functionName: {
        type: String,
        sparse: true,
        description: 'Smart contract function called'
      },
      errorDetails: {
        type: String,
        sparse: true,
        description: 'Error message if transaction failed'
      },
      tags: [String],
      customFields: mongoose.Schema.Types.Mixed
    },

    notes: {
      type: String,
      maxlength: 500,
      sparse: true,
      description: 'Internal notes about transaction'
    },

    isReconciled: {
      type: Boolean,
      default: false,
      description: 'Whether transaction has been reconciled'
    },

    reconcileDate: {
      type: Date,
      sparse: true,
      description: 'When transaction was reconciled'
    },

    taxRelevant: {
      type: Boolean,
      default: false,
      description: 'Whether this transaction affects tax reporting'
    },

    category: {
      type: String,
      enum: ['income', 'expense', 'internal_transfer', 'fee', 'reward'],
      default: 'internal_transfer',
      index: true,
      description: 'Transaction category for reporting'
    },

    createdAt: {
      type: Date,
      default: Date.now,
      index: true
    },

    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true,
    strict: true,
    collection: 'transaction_history'
  }
);

// Indexes for common queries
TransactionHistorySchema.index({ userAddress: 1, createdAt: -1 });
TransactionHistorySchema.index({ userAddress: 1, status: 1, createdAt: -1 });
TransactionHistorySchema.index({ userAddress: 1, transactionType: 1, createdAt: -1 });
TransactionHistorySchema.index({ userAddress: 1, category: 1, createdAt: -1 });
TransactionHistorySchema.index({ txHash: 1 });
TransactionHistorySchema.index({ relatedAddress: 1, userAddress: 1 });
TransactionHistorySchema.index({ 'metadata.tags': 1, userAddress: 1 });

// Virtual for formatted amount
TransactionHistorySchema.virtual('formattedAmount').get(function () {
  return this.amount.toFixed(6);
});

// Virtual for age in hours
TransactionHistorySchema.virtual('ageInHours').get(function () {
  const now = new Date();
  const age = (now - this.createdAt) / (1000 * 60 * 60);
  return Math.floor(age);
});

// Method to check if confirmed
TransactionHistorySchema.methods.isConfirmed = function () {
  return this.status === 'confirmed' && this.confirmations >= 1;
};

// Method to check if finalized
TransactionHistorySchema.methods.isFinalized = function () {
  return this.confirmations >= 15 && this.status === 'confirmed';
};

// Method to update confirmation count
TransactionHistorySchema.methods.updateConfirmations = function (newConfirmationCount) {
  this.confirmations = newConfirmationCount;
  if (newConfirmationCount >= 1 && this.status === 'pending') {
    this.status = 'confirmed';
  }
  return this.save();
};

// Method to format transaction for display
TransactionHistorySchema.methods.toDisplay = function () {
  return {
    id: this._id,
    userAddress: this.userAddress,
    type: this.transactionType,
    status: this.status,
    amount: this.formattedAmount,
    amountUsd: this.amountUsd?.toFixed(2),
    stxPrice: this.stxPrice?.toFixed(2),
    txHash: this.txHash,
    blockHeight: this.blockHeight,
    blockTime: this.blockTime,
    confirmations: this.confirmations,
    contentId: this.relatedContentId,
    contentTitle: this.relatedContentTitle,
    relatedAddress: this.relatedAddress,
    relatedAddressName: this.relatedAddressName,
    relatedAddressType: this.relatedAddressType,
    description: this.description,
    category: this.category,
    timestamp: this.createdAt,
    ageInHours: this.ageInHours,
    isConfirmed: this.isConfirmed(),
    isFinalized: this.isFinalized()
  };
};

// Static method to get transaction summary
TransactionHistorySchema.statics.getTransactionSummary = async function (userAddress) {
  const pipeline = [
    { $match: { userAddress, status: 'confirmed' } },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: '$amount' },
        totalUsd: { $sum: '$amountUsd' },
        transactionCount: { $sum: 1 },
        byType: {
          $push: {
            type: '$transactionType',
            amount: '$amount'
          }
        },
        byCategory: {
          $push: {
            category: '$category',
            amount: '$amount'
          }
        }
      }
    }
  ];

  const summary = await this.aggregate(pipeline);
  return summary[0] || { totalAmount: 0, totalUsd: 0, transactionCount: 0 };
};

// Static method to get transactions by date range
TransactionHistorySchema.statics.getByDateRange = function (userAddress, startDate, endDate) {
  return this.find({
    userAddress,
    createdAt: { $gte: startDate, $lte: endDate }
  })
    .sort({ createdAt: -1 })
    .exec();
};

// Static method to get pending transactions
TransactionHistorySchema.statics.getPending = function (userAddress) {
  return this.find({
    userAddress,
    status: 'pending'
  }).sort({ createdAt: -1 });
};

module.exports = mongoose.model('TransactionHistory', TransactionHistorySchema);
