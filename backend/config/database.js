// MongoDB Replica Set Configuration
// Production-ready database configuration for MongoDB cluster

const mongoose = require('mongoose');

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
  authSource: 'admin',
  user: process.env.MONGO_APP_USERNAME || 'web3app',
  pass: process.env.MONGO_APP_PASSWORD || 'web3app_password_123',

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

// Build MongoDB connection URI for replica set
function buildMongoURI() {
  const protocol = mongoOptions.ssl ? 'mongodb+srv' : 'mongodb';
  const hosts = process.env.MONGO_HOSTS || 'mongodb-primary:27017,mongodb-secondary1:27017,mongodb-secondary2:27017';
  const database = process.env.MONGO_DATABASE || 'web3content';
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
      const mongoURI = process.env.MONGODB_URI || buildMongoURI();

      console.log('Connecting to MongoDB replica set...');
      console.log(`Hosts: ${process.env.MONGO_HOSTS || 'mongodb-primary:27017,mongodb-secondary1:27017,mongodb-secondary2:27017'}`);
      console.log(`Replica Set: ${mongoOptions.replicaSet}`);
      console.log(`Database: ${process.env.MONGO_DATABASE || 'web3content'}`);

      this.connection = await mongoose.connect(mongoURI, mongoOptions);

      this.isConnected = true;
      console.log('✅ Successfully connected to MongoDB replica set');

      // Set up connection event handlers
      this.setupEventHandlers();

      return this.connection;
    } catch (error) {
      console.error('❌ Failed to connect to MongoDB replica set:', error);
      throw error;
    }
  }

  // Set up connection event handlers
  setupEventHandlers() {
    mongoose.connection.on('connected', () => {
      console.log('📊 MongoDB connected');
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('📊 MongoDB disconnected');
      this.isConnected = false;
    });

    mongoose.connection.on('reconnected', () => {
      console.log('📊 MongoDB reconnected');
      this.isConnected = true;
    });

    // Replica set events
    mongoose.connection.on('replicaSetInitiated', () => {
      console.log('📊 Replica set initiated');
    });

    mongoose.connection.on('replicaSetReconfigured', () => {
      console.log('📊 Replica set reconfigured');
    });
  }

  // Disconnect from MongoDB
  async disconnect() {
    try {
      await mongoose.connection.close();
      this.isConnected = false;
      console.log('✅ Successfully disconnected from MongoDB');
    } catch (error) {
      console.error('❌ Error disconnecting from MongoDB:', error);
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
  console.log('Received SIGINT, gracefully shutting down...');
  await dbConnection.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, gracefully shutting down...');
  await dbConnection.disconnect();
  process.exit(0);
});

module.exports = {
  DatabaseConnection,
  dbConnection,
  mongoOptions,
  buildMongoURI,
};