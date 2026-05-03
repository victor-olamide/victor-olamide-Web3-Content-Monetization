const request = require('supertest');
const express = require('express');
const contentRoutes = require('../routes/contentRoutes');
const Content = require('../models/Content');
const Purchase = require('../models/Purchase');
const Refund = require('../models/Refund');

describe('Content Removal and Refund Integration Tests', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/content', contentRoutes);
  });

  describe('POST /api/content/:contentId/remove', () => {
    test('should require creator address header', async () => {
      const response = await request(app)
        .post('/api/content/1/remove')
        .send({ reason: 'Test removal' });

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('Authentication required');
    });

    test('should reject non-creator removal attempts', async () => {
      // Mock content with different creator
      const mockContent = {
        contentId: 1,
        title: 'Test',
        creator: 'SP1...actual-creator',
        price: 100,
        url: 'ipfs://...'
      };

      Content.findOne = jest.fn().mockResolvedValue(mockContent);

      const response = await request(app)
        .post('/api/content/1/remove')
        .set('x-creator-address', 'SP2...different-creator')
        .send({ reason: 'Unauthorized' });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Access denied');
    });

    test('should handle content not found', async () => {
      Content.findOne = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .post('/api/content/999/remove')
        .set('x-creator-address', 'SP1...creator')
        .send({ reason: 'Not found' });

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('Content not found');
    });
  });

  describe('GET /api/content/:contentId/refunds', () => {
    test('should require creator address', async () => {
      const response = await request(app)
        .get('/api/content/1/refunds');

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('Authentication required');
    });

    test('should return refunds for creator content', async () => {
      const mockContent = {
        contentId: 1,
        creator: 'SP1...creator',
        title: 'Test',
        price: 100,
        url: 'ipfs://...'
      };

      Content.findOne = jest.fn().mockResolvedValue(mockContent);
      Refund.find = jest.fn().mockResolvedValue([]);

      const response = await request(app)
        .get('/api/content/1/refunds')
        .set('x-creator-address', 'SP1...creator');

      expect(response.status).toBe(200);
      expect(response.body.contentId).toBe(1);
      expect(response.body.totalRefunds).toBe(0);
      expect(Array.isArray(response.body.refunds)).toBe(true);
    });
  });
});

describe('Refund Routes Integration Tests', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    const refundRoutes = require('../routes/refundRoutes');
    app.use('/api/refunds', refundRoutes);
  });

  describe('GET /api/refunds/user/:address', () => {
    test('should return empty array for user with no refunds', async () => {
      Refund.find = jest.fn().mockResolvedValue([]);

      const response = await request(app)
        .get('/api/refunds/user/SP1...user');

      expect(response.status).toBe(200);
      expect(response.body.user).toBe('SP1...user');
      expect(response.body.totalRefunds).toBe(0);
      expect(response.body.refunds).toEqual([]);
    });

    test('should return refunds for user', async () => {
      const mockRefunds = [
        {
          _id: '507f1f77bcf86cd799439011',
          contentId: 1,
          user: 'SP1...user',
          refundAmount: 100,
          status: 'completed'
        }
      ];

      Refund.find = jest.fn().mockResolvedValue(mockRefunds);

      const response = await request(app)
        .get('/api/refunds/user/SP1...user');

      expect(response.status).toBe(200);
      expect(response.body.totalRefunds).toBe(1);
      expect(response.body.refunds).toHaveLength(1);
    });
  });

  describe('GET /api/refunds/creator/:address', () => {
    test('should return refunds grouped by status', async () => {
      const mockRefunds = [
        {
          _id: '1',
          contentId: 1,
          status: 'pending',
          creator: 'SP1...creator',
          reason: 'content-removed'
        },
        {
          _id: '2',
          contentId: 2,
          status: 'completed',
          creator: 'SP1...creator',
          reason: 'content-removed'
        }
      ];

      Refund.find = jest.fn().mockResolvedValue(mockRefunds);

      const response = await request(app)
        .get('/api/refunds/creator/SP1...creator');

      expect(response.status).toBe(200);
      expect(response.body.creator).toBe('SP1...creator');
      expect(response.body.total).toBe(2);
      expect(response.body.byStatus.pending).toBe(1);
      expect(response.body.byStatus.completed).toBe(1);
    });
  });

  describe('POST /api/refunds/:id/approve', () => {
    test('should require approvedBy field', async () => {
      const response = await request(app)
        .post('/api/refunds/someid/approve')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('approvedBy');
    });
  });

  describe('POST /api/refunds/:id/complete', () => {
    test('should require txId field', async () => {
      const response = await request(app)
        .post('/api/refunds/someid/complete')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('txId');
    });
  });

  describe('GET /api/refunds/status/summary', () => {
    test('should return refund summary statistics', async () => {
      const mockRefunds = [
        { status: 'pending', reason: 'content-removed', refundAmount: 100 },
        { status: 'completed', reason: 'content-removed', refundAmount: 150 },
        { status: 'approved', reason: 'manual-request', refundAmount: 50 }
      ];

      Refund.find = jest.fn().mockResolvedValue(mockRefunds);

      const response = await request(app)
        .get('/api/refunds/status/summary');

      expect(response.status).toBe(200);
      expect(response.body.total).toBe(3);
      expect(response.body.byStatus.pending).toBe(1);
      expect(response.body.byStatus.completed).toBe(1);
      expect(response.body.byStatus.approved).toBe(1);
      expect(response.body.byReason['content-removed']).toBe(2);
      expect(response.body.byReason['manual-request']).toBe(1);
      expect(response.body.totalAmount).toBe(300);
    });
  });
});
