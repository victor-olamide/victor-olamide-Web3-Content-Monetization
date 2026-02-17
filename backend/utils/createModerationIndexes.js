/**
 * Create Moderation System Indexes
 * Run this once to ensure all moderation collections have proper indexes
 */

const ModerationQueue = require('../models/ModerationQueue');
const ModerationFlag = require('../models/ModerationFlag');
const ModerationAuditLog = require('../models/ModerationAuditLog');

async function createModerationIndexes() {
  try {
    console.log('Creating moderation system indexes...');

    // ModerationQueue indexes
    console.log('Creating ModerationQueue indexes...');
    await ModerationQueue.collection.createIndex({ queueId: 1 }, { unique: true });
    await ModerationQueue.collection.createIndex({ contentId: 1 });
    await ModerationQueue.collection.createIndex({ creator: 1 });
    await ModerationQueue.collection.createIndex({ status: 1 });
    await ModerationQueue.collection.createIndex({ severity: 1 });
    await ModerationQueue.collection.createIndex({ priority: 1 });
    await ModerationQueue.collection.createIndex({ flagCount: 1 });
    await ModerationQueue.collection.createIndex({ assignedModerator: 1 });
    await ModerationQueue.collection.createIndex({ createdAt: 1 });
    await ModerationQueue.collection.createIndex({ reviewCompletedAt: 1 });

    // Compound indexes for common queries
    await ModerationQueue.collection.createIndex({ status: 1, priority: -1, createdAt: -1 });
    await ModerationQueue.collection.createIndex({ assignedModerator: 1, status: 1 });
    await ModerationQueue.collection.createIndex({ creator: 1, status: 1 });
    await ModerationQueue.collection.createIndex({ severity: 1, status: 1 });
    await ModerationQueue.collection.createIndex({ contentId: 1, status: 1 });
    await ModerationQueue.collection.createIndex({ firstFlaggedAt: 1 });
    await ModerationQueue.collection.createIndex({ lastFlaggedAt: 1 });
    console.log('✓ ModerationQueue indexes created');

    // ModerationFlag indexes
    console.log('Creating ModerationFlag indexes...');
    await ModerationFlag.collection.createIndex({ flagId: 1 }, { unique: true });
    await ModerationFlag.collection.createIndex({ contentId: 1 });
    await ModerationFlag.collection.createIndex({ flaggedBy: 1 });
    await ModerationFlag.collection.createIndex({ flagType: 1 });
    await ModerationFlag.collection.createIndex({ reason: 1 });
    await ModerationFlag.collection.createIndex({ status: 1 });
    await ModerationFlag.collection.createIndex({ createdAt: 1 });
    await ModerationFlag.collection.createIndex({ queueId: 1 });
    await ModerationFlag.collection.createIndex({ reviewedBy: 1 });

    // Compound indexes
    await ModerationFlag.collection.createIndex({ status: 1, createdAt: -1 });
    await ModerationFlag.collection.createIndex({ contentId: 1, flagType: 1 });
    await ModerationFlag.collection.createIndex({ reason: 1, status: 1 });
    await ModerationFlag.collection.createIndex({ flaggedBy: 1, createdAt: -1 });
    console.log('✓ ModerationFlag indexes created');

    // ModerationAuditLog indexes
    console.log('Creating ModerationAuditLog indexes...');
    await ModerationAuditLog.collection.createIndex({ logId: 1 }, { unique: true });
    await ModerationAuditLog.collection.createIndex({ queueId: 1 });
    await ModerationAuditLog.collection.createIndex({ contentId: 1 });
    await ModerationAuditLog.collection.createIndex({ actor: 1 });
    await ModerationAuditLog.collection.createIndex({ actorAddress: 1 });
    await ModerationAuditLog.collection.createIndex({ action: 1 });
    await ModerationAuditLog.collection.createIndex({ timestamp: 1 });

    // Compound indexes
    await ModerationAuditLog.collection.createIndex({ action: 1, timestamp: -1 });
    await ModerationAuditLog.collection.createIndex({ actorAddress: 1, timestamp: -1 });
    await ModerationAuditLog.collection.createIndex({ contentId: 1, timestamp: -1 });
    await ModerationAuditLog.collection.createIndex({ queueId: 1, timestamp: -1 });
    await ModerationAuditLog.collection.createIndex({ actor: 1, action: 1 });
    console.log('✓ ModerationAuditLog indexes created');

    console.log('\n✅ All moderation indexes created successfully!');
    return true;
  } catch (error) {
    console.error('❌ Error creating moderation indexes:', error);
    throw error;
  }
}

// Export for use in initialization
module.exports = { createModerationIndexes };

// Run if called directly
if (require.main === module) {
  const mongoose = require('mongoose');
  const dbUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017/web3-platform';

  mongoose.connect(dbUrl)
    .then(() => createModerationIndexes())
    .then(() => {
      console.log('Index creation complete. Exiting...');
      process.exit(0);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}
