'use strict';

/**
 * Tests for GET /metrics and GET /metrics/summary (#196).
 */

const request = require('supertest');
const app = require('../server');

jest.mock('../config/database', () => ({
  connectDB: jest.fn().mockResolvedValue(undefined),
  disconnectDB: jest.fn().mockResolvedValue(undefined),
  getConnectionStatus: jest.fn().mockReturnValue({ isConnected: true, readyState: 1 }),
  healthCheck: jest.fn().mockResolvedValue({ status: 'healthy', message: 'ok' }),
  get isConnected() { return true; },
}));

jest.mock('../utils/validateEnv', () => ({ validateEnv: jest.fn() }));
jest.mock('../services/renewalScheduler', () => ({
  initializeRenewalScheduler: jest.fn(),
  stopRenewalScheduler: jest.fn(),
}));
jest.mock('../services/pinningManager', () => ({
  initializePinningService: jest.fn().mockResolvedValue(undefined),
  pinningManager: { stopMonitoring: jest.fn() },
}));
jest.mock('../services/verificationCacheEvictionJob', () => ({ startCacheEvictionJob: jest.fn() }));
jest.mock('../services/ppvTransactionIndexer', () => ({
  startIndexer: jest.fn(),
  stopIndexer: jest.fn(),
}));
jest.mock('../services/contentGateTransactionIndexer', () => ({
  startIndexer: jest.fn().mockResolvedValue(undefined),
  stopIndexer: jest.fn(),
  pollInterval: 30000,
}));

describe('GET /metrics', () => {
  it('returns 200 with Prometheus text format', async () => {
    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/plain/);
    expect(res.text).toMatch(/# HELP/);
    expect(res.text).toMatch(/# TYPE/);
  });

  it('includes http_requests_total metric', async () => {
    // Make a request to generate data
    await request(app).get('/health');
    const res = await request(app).get('/metrics');
    expect(res.text).toContain('http_requests_total');
  });

  it('includes http_request_duration_seconds metric', async () => {
    const res = await request(app).get('/metrics');
    expect(res.text).toContain('http_request_duration_seconds');
  });

  it('includes http_errors_total metric', async () => {
    const res = await request(app).get('/metrics');
    expect(res.text).toContain('http_errors_total');
  });

  it('includes active_users_total metric', async () => {
    const res = await request(app).get('/metrics');
    expect(res.text).toContain('active_users_total');
  });

  it('includes db_connection_state metric', async () => {
    const res = await request(app).get('/metrics');
    expect(res.text).toContain('db_connection_state');
  });

  it('includes process_uptime_seconds metric', async () => {
    const res = await request(app).get('/metrics');
    expect(res.text).toContain('process_uptime_seconds');
  });

  it('includes Node.js default metrics (node_ prefix)', async () => {
    const res = await request(app).get('/metrics');
    expect(res.text).toContain('node_');
  });
});

describe('GET /metrics/summary', () => {
  it('returns 200 with JSON object', async () => {
    const res = await request(app).get('/metrics/summary');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('metrics');
    expect(typeof res.body.metrics).toBe('object');
  });

  it('contains http_requests_total in summary', async () => {
    const res = await request(app).get('/metrics/summary');
    expect(res.body.metrics).toHaveProperty('http_requests_total');
  });

  it('contains http_request_duration_seconds in summary', async () => {
    const res = await request(app).get('/metrics/summary');
    expect(res.body.metrics).toHaveProperty('http_request_duration_seconds');
  });
});
