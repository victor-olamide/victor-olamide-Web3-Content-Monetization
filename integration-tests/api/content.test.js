/**
 * Content Management API Integration Tests
 * Tests for content creation, retrieval, updates, and moderation
 */

const request = require('supertest');
const mongoose = require('mongoose');
const Content = require('../../../backend/models/Content');
const User = require('../../../backend/models/User');
const TestUtils = require('../utils/test-setup');

describe('Content Management API Integration Tests', () => {
  let server;
  let creatorUser;
  let consumerUser;
  let testContent;
  let creatorToken;
  let consumerToken;

  beforeAll(async () => {
    // Setup test server
    const serverSetup = await TestUtils.setupTestServer();
    server = serverSetup.server;

    // Create test users
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
      description: 'Test description',
      price: 10,
      contentType: 'video',
    });
    const content = new Content(testContent);
    await content.save();
    testContent._id = content._id;
  });

  afterAll(async () => {
    await TestUtils.teardownTestServer(server);
  });

  describe('POST /api/content', () => {
    it('should create content successfully for creator', async () => {
      const newContent = TestUtils.generateContent({
        creator: creatorUser._id,
      });

      const response = await request(server)
        .post('/api/content')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send(newContent)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('_id');
      expect(response.body.data.title).toBe(newContent.title);
      expect(response.body.data.creator).toBe(creatorUser._id.toString());
    });

    it('should reject content creation for non-creator', async () => {
      const newContent = TestUtils.generateContent({
        creator: consumerUser._id,
      });

      const response = await request(server)
        .post('/api/content')
        .set('Authorization', `Bearer ${consumerToken}`)
        .send(newContent)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('creator');
    });

    it('should validate required fields', async () => {
      const response = await request(server)
        .post('/api/content')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('required');
    });

    it('should validate content type', async () => {
      const invalidContent = TestUtils.generateContent({
        creator: creatorUser._id,
        contentType: 'invalid-type',
      });

      const response = await request(server)
        .post('/api/content')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send(invalidContent)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('contentType');
    });
  });

  describe('GET /api/content', () => {
    it('should return public content list', async () => {
      const response = await request(server)
        .get('/api/content')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should filter content by type', async () => {
      const response = await request(server)
        .get('/api/content?contentType=video')
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach(content => {
        expect(content.contentType).toBe('video');
      });
    });

    it('should filter content by creator', async () => {
      const response = await request(server)
        .get(`/api/content?creator=${creatorUser._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach(content => {
        expect(content.creator._id || content.creator).toBe(creatorUser._id.toString());
      });
    });

    it('should support pagination', async () => {
      const response = await request(server)
        .get('/api/content?page=1&limit=5')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeLessThanOrEqual(5);
      expect(response.body).toHaveProperty('pagination');
    });
  });

  describe('GET /api/content/:id', () => {
    it('should return content details', async () => {
      const response = await request(server)
        .get(`/api/content/${testContent._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(testContent._id.toString());
      expect(response.body.data.title).toBe(testContent.title);
    });

    it('should return 404 for non-existent content', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(server)
        .get(`/api/content/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });
  });

  describe('PUT /api/content/:id', () => {
    it('should update content for creator', async () => {
      const updates = {
        title: 'Updated Title',
        description: 'Updated description',
      };

      const response = await request(server)
        .put(`/api/content/${testContent._id}`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(updates.title);
      expect(response.body.data.description).toBe(updates.description);
    });

    it('should reject update for non-creator', async () => {
      const updates = {
        title: 'Unauthorized Update',
      };

      const response = await request(server)
        .put(`/api/content/${testContent._id}`)
        .set('Authorization', `Bearer ${consumerToken}`)
        .send(updates)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('permission');
    });

    it('should reject update for non-existent content', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const updates = { title: 'Update' };

      const response = await request(server)
        .put(`/api/content/${fakeId}`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .send(updates)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/content/:id', () => {
    let contentToDelete;

    beforeEach(async () => {
      // Create content for deletion test
      contentToDelete = TestUtils.generateContent({
        creator: creatorUser._id,
      });
      const content = new Content(contentToDelete);
      await content.save();
      contentToDelete._id = content._id;
    });

    it('should delete content for creator', async () => {
      const response = await request(server)
        .delete(`/api/content/${contentToDelete._id}`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify content is deleted
      const deletedContent = await Content.findById(contentToDelete._id);
      expect(deletedContent).toBeNull();
    });

    it('should reject delete for non-creator', async () => {
      const response = await request(server)
        .delete(`/api/content/${contentToDelete._id}`)
        .set('Authorization', `Bearer ${consumerToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Content Moderation', () => {
    it('should flag content for moderation', async () => {
      const flagData = {
        reason: 'inappropriate_content',
        description: 'Contains inappropriate material',
      };

      const response = await request(server)
        .post(`/api/content/${testContent._id}/flag`)
        .set('Authorization', `Bearer ${consumerToken}`)
        .send(flagData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.reason).toBe(flagData.reason);
    });

    it('should validate flag reason', async () => {
      const invalidFlag = {
        reason: 'invalid_reason',
      };

      const response = await request(server)
        .post(`/api/content/${testContent._id}/flag`)
        .set('Authorization', `Bearer ${consumerToken}`)
        .send(invalidFlag)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Content Search', () => {
    it('should search content by title', async () => {
      const response = await request(server)
        .get('/api/content/search?q=Test')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      response.body.data.forEach(content => {
        expect(content.title.toLowerCase()).toContain('test');
      });
    });

    it('should search content by tags', async () => {
      const response = await request(server)
        .get('/api/content/search?tags=video')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('Content Analytics', () => {
    it('should track content views', async () => {
      const response = await request(server)
        .post(`/api/content/${testContent._id}/view`)
        .set('Authorization', `Bearer ${consumerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should get content statistics for creator', async () => {
      const response = await request(server)
        .get(`/api/content/${testContent._id}/stats`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('views');
      expect(response.body.data).toHaveProperty('likes');
    });
  });
});