/**
 * Test Setup Utilities
 * Common setup and teardown for integration tests
 */

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { faker } = require('@faker-js/faker');
const axios = require('axios');

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
      username: faker.internet.userName(),
      email: faker.internet.email(),
      password: 'TestPassword123!',
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      role: 'user',
      isActive: true,
      ...overrides,
    };
  },

  /**
   * Generate fake content data
   */
  generateContent(creatorId, overrides = {}) {
    return {
      title: faker.lorem.sentence(),
      description: faker.lorem.paragraph(),
      contentType: faker.helpers.arrayElement(['video', 'image', 'document', 'audio']),
      price: faker.number.float({ min: 0, max: 100, precision: 0.01 }),
      creator: creatorId,
      tags: faker.lorem.words(3).split(' '),
      isPublished: true,
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
      const contentData = this.generateContent(users[i % users.length]._id);
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

    // Mock file upload service
    jest.mock('../../backend/services/fileService', () => ({
      uploadFile: jest.fn().mockResolvedValue({
        url: 'https://example.com/test-file.jpg',
        key: 'test-file-key',
      }),
      deleteFile: jest.fn().mockResolvedValue(true),
    }));

    // Mock payment service
    jest.mock('../../backend/services/paymentService', () => ({
      processPayment: jest.fn().mockResolvedValue({
        success: true,
        transactionId: 'test-transaction-id',
      }),
    }));
  },

  /**
   * Setup test server
   */
  async setupTestServer() {
    const app = require('../../backend/app');
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

module.exports = TestUtils;