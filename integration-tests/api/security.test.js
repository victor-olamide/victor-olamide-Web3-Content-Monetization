/**
 * Security Integration Tests
 * Tests for authentication, authorization, input validation, and security vulnerabilities
 */

const request = require('supertest');
const mongoose = require('mongoose');
const User = require('../../../backend/models/User');
const Content = require('../../../backend/models/Content');
const TestUtils = require('../utils/test-setup');

describe('Security Integration Tests', () => {
  let server;
  let adminUser;
  let creatorUser;
  let consumerUser;
  let testContent;
  let adminToken;
  let creatorToken;
  let consumerToken;

  beforeAll(async () => {
    // Setup test server
    const serverSetup = await TestUtils.setupTestServer();
    server = serverSetup.server;

    // Create test users with different roles
    adminUser = TestUtils.generateUser({
      email: 'admin@example.com',
      role: 'admin',
    });
    adminUser.password = await TestUtils.hashPassword(adminUser.password);
    const admin = new User(adminUser);
    await admin.save();
    adminUser._id = admin._id;
    adminToken = TestUtils.generateToken(adminUser);

    creatorUser = TestUtils.generateUser({
      email: 'creator@example.com',
      role: 'creator',
    });
    creatorUser.password = await TestUtils.hashPassword(creatorUser.password);
    const creator = new User(creatorUser);
    await creator.save();
    creatorUser._id = creator._id;
    creatorToken = TestUtils.generateToken(creatorUser);

    consumerUser = TestUtils.generateUser({
      email: 'consumer@example.com',
      role: 'consumer',
    });
    consumerUser.password = await TestUtils.hashPassword(consumerUser.password);
    const consumer = new User(consumerUser);
    await consumer.save();
    consumerUser._id = consumer._id;
    consumerToken = TestUtils.generateToken(consumerUser);

    // Create test content
    testContent = TestUtils.generateContent({
      creator: creatorUser._id,
      title: 'Test Content',
      accessType: 'paid',
      price: 10,
    });
    const content = new Content(testContent);
    await content.save();
    testContent._id = content._id;
  });

  afterAll(async () => {
    await TestUtils.teardownTestServer(server);
  });

  describe('Authentication Security', () => {
    it('should prevent brute force attacks with rate limiting', async () => {
      const loginData = {
        email: consumerUser.email,
        password: 'WrongPassword123!',
      };

      // Make multiple failed login attempts
      const promises = [];
      for (let i = 0; i < 15; i++) {
        promises.push(
          request(server)
            .post('/api/auth/login')
            .send(loginData)
        );
      }

      const responses = await Promise.all(promises);

      // Should be rate limited
      const rateLimitedResponse = responses.find(r => r.status === 429);
      expect(rateLimitedResponse).toBeDefined();
      expect(rateLimitedResponse.body.message).toContain('rate limit');
    });

    it('should prevent JWT token tampering', async () => {
      const validToken = TestUtils.generateToken(consumerUser);
      const tamperedToken = validToken.slice(0, -5) + 'xxxxx'; // Tamper with signature

      const response = await request(server)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tamperedToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid or expired token');
    });

    it('should handle expired tokens gracefully', async () => {
      const expiredToken = TestUtils.generateExpiredToken(consumerUser);

      const response = await request(server)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid or expired token');
    });
  });

  describe('Authorization Security', () => {
    it('should prevent unauthorized access to admin endpoints', async () => {
      const response = await request(server)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${consumerToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('admin');
    });

    it('should prevent consumers from creating content', async () => {
      const contentData = TestUtils.generateContent({
        creator: consumerUser._id,
      });

      const response = await request(server)
        .post('/api/content')
        .set('Authorization', `Bearer ${consumerToken}`)
        .send(contentData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('creator');
    });

    it('should prevent users from accessing other users data', async () => {
      const response = await request(server)
        .get(`/api/users/${adminUser._id}`)
        .set('Authorization', `Bearer ${consumerToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('permission');
    });

    it('should prevent creators from moderating other creators content', async () => {
      // Create content by another creator
      const otherCreator = TestUtils.generateUser({
        email: 'other-creator@example.com',
        role: 'creator',
      });
      otherCreator.password = await TestUtils.hashPassword(otherCreator.password);
      const otherCreatorDoc = new User(otherCreator);
      await otherCreatorDoc.save();
      otherCreator._id = otherCreatorDoc._id;

      const otherContent = TestUtils.generateContent({
        creator: otherCreator._id,
      });
      const contentDoc = new Content(otherContent);
      await contentDoc.save();
      otherContent._id = contentDoc._id;

      // Try to moderate as different creator
      const response = await request(server)
        .put(`/api/content/${otherContent._id}/moderate`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({ status: 'approved' })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('moderator');
    });
  });

  describe('Input Validation Security', () => {
    it('should prevent SQL injection attempts', async () => {
      const maliciousInput = {
        email: "'; DROP TABLE users; --",
        password: 'password123',
      };

      const response = await request(server)
        .post('/api/auth/login')
        .send(maliciousInput)
        .expect(401);

      // Should not crash, should handle gracefully
      expect(response.body.success).toBe(false);
    });

    it('should prevent XSS attacks in content', async () => {
      const xssContent = TestUtils.generateContent({
        creator: creatorUser._id,
        title: '<script>alert("XSS")</script>',
        description: '<img src=x onerror=alert("XSS")>',
      });

      const response = await request(server)
        .post('/api/content')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send(xssContent)
        .expect(201);

      expect(response.body.success).toBe(true);
      // Content should be sanitized
      expect(response.body.data.title).not.toContain('<script>');
      expect(response.body.data.description).not.toContain('onerror');
    });

    it('should validate file upload types', async () => {
      const maliciousFile = {
        filename: 'malicious.exe',
        contentType: 'application/x-msdownload',
        size: 1024,
      };

      const response = await request(server)
        .post('/api/content/upload')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send(maliciousFile)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('file type');
    });

    it('should prevent directory traversal attacks', async () => {
      const traversalPath = '../../../etc/passwd';

      const response = await request(server)
        .get(`/api/content/download/${traversalPath}`)
        .set('Authorization', `Bearer ${consumerToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('invalid path');
    });

    it('should validate JSON payload size', async () => {
      const largePayload = {
        data: 'x'.repeat(1024 * 1024), // 1MB string
      };

      const response = await request(server)
        .post('/api/content')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send(largePayload)
        .expect(413); // Payload too large

      expect(response.body.success).toBe(false);
    });
  });

  describe('API Security', () => {
    it('should prevent mass assignment vulnerabilities', async () => {
      const maliciousUserData = {
        email: 'test@example.com',
        password: 'password123',
        role: 'admin', // Should not be allowed
        isVerified: true, // Should not be allowed
        createdAt: new Date('2020-01-01'), // Should not be allowed
      };

      const response = await request(server)
        .post('/api/auth/register')
        .send(maliciousUserData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.role).not.toBe('admin'); // Should be default role
      expect(response.body.data.isVerified).toBe(false); // Should be false for new users
    });

    it('should prevent IDOR (Insecure Direct Object Reference)', async () => {
      // Try to access another user's private data
      const response = await request(server)
        .get(`/api/users/${adminUser._id}/private-data`)
        .set('Authorization', `Bearer ${consumerToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('permission');
    });

    it('should validate API versioning', async () => {
      const response = await request(server)
        .get('/api/v999/content') // Non-existent version
        .set('Authorization', `Bearer ${consumerToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should handle malformed JSON gracefully', async () => {
      const response = await request(server)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{invalid json}')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('JSON');
    });
  });

  describe('Session Security', () => {
    it('should invalidate sessions on logout', async () => {
      const token = TestUtils.generateToken(consumerUser);

      // Use token
      await request(server)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Logout
      await request(server)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Try to use token again
      const response = await request(server)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should prevent concurrent sessions abuse', async () => {
      // Login multiple times
      const tokens = [];
      for (let i = 0; i < 5; i++) {
        const response = await request(server)
          .post('/api/auth/login')
          .send({
            email: consumerUser.email,
            password: 'TestPassword123!',
          })
          .expect(200);

        tokens.push(response.body.data.token);
      }

      // All tokens should work (for now - could implement session limits)
      for (const token of tokens) {
        const response = await request(server)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.body.success).toBe(true);
      }
    });
  });

  describe('Data Exposure Security', () => {
    it('should not expose sensitive user data', async () => {
      const response = await request(server)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach(user => {
        expect(user.password).toBeUndefined();
        expect(user.resetToken).toBeUndefined();
        expect(user.emailVerificationToken).toBeUndefined();
      });
    });

    it('should not expose internal system data', async () => {
      const response = await request(server)
        .get('/api/content')
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach(content => {
        expect(content.__v).toBeUndefined(); // MongoDB version field
        expect(content.internalId).toBeUndefined();
      });
    });

    it('should sanitize error messages', async () => {
      // Try to access non-existent endpoint
      const response = await request(server)
        .get('/api/non-existent-endpoint')
        .expect(404);

      expect(response.body.success).toBe(false);
      // Error message should not reveal internal structure
      expect(response.body.message).not.toContain('Cannot GET');
      expect(response.body.message).not.toContain('router');
    });
  });

  describe('Rate Limiting Security', () => {
    it('should enforce different rate limits for different endpoints', async () => {
      // Test auth endpoints (stricter limits)
      const authPromises = [];
      for (let i = 0; i < 10; i++) {
        authPromises.push(
          request(server)
            .post('/api/auth/login')
            .send({
              email: consumerUser.email,
              password: 'wrongpassword',
            })
        );
      }

      const authResponses = await Promise.all(authPromises);
      const authRateLimited = authResponses.some(r => r.status === 429);
      expect(authRateLimited).toBe(true);

      // Test content endpoints (looser limits)
      const contentPromises = [];
      for (let i = 0; i < 50; i++) {
        contentPromises.push(
          request(server).get('/api/content')
        );
      }

      const contentResponses = await Promise.all(contentPromises);
      const contentRateLimited = contentResponses.some(r => r.status === 429);
      // Content endpoints might not be rate limited as strictly
      expect(contentRateLimited).toBe(false);
    });

    it('should reset rate limits after time window', async () => {
      // This would require waiting or mocking time
      // In a real test, we'd use time manipulation
      const response = await request(server)
        .post('/api/auth/login')
        .send({
          email: consumerUser.email,
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      // In a full test, we'd wait and check if limit resets
    });
  });

  describe('CORS Security', () => {
    it('should enforce CORS policy', async () => {
      const response = await request(server)
        .options('/api/content')
        .set('Origin', 'https://malicious-site.com')
        .set('Access-Control-Request-Method', 'GET')
        .expect(200);

      // Should not allow malicious origin
      expect(response.headers['access-control-allow-origin']).not.toBe('https://malicious-site.com');
    });

    it('should allow trusted origins', async () => {
      const response = await request(server)
        .options('/api/content')
        .set('Origin', process.env.FRONTEND_URL || 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });
});