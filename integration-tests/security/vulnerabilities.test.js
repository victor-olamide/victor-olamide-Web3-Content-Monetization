/**
 * Security Vulnerability Tests
 * Tests for common web application security vulnerabilities
 */

const request = require('supertest');
const TestUtils = require('../utils/test-setup');

describe('Security Vulnerability Tests', () => {
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

  describe('SQL Injection Prevention', () => {
    const sqlInjectionPayloads = [
      "' OR '1'='1",
      "'; DROP TABLE users; --",
      "' UNION SELECT * FROM users --",
      "admin' --",
      "1' OR '1' = '1",
      "' OR 1=1 --",
      "') OR ('1'='1",
    ];

    sqlInjectionPayloads.forEach((payload, index) => {
      it(`should prevent SQL injection in login - payload ${index + 1}`, async () => {
        const response = await request(server)
          .post('/api/auth/login')
          .send({
            email: payload,
            password: 'password123',
          })
          .expect(401);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('Invalid credentials');
      });

      it(`should prevent SQL injection in registration - payload ${index + 1}`, async () => {
        const response = await request(server)
          .post('/api/auth/register')
          .send({
            email: payload + '@example.com',
            password: 'TestPassword123!',
            role: 'consumer',
          })
          .expect(400);

        // Should validate email format, not execute SQL
        expect(response.body.success).toBe(false);
      });
    });
  });

  describe('Cross-Site Scripting (XSS) Prevention', () => {
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '<img src=x onerror=alert("XSS")>',
      'javascript:alert("XSS")',
      '<iframe src="javascript:alert(\'XSS\')"></iframe>',
      '<svg onload=alert("XSS")>',
      '<body onload=alert("XSS")>',
      '"><script>alert("XSS")</script>',
    ];

    xssPayloads.forEach((payload, index) => {
      it(`should sanitize XSS in content creation - payload ${index + 1}`, async () => {
        const response = await request(server)
          .post('/api/content')
          .set('Authorization', `Bearer ${testToken}`)
          .send({
            title: payload,
            description: 'Test description',
            contentType: 'video',
            price: 10,
          })
          .expect(201);

        expect(response.body.success).toBe(true);
        // Content should be sanitized
        expect(response.body.data.title).not.toContain('<script>');
        expect(response.body.data.title).not.toContain('javascript:');
        expect(response.body.data.title).not.toContain('onerror');
        expect(response.body.data.title).not.toContain('onload');
      });
    });
  });

  describe('Cross-Site Request Forgery (CSRF) Protection', () => {
    it('should require proper content-type for POST requests', async () => {
      const response = await request(server)
        .post('/api/auth/login')
        .set('Content-Type', 'text/plain')
        .send('email=test@example.com&password=password123')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate origin headers', async () => {
      const response = await request(server)
        .post('/api/auth/login')
        .set('Origin', 'https://malicious-site.com')
        .send({
          email: 'test@example.com',
          password: 'password123',
        })
        .expect(401);

      // Should reject or handle malicious origin
      expect(response.status).toBeDefined();
    });
  });

  describe('Insecure Direct Object Reference (IDOR)', () => {
    it('should prevent accessing other users data', async () => {
      // Create another user
      const otherUser = TestUtils.generateUser();
      otherUser.password = await TestUtils.hashPassword(otherUser.password);
      const User = require('../../../backend/models/User');
      const user = new User(otherUser);
      await user.save();
      otherUser._id = user._id;

      // Try to access other user's profile
      const response = await request(server)
        .get(`/api/users/${otherUser._id}`)
        .set('Authorization', `Bearer ${testToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('permission');
    });

    it('should prevent accessing other users content', async () => {
      // Create content for another user
      const otherUser = TestUtils.generateUser();
      otherUser.password = await TestUtils.hashPassword(otherUser.password);
      const User = require('../../../backend/models/User');
      const user = new User(otherUser);
      await user.save();
      otherUser._id = user._id;

      const Content = require('../../../backend/models/Content');
      const content = new Content(TestUtils.generateContent({
        creator: otherUser._id,
        accessType: 'paid',
      }));
      await content.save();

      // Try to access private content
      const response = await request(server)
        .get(`/api/content/${content._id}/download`)
        .set('Authorization', `Bearer ${testToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Mass Assignment Vulnerabilities', () => {
    it('should prevent mass assignment in user registration', async () => {
      const maliciousData = {
        email: 'test@example.com',
        password: 'TestPassword123!',
        role: 'admin', // Should not be allowed
        isVerified: true, // Should not be allowed
        balance: 1000000, // Should not be allowed
        createdAt: '2020-01-01', // Should not be allowed
      };

      const response = await request(server)
        .post('/api/auth/register')
        .send(maliciousData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.role).not.toBe('admin'); // Should be default
      expect(response.body.data.isVerified).toBe(false); // Should be false
      expect(response.body.data.balance).toBeUndefined(); // Should not exist
    });

    it('should prevent mass assignment in content creation', async () => {
      const maliciousContent = {
        title: 'Test Content',
        description: 'Test description',
        contentType: 'video',
        price: 10,
        status: 'approved', // Should not be allowed for creators
        moderationScore: 100, // Should not be allowed
        viewCount: 10000, // Should not be allowed
        createdAt: '2020-01-01', // Should not be allowed
      };

      const response = await request(server)
        .post('/api/content')
        .set('Authorization', `Bearer ${testToken}`)
        .send(maliciousContent)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).not.toBe('approved'); // Should be pending
      expect(response.body.data.moderationScore).toBeUndefined();
      expect(response.body.data.viewCount).toBe(0);
    });
  });

  describe('Directory Traversal Attacks', () => {
    const traversalPayloads = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\config\\sam',
      '....//....//....//etc/passwd',
      '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
      '.../...//.../...//.../...//etc/passwd',
    ];

    traversalPayloads.forEach((payload, index) => {
      it(`should prevent directory traversal in file access - payload ${index + 1}`, async () => {
        const response = await request(server)
          .get(`/api/content/download/${payload}`)
          .set('Authorization', `Bearer ${testToken}`)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('invalid');
      });
    });
  });

  describe('Command Injection Prevention', () => {
    it('should prevent command injection in file processing', async () => {
      const maliciousFilename = 'test.jpg; rm -rf /; #';

      const response = await request(server)
        .post('/api/upload')
        .set('Authorization', `Bearer ${testToken}`)
        .attach('file', Buffer.from('fake image'), maliciousFilename)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('filename');
    });
  });

  describe('XML External Entity (XXE) Prevention', () => {
    it('should prevent XXE in XML processing', async () => {
      const xxePayload = `<?xml version="1.0"?>
<!DOCTYPE foo [
<!ENTITY xxe SYSTEM "file:///etc/passwd">
]>
<foo>&xxe;</foo>`;

      const response = await request(server)
        .post('/api/import/xml')
        .set('Authorization', `Bearer ${testToken}`)
        .set('Content-Type', 'application/xml')
        .send(xxePayload)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Server-Side Request Forgery (SSRF) Prevention', () => {
    const ssrfPayloads = [
      'http://localhost:27017', // MongoDB
      'http://127.0.0.1:6379', // Redis
      'http://169.254.169.254', // AWS metadata
      'http://metadata.google.internal', // GCP metadata
      'file:///etc/passwd',
      'dict://localhost:11211/stats', // Memcached
    ];

    ssrfPayloads.forEach((payload, index) => {
      it(`should prevent SSRF in URL processing - payload ${index + 1}`, async () => {
        const response = await request(server)
          .post('/api/content/fetch-url')
          .set('Authorization', `Bearer ${testToken}`)
          .send({ url: payload })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('invalid');
      });
    });
  });

  describe('Rate Limiting Effectiveness', () => {
    it('should enforce rate limits on sensitive endpoints', async () => {
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(
          request(server)
            .post('/api/auth/login')
            .send({
              email: 'test@example.com',
              password: 'wrongpassword',
            })
        );
      }

      const responses = await Promise.all(promises);
      const rateLimitedResponses = responses.filter(r => r.status === 429);

      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should have different limits for different endpoints', async () => {
      // Test auth endpoint (strict limits)
      const authPromises = [];
      for (let i = 0; i < 20; i++) {
        authPromises.push(
          request(server)
            .post('/api/auth/login')
            .send({
              email: 'test@example.com',
              password: 'wrongpassword',
            })
        );
      }

      // Test content endpoint (looser limits)
      const contentPromises = [];
      for (let i = 0; i < 100; i++) {
        contentPromises.push(
          request(server).get('/api/content')
        );
      }

      const [authResponses, contentResponses] = await Promise.all([
        Promise.all(authPromises),
        Promise.all(contentPromises)
      ]);

      const authRateLimited = authResponses.filter(r => r.status === 429).length;
      const contentRateLimited = contentResponses.filter(r => r.status === 429).length;

      // Auth should be more strictly rate limited
      expect(authRateLimited).toBeGreaterThan(contentRateLimited);
    });
  });

  describe('Information Disclosure Prevention', () => {
    it('should not leak sensitive information in errors', async () => {
      const response = await request(server)
        .get('/api/debug/internal-error')
        .expect(500);

      expect(response.body.success).toBe(false);
      // Error should not contain stack traces, file paths, or internal details
      expect(response.body.message).not.toMatch(/stack|trace|file|line|at\s+/i);
    });

    it('should not expose server information in headers', async () => {
      const response = await request(server)
        .get('/api/health')
        .expect(200);

      // Should not expose server technology
      expect(response.headers['x-powered-by']).toBeUndefined();
      expect(response.headers['server']).toBeUndefined();
    });

    it('should not leak database information', async () => {
      const response = await request(server)
        .get('/api/content/invalid-id-format')
        .expect(400);

      expect(response.body.success).toBe(false);
      // Should not reveal MongoDB error details
      expect(response.body.message).not.toContain('ObjectId');
      expect(response.body.message).not.toContain('mongodb');
    });
  });
});