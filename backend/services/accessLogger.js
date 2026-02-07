const mongoose = require('mongoose');

const accessLogSchema = new mongoose.Schema({
  userAddress: { type: String, required: true, index: true },
  contentId: { type: Number, required: true, index: true },
  accessMethod: { type: String, enum: ['creator', 'purchase', 'subscription', 'token-gating'], required: true },
  accessGranted: { type: Boolean, required: true },
  reason: { type: String },
  ipAddress: { type: String },
  userAgent: { type: String },
  timestamp: { type: Date, default: Date.now, index: true }
});

const AccessLog = mongoose.model('AccessLog', accessLogSchema);

/**
 * Log access attempt
 */
async function logAccess(data) {
  try {
    const log = new AccessLog(data);
    await log.save();
  } catch (err) {
    console.error('Access logging error:', err);
  }
}

/**
 * Get access logs for a user
 */
async function getUserAccessLogs(userAddress, limit = 50) {
  return await AccessLog.find({ userAddress })
    .sort({ timestamp: -1 })
    .limit(limit);
}

/**
 * Get access logs for content
 */
async function getContentAccessLogs(contentId, limit = 50) {
  return await AccessLog.find({ contentId, accessGranted: true })
    .sort({ timestamp: -1 })
    .limit(limit);
}

/**
 * Get access statistics
 */
async function getAccessStats(contentId) {
  const stats = await AccessLog.aggregate([
    { $match: { contentId, accessGranted: true } },
    { $group: {
      _id: '$accessMethod',
      count: { $sum: 1 }
    }}
  ]);

  return stats.reduce((acc, stat) => {
    acc[stat._id] = stat.count;
    return acc;
  }, {});
}

module.exports = {
  logAccess,
  getUserAccessLogs,
  getContentAccessLogs,
  getAccessStats,
  AccessLog
};
