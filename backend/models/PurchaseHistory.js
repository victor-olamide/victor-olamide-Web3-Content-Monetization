const mongoose = require('mongoose');

const purchaseHistorySchema = new mongoose.Schema(
  {
    // Link to purchase record
    purchaseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Purchase',
      index: true
    },

    // User wallet address
    buyerAddress: {
      type: String,
      required: true,
      lowercase: true,
      index: true
    },

    // Content details
    contentId: {
      type: Number,
      required: true,
      index: true
    },

    contentTitle: {
      type: String,
      required: true
    },

    contentType: {
      type: String,
      enum: ['video', 'article', 'image', 'music'],
      required: true
    },

    creatorAddress: {
      type: String,
      required: true,
      lowercase: true,
      index: true
    },

    creatorName: {
      type: String,
      default: ''
    },

    // Purchase details
    purchasePrice: {
      type: Number,
      required: true
    },

    purchaseCurrency: {
      type: String,
      default: 'USD'
    },

    purchaseDate: {
      type: Date,
      default: Date.now,
      index: true
    },

    // Transaction details
    transactionHash: {
      type: String,
      sparse: true,
      index: true
    },

    transactionStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'completed',
      index: true
    },

    blockNumber: {
      type: Number,
      default: null
    },

    // Download information
    downloads: {
      total: {
        type: Number,
        default: 0
      },
      lastDownloadDate: {
        type: Date,
        default: null
      },
      lastDownloadPath: {
        type: String,
        default: null
      }
    },

    // Access information
    accessStatus: {
      type: String,
      enum: ['active', 'expired', 'revoked', 'refunded'],
      default: 'active',
      index: true
    },

    accessExpiresAt: {
      type: Date,
      default: null
    },

    // Rating and review
    rating: {
      score: {
        type: Number,
        min: 0,
        max: 5,
        default: null
      },
      review: {
        type: String,
        default: null,
        maxlength: 1000
      },
      reviewDate: {
        type: Date,
        default: null
      }
    },

    // Refund information
    refundInfo: {
      refunded: {
        type: Boolean,
        default: false
      },
      refundDate: {
        type: Date,
        default: null
      },
      refundAmount: {
        type: Number,
        default: null
      },
      refundReason: {
        type: String,
        default: null
      },
      refundTransactionHash: {
        type: String,
        default: null
      }
    },

    // Engagement metrics
    engagement: {
      viewCount: {
        type: Number,
        default: 0
      },
      watchTimeSeconds: {
        type: Number,
        default: 0
      },
      completionPercentage: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
      },
      lastAccessedAt: {
        type: Date,
        default: null
      }
    },

    // Tags for organization
    tags: {
      type: [String],
      default: []
    },

    // Favorite status
    isFavorite: {
      type: Boolean,
      default: false,
      index: true
    },

    favoriteDate: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    collection: 'purchase_history'
  }
);

// Indexes for efficient queries
purchaseHistorySchema.index({ buyerAddress: 1, purchaseDate: -1 });
purchaseHistorySchema.index({ buyerAddress: 1, isFavorite: 1 });
purchaseHistorySchema.index({ buyerAddress: 1, accessStatus: 1 });
purchaseHistorySchema.index({ creatorAddress: 1 });
purchaseHistorySchema.index({ contentId: 1 });
purchaseHistorySchema.index({ transactionStatus: 1 });

module.exports = mongoose.model('PurchaseHistory', purchaseHistorySchema);
