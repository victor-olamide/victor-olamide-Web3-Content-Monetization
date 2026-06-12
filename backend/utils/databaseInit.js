// Database Initialization Script
// Initializes MongoDB replica set connection on application startup

const { dbConnection } = require('../config/database');
const { createIpfsIndexes } = require('./createIpfsIndexes');

/**
 * Initialize database connection
 * Call this function during application startup
 */
async function initializeDatabase() {
  try {
    console.log('🚀 Initializing database connection...');

    // Connect to MongoDB replica set
    await dbConnection.connect();

    // Perform initial health check
    const healthStatus = await dbConnection.healthCheck();

    if (healthStatus.status === 'healthy') {
      console.log('✅ Database initialization completed successfully');
      console.log(`📊 Connected to replica set: ${healthStatus.replicaSet.set}`);
      console.log(`📊 Primary node: ${healthStatus.replicaSet.primary}`);
      console.log(`📊 Total members: ${healthStatus.replicaSet.members}`);
    } else {
      console.warn('⚠️  Database connected but health check failed:', healthStatus.message);
    }

    // Ensure IPFS-related indexes exist
    try {
      await createIpfsIndexes();
    } catch (idxErr) {
      console.warn('⚠️  IPFS index creation failed (non-fatal):', idxErr.message);
    }

    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    console.error('Please check your MongoDB configuration:');
    console.error('- Ensure MongoDB cluster is running');
    console.error('- Verify connection string and credentials');
    console.error('- Check replica set configuration');
    throw error;
  }
}

/**
 * Close database connection
 * Call this function during application shutdown
 */
async function closeDatabase() {
  try {
    console.log('🛑 Closing database connection...');
    await dbConnection.disconnect();
    console.log('✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error closing database connection:', error);
    throw error;
  }
}

/**
 * Get database connection status
 */
function getDatabaseStatus() {
  return dbConnection.getStatus();
}

/**
 * Perform database health check
 */
async function checkDatabaseHealth() {
  return await dbConnection.healthCheck();
}

module.exports = {
  initializeDatabase,
  closeDatabase,
  getDatabaseStatus,
  checkDatabaseHealth,
};