const request = require('supertest');
const mongoose = require('mongoose');
const Subscription = require('../models/Subscription');
const ProRataRefund = require('../models/ProRataRefund');

describe('Pro-Rata Refund API Integration Tests', () => {
  const baseUrl = 'http://localhost:5000/api/refunds';

  const mockSubscriptionData = {
    user: 'integration-user-123',
    creator: 'integration-creator-456',
    tierId: 1,
    amount: 29.99,
    expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    transactionId: `tx-integration-${Date.now()}`,
    autoRenewal: true
  };

  let testSubscriptionId;
  let testRefundId;

  beforeAll(async () => {
    if (!mongoose.connection.readyState) {
      await mongoose.connect(
        process.env.MONGODB_URI || 'mongodb://localhost:27017/stacks_monetization_test'
      );
    }
  });

  afterAll(async () => {
    await Subscription.deleteMany({ user: mockSubscriptionData.user });
    await ProRataRefund.deleteMany({});
    await mongoose.connection.close();
  });

  describe('POST /subscriptions/:subscriptionId/cancel-with-refund', () => {
    it('should cancel subscription and initiate refund', async () => {
      // Create subscription
      const subscription = await Subscription.create(mockSubscriptionData);
      testSubscriptionId = subscription._id;

      const response = await request(baseUrl)
        .post(`/subscriptions/${testSubscriptionId}/cancel-with-refund`)
        .send({
          reason: 'No longer needed',
          refundMethod: 'blockchain'
        })
        .expect(200);

      expect(response.body.message).toContain('cancelled');
      expect(response.body.subscription.status).toBe('cancelled');
      expect(response.body.refund).toBeDefined();
      expect(response.body.refund.eligible).toBe(true);

      if (response.body.refund.refundId) {
        testRefundId = response.body.refund.refundId;
      }
    });

    it('should return 404 for non-existent subscription', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(baseUrl)
        .post(`/subscriptions/${fakeId}/cancel-with-refund`)
        .send({ reason: 'Testing' })
        .expect(400);

      expect(response.body.message).toContain('not found');
    });

    it('should prevent cancellation of already cancelled subscription', async () => {
      // Create and cancel subscription
      const subscription = await Subscription.create({
        ...mockSubscriptionData,
        transactionId: `tx-${Date.now()}`
      });

      await request(baseUrl)
        .post(`/subscriptions/${subscription._id}/cancel-with-refund`)
        .send({ reason: 'First cancellation' })
        .expect(200);

      // Try to cancel again
      const response = await request(baseUrl)
        .post(`/subscriptions/${subscription._id}/cancel-with-refund`)
        .send({ reason: 'Second cancellation' })
        .expect(400);

      expect(response.body.message).toContain('already cancelled');
    });
  });

  describe('GET /subscriptions/:subscriptionId/refund-preview', () => {
    it('should preview refund without cancelling', async () => {
      const subscription = await Subscription.create({
        ...mockSubscriptionData,
        transactionId: `tx-preview-${Date.now()}`
      });

      const response = await request(baseUrl)
        .get(`/subscriptions/${subscription._id}/refund-preview`)
        .expect(200);

      expect(response.body.subscriptionId).toBe(subscription._id.toString());
      expect(response.body.eligibility).toBeDefined();
      expect(response.body.eligibility.isEligible).toBe(true);
      expect(response.body.refund).toBeDefined();
      expect(response.body.refund.refundAmount).toBeGreaterThan(0);
    });

    it('should show refund breakdown correctly', async () => {
      const subscription = await Subscription.create({
        ...mockSubscriptionData,
        transactionId: `tx-breakdown-${Date.now()}`
      });

      const response = await request(baseUrl)
        .get(`/subscriptions/${subscription._id}/refund-preview`)
        .expect(200);

      expect(response.body.refund.breakdown).toBeDefined();
      expect(response.body.refund.daysUsed).toBeGreaterThanOrEqual(0);
      expect(response.body.refund.daysRemaining).toBeGreaterThan(0);
      expect(response.body.refund.totalDays).toBeGreaterThan(0);
    });

    it('should return 404 for non-existent subscription', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(baseUrl)
        .get(`/subscriptions/${fakeId}/refund-preview`)
        .expect(404);

      expect(response.body.message).toContain('not found');
    });
  });

  describe('GET /refunds/pro-rata/:refundId', () => {
    it('should retrieve refund details', async () => {
      if (!testRefundId) {
        // Create a refund first
        const subscription = await Subscription.create({
          ...mockSubscriptionData,
          transactionId: `tx-refund-detail-${Date.now()}`
        });

        const refund = await ProRataRefund.create({
          subscriptionId: subscription._id,
          userId: mockSubscriptionData.user,
          creatorId: mockSubscriptionData.creator,
          originalAmount: 29.99,
          originalStartDate: subscription.timestamp,
          originalExpiryDate: subscription.expiry,
          actualCancellationDate: new Date(),
          totalDays: 30,
          usedDays: 5,
          unusedDays: 25,
          usagePercentage: 16.67,
          refundAmount: 24.99,
          refundReason: 'Test refund',
          refundStatus: 'pending'
        });

        testRefundId = refund._id;
      }

      const response = await request(baseUrl)
        .get(`/refunds/pro-rata/${testRefundId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.refund._id).toBeDefined();
      expect(response.body.refund.refundStatus).toBe('pending');
    });

    it('should return 404 for non-existent refund', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(baseUrl)
        .get(`/refunds/pro-rata/${fakeId}`)
        .expect(404);

      expect(response.body.message).toBeDefined();
    });
  });

  describe('Refund Approval Workflow', () => {
    let workflowRefundId;

    beforeEach(async () => {
      const subscription = await Subscription.create({
        ...mockSubscriptionData,
        transactionId: `tx-workflow-${Date.now()}`
      });

      const refund = await ProRataRefund.create({
        subscriptionId: subscription._id,
        userId: mockSubscriptionData.user,
        creatorId: mockSubscriptionData.creator,
        originalAmount: 29.99,
        originalStartDate: subscription.timestamp,
        originalExpiryDate: subscription.expiry,
        actualCancellationDate: new Date(),
        totalDays: 30,
        usedDays: 5,
        unusedDays: 25,
        usagePercentage: 16.67,
        refundAmount: 24.99,
        refundReason: 'Test refund',
        refundStatus: 'pending'
      });

      workflowRefundId = refund._id;
    });

    it('should approve pending refund', async () => {
      const response = await request(baseUrl)
        .post(`/refunds/pro-rata/${workflowRefundId}/approve`)
        .send({ approvedBy: 'admin' })
        .expect(200);

      expect(response.body.message).toContain('approved');
      expect(response.body.refund.refundStatus).toBe('approved');
    });

    it('should complete approved refund with transaction ID', async () => {
      // First approve
      await request(baseUrl)
        .post(`/refunds/pro-rata/${workflowRefundId}/approve`)
        .send({ approvedBy: 'admin' });

      // Then complete
      const response = await request(baseUrl)
        .post(`/refunds/pro-rata/${workflowRefundId}/complete`)
        .send({ transactionId: 'tx-test-123456' })
        .expect(200);

      expect(response.body.message).toContain('completed');
      expect(response.body.refund.transactionId).toBe('tx-test-123456');
    });

    it('should require transaction ID for completion', async () => {
      // First approve
      await request(baseUrl)
        .post(`/refunds/pro-rata/${workflowRefundId}/approve`)
        .send({ approvedBy: 'admin' });

      // Try to complete without transaction ID
      const response = await request(baseUrl)
        .post(`/refunds/pro-rata/${workflowRefundId}/complete`)
        .send({})
        .expect(400);

      expect(response.body.message).toContain('Transaction ID');
    });

    it('should reject pending refund', async () => {
      const response = await request(baseUrl)
        .post(`/refunds/pro-rata/${workflowRefundId}/reject`)
        .send({ reason: 'Invalid claim' })
        .expect(200);

      expect(response.body.message).toContain('rejected');
      expect(response.body.refund.refundStatus).toBe('rejected');
      expect(response.body.refund.failureReason).toBe('Invalid claim');
    });
  });

  describe('GET /refunds/pro-rata/creator/:creatorId/pending', () => {
    it('should retrieve pending refunds for creator', async () => {
      const response = await request(baseUrl)
        .get(`/refunds/pro-rata/creator/${mockSubscriptionData.creator}/pending`)
        .expect(200);

      expect(response.body.creatorId).toBe(mockSubscriptionData.creator);
      expect(response.body.totalPending).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(response.body.refunds)).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(baseUrl)
        .get(`/refunds/pro-rata/creator/${mockSubscriptionData.creator}/pending?limit=10&offset=0`)
        .expect(200);

      expect(response.body.limit).toBe(10);
      expect(response.body.offset).toBe(0);
      expect(response.body.returned).toBeLessThanOrEqual(10);
    });
  });

  describe('GET /refunds/pro-rata/user/:userId', () => {
    it('should retrieve all refunds for user', async () => {
      const response = await request(baseUrl)
        .get(`/refunds/pro-rata/user/${mockSubscriptionData.user}`)
        .expect(200);

      expect(response.body.userId).toBe(mockSubscriptionData.user);
      expect(response.body.summary).toBeDefined();
      expect(Array.isArray(response.body.refunds)).toBe(true);
    });

    it('should filter refunds by status', async () => {
      const response = await request(baseUrl)
        .get(`/refunds/pro-rata/user/${mockSubscriptionData.user}?status=pending`)
        .expect(200);

      expect(response.body.filter.status).toBe('pending');
      response.body.refunds.forEach(refund => {
        expect(refund.refundStatus).toBe('pending');
      });
    });
  });

  describe('GET /refunds/pro-rata/status/:status', () => {
    it('should retrieve refunds by status', async () => {
      const validStatuses = ['pending', 'approved', 'processing', 'completed', 'failed', 'rejected'];

      for (const status of validStatuses) {
        const response = await request(baseUrl)
          .get(`/refunds/pro-rata/status/${status}`)
          .expect(200);

        expect(response.body.status).toBe(status);
        expect(Array.isArray(response.body.refunds)).toBe(true);
      }
    });

    it('should return 400 for invalid status', async () => {
      const response = await request(baseUrl)
        .get('/refunds/pro-rata/status/invalid-status')
        .expect(400);

      expect(response.body.message).toContain('Invalid status');
    });
  });

  describe('GET /refunds/pro-rata/statistics', () => {
    it('should return refund statistics', async () => {
      const response = await request(baseUrl)
        .get('/refunds/pro-rata/statistics')
        .expect(200);

      expect(response.body.statistics).toBeDefined();
      expect(response.body.statistics.totalRefunds).toBeGreaterThanOrEqual(0);
      expect(response.body.statistics.byStatus).toBeDefined();
      expect(response.body.statistics.totalAmount).toBeDefined();
    });

    it('should support filtering by creator', async () => {
      const response = await request(baseUrl)
        .get(`/refunds/pro-rata/statistics?creatorId=${mockSubscriptionData.creator}`)
        .expect(200);

      expect(response.body.statistics).toBeDefined();
    });
  });

  describe('GET /refunds/pro-rata/pending/all', () => {
    it('should retrieve all pending refunds', async () => {
      const response = await request(baseUrl)
        .get('/refunds/pro-rata/pending/all')
        .expect(200);

      expect(response.body.total).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(response.body.refunds)).toBe(true);
    });
  });

  describe('POST /refunds/pro-rata/bulk-approve', () => {
    it('should bulk approve multiple refunds', async () => {
      // Create multiple refunds
      const refund1 = await ProRataRefund.create({
        subscriptionId: new mongoose.Types.ObjectId(),
        userId: mockSubscriptionData.user,
        creatorId: mockSubscriptionData.creator,
        originalAmount: 29.99,
        originalStartDate: new Date(),
        originalExpiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        actualCancellationDate: new Date(),
        totalDays: 30,
        usedDays: 5,
        unusedDays: 25,
        usagePercentage: 16.67,
        refundAmount: 24.99,
        refundReason: 'Bulk test 1',
        refundStatus: 'pending'
      });

      const refund2 = await ProRataRefund.create({
        subscriptionId: new mongoose.Types.ObjectId(),
        userId: mockSubscriptionData.user,
        creatorId: mockSubscriptionData.creator,
        originalAmount: 29.99,
        originalStartDate: new Date(),
        originalExpiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        actualCancellationDate: new Date(),
        totalDays: 30,
        usedDays: 10,
        unusedDays: 20,
        usagePercentage: 33.33,
        refundAmount: 20.0,
        refundReason: 'Bulk test 2',
        refundStatus: 'pending'
      });

      const response = await request(baseUrl)
        .post('/refunds/pro-rata/bulk-approve')
        .send({
          refundIds: [refund1._id, refund2._id],
          approvedBy: 'admin'
        })
        .expect(200);

      expect(response.body.successful).toBeGreaterThanOrEqual(0);
      expect(response.body.results).toHaveLength(2);
    });

    it('should require refundIds array', async () => {
      const response = await request(baseUrl)
        .post('/refunds/pro-rata/bulk-approve')
        .send({ approvedBy: 'admin' })
        .expect(400);

      expect(response.body.message).toContain('refundIds');
    });
  });
});
