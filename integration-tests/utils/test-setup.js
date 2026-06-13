/**
 * Test Setup Utilities
 * Common setup and teardown for integration tests
 */

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('../../backend/node_modules/mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const axios = require('axios');

const ALLOWED_CONTENT_TYPES = ['video', 'article', 'image', 'music'];
const STX_ADDRESS_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const randomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const randomFloat = (min, max, precision = 0.01) => {
  const factor = 1 / precision;
  return Math.floor((Math.random() * (max - min) + min) * factor) / factor;
};

const randomElement = (items) => items[Math.floor(Math.random() * items.length)];

const randomEmail = () => `user${Date.now()}${randomInt(1000, 9999)}@example.com`;

const randomSentence = () => `Test content title ${randomInt(1000, 9999)}`;

const randomParagraph = () => `This is a test description ${randomInt(100000, 999999)}.`;

const randomTxHex = () => '0x' + crypto.randomBytes(32).toString('hex');

const generateStxAddress = () => {
  let body = '';
  for (let i = 0; i < 38; i++) {
    body += STX_ADDRESS_CHARS[Math.floor(Math.random() * STX_ADDRESS_CHARS.length)];
  }
  return `ST${body}`;
};

const generateTxId = () => {
  return randomTxHex();
};

const generateExpiryDate = (days = 30) => {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + days);
  return expiry;
};

let mongoServer;

// Global test setup
beforeAll(async () => {
  // Start in-memory MongoDB server
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  // Connect to the in-memory database
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret';
  process.env.MONGODB_URI = mongoUri;
  process.env.REDIS_URL = 'redis://localhost:6379'; // Mock Redis for tests

  // Configure axios defaults for API tests
  axios.defaults.baseURL = 'http://localhost:3001';
  axios.defaults.timeout = 10000;
}, 60000);

// Global test teardown
afterAll(async () => {
  // Close database connection
  await mongoose.connection.close();

  // Stop the in-memory MongoDB server
  if (mongoServer) {
    await mongoServer.stop();
  }
}, 60000);

// Clean up after each test
afterEach(async () => {
  // Clear all collections
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }

  // Clear axios defaults
  delete axios.defaults.headers.common['Authorization'];
});

