/**
 * Moderation System Integration Tests
 */

const request = require('supertest');
const mongoose = require('mongoose');
const ModerationQueue = require('../models/ModerationQueue');
const ModerationFlag = require('../models/ModerationFlag');
const ModerationAuditLog = require('../models/ModerationAuditLog');
const Content = require('../models/Content');
const moderationService = require('../services/moderationService');
const reportingService = require('../services/reportingService');

// Assuming app is exported from index.js
let app;

describe('Moderation System Integration Tests', () => {
  const testContentId = 1;
  const testCreator = 'creator.stx';
  const testModerator = 'moderator.stx';
  const testAdmin = 'admin.stx';
  const testUser = 'user.stx';

  beforeAll(async () => {
    // Setup test app
    app = require('../index');

    // Create test content
    await Content.create({
      contentId: testContentId,
      title: 'Test Content',
      description: 'Test Description',
      contentType: 'video',
      price: 9.99,
      creator: testCreator,
      url: 'ipfs://test',
      isRemoved: false
    });
  });

  afterAll(async () => {
    // Cleanup
    await ModerationQueue.deleteMany({});
    await ModerationFlag.deleteMany({});
    await ModerationAuditLog.deleteMany({});
    await Content.deleteMany({});
  });

  describe('Flag Submission', () => {
    it('should submit a flag for content', async () => {
      const flagData = {
        contentId: testContentId,
        reason: 'adult-content',
        description: 'This content contains inappropriate material',
        userContact: { email: 'user@example.com', preferNotification: true }
      };

      const result = await reportingService.submitFlag(testContentId, {
        ...flagData,
        flaggedBy: testUser,
        ipAddress: '127.0.0.1',
        userAgent: 'Test User Agent'
      });

      expect(result.flag).toBeDefined();
      expect(result.flag.contentId).toBe(testContentId);
      expect(result.flag.reason).toBe('adult-content');
      expect(result.queue).toBeDefined();
      expect(result.queue.status).toBe('pending');
    });

    it('should prevent duplicate flags from same user within 24 hours', async () => {
      await reportingService.submitFlag(testContentId, {
        flaggedBy: testUser,
        reason: 'hate-speech',
        ipAddress: '127.0.0.1'
      });

      // Try to flag again
      expect(
        reportingService.submitFlag(testContentId, {
          flaggedBy: testUser,
          reason: 'hate-speech',
          ipAddress: '127.0.0.1'
        })
      ).rejects.toThrow('already reported');
    });

    it('should calculate correct severity based on reason', () => {
      const criticalSeverity = moderationService.calculateSeverity({
        reasons: ['illegal-content']
      });
      expect(criticalSeverity).toBe('critical');

      const highSeverity = moderationService.calculateSeverity({
        reasons: ['hate-speech']
      });
      expect(highSeverity).toBe('high');

      const mediumSeverity = moderationService.calculateSeverity({
        reasons: ['spam', 'misinformation', 'low-quality']
      });
      expect(mediumSeverity).toBe('medium');
    });

    it('should merge multiple flags into queue', async () => {
      const content = await Content.create({
        contentId: 2,
        title: 'Test Content 2',
        contentType: 'video',
        price: 9.99,
        creator: testCreator,
        url: 'ipfs://test2'
      });

      // Create first flag
      const flag1 = await reportingService.submitFlag(2, {
        flaggedBy: 'user1.stx',
        reason: 'violent-content',
        ipAddress: '127.0.0.1'
      });

      // Create second flag
      const flag2 = await reportingService.submitFlag(2, {
        flaggedBy: 'user2.stx',
        reason: 'harassment',
        ipAddress: '127.0.0.1'
      });

      expect(flag2.queue.flagCount).toBe(2);
      expect(flag2.queue.flags.length).toBe(2);

      await Content.deleteOne({ contentId: 2 });
    });
  });

  describe('Queue Management', () => {
    let queueId;

    beforeAll(async () => {
      const flag = await reportingService.submitFlag(testContentId, {
        flaggedBy: 'queuetest.stx',
        reason: 'copyright-violation',
        ipAddress: '127.0.0.1'
      });
      queueId = flag.queue.queueId;
    });

    it('should retrieve moderation queue', async () => {
      const result = await moderationService.getQueue({
        status: 'pending',
        limit: 10
      });

      expect(result.queue).toBeDefined();
      expect(Array.isArray(result.queue)).toBe(true);
      expect(result.total).toBeGreaterThan(0);
    });

    it('should assign queue to moderator', async () => {
      const result = await moderationService.assignToModerator(
        queueId,
        testModerator,
        'Assigned for review'
      );

      expect(result.status).toBe('under-review');
      expect(result.assignedModerator).toBe(testModerator);
      expect(result.assignedAt).toBeDefined();
    });

    it('should start review of content', async () => {
      const result = await moderationService.startReview(
        queueId,
        testModerator,
        'Starting review'
      );

      expect(result.status).toBe('under-review');
      expect(result.reviewStartedAt).toBeDefined();
    });

    it('should approve content and resolve flags', async () => {
      const result = await moderationService.approveContent(
        queueId,
        testModerator,
        'Content is appropriate'
      );

      expect(result.status).toBe('approved');
      expect(result.decision).toBe('approved');
      expect(result.reviewCompletedAt).toBeDefined();
    });
  });

  describe('Content Removal and Appeals', () => {
    let removalQueueId;

    beforeAll(async () => {
      const content = await Content.create({
        contentId: 3,
        title: 'Content for Removal Test',
        contentType: 'article',
        price: 5.99,
        creator: testCreator,
        url: 'ipfs://test3'
      });

      const flag = await reportingService.submitFlag(3, {
        flaggedBy: 'user3.stx',
        reason: 'illegal-content',
        ipAddress: '127.0.0.1'
      });
      removalQueueId = flag.queue.queueId;

      await moderationService.assignToModerator(removalQueueId, testModerator);
    });

    it('should reject content and mark for removal', async () => {
      const result = await moderationService.rejectContent(
        removalQueueId,
        testModerator,
        'illegal-content',
        'Content violates terms of service'
      );

      expect(result.status).toBe('removed');
      expect(result.decision).toBe('removed');
      expect(result.removalReason).toBe('illegal-content');
      expect(result.appealDeadline).toBeDefined();

      // Verify content is marked as removed
      const content = await Content.findOne({ contentId: 3 });
      expect(content.isRemoved).toBe(true);
      expect(content.removedAt).toBeDefined();
    });

    it('should file appeal against removal', async () => {
      const result = await moderationService.fileAppeal(
        removalQueueId,
        testCreator,
        'This content is incorrectly classified. It is not illegal material but educational content about legal issues.'
      );

      expect(result.status).toBe('appealed');
      expect(result.appealCount).toBe(1);
      expect(result.lastAppealAt).toBeDefined();
    });

    it('should prevent appeal after deadline', async () => {
      const queue = await ModerationQueue.findOne({ queueId: removalQueueId });
      queue.appealDeadline = new Date(Date.now() - 1000); // Past date
      await queue.save();

      expect(
        moderationService.fileAppeal(
          removalQueueId,
          testCreator,
          'Another appeal'
        )
      ).rejects.toThrow('deadline has passed');
    });
  });

  describe('Audit Logging', () => {
    it('should create audit log entries', async () => {
      const logs = await ModerationAuditLog.find({});
      expect(logs.length).toBeGreaterThan(0);
    });

    it('should track moderator actions', async () => {
      const moderatorLogs = await ModerationAuditLog.find({
        actor: 'moderator'
      });

      expect(Array.isArray(moderatorLogs)).toBe(true);
    });
  });

  describe('Analytics and Reporting', () => {
    it('should calculate moderation stats', async () => {
      const stats = await moderationService.getStats();

      expect(stats.byStatus).toBeDefined();
      expect(stats.bySeverity).toBeDefined();
      expect(stats.byContentType).toBeDefined();
      expect(typeof stats.removalRate).toBe('string');
      expect(stats.totalFlags).toBeGreaterThanOrEqual(0);
    });

    it('should get user flags', async () => {
      const result = await reportingService.getUserFlags(testUser);

      expect(result.flags).toBeDefined();
      expect(result.total).toBeGreaterThanOrEqual(0);
      expect(result.hasMore).toBeDefined();
    });

    it('should get content flags', async () => {
      const result = await reportingService.getContentFlags(testContentId);

      expect(result.flags).toBeDefined();
      expect(result.reasons).toBeDefined();
      expect(result.total).toBeGreaterThanOrEqual(0);
    });

    it('should get most flagged content', async () => {
      const mostFlagged = await reportingService.getMostFlaggedContent(5);

      expect(Array.isArray(mostFlagged)).toBe(true);
      if (mostFlagged.length > 0) {
        expect(mostFlagged[0].flagCount).toBeDefined();
        expect(mostFlagged[0]._id).toBeDefined();
      }
    });
  });

  describe('Validation', () => {
    it('should validate flag submission data', async () => {
      expect(async () => {
        await reportingService.submitFlag(testContentId, {
          flaggedBy: testUser,
          reason: 'invalid-reason',
          ipAddress: '127.0.0.1'
        });
      }).rejects.toThrow();
    });

    it('should validate content exists before flagging', async () => {
      expect(async () => {
        await reportingService.submitFlag(99999, {
          flaggedBy: testUser,
          reason: 'adult-content',
          ipAddress: '127.0.0.1'
        });
      }).rejects.toThrow('not found');
    });

    it('should validate removal reason', async () => {
      const flag = await reportingService.submitFlag(testContentId, {
        flaggedBy: 'validationtest.stx',
        reason: 'spam',
        ipAddress: '127.0.0.1'
      });

      const result = await moderationService.assignToModerator(
        flag.queue.queueId,
        testModerator
      );

      expect(async () => {
        await moderationService.rejectContent(
          result.queueId,
          testModerator,
          'invalid-reason'
        );
      }).rejects.toThrow();
    });
  });

  describe('API Endpoints', () => {
    it('POST /api/moderation/flag should submit flag', async () => {
      const response = await request(app)
        .post('/api/moderation/flag')
        .set('X-Wallet-Address', testUser)
        .send({
          contentId: testContentId,
          reason: 'misinformation',
          description: 'Factually incorrect information'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.flagId).toBeDefined();
      expect(response.body.data.queueId).toBeDefined();
    });

    it('GET /api/moderation/queue should require moderator auth', async () => {
      const response = await request(app)
        .get('/api/moderation/queue');

      expect(response.status).toBe(401);
    });

    it('GET /api/moderation/flags/user should get user flags', async () => {
      const response = await request(app)
        .get('/api/moderation/flags/user')
        .set('X-Wallet-Address', testUser);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.flags)).toBe(true);
    });
  });
});
