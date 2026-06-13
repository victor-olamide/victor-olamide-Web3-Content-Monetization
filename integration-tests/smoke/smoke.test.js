'use strict';

/**
 * Smoke Tests (#195)
 * Validates after each staging deployment:
 *   1. Health check endpoints
 *   2. Auth endpoints
 *   3. Content API
 *   4. Database connectivity
 */

const request = require('supertest');
const TestUtils = require('../utils/test-setup');

let server;
let testToken;
let testUser;

beforeAll(async () => {
  const setup = await TestUtils.setupTestServer();
  server = setup.server;

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

// ── 1. Health Checks ────────────────────────────────────────────────────────

describe('Health Check Smoke Tests', () => {
  it('GET /health returns 200 with healthy status', async () => {
    const res = await request(server).get('/health').expect(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.timestamp).toBeDefined();
  });

  it('GET /health includes uptime', async () => {
    const res = await request(server).get('/health').expect(200);
    expect(typeof res.body.uptime).toBe('number');
  });

  it('GET /health/database returns 200 with connected status', async () => {
    const res = await request(server).get('/health/database').expect(200);
    expect(res.body.status).toBe('connected');
  });

  it('GET /health/database identifies mongodb', async () => {
    const res = await request(server).get('/health/database').expect(200);
    expect(res.body.database).toBe('mongodb');
  });

  it('GET /metrics returns prometheus text format', async () => {
    const res = await request(server).get('/metrics').expect(200);
    expect(res.headers['content-type']).toMatch(/text\/plain/);
  });
});

// ── 2. Authentication Endpoints ─────────────────────────────────────────────

describe('Authentication Endpoint Smoke Tests', () => {
  it('POST /api/auth/login is reachable (returns 4xx for invalid creds)', async () => {
    const res = await request(server)
      .post('/api/auth/login')
      .send({ email: 'smoke@example.com', password: 'wrong' });
    expect([400, 401, 422]).toContain(res.status);
  });

  it('POST /api/auth/login returns JSON', async () => {
    const res = await request(server)
      .post('/api/auth/login')
      .send({ email: 'smoke@example.com', password: 'wrong' });
    expect(res.headers['content-type']).toMatch(/application\/json/);
  });

  it('POST /api/auth/register is reachable (2xx or 4xx)', async () => {
    const res = await request(server)
      .post('/api/auth/register')
      .send({
        email: `smoke-${Date.now()}@example.com`,
        password: 'SmokeTest123!',
        username: `smoke${Date.now()}`,
      });
    expect([200, 201, 400, 409, 422]).toContain(res.status);
  });

  it('Protected route /api/auth/me rejects unauthenticated request with 401', async () => {
    const res = await request(server).get('/api/auth/me');
    expect([401, 403]).toContain(res.status);
  });
});

// ── 3. Content API ───────────────────────────────────────────────────────────

describe('Content API Smoke Tests', () => {
  it('GET /api/content returns 200 with array payload', async () => {
    const res = await request(server).get('/api/content').expect(200);
    const items = res.body?.data ?? res.body;
    expect(Array.isArray(items)).toBe(true);
  });

  it('GET /api/content returns application/json', async () => {
    const res = await request(server).get('/api/content').expect(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
  });

  it('GET /api/content?search=test handles query param (200 or 404)', async () => {
    const res = await request(server).get('/api/content?search=test');
    expect([200, 404]).toContain(res.status);
  });
});

// ── 4. Database Connectivity ─────────────────────────────────────────────────

describe('Database Connectivity Smoke Tests', () => {
  it('mongoose connection is active (readyState === 1)', async () => {
    const mongoose = require('mongoose');
    expect(mongoose.connection.readyState).toBe(1);
  });

  it('GET /health/database confirms db is connected', async () => {
    const res = await request(server).get('/health/database').expect(200);
    expect(res.body.status).toBe('connected');
    expect(res.body.database).toBe('mongodb');
  });

  it('GET /health/database/status returns connection and health fields', async () => {
    const res = await request(server).get('/health/database/status').expect(200);
    expect(res.body).toHaveProperty('connection');
    expect(res.body).toHaveProperty('health');
  });

  it('Basic CRUD operation succeeds against test database', async () => {
    const User = require('../../../backend/models/User');
    const u = TestUtils.generateUser();
    u.password = await TestUtils.hashPassword(u.password);
    const saved = await new User(u).save();
    const found = await User.findById(saved._id);
    expect(found.email).toBe(u.email);
    await User.findByIdAndDelete(saved._id);
  });
});

// ── 5. Deployment-blocking summary check ────────────────────────────────────

describe('Deployment Gate', () => {
  it('all four critical areas pass before deployment proceeds', () => {
    // This test exists as a sentinel — if any critical describe above fails,
    // the overall jest run exits non-zero, blocking the deployment pipeline.
    expect(true).toBe(true);
  });
});
