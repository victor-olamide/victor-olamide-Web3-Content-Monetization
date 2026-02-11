const request = require('supertest');
const app = require('../index');
const ContentPreview = require('../models/ContentPreview');
const Content = require('../models/Content');
const Purchase = require('../models/Purchase');

describe('Preview API Integration Tests', () => {
  const testContentId = 1;
  const testCreator = 'creator.stx';
  const testUser = 'user.stx';

  beforeAll(async () => {
    // Setup test data
    await Content.create({
      contentId: testContentId,
      title: 'Test Content',
      description: 'Test Description',
      contentType: 'video',
      price: 9.99,
      creator: testCreator,
      url: 'ipfs://test'
    });
  });

  afterAll(async () => {
    // Cleanup
    await ContentPreview.deleteMany({});
    await Content.deleteMany({});
    await Purchase.deleteMany({});
  });

  describe('GET /api/preview/:contentId', () => {
    it('should get preview for existing content', async () => {
      // Create a preview first
      await ContentPreview.create({
        contentId: testContentId,
        title: 'Test Content',
        description: 'Test Description',
        contentType: 'video',
        price: 9.99,
        creator: testCreator,
        previewEnabled: true,
        thumbnailUrl: 'ipfs://Qm123',
        totalViews: 10
      });

      const response = await request(app)
        .get(`/api/preview/${testContentId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.contentId).toBe(testContentId);
      expect(response.body.data.title).toBe('Test Content');
      expect(response.body.data.totalViews).toBeGreaterThan(10);
    });

    it('should return 404 for non-existent preview', async () => {
      const response = await request(app)
        .get('/api/preview/99999')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Preview not available');
    });
  });

  describe('POST /api/preview/batch/get', () => {
    it('should retrieve multiple previews', async () => {
      // Create additional previews
      const contentId2 = 2;
      const contentId3 = 3;

      await Content.create({
        contentId: contentId2,
        title: 'Content 2',
        description: 'Description 2',
        contentType: 'article',
        price: 5.99,
        creator: testCreator,
        url: 'ipfs://test2'
      });

      await ContentPreview.create({
        contentId: contentId2,
        title: 'Content 2',
        description: 'Description 2',
        contentType: 'article',
        price: 5.99,
        creator: testCreator,
        previewEnabled: true
      });

      const response = await request(app)
        .post('/api/preview/batch/get')
        .send({
          contentIds: [testContentId, contentId2]
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle empty array', async () => {
      const response = await request(app)
        .post('/api/preview/batch/get')
        .send({
          contentIds: []
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/preview/type/:contentType', () => {
    it('should get previews by content type', async () => {
      const response = await request(app)
        .get('/api/preview/type/video?limit=10&skip=0')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('total');
      expect(Array.isArray(response.body.data.data)).toBe(true);
    });
  });

  describe('GET /api/preview/trending', () => {
    it('should get trending previews', async () => {
      const response = await request(app)
        .get('/api/preview/trending?limit=10&days=7')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/preview/:contentId/access/:userAddress', () => {
    it('should return preview-only access for non-purchaser', async () => {
      const response = await request(app)
        .get(`/api/preview/${testContentId}/access/${testUser}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.contentId).toBe(testContentId);
      expect(response.body.data.hasAccess).toBe(false);
      expect(response.body.data.accessType).toBe('preview_only');
    });

    it('should return purchased access for buyer', async () => {
      // Create a purchase record
      await Purchase.create({
        contentId: testContentId,
        buyerAddress: testUser,
        sellerAddress: testCreator,
        amount: 9.99,
        status: 'completed',
        transactionHash: 'test-hash-123'
      });

      const response = await request(app)
        .get(`/api/preview/${testContentId}/access/${testUser}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.hasAccess).toBe(true);
      expect(response.body.data.accessType).toBe('purchased');
    });
  });

  describe('POST /api/preview/:contentId/download', () => {
    it('should record preview download', async () => {
      const response = await request(app)
        .post(`/api/preview/${testContentId}/download`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalPreviewDownloads');
    });
  });

  describe('GET /api/preview/stats/:creatorAddress', () => {
    it('should get creator preview statistics', async () => {
      const response = await request(app)
        .get(`/api/preview/stats/${testCreator}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalPreviews');
      expect(response.body.data).toHaveProperty('totalPreviewViews');
      expect(response.body.data).toHaveProperty('totalPreviewDownloads');
      expect(response.body.data).toHaveProperty('contentWithPreviews');
      expect(response.body.data).toHaveProperty('previewBreakdown');
    });

    it('should return empty stats for unknown creator', async () => {
      const response = await request(app)
        .get('/api/preview/stats/unknown.stx')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalPreviews).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid content ID', async () => {
      const response = await request(app)
        .get('/api/preview/invalid')
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should handle invalid batch request', async () => {
      const response = await request(app)
        .post('/api/preview/batch/get')
        .send({
          contentIds: 'not-an-array'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle missing file in upload', async () => {
      const response = await request(app)
        .post(`/api/preview/${testContentId}/thumbnail`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Authorization', () => {
    it('should reject thumbnail upload without auth', async () => {
      const response = await request(app)
        .post(`/api/preview/${testContentId}/thumbnail`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should reject metadata update without auth', async () => {
      const response = await request(app)
        .patch(`/api/preview/${testContentId}/metadata`)
        .send({
          previewText: 'Updated text'
        })
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Pagination', () => {
    it('should respect skip and limit parameters', async () => {
      const response = await request(app)
        .get('/api/preview/type/video?skip=0&limit=5')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('skip');
      expect(response.body.data).toHaveProperty('limit');
      expect(response.body.data.skip).toBe(0);
      expect(response.body.data.limit).toBe(5);
    });
  });

  describe('Data Validation', () => {
    it('should validate file type on upload', async () => {
      const response = await request(app)
        .post(`/api/preview/${testContentId}/thumbnail`)
        .attach('thumbnail', Buffer.from('test'), 'test.txt')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle very large requests', async () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => i + 1);

      const response = await request(app)
        .post('/api/preview/batch/get')
        .send({
          contentIds: largeArray
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});
