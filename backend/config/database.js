'use strict';

/**
 * MongoDB connection configuration using Mongoose.
 *
 * Reads DB_URI (primary) or MONGODB_URI (fallback) from environment.
 * Exposes connectDB(), disconnectDB(), getConnectionStatus(), and healthCheck().
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

// DB_URI is the canonical env var for this project (issue #148).
// MONGODB_URI is kept as a fallback for backward compatibility with older deployments.
const DB_URI = process.env.DB_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/stacks_monetization';

const MAX_RETRIES = parseInt(process.env.MONGO_CONNECT_RETRIES, 10) || 3;
const RETRY_DELAY_MS = parseInt(process.env.MONGO_CONNECT_RETRY_DELAY_MS, 10) || 3000;

const MONGOOSE_OPTIONS = {
  maxPoolSize: parseInt(process.env.MONGO_MAX_POOL_SIZE, 10) || 10,
  minPoolSize: parseInt(process.env.MONGO_MIN_POOL_SIZE, 10) || 2,
  serverSelectionTimeoutMS: parseInt(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS, 10) || 5000,
  socketTimeoutMS: parseInt(process.env.MONGO_SOCKET_TIMEOUT_MS, 10) || 45000,
  connectTimeoutMS: parseInt(process.env.MONGO_CONNECT_TIMEOUT_MS, 10) || 10000,
  retryWrites: true,
  retryReads: true,
};

let _isConnected = false;

/**
 * Register Mongoose connection lifecycle event handlers.
 */
function _registerEventHandlers() {
  mongoose.connection.on('connected', () => {
    _isConnected = true;
    logger.info('MongoDB connected', { uri: _redactUri(DB_URI) });
  });

  mongoose.connection.on('error', (err) => {
    logger.error('MongoDB connection error', { err });
  });

  mongoose.connection.on('disconnected', () => {
    _isConnected = false;
    logger.warn('MongoDB disconnected');
  });

  mongoose.connection.on('reconnected', () => {
    _isConnected = true;
    logger.info('MongoDB reconnected');
  });

  mongoose.connection.on('close', () => {
    _isConnected = false;
    logger.info('MongoDB connection closed');
  });
}

/**
 * Redact credentials from a MongoDB URI for safe logging.
 * @param {string} uri
 * @returns {string}
 */
function _redactUri(uri) {
  try {
    const u = new URL(uri);
    if (u.password) u.password = '***';
    if (u.username) u.username = '***';
    return u.toString();
  } catch {
    return '<invalid-uri>';
  }
}

/**
 * Sleep helper for retry delays.
 * @param {number} ms
 */
function _sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Connect to MongoDB using Mongoose.
 * Retries up to MAX_RETRIES times before throwing.
 */
async function connectDB() {
  if (_isConnected) {
    logger.debug('MongoDB already connected, reusing existing connection');
    return;
  }

  logger.info('Connecting to MongoDB', { uri: _redactUri(DB_URI) });

  _registerEventHandlers();

  let lastError;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await mongoose.connect(DB_URI, MONGOOSE_OPTIONS);
      _isConnected = true;
      return;
    } catch (err) {
      lastError = err;
      logger.warn(`MongoDB connection attempt ${attempt}/${MAX_RETRIES} failed`, { err });
      if (attempt < MAX_RETRIES) {
        await _sleep(RETRY_DELAY_MS);
      }
    }
  }

  logger.error('All MongoDB connection attempts failed', { err: lastError });
  throw lastError;
}

/**
 * Gracefully close the MongoDB connection.
 */
async function disconnectDB() {
  if (!_isConnected) return;
  await mongoose.connection.close();
  _isConnected = false;
  logger.info('MongoDB connection closed gracefully');
}

/**
 * Return a snapshot of the current connection state.
 * @returns {{ isConnected: boolean, readyState: number, host: string|null, name: string|null }}
 */
function getConnectionStatus() {
  const conn = mongoose.connection;
  return {
    isConnected: _isConnected,
    readyState: conn.readyState,
    host: conn.host || null,
    port: conn.port || null,
    name: conn.name || null,
  };
}

/**
 * Lightweight health check — pings the database.
 * @returns {Promise<{ status: 'healthy'|'unhealthy', message: string }>}
 */
async function healthCheck() {
  try {
    if (!_isConnected) {
      return { status: 'unhealthy', message: 'Not connected to MongoDB' };
    }
    await mongoose.connection.db.admin().ping();
    return { status: 'healthy', message: 'MongoDB is reachable' };
  } catch (err) {
    return { status: 'unhealthy', message: err.message };
  }
}

// Graceful shutdown on process signals
process.on('SIGINT', async () => {
  logger.info('SIGINT received — closing MongoDB connection');
  await disconnectDB();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received — closing MongoDB connection');
  await disconnectDB();
  process.exit(0);
});

module.exports = {
  connectDB,
  disconnectDB,
  getConnectionStatus,
  healthCheck,
  redactUri: _redactUri,
  // Expose for tests / legacy callers
  get isConnected() { return _isConnected; },
};
