'use strict';

/**
 * Tests for GET /health, /health/live, /health/ready, /health/database (#196).
 */

const request = require('supertest');
const app = require('../server');

// Mock database module so tests don't need a real MongoDB
jest.mock('../config/database', () => ({
  connectDB: jest.fn().mockResolvedValue(undefined),
  disconnectDB: jest.fn().mockResolvedValue(undefined),
  getConnectionStatus: jest.fn().mockReturnValue({
    isConnected: true,
    readyState: 1,
    host: 'localhost',
    port: 27017,
    name: 'test',
  }),
  healthCheck: jest.fn().mockResolvedValue({ status: 'healthy', message: 'MongoDB is reachable' }),
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

describe('GET /health', () => {
  it('returns 200 with healthy status when DB is up', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body).toHaveProperty('uptime');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body.database.status).toBe('connected');
  });

  it('returns process info in health response', async () => {
    const res = await request(app).get('/health');
    expect(res.body.process).toHaveProperty('nodeVersion');
    expect(res.body.process).toHaveProperty('platform');
    expect(res.body.process).toHaveProperty('pid');
    expect(res.body.process).toHaveProperty('memoryMB');
  });

  it('returns 503 with degraded status when DB is down', async () => {
    const { healthCheck } = require('../config/database');
    healthCheck.mockResolvedValueOnce({ status: 'unhealthy', message: 'Connection refused' });
    const res = await request(app).get('/health');
    expect(res.status).toBe(503);
    expect(res.body.status).toBe('degraded');
    expect(res.body.database.status).toBe('disconnected');
  });
});

describe('GET /health/live', () => {
  it('returns 200 with alive status', async () => {
    const res = await request(app).get('/health/live');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('alive');
    expect(res.body).toHaveProperty('uptime');
    expect(res.body).toHaveProperty('pid');
  });
});

describe('GET /health/ready', () => {
  it('returns 200 when DB is reachable', async () => {
    const res = await request(app).get('/health/ready');
    expect(res.status).toBe(200);
    expect(res.body.ready).toBe(true);
  });

  it('returns 503 when DB is not reachable', async () => {
    const { healthCheck } = require('../config/database');
    healthCheck.mockResolvedValueOnce({ status: 'unhealthy', message: 'ping failed' });
    const res = await request(app).get('/health/ready');
    expect(res.status).toBe(503);
    expect(res.body.ready).toBe(false);
  });
});

describe('GET /health/database', () => {
  it('returns 200 when DB is healthy', async () => {
    const res = await request(app).get('/health/database');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('connected');
  });

  it('returns 503 when DB is unhealthy', async () => {
    const { healthCheck } = require('../config/database');
    healthCheck.mockResolvedValueOnce({ status: 'unhealthy', message: 'timed out' });
    const res = await request(app).get('/health/database');
    expect(res.status).toBe(503);
    expect(res.body.status).toBe('disconnected');
  });
});
