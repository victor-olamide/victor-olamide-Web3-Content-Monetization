const request = require('supertest');
const mongoose = require('mongoose');
const Subscription = require('../models/Subscription');
const SubscriptionRenewal = require('../models/SubscriptionRenewal');

describe('Subscription Renewal API Integration Tests', () => {
  const baseUrl = 'http://localhost:5000/api/subscriptions';
  
  // Test data
  const mockUserId = 'user-integration-test-123';
  const mockCreatorId = 'creator-integration-test-456';
  const mockTierId = 'tier-integration-test-789';

  let testSubscriptionId;
  let testRenewalId;

  beforeAll(async () => {
    // Setup test database
    if (!mongoose.connection.readyState) {
      await mongoose.connect(
        process.env.MONGODB_URI || 'mongodb://localhost:27017/stacks_monetization_test'
      );
    }
  });

  afterAll(async () => {
    // Cleanup test data
    await Subscription.deleteMany({ user: mockUserId });
    await SubscriptionRenewal.deleteMany({});
    await mongoose.connection.close();
  });

  describe('GET /subscriptions/:user', () => {
    it('should retrieve all subscriptions for a user', async () => {
      // Create test subscription
      const subscription = await Subscription.create({
        user: mockUserId,
        creator: mockCreatorId,
        tierId: mockTierId,
        price: 9.99,
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        autoRenewal: true,
        gracePeriodDays: 7,
        status: 'active'
      });

      testSubscriptionId = subscription._id;

      const response = await request(baseUrl)
        .get(`/${mockUserId}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should return empty array for user with no subscriptions', async () => {
      const response = await request(baseUrl)
        .get('/nonexistent-user-12345')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /subscriptions/:user/status', () => {
    it('should return subscription status dashboard', async () => {
      const response = await request(baseUrl)
        .get(`/${mockUserId}/status`)
        .expect(200);

      expect(response.body.user).toBe(mockUserId);
      expect(response.body.subscriptions).toBeDefined();
      expect(response.body.statistics).toBeDefined();
    });
  });

  describe('GET /subscriptions/subscription/:id', () => {
    it('should retrieve subscription with renewal details', async () => {
      const response = await request(baseUrl)
        .get(`/subscription/${testSubscriptionId}`)
        .expect(200);

      expect(response.body.subscription._id).toBeDefined();
      expect(response.body.renewalStatus).toBeDefined();
      expect(Array.isArray(response.body.renewalHistory)).toBe(true);
    });

    it('should return 404 for nonexistent subscription', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(baseUrl)
        .get(`/subscription/${fakeId}`)
        .expect(404);

      expect(response.body.message).toContain('not found');
    });
  });

  describe('POST /subscriptions/:id/renew', () => {
    it('should initiate manual renewal', async () => {
      const response = await request(baseUrl)
        .post(`/${testSubscriptionId}/renew`)
        .send({ renewalType: 'manual' })
        .expect(200);

      expect(response.body.message).toContain('initiated successfully');
      expect(response.body.renewal).toBeDefined();
      testRenewalId = response.body.renewal._id;
    });

    it('should return 404 for nonexistent subscription', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(baseUrl)
        .post(`/${fakeId}/renew`)
        .send({ renewalType: 'manual' })
        .expect(404);

      expect(response.body.message).toContain('not found');
    });

    it('should use default renewalType if not provided', async () => {
      const response = await request(baseUrl)
        .post(`/${testSubscriptionId}/renew`)
        .send({})
        .expect(200);

      expect(response.body.renewal.renewalType).toBe('manual');
    });
  });

  describe('POST /subscriptions/renewal/:renewalId/complete', () => {
    it('should complete renewal with transaction ID', async () => {
      const txId = 'tx-integration-test-abc123def456';
      
      const response = await request(baseUrl)
        .post(`/renewal/${testRenewalId}/complete`)
        .send({ txId })
        .expect(200);

      expect(response.body.message).toContain('completed successfully');
      expect(response.body.renewal.transactionId).toBe(txId);
      expect(response.body.renewal.status).toBe('completed');
    });

    it('should return 400 if transaction ID is missing', async () => {
      const response = await request(baseUrl)
        .post(`/renewal/${testRenewalId}/complete`)
        .send({})
        .expect(400);

      expect(response.body.message).toContain('Transaction ID');
    });

    it('should return 404 for nonexistent renewal', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(baseUrl)
        .post(`/renewal/${fakeId}/complete`)
        .send({ txId: 'tx-123' })
        .expect(404);

      expect(response.body.message).toBeDefined();
    });
  });

  describe('POST /subscriptions/renewal/:renewalId/fail', () => {
    it('should handle renewal failure with reason', async () => {
      // Create new renewal for failure test
      const newRenewal = await SubscriptionRenewal.create({
        subscriptionId: testSubscriptionId,
        userId: mockUserId,
        creatorId: mockCreatorId,
        tierId: mockTierId,
        previousExpiryDate: new Date(),
        amount: 9.99,
        status: 'pending',
        renewalType: 'automatic',
        attemptNumber: 1,
        maxAttempts: 3
      });

      const response = await request(baseUrl)
        .post(`/renewal/${newRenewal._id}/fail`)
        .send({ failureReason: 'Insufficient funds' })
        .expect(200);

      expect(response.body.message).toBeDefined();
      expect(response.body.willRetry).toBeDefined();
    });

    it('should retry failed renewal up to max attempts', async () => {
      const newRenewal = await SubscriptionRenewal.create({
        subscriptionId: testSubscriptionId,
        userId: mockUserId,
        creatorId: mockCreatorId,
        tierId: mockTierId,
        previousExpiryDate: new Date(),
        amount: 9.99,
        status: 'failed',
        renewalType: 'automatic',
        attemptNumber: 2,
        maxAttempts: 3
      });

      const response = await request(baseUrl)
        .post(`/renewal/${newRenewal._id}/fail`)
        .send({ failureReason: 'Network error' })
        .expect(200);

      expect(response.body.willRetry).toBe(true);
    });
  });

  describe('GET /subscriptions/:id/renewals', () => {
    it('should retrieve renewal history for subscription', async () => {
      const response = await request(baseUrl)
        .get(`/${testSubscriptionId}/renewals`)
        .expect(200);

      expect(response.body.subscriptionId).toBe(testSubscriptionId.toString());
      expect(response.body.totalRenewals).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(response.body.renewals)).toBe(true);
    });

    it('should return 404 for nonexistent subscription', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(baseUrl)
        .get(`/${fakeId}/renewals`)
        .expect(404);

      expect(response.body.message).toContain('not found');
    });
  });

  describe('POST /subscriptions/:id/cancel', () => {
    it('should cancel active subscription with reason', async () => {
      const response = await request(baseUrl)
        .post(`/${testSubscriptionId}/cancel`)
        .send({ reason: 'No longer interested' })
        .expect(200);

      expect(response.body.message).toContain('cancelled successfully');
      expect(response.body.subscription.status).toBe('cancelled');
      expect(response.body.subscription.cancelReason).toBe('No longer interested');
    });

    it('should use default reason if not provided', async () => {
      const newSubscription = await Subscription.create({
        user: `${mockUserId}-cancel-test`,
        creator: mockCreatorId,
        tierId: mockTierId,
        price: 9.99,
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'active'
      });

      const response = await request(baseUrl)
        .post(`/${newSubscription._id}/cancel`)
        .send({})
        .expect(200);

      expect(response.body.subscription.cancelReason).toContain('User requested');
    });

    it('should prevent cancellation of already cancelled subscription', async () => {
      // First cancel
      await request(baseUrl)
        .post(`/${testSubscriptionId}/cancel`)
        .send({ reason: 'First cancellation' });

      // Try to cancel again
      const response = await request(baseUrl)
        .post(`/${testSubscriptionId}/cancel`)
        .send({ reason: 'Second cancellation' })
        .expect(400);

      expect(response.body.message).toContain('already cancelled');
    });
  });

  describe('POST /subscriptions/:id/grace-period', () => {
    it('should apply grace period to expired subscription', async () => {
      const expiredSubscription = await Subscription.create({
        user: `${mockUserId}-grace-test`,
        creator: mockCreatorId,
        tierId: mockTierId,
        price: 9.99,
        expiryDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        gracePeriodDays: 7,
        status: 'expired'
      });

      const response = await request(baseUrl)
        .post(`/${expiredSubscription._id}/grace-period`)
        .send({})
        .expect(200);

      expect(response.body.message).toBeDefined();
      expect(response.body.gracePeriod).toBeDefined();
      expect(response.body.gracePeriod.daysRemaining).toBe(7);
    });

    it('should return 400 for active subscription', async () => {
      const activeSubscription = await Subscription.create({
        user: `${mockUserId}-active-test`,
        creator: mockCreatorId,
        tierId: mockTierId,
        price: 9.99,
        expiryDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        gracePeriodDays: 7,
        status: 'active'
      });

      const response = await request(baseUrl)
        .post(`/${activeSubscription._id}/grace-period`)
        .send({})
        .expect(400);

      expect(response.body.message).toBeDefined();
    });
  });

  describe('GET /subscriptions/renewals/status/:status', () => {
    it('should retrieve renewals by status', async () => {
      const response = await request(baseUrl)
        .get('/renewals/status/completed')
        .expect(200);

      expect(response.body.status).toBe('completed');
      expect(response.body.totalRenewals).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(response.body.renewals)).toBe(true);
    });

    it('should return error for invalid status', async () => {
      const response = await request(baseUrl)
        .get('/renewals/status/invalid-status')
        .expect(400);

      expect(response.body.message).toContain('Invalid status');
    });
  });

  describe('GET /subscriptions/pending/all', () => {
    it('should retrieve all pending renewals', async () => {
      const response = await request(baseUrl)
        .get('/pending/all')
        .expect(200);

      expect(response.body.totalPending).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(response.body.renewals)).toBe(true);
    });

    it('should only include pending and processing renewals', async () => {
      const response = await request(baseUrl)
        .get('/pending/all')
        .expect(200);

      response.body.renewals.forEach(renewal => {
        expect(['pending', 'processing']).toContain(renewal.status);
      });
    });
  });
});

describe('Renewal API Error Handling', () => {
  const baseUrl = 'http://localhost:5000/api/subscriptions';

  it('should handle server errors gracefully', async () => {
    // Test with invalid ID format
    const response = await request(baseUrl)
      .get('/subscription/invalid-id-format')
      .expect(500);

    expect(response.body.message).toBeDefined();
  });
});

describe('Renewal Scheduler Integration', () => {
  it('should track renewal processing metrics', async () => {
    const statusResponse = await request('http://localhost:5000')
      .get('/api/status')
      .expect(200);

    expect(statusResponse.body.renewals).toBeDefined();
    expect(statusResponse.body.renewals.lastProcessed).toBeDefined();
    expect(statusResponse.body.renewals.totalProcessed).toBeGreaterThanOrEqual(0);
  });
});
