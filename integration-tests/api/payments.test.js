/**
 * Payment and Subscription API Integration Tests
 * Tests for payment processing, subscriptions, and platform purchase flows
 */

const request = require('supertest');
const User = require('../../backend/models/User');
const Content = require('../../backend/models/Content');
const Subscription = require('../../backend/models/Subscription');
const TestUtils = require('../utils/test-setup');

describe('Payment and Subscription API Integration Tests', () => {
  let server;
  let creatorUser;
  let consumerUser;
  let premiumContent;

  beforeAll(async () => {
    const serverSetup = await TestUtils.setupTestServer();
    server = serverSetup.server;

    creatorUser = TestUtils.generateUser({
      email: 'creator@example.com',
      role: 'creator',
    });
    creatorUser.password = await TestUtils.hashPassword(creatorUser.password);
    const creator = new User(creatorUser);
    await creator.save();
    creatorUser._id = creator._id;

    consumerUser = TestUtils.generateUser({
      email: 'subscriber@example.com',
      role: 'subscriber',
    });
    consumerUser.password = await TestUtils.hashPassword(consumerUser.password);
    const consumer = new User(consumerUser);
    await consumer.save();
    consumerUser._id = consumer._id;

    premiumContent = TestUtils.generateContent(creatorUser.walletAddress, {
      title: 'Premium Content',
      description: 'Premium video content',
      price: 25,
      contentType: 'video',
    });
    const content = new Content(premiumContent);
    await content.save();
    premiumContent._id = content._id;
  });

  afterAll(async () => {
    await TestUtils.teardownTestServer(server);
  });

  describe('Payment route coverage', () => {
    it('should return platform fee information', async () => {
      const response = await request(server)
        .get('/api/purchases/platform-fee')
        .expect(200);

      expect(response.body.platformFee).toBeDefined();
      expect(typeof response.body.platformFee).toBe('number');
      expect(response.body.feePercentage).toMatch(/%$/);
    });

    it('should calculate platform fee for a given amount', async () => {
      const response = await request(server)
        .get('/api/purchases/calculate-fee/100')
        .expect(200);

      expect(response.body.totalAmount).toBe(100);
      expect(response.body.platformFee).toBe(1);
      expect(response.body.creatorAmount).toBe(99);
    });

    it('should validate purchase body before saving', async () => {
      const response = await request(server)
        .post('/api/purchases')
        .send({})
        .expect(400);

      expect(response.body.message).toContain('Missing required fields');
    });

    it('should create a new purchase record successfully', async () => {
      const purchaseData = {
        contentId: premiumContent.contentId,
        user: consumerUser.walletAddress,
        txId: TestUtils.generateTxId(),
        amount: premiumContent.price,
        creator: creatorUser.walletAddress,
      };

      const response = await request(server)
        .post('/api/purchases')
        .send(purchaseData)
        .expect(201);

      expect(response.body).toHaveProperty('purchase');
      expect(response.body.purchase.contentId).toBe(premiumContent.contentId);
      expect(response.body.purchase.user).toBe(consumerUser.walletAddress);
      expect(response.body.purchase.creator).toBe(creatorUser.walletAddress);
    });

    it('should prevent duplicate purchase records for the same txId', async () => {
      const txId = TestUtils.generateTxId();
      const purchaseData = {
        contentId: premiumContent.contentId,
        user: consumerUser.walletAddress,
        txId,
        amount: premiumContent.price,
        creator: creatorUser.walletAddress,
      };

      await request(server)
        .post('/api/purchases')
        .send(purchaseData)
        .expect(201);

      const duplicateResponse = await request(server)
        .post('/api/purchases')
        .send(purchaseData)
        .expect(409);

      expect(duplicateResponse.body.message).toContain('already exists');
    });

    it('should return purchase history for a user', async () => {
      const response = await request(server)
        .get(`/api/purchases/user/${consumerUser.walletAddress}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((purchase) => {
        expect(purchase.user).toBe(consumerUser.walletAddress);
      });
    });

    it('should check if a user has access to a purchased content item', async () => {
      const response = await request(server)
        .get(`/api/purchases/check/${consumerUser.walletAddress}/${premiumContent.contentId}`)
        .expect(200);

      expect(response.body.hasAccess).toBe(true);
    });
  });

  describe('Subscription route coverage', () => {
    let subscriptionId;

    it('should create a new subscription purchase', async () => {
      const subscriptionData = {
        user: consumerUser.walletAddress,
        creator: creatorUser.walletAddress,
        tierId: 1,
        tierName: 'premium',
        tierPrice: 50,
        tierBenefits: ['Exclusive access'],
        amount: 50,
        transactionId: TestUtils.generateTxId(),
        expiry: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
      };

      const response = await request(server)
        .post('/api/subscriptions')
        .send(subscriptionData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.subscription).toBeDefined();
      expect(response.body.subscription.user).toBe(consumerUser.walletAddress);
      subscriptionId = response.body.subscription._id;
    });

    it('should return active subscriptions for a user', async () => {
      const response = await request(server)
        .get(`/api/subscriptions/${consumerUser.walletAddress}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((subscription) => {
        expect(subscription.user).toBe(consumerUser.walletAddress);
      });
    });

    it('should return subscription status for a user', async () => {
      const response = await request(server)
        .get(`/api/subscriptions/${consumerUser.walletAddress}/status`)
        .expect(200);

      expect(response.body.user).toBe(consumerUser.walletAddress);
      expect(Array.isArray(response.body.subscriptions)).toBe(true);
    });

    it('should cancel an existing subscription', async () => {
      const createResponse = await request(server)
        .post('/api/subscriptions')
        .send({
          user: consumerUser.walletAddress,
          creator: creatorUser.walletAddress,
          tierId: 2,
          tierName: 'monthly',
          tierPrice: 20,
          tierBenefits: ['Monthly access'],
          amount: 20,
          transactionId: TestUtils.generateTxId(),
          expiry: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
        })
        .expect(201);

      const subscription = createResponse.body.subscription;

      const cancelResponse = await request(server)
        .post(`/api/subscriptions/${subscription._id}/cancel`)
        .expect(200);

      expect(cancelResponse.body.message).toContain('cancelled successfully');
      expect(cancelResponse.body.subscription).toBeDefined();
      expect(cancelResponse.body.subscription.cancelledAt).toBeTruthy();
    });

    it('should reject subscription purchase with missing fields', async () => {
      const response = await request(server)
        .post('/api/subscriptions')
        .send({ user: consumerUser.walletAddress })
        .expect(400);

      expect(response.body.errors).toBeDefined();
      expect(response.body.success).toBe(false);
    });
  });
});