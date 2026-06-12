const request = require('supertest');
const express = require('express');

// Mock admin auth middleware to pass through
jest.mock('../middleware/adminAuth', () => ({
  adminAuthMiddleware: (req, res, next) => next()
}));

// Mock pinningService and pinningManager
jest.mock('../services/pinningService', () => ({
  pinningService: {
    getHealthStatus: jest.fn().mockReturnValue({
      providers: {},
      summary: { totalProviders: 0, enabledProviders: 0, healthyProviders: 0, serviceHealthy: false }
    }),
    getStorageUsage: jest.fn().mockResolvedValue({ providers: {}, summary: {} }),
    checkPinningStatus: jest.fn().mockResolvedValue({ hash: 'QmTest', status: {}, summary: {} }),
    pinExistingHash: jest.fn().mockResolvedValue({ hash: 'QmTest', pinned: [], errors: [], success: true }),
    unpinHash: jest.fn().mockResolvedValue({ hash: 'QmTest', unpinned: [], errors: [], success: true })
  },
  PROVIDERS: {}
}));

jest.mock('../services/pinningManager', () => ({
  pinningManager: {
    getStatus: jest.fn().mockReturnValue({ service: 'PinningManager', redundancyLevel: 2, pinningService: {} }),
    getPinningStats: jest.fn().mockResolvedValue({ content: {}, previews: {}, storage: {}, providers: {} }),
    repairContentPinning: jest.fn().mockResolvedValue({ success: true, repaired: false }),
    updateContentPinningInfo: jest.fn().mockResolvedValue({}),
    emergencyUnpinAll: jest.fn().mockResolvedValue({ success: true, unpinned: 0, failed: 0, totalProcessed: 0 }),
    performHealthCheck: jest.fn().mockResolvedValue({}),
    redundancyLevel: 2
  }
}));

jest.mock('../services/ipfsService', () => ({
  verifyCredentials: jest.fn().mockResolvedValue(true)
}));

jest.mock('../models/Content', () => ({
  findOne: jest.fn(),
  find: jest.fn().mockReturnValue({ select: jest.fn().mockReturnThis(), sort: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), skip: jest.fn().mockResolvedValue([]) }),
  countDocuments: jest.fn().mockResolvedValue(0),
  findByIdAndUpdate: jest.fn().mockResolvedValue({})
}));

jest.mock('../models/ContentPreview', () => ({
  findById: jest.fn()
}));

const pinningRoutes = require('../routes/pinningRoutes');

describe('IPFS Pinning Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/pinning', pinningRoutes);
  });

  describe('GET /api/pinning/status', () => {
    it('returns success with service and stats', async () => {
      const res = await request(app).get('/api/pinning/status');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('service');
      expect(res.body.data).toHaveProperty('stats');
    });
  });

  describe('GET /api/pinning/health', () => {
    it('returns success with health data', async () => {
      const res = await request(app).get('/api/pinning/health');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('summary');
    });
  });

  describe('GET /api/pinning/storage', () => {
    it('returns storage usage', async () => {
      const res = await request(app).get('/api/pinning/storage');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/pinning/verify-credentials', () => {
    it('returns credential validity', async () => {
      const res = await request(app).get('/api/pinning/verify-credentials');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('valid');
    });
  });

  describe('POST /api/pinning/content/:contentId/pin', () => {
    it('returns 404 when content not found', async () => {
      const Content = require('../models/Content');
      Content.findOne.mockResolvedValueOnce(null);
      const res = await request(app).post('/api/pinning/content/999/pin').send({ redundancy: 2 });
      expect(res.status).toBe(404);
    });

    it('returns 400 when content has no IPFS URL', async () => {
      const Content = require('../models/Content');
      Content.findOne.mockResolvedValueOnce({ contentId: 1, url: 'https://example.com/file.mp4' });
      const res = await request(app).post('/api/pinning/content/1/pin').send({});
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/pinning/emergency/unpin-all', () => {
    it('returns 400 without confirmation', async () => {
      const res = await request(app).post('/api/pinning/emergency/unpin-all').send({});
      expect(res.status).toBe(400);
    });

    it('succeeds with correct confirmation', async () => {
      const res = await request(app)
        .post('/api/pinning/emergency/unpin-all')
        .send({ confirmation: 'CONFIRM_UNPIN_ALL' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /api/pinning/health-check', () => {
    it('triggers health check and returns success', async () => {
      const res = await request(app).post('/api/pinning/health-check');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
