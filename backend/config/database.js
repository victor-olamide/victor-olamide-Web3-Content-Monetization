'use strict';

/**
 * MongoDB connection configuration using Mongoose.
 *
 * Reads DB_URI (primary) or MONGODB_URI (fallback) from environment.
 * Exposes connectDB(), disconnectDB(), getConnectionStatus(), and healthCheck().
 */
const mongoose = require('mongoose');
const logger = require('../utils/logger');

// MongoDB connection options for replica set
const mongoOptions = {
  // Replica set configuration
  replicaSet: process.env.MONGO_REPLICA_SET_NAME || 'rs0',

  // Connection settings
  maxPoolSize: parseInt(process.env.MONGO_MAX_POOL_SIZE) || 10,
  minPoolSize: parseInt(process.env.MONGO_MIN_POOL_SIZE) || 5,
  maxIdleTimeMS: parseInt(process.env.MONGO_MAX_IDLE_TIME_MS) || 30000,
  serverSelectionTimeoutMS: parseInt(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS) || 5000,
  socketTimeoutMS: parseInt(process.env.MONGO_SOCKET_TIMEOUT_MS) || 45000,
  connectTimeoutMS: parseInt(process.env.MONGO_CONNECT_TIMEOUT_MS) || 10000,
  bufferMaxEntries: 0, // Disable mongoose buffering
  bufferCommands: false, // Disable mongoose buffering

  // Retry configuration
  retryWrites: true,
  retryReads: true,

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
  // Connect to MongoDB replica set
  async connect() {
    try {
      const mongoURI = process.env.MONGODB_URI || buildMongoURI();

      logger.info('Connecting to MongoDB replica set', {
        hosts: process.env.MONGO_HOSTS || 'mongodb-primary:27017,mongodb-secondary1:27017,mongodb-secondary2:27017',
        replicaSet: mongoOptions.replicaSet,
        database: process.env.MONGO_DATABASE || 'web3content',
      });

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
      this.isConnected = true;
      logger.info('Connected to MongoDB replica set');

      // Set up connection event handlers
      this.setupEventHandlers();

      return this.connection;
    } catch (error) {
      logger.error('Failed to connect to MongoDB replica set', { err: error });
      throw error;
    }
  }

  // Set up connection event handlers
  setupEventHandlers() {
    mongoose.connection.on('connected', () => {
      logger.info('MongoDB connected');
    });

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error', { err });
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
      this.isConnected = false;
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
      this.isConnected = true;
    });

    // Replica set events
    mongoose.connection.on('replicaSetInitiated', () => {
      logger.info('Replica set initiated');
    });

    mongoose.connection.on('replicaSetReconfigured', () => {
      logger.info('Replica set reconfigured');
    });
  }

  // Disconnect from MongoDB
  async disconnect() {
    try {
      await mongoose.connection.close();
      this.isConnected = false;
      logger.info('Disconnected from MongoDB');
    } catch (error) {
      logger.error('Error disconnecting from MongoDB', { err: error });
      throw error;
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
  logger.info('SIGINT received, gracefully shutting down');
  await dbConnection.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received — closing MongoDB connection');
  await disconnectDB();
  logger.info('SIGTERM received, gracefully shutting down');
  await dbConnection.disconnect();
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
