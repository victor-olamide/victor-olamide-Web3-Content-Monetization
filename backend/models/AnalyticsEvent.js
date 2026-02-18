/**
 * Analytics Event Model
 * Stores individual analytics events for aggregation
 */

const mongoose = require('mongoose');

const analyticsEventSchema = new mongoose.Schema(
  {
    eventType: {
      type: String,
      required: true,
      enum: [
        'PAGE_VIEW',
        'CONTENT_VIEW',
        'CONTENT_PURCHASE',
        'USER_REGISTRATION',
        'USER_LOGIN',
        'CONTENT_UPLOAD',
        'CONTENT_LIKE',
        'CONTENT_SHARE',
        'COMMENT',
        'SEARCH',
        'TRANSACTION',
        'WALLET_CONNECTION',
        'NFT_MINT',
        'COLLABORATION_REQUEST',
        'MODERATION_ACTION',
        'ADMIN_ACTION',
      ],
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    sessionId: {
      type: String,
      index: true,
    },
    contentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Content',
    },
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    userAgent: String,
    ipAddress: String,
    referrer: String,
    url: String,
    deviceType: {
      type: String,
      enum: ['desktop', 'mobile', 'tablet'],
    },
    browser: String,
    os: String,
    country: String,
    city: String,
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    processed: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'analyticsEvents',
  }
);

// Indexes for efficient querying
analyticsEventSchema.index({ eventType: 1, timestamp: -1 });
analyticsEventSchema.index({ userId: 1, timestamp: -1 });
analyticsEventSchema.index({ contentId: 1, timestamp: -1 });
analyticsEventSchema.index({ sessionId: 1, timestamp: -1 });
analyticsEventSchema.index({ timestamp: -1, processed: 1 });

// TTL index for automatic cleanup (90 days retention)
analyticsEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

/**
 * Create analytics event
 */
analyticsEventSchema.statics.createEvent = async function (eventData) {
  try {
    const event = new this(eventData);
    return await event.save();
  } catch (error) {
    console.error('Error creating analytics event:', error);
    throw error;
  }
};

/**
 * Get events for aggregation
 */
analyticsEventSchema.statics.getUnprocessedEvents = async function (limit = 1000) {
  return await this.find({ processed: false })
    .sort({ timestamp: 1 })
    .limit(limit);
};

/**
 * Mark events as processed
 */
analyticsEventSchema.statics.markAsProcessed = async function (eventIds) {
  return await this.updateMany(
    { _id: { $in: eventIds } },
    { $set: { processed: true } }
  );
};

module.exports = mongoose.model('AnalyticsEvent', analyticsEventSchema);