// Test utilities
const TestUtils = {
  /**
   * Generate fake user data
   */
  generateUser(overrides = {}) {
    return {
      name: `Test User ${randomInt(1000, 9999)}`,
      email: randomEmail(),
      password: 'TestPassword123!',
      role: 'subscriber',
      isActive: true,
      walletAddress: generateStxAddress(),
      ...overrides,
    };
  },

  /**
   * Generate fake content data
   */
  generateContent(creatorAddress, overrides = {}) {
    return {
      contentId: randomInt(1001, 999999),
      title: randomSentence(),
      description: randomParagraph(),
      contentType: randomElement(ALLOWED_CONTENT_TYPES),
      price: randomFloat(0, 100, 0.01),
      creator: creatorAddress || generateStxAddress(),
      url: `https://example.com/content/${randomInt(1000, 9999)}`,
      tokenGating: { enabled: false },
      ...overrides,
    };
  },

  /**
   * Generate JWT token for user
   */
  generateToken(user) {
    return jwt.sign(
      {
        id: user._id || user.id,
        email: user.email,
        role: user.role || 'user',
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
  },

  /**
   * Hash password
   */
  async hashPassword(password) {
    return await bcrypt.hash(password, 12);
  },

  /**
   * Create authenticated axios instance
   */
  createAuthenticatedClient(token) {
    const client = axios.create({
      baseURL: 'http://localhost:3001',
      timeout: 10000,
    });

    client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    return client;
  },

  /**
   * Wait for a condition to be true
   */
  async waitFor(condition, timeout = 5000, interval = 100) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }

    throw new Error(`Condition not met within ${timeout}ms`);
  },

  /**
   * Retry a function with exponential backoff
   */
  async retry(fn, maxRetries = 3, initialDelay = 1000) {
    let lastError;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        const delay = initialDelay * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  },

  /**
   * Generate test data fixtures
   */
  async createTestFixtures() {
    const User = require('../../backend/models/User');
    const Content = require('../../backend/models/Content');

    // Create test users
    const users = [];
    for (let i = 0; i < 5; i++) {
      const userData = this.generateUser();
      userData.password = await this.hashPassword(userData.password);
      const user = new User(userData);
      await user.save();
      users.push(user);
    }

    // Create test content
    const content = [];
    for (let i = 0; i < 10; i++) {
      const contentData = this.generateContent(users[i % users.length].walletAddress);
      const contentItem = new Content(contentData);
      await contentItem.save();
      content.push(contentItem);
    }

    return { users, content };
  },

  /**
   * Clean up test data
   */
  async cleanupTestData() {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  },

  /**
   * Mock external services
   */
  mockExternalServices() {
    // Mock email service
    jest.mock('../../backend/services/emailService', () => ({
      sendEmail: jest.fn().mockResolvedValue(true),
    }));

    // Mock storage service
    jest.mock('../../backend/services/storageService', () => ({
      uploadToIPFS: jest.fn().mockResolvedValue('ipfs://testHash'),
      uploadToGaia: jest.fn().mockResolvedValue('gaia://testHub/test-file.jpg'),
      getGatewayUrl: jest.fn().mockReturnValue('https://gateway.pinata.cloud/ipfs/testHash'),
      getContentFromStorage: jest.fn().mockResolvedValue(Buffer.from('test content')),
      checkStorageHealth: jest.fn().mockResolvedValue(true),
    }));

    // Mock blockchain and price services for purchase routes
    jest.mock('../../backend/services/stacksApiService', () => ({
      verifyTransaction: jest.fn().mockResolvedValue({
        success: true,
        txId: '0x' + require('crypto').randomBytes(32).toString('hex'),
        blockHeight: 123,
        confirmations: 10,
        status: 'success'
      }),
    }));

    jest.mock('../../backend/services/stxPriceService', () => ({
      getCurrentSTXPrice: jest.fn().mockResolvedValue({
        usd: 1.5,
        usd_24h_vol: 1000000,
        usd_24h_change: 0.2,
        last_updated_at: Math.floor(Date.now() / 1000)
      }),
    }));

    jest.mock('../../backend/services/contractService', () => ({
      getPlatformFee: jest.fn().mockResolvedValue(2),
      calculatePlatformFee: jest.fn().mockResolvedValue(1),
    }));

    jest.mock('../../backend/services/blockchainVerification', () => ({
      verifyTransactionStatus: jest.fn().mockResolvedValue({
        verified: true,
        status: 'success',
        confirmations: 10,
      }),
    }));

    jest.mock('../../backend/services/transactionHistoryService', () => ({
      recordTransaction: jest.fn().mockResolvedValue({}),
    }));

    jest.mock('../../backend/services/royaltyService', () => ({
      calculatePlatformFee: jest.fn().mockResolvedValue(1),
      calculateCreatorAmount: jest.fn().mockReturnValue(1),
      distributePurchaseRoyalties: jest.fn().mockResolvedValue([]),
      distributeSubscriptionRoyalties: jest.fn().mockResolvedValue([]),
    }));
  },

  /**
   * Setup test server
   */
  async setupTestServer() {
    const app = require('../../backend/server');
    const http = require('http');

    return new Promise((resolve, reject) => {
      const server = http.createServer(app);
      server.listen(0, () => {
        const port = server.address().port;
        process.env.PORT = port;
        axios.defaults.baseURL = `http://localhost:${port}`;
        resolve({ server, port });
      });

      server.on('error', reject);
    });
  },

  /**
   * Teardown test server
   */
  async teardownTestServer(server) {
    return new Promise((resolve) => {
      server.close(resolve);
    });
  },
};

TestUtils.mockExternalServices();

module.exports = TestUtils;