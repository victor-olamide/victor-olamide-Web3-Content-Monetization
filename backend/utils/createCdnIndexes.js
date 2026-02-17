const mongoose = require('mongoose');
const { CdnCacheEntry, CdnPurgeRequest, CdnAnalytics, CdnHealthCheck } = require('../models/CdnCache');

/**
 * Create database indexes for CDN collections
 * This script should be run after the CDN models are created
 */
async function createCdnIndexes() {
  try {
    console.log('Creating CDN database indexes...');

    // CdnCacheEntry indexes
    await CdnCacheEntry.collection.createIndex(
      { contentId: 1 },
      { name: 'contentId_index', unique: true }
    );

    await CdnCacheEntry.collection.createIndex(
      { status: 1, createdAt: -1 },
      { name: 'status_createdAt_index' }
    );

    await CdnCacheEntry.collection.createIndex(
      { contentType: 1, status: 1 },
      { name: 'contentType_status_index' }
    );

    await CdnCacheEntry.collection.createIndex(
      { lastAccessed: -1 },
      { name: 'lastAccessed_index' }
    );

    await CdnCacheEntry.collection.createIndex(
      { expiresAt: 1 },
      { name: 'expiresAt_index', expireAfterSeconds: 0 }
    );

    console.log('✓ Created CdnCacheEntry indexes');

    // CdnPurgeRequest indexes
    await CdnPurgeRequest.collection.createIndex(
      { status: 1, createdAt: -1 },
      { name: 'status_createdAt_index' }
    );

    await CdnPurgeRequest.collection.createIndex(
      { contentIds: 1 },
      { name: 'contentIds_index' }
    );

    await CdnPurgeRequest.collection.createIndex(
      { requestedBy: 1, createdAt: -1 },
      { name: 'requestedBy_createdAt_index' }
    );

    console.log('✓ Created CdnPurgeRequest indexes');

    // CdnAnalytics indexes
    await CdnAnalytics.collection.createIndex(
      { date: 1, period: 1 },
      { name: 'date_period_index', unique: true }
    );

    await CdnAnalytics.collection.createIndex(
      { period: 1, date: -1 },
      { name: 'period_date_index' }
    );

    await CdnAnalytics.collection.createIndex(
      { 'metrics.totalRequests': -1 },
      { name: 'totalRequests_index' }
    );

    console.log('✓ Created CdnAnalytics indexes');

    // CdnHealthCheck indexes
    await CdnHealthCheck.collection.createIndex(
      { checkedAt: -1 },
      { name: 'checkedAt_index' }
    );

    await CdnHealthCheck.collection.createIndex(
      { provider: 1, checkedAt: -1 },
      { name: 'provider_checkedAt_index' }
    );

    await CdnHealthCheck.collection.createIndex(
      { status: 1, checkedAt: -1 },
      { name: 'status_checkedAt_index' }
    );

    console.log('✓ Created CdnHealthCheck indexes');

    console.log('✅ All CDN database indexes created successfully');
  } catch (error) {
    console.error('❌ Failed to create CDN indexes:', error);
    throw error;
  }
}

/**
 * Drop CDN indexes (for cleanup or recreation)
 */
async function dropCdnIndexes() {
  try {
    console.log('Dropping CDN database indexes...');

    await CdnCacheEntry.collection.dropIndexes();
    await CdnPurgeRequest.collection.dropIndexes();
    await CdnAnalytics.collection.dropIndexes();
    await CdnHealthCheck.collection.dropIndexes();

    console.log('✅ All CDN database indexes dropped successfully');
  } catch (error) {
    console.error('❌ Failed to drop CDN indexes:', error);
    throw error;
  }
}

/**
 * Get index information for CDN collections
 */
async function getCdnIndexInfo() {
  try {
    console.log('Getting CDN index information...');

    const cacheIndexes = await CdnCacheEntry.collection.indexes();
    const purgeIndexes = await CdnPurgeRequest.collection.indexes();
    const analyticsIndexes = await CdnAnalytics.collection.indexes();
    const healthIndexes = await CdnHealthCheck.collection.indexes();

    return {
      CdnCacheEntry: cacheIndexes,
      CdnPurgeRequest: purgeIndexes,
      CdnAnalytics: analyticsIndexes,
      CdnHealthCheck: healthIndexes
    };
  } catch (error) {
    console.error('❌ Failed to get CDN index info:', error);
    throw error;
  }
}

module.exports = {
  createCdnIndexes,
  dropCdnIndexes,
  getCdnIndexInfo
};

// Run if called directly
if (require.main === module) {
  const mongoose = require('mongoose');

  // Connect to MongoDB (adjust connection string as needed)
  mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/web3-platform', {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(async () => {
    console.log('Connected to MongoDB');
    await createCdnIndexes();
    process.exit(0);
  })
  .catch((error) => {
    console.error('MongoDB connection failed:', error);
    process.exit(1);
  });
}