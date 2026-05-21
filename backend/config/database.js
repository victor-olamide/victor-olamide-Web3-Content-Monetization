// MongoDB Replica Set Configuration
// Production-ready database configuration for MongoDB cluster

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

  // Read preference for load distribution
  readPreference: process.env.MONGO_READ_PREFERENCE || 'secondaryPreferred',

  // Authentication
  authSource: process.env.MONGO_AUTH_SOURCE || 'admin',
  user: process.env.MONGO_APP_USERNAME,
  pass: process.env.MONGO_APP_PASSWORD,

  // SSL/TLS configuration
  ssl: process.env.MONGO_SSL_ENABLED === 'true',
  sslValidate: process.env.MONGO_SSL_VALIDATE !== 'false',
  sslCA: process.env.MONGO_SSL_CA_FILE,
  sslCert: process.env.MONGO_SSL_CERT_FILE,
  sslKey: process.env.MONGO_SSL_KEY_FILE,

  // Monitoring and logging
  loggerLevel: process.env.MONGO_LOG_LEVEL || 'error',
  monitorCommands: process.env.MONGO_MONITOR_COMMANDS === 'true',
};

// Fail fast if required database credentials are not set
function validateDbCredentials() {
  const missing = [];
  if (!process.env.MONGO_APP_USERNAME || process.env.MONGO_APP_USERNAME.trim() === '') {
    missing.push('MONGO_APP_USERNAME');
  }
  if (!process.env.MONGO_APP_PASSWORD || process.env.MONGO_APP_PASSWORD.trim() === '') {
    missing.push('MONGO_APP_PASSWORD');
  }
  if (missing.length > 0) {
    throw new Error(
      `Missing required database environment variables: ${missing.join(', ')}. ` +
      'Set them in your .env file or deployment secrets.'
    );
  }

  const password = process.env.MONGO_APP_PASSWORD;
  if (password && password.length < 12) {
    logger.warn('MONGO_APP_PASSWORD is shorter than 12 characters — use a stronger password in production');
  }
}

// Build MongoDB connection URI for replica set
function buildMongoURI() {
  const protocol = mongoOptions.ssl ? 'mongodb+srv' : 'mongodb';
  const hosts = process.env.MONGO_HOSTS || 'mongodb-primary:27017,mongodb-secondary1:27017,mongodb-secondary2:27017';
  const database = process.env.MONGO_DATABASE;
  if (!database) {
    throw new Error('MONGO_DATABASE environment variable is required');
  }
  const replicaSet = process.env.MONGO_REPLICA_SET_NAME || 'rs0';

  // For replica set, use multiple hosts
  const hostArray = hosts.split(',');
  const connectionString = `${protocol}://${hostArray.join(',')}/${database}?replicaSet=${replicaSet}`;

  // Add additional options
  const options = [];

  if (mongoOptions.readPreference) {
    options.push(`readPreference=${mongoOptions.readPreference}`);
  }

  if (mongoOptions.retryWrites) {
    options.push('retryWrites=true');
  }

  if (mongoOptions.retryReads) {
    options.push('retryReads=true');
  }

  if (mongoOptions.maxPoolSize) {
    options.push(`maxPoolSize=${mongoOptions.maxPoolSize}`);
  }

  if (mongoOptions.minPoolSize) {
    options.push(`minPoolSize=${mongoOptions.minPoolSize}`);
  }

  if (mongoOptions.serverSelectionTimeoutMS) {
    options.push(`serverSelectionTimeoutMS=${mongoOptions.serverSelectionTimeoutMS}`);
  }

  if (mongoOptions.socketTimeoutMS) {
    options.push(`socketTimeoutMS=${mongoOptions.socketTimeoutMS}`);
  }

  if (mongoOptions.connectTimeoutMS) {
    options.push(`connectTimeoutMS=${mongoOptions.connectTimeoutMS}`);
  }

  if (options.length > 0) {
    return `${connectionString}&${options.join('&')}`;
  }

  return connectionString;
}

// Database connection class
class DatabaseConnection {
  constructor() {
    this.isConnected = false;
    this.connection = null;
  }

  // Connect to MongoDB replica set
  async connect() {
    try {
      if (!process.env.MONGODB_URI) {
        validateDbCredentials();
      }

      const isProduction = process.env.NODE_ENV === 'production';
      if (isProduction && process.env.MONGO_SSL_ENABLED !== 'true') {
        logger.warn('MongoDB SSL is disabled in production — credentials transmitted in plaintext');
      }

      const mongoURI = process.env.MONGODB_URI || buildMongoURI();

      logger.info('Connecting to MongoDB replica set', {
        hosts: process.env.MONGO_HOSTS || 'mongodb-primary:27017,mongodb-secondary1:27017,mongodb-secondary2:27017',
        replicaSet: mongoOptions.replicaSet,
        database: process.env.MONGO_DATABASE || 'web3content',
        user: process.env.MONGODB_URI ? '[from MONGODB_URI]' : (process.env.MONGO_APP_USERNAME || '[not set]'),
      });

      this.connection = await mongoose.connect(mongoURI, mongoOptions);

      this.isConnected = true;
      const safeURI = mongoURI.replace(/:\/\/[^@]+@/, '://***:***@');
      logger.info('Connected to MongoDB replica set', { uri: safeURI });

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

  // Get connection status
  getStatus() {
    return {
      isConnected: this.isConnected,
      readyState: mongoose.connection.readyState,
      name: mongoose.connection.name,
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      database: mongoose.connection.db ? mongoose.connection.db.databaseName : null,
    };
  }

  // Health check
  async healthCheck() {
    try {
      if (!this.isConnected) {
        return { status: 'disconnected', message: 'Not connected to MongoDB' };
      }

      // Perform a simple database operation
      await mongoose.connection.db.admin().ping();

      // Get replica set status
      const rsStatus = await mongoose.connection.db.admin().command({ replSetGetStatus: 1 });

      return {
        status: 'healthy',
        message: 'MongoDB replica set is healthy',
        replicaSet: {
          set: rsStatus.set,
          myState: rsStatus.myState,
          members: rsStatus.members.length,
          primary: rsStatus.members.find(m => m.state === 1)?.name,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `MongoDB health check failed: ${error.message}`,
        error: error.message,
      };
    }
  }
}

// Create singleton instance
const dbConnection = new DatabaseConnection();

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('SIGINT received, gracefully shutting down');
  await dbConnection.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, gracefully shutting down');
  await dbConnection.disconnect();
  process.exit(0);
});

module.exports = {
  DatabaseConnection,
  dbConnection,
  mongoOptions,
  buildMongoURI,
};