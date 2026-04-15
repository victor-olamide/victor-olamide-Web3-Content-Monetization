'use strict';

// Database Health Check Middleware
// Uses the shared database.js module for all connection state and health checks.

const { connectDB, getConnectionStatus, healthCheck, isConnected } = require('../config/database');
const logger = require('../utils/logger');

/**
 * GET /health/database
 * Returns 200 when MongoDB is reachable, 503 otherwise.
 */
const databaseHealthCheck = async (req, res) => {
  try {
    const health = await healthCheck();
    if (health.status === 'healthy') {
      return res.status(200).json({
        status: 'connected',
        database: 'mongodb',
        message: health.message,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      });
    }
    return res.status(503).json({
      status: 'disconnected',
      database: 'mongodb',
      error: health.message,
      timestamp: new Date().toISOString(),
    });
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
 * GET /health/database/status
 * Returns detailed connection state and environment info.
 */
const databaseStatusCheck = async (req, res) => {
  try {
    const status = getConnectionStatus();
    const health = await healthCheck();
    return res.status(200).json({
      connection: status,
      health,
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
 * Middleware — ensures MongoDB is connected before the request proceeds.
 * Attempts a reconnect if disconnected; returns 503 if unavailable.
 */
const requireDatabaseConnection = async (req, res, next) => {
  try {
    if (!isConnected) {
      logger.warn('DB not connected — attempting reconnect');
      await connectDB();
    }
    const health = await healthCheck();
    if (health.status !== 'healthy') {
      return res.status(503).json({
        error: 'Database temporarily unavailable',
        message: health.message,
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
