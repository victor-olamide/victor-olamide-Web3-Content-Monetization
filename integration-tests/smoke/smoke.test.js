/**
 * Smoke Tests
 * Quick validation tests for critical functionality
 */

const request = require('supertest');
const { test, expect } = require('@playwright/test');
const TestUtils = require('../utils/test-setup');

describe('API Smoke Tests', () => {
  let server;
  let testUser;
  let testToken;

  beforeAll(async () => {
    const serverSetup = await TestUtils.setupTestServer();
    server = serverSetup.server;

    // Create test user
    testUser = TestUtils.generateUser();
    testUser.password = await TestUtils.hashPassword(testUser.password);
    const User = require('../../../backend/models/User');
    const user = new User(testUser);
    await user.save();
    testUser._id = user._id;
    testToken = TestUtils.generateToken(testUser);
  });

  afterAll(async () => {
    await TestUtils.teardownTestServer(server);
  });

  describe('Health Checks', () => {
    it('should respond to health check endpoint', async () => {
      const response = await request(server)
        .get('/api/health')
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.timestamp).toBeDefined();
    });

    it('should respond to database health check', async () => {
      const response = await request(server)
        .get('/api/health/database')
        .expect(200);

      expect(response.body.database).toBe('connected');
    });
  });

  describe('Authentication Smoke Tests', () => {
    it('should handle basic login flow', async () => {
      const response = await request(server)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'TestPassword123!',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
    });

    it('should handle basic registration', async () => {
      const newUser = TestUtils.generateUser();

      const response = await request(server)
        .post('/api/auth/register')
        .send(newUser)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(newUser.email);
    });
  });

  describe('Content Smoke Tests', () => {
    it('should retrieve public content list', async () => {
      const response = await request(server)
        .get('/api/content')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should handle content creation', async () => {
      const contentData = TestUtils.generateContent({
        creator: testUser._id,
      });

      const response = await request(server)
        .post('/api/content')
        .set('Authorization', `Bearer ${testToken}`)
        .send(contentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(contentData.title);
    });
  });

  describe('Payment Smoke Tests', () => {
    it('should handle basic payment flow', async () => {
      // Create content first
      const contentData = TestUtils.generateContent({
        creator: testUser._id,
        price: 5,
        accessType: 'paid',
      });

      const Content = require('../../../backend/models/Content');
      const content = new Content(contentData);
      await content.save();

      const paymentData = {
        contentId: content._id,
        paymentMethod: 'stacks',
        amount: 5,
      };

      const response = await request(server)
        .post('/api/payments/purchase')
        .set('Authorization', `Bearer ${testToken}`)
        .send(paymentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBeDefined();
    });
  });
});

test.describe('Frontend Smoke Tests', () => {
  test('should load homepage', async ({ page }) => {
    await page.goto('/');

    // Verify basic page elements
    await expect(page.locator('h1, [data-testid="main-heading"]')).toBeVisible();
    await expect(page.locator('body')).toBeVisible();
  });

  test('should load login page', async ({ page }) => {
    await page.goto('/login');

    // Verify login form elements
    await expect(page.locator('[data-testid="email-input"], input[type="email"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-input"], input[type="password"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-button"], button:has-text("Login")')).toBeVisible();
  });

  test('should load registration page', async ({ page }) => {
    await page.goto('/register');

    // Verify registration form elements
    await expect(page.locator('[data-testid="email-input"], input[type="email"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-input"], input[type="password"]')).toBeVisible();
    await expect(page.locator('[data-testid="register-button"], button:has-text("Register")')).toBeVisible();
  });

  test('should handle 404 pages', async ({ page }) => {
    await page.goto('/non-existent-page');

    // Verify 404 handling
    await expect(page.locator('text=/404|not found/i')).toBeVisible();
  });

  test('should load dashboard for authenticated users', async ({ page }) => {
    // This would require authentication setup
    // For smoke test, just verify the route exists
    const response = await page.request.get('/dashboard');
    expect([200, 302, 401]).toContain(response.status()); // Should not be 404
  });
});

describe('Database Smoke Tests', () => {
  let server;

  beforeAll(async () => {
    const serverSetup = await TestUtils.setupTestServer();
    server = serverSetup.server;
  });

  afterAll(async () => {
    await TestUtils.teardownTestServer(server);
  });

  it('should connect to database', async () => {
    const mongoose = require('mongoose');
    expect(mongoose.connection.readyState).toBe(1); // Connected
  });

  it('should handle basic database operations', async () => {
    const User = require('../../../backend/models/User');

    // Create
    const testUser = TestUtils.generateUser();
    testUser.password = await TestUtils.hashPassword(testUser.password);
    const user = new User(testUser);
    await user.save();

    // Read
    const foundUser = await User.findById(user._id);
    expect(foundUser.email).toBe(testUser.email);

    // Update
    await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });
    const updatedUser = await User.findById(user._id);
    expect(updatedUser.lastLogin).toBeDefined();

    // Delete
    await User.findByIdAndDelete(user._id);
    const deletedUser = await User.findById(user._id);
    expect(deletedUser).toBeNull();
  });
});

describe('External Service Smoke Tests', () => {
  let server;

  beforeAll(async () => {
    const serverSetup = await TestUtils.setupTestServer();
    server = serverSetup.server;
  });

  afterAll(async () => {
    await TestUtils.teardownTestServer(server);
  });

  it('should handle file upload service', async () => {
    // Test file upload endpoint exists and responds
    const response = await request(server)
      .post('/api/upload/test')
      .expect(200);

    // Should not crash, even if upload service is mocked
    expect(response.status).toBeDefined();
  });

  it('should handle email service', async () => {
    // Test email endpoint exists
    const response = await request(server)
      .post('/api/email/test')
      .expect(200);

    // Should not crash, even if email service is mocked
    expect(response.status).toBeDefined();
  });

  it('should handle blockchain service', async () => {
    // Test blockchain endpoint exists
    const response = await request(server)
      .post('/api/blockchain/test')
      .expect(200);

    // Should not crash, even if blockchain service is mocked
    expect(response.status).toBeDefined();
  });
});

describe('Performance Smoke Tests', () => {
  let server;

  beforeAll(async () => {
    const serverSetup = await TestUtils.setupTestServer();
    server = serverSetup.server;
  });

  afterAll(async () => {
    await TestUtils.teardownTestServer(server);
  });

  it('should respond within acceptable time', async () => {
    const startTime = Date.now();

    await request(server)
      .get('/api/health')
      .expect(200);

    const responseTime = Date.now() - startTime;
    expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
  });

  it('should handle concurrent requests', async () => {
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(
        request(server)
          .get('/api/health')
          .expect(200)
      );
    }

    const responses = await Promise.all(promises);
    responses.forEach(response => {
      expect(response.status).toBe(200);
    });
  });
});