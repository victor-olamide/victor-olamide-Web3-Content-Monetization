// Database Health Check Middleware
// Provides health check endpoints for MongoDB replica set

const { dbConnection } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Database health check endpoint
 * GET /api/health/database
 */
const databaseHealthCheck = async (req, res) => {
  try {
    const healthStatus = await dbConnection.healthCheck();

    if (healthStatus.status === 'healthy') {
      return res.status(200).json({
        status: 'connected',
        database: 'mongodb',
        replicaSet: healthStatus.replicaSet,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      });
    } else {
      return res.status(503).json({
        status: 'disconnected',
        database: 'mongodb',
        error: healthStatus.message,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    logger.error('Database health check error', { err: error });
    return res.status(503).json({
      status: 'error',
      database: 'mongodb',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Detailed database status endpoint
 * GET /api/health/database/status
 */
const databaseStatusCheck = async (req, res) => {
  try {
    const status = dbConnection.getStatus();
    const health = await dbConnection.healthCheck();

    return res.status(200).json({
      connection: status,
      health: health,
      timestamp: new Date().toISOString(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        memory: process.memoryUsage(),
        uptime: process.uptime(),
      },
    });
  } catch (error) {
    logger.error('Database status check error', { err: error });
    return res.status(500).json({
      error: 'Failed to get database status',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Database connection middleware
 * Ensures database is connected before processing requests
 */
const requireDatabaseConnection = async (req, res, next) => {
  try {
    if (!dbConnection.isConnected) {
      // Attempt to reconnect
      await dbConnection.connect();
    }

    // Check if connection is still healthy
    const health = await dbConnection.healthCheck();
    if (health.status !== 'healthy') {
      return res.status(503).json({
        error: 'Database temporarily unavailable',
        message: 'Replica set is not healthy',
        timestamp: new Date().toISOString(),
      });
    }

    next();
  } catch (error) {
    logger.error('Database connection middleware error', { err: error });
    return res.status(503).json({
      error: 'Database connection failed',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

module.exports = {
  databaseHealthCheck,
  databaseStatusCheck,
  requireDatabaseConnection,
};