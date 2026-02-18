/**
 * Payment and Subscription API Integration Tests
 * Tests for payment processing, subscriptions, and monetization flows
 */

const request = require('supertest');
const mongoose = require('mongoose');
const User = require('../../../backend/models/User');
const Content = require('../../../backend/models/Content');
const Subscription = require('../../../backend/models/Subscription');
const Transaction = require('../../../backend/models/Transaction');
const TestUtils = require('../utils/test-setup');

describe('Payment and Subscription API Integration Tests', () => {
  let server;
  let creatorUser;
  let consumerUser;
  let premiumContent;
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
      walletAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
    });
    consumerUser.password = await TestUtils.hashPassword(consumerUser.password);
    const consumer = new User(consumerUser);
    await consumer.save();
    consumerUser._id = consumer._id;
    consumerToken = TestUtils.generateToken(consumerUser);

    // Create premium content
    premiumContent = TestUtils.generateContent({
      creator: creatorUser._id,
      title: 'Premium Content',
      price: 25,
      contentType: 'video',
      accessType: 'paid',
    });
    const content = new Content(premiumContent);
    await content.save();
    premiumContent._id = content._id;
  });

  afterAll(async () => {
    await TestUtils.teardownTestServer(server);
  });

  describe('POST /api/payments/purchase', () => {
    it('should process content purchase successfully', async () => {
      const purchaseData = {
        contentId: premiumContent._id,
        paymentMethod: 'stacks',
        amount: premiumContent.price,
      };

      const response = await request(server)
        .post('/api/payments/purchase')
        .set('Authorization', `Bearer ${consumerToken}`)
        .send(purchaseData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('transactionId');
      expect(response.body.data.status).toBe('pending');
      expect(response.body.data.amount).toBe(premiumContent.price);
    });

    it('should reject purchase for own content', async () => {
      const purchaseData = {
        contentId: premiumContent._id,
        paymentMethod: 'stacks',
        amount: premiumContent.price,
      };

      const response = await request(server)
        .post('/api/payments/purchase')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send(purchaseData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('own content');
    });

    it('should validate payment amount', async () => {
      const invalidPurchase = {
        contentId: premiumContent._id,
        paymentMethod: 'stacks',
        amount: 10, // Wrong amount
      };

      const response = await request(server)
        .post('/api/payments/purchase')
        .set('Authorization', `Bearer ${consumerToken}`)
        .send(invalidPurchase)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('amount');
    });

    it('should validate payment method', async () => {
      const invalidPurchase = {
        contentId: premiumContent._id,
        paymentMethod: 'invalid-method',
        amount: premiumContent.price,
      };

      const response = await request(server)
        .post('/api/payments/purchase')
        .set('Authorization', `Bearer ${consumerToken}`)
        .send(invalidPurchase)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('payment method');
    });
  });

  describe('POST /api/subscriptions/create', () => {
    it('should create subscription successfully', async () => {
      const subscriptionData = {
        creatorId: creatorUser._id,
        tier: 'premium',
        price: 50,
        duration: 30, // days
        benefits: ['Exclusive content', 'Early access'],
      };

      const response = await request(server)
        .post('/api/subscriptions/create')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send(subscriptionData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.creator).toBe(creatorUser._id.toString());
      expect(response.body.data.tier).toBe('premium');
      expect(response.body.data.price).toBe(50);
    });

    it('should reject subscription creation for non-creator', async () => {
      const subscriptionData = {
        creatorId: consumerUser._id,
        tier: 'basic',
        price: 20,
      };

      const response = await request(server)
        .post('/api/subscriptions/create')
        .set('Authorization', `Bearer ${consumerToken}`)
        .send(subscriptionData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('creator');
    });

    it('should validate subscription data', async () => {
      const invalidSubscription = {
        tier: 'invalid-tier',
        price: -10,
      };

      const response = await request(server)
        .post('/api/subscriptions/create')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send(invalidSubscription)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/subscriptions/subscribe', () => {
    let testSubscription;

    beforeEach(async () => {
      // Create a test subscription
      testSubscription = TestUtils.generateSubscription({
        creator: creatorUser._id,
        tier: 'monthly',
        price: 30,
      });
      const subscription = new Subscription(testSubscription);
      await subscription.save();
      testSubscription._id = subscription._id;
    });

    it('should subscribe to creator successfully', async () => {
      const subscribeData = {
        subscriptionId: testSubscription._id,
        paymentMethod: 'stacks',
      };

      const response = await request(server)
        .post('/api/subscriptions/subscribe')
        .set('Authorization', `Bearer ${consumerToken}`)
        .send(subscribeData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('active');
      expect(response.body.data.subscriber).toBe(consumerUser._id.toString());
    });

    it('should reject subscription to own content', async () => {
      const subscribeData = {
        subscriptionId: testSubscription._id,
        paymentMethod: 'stacks',
      };

      const response = await request(server)
        .post('/api/subscriptions/subscribe')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send(subscribeData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('own subscription');
    });

    it('should handle duplicate subscriptions', async () => {
      // First subscription
      const subscribeData = {
        subscriptionId: testSubscription._id,
        paymentMethod: 'stacks',
      };

      await request(server)
        .post('/api/subscriptions/subscribe')
        .set('Authorization', `Bearer ${consumerToken}`)
        .send(subscribeData)
        .expect(201);

      // Try to subscribe again
      const response = await request(server)
        .post('/api/subscriptions/subscribe')
        .set('Authorization', `Bearer ${consumerToken}`)
        .send(subscribeData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already subscribed');
    });
  });

  describe('GET /api/subscriptions/my-subscriptions', () => {
    it('should return user subscriptions', async () => {
      const response = await request(server)
        .get('/api/subscriptions/my-subscriptions')
        .set('Authorization', `Bearer ${consumerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return creator subscriptions', async () => {
      const response = await request(server)
        .get('/api/subscriptions/my-subscriptions')
        .set('Authorization', `Bearer ${creatorToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('POST /api/subscriptions/cancel', () => {
    let activeSubscription;

    beforeEach(async () => {
      // Create and activate a subscription
      activeSubscription = TestUtils.generateSubscription({
        creator: creatorUser._id,
        subscriber: consumerUser._id,
        status: 'active',
      });
      const subscription = new Subscription(activeSubscription);
      await subscription.save();
      activeSubscription._id = subscription._id;
    });

    it('should cancel subscription successfully', async () => {
      const response = await request(server)
        .post(`/api/subscriptions/${activeSubscription._id}/cancel`)
        .set('Authorization', `Bearer ${consumerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('cancelled');
    });

    it('should reject cancellation by non-subscriber', async () => {
      const response = await request(server)
        .post(`/api/subscriptions/${activeSubscription._id}/cancel`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/payments/transactions', () => {
    it('should return user transactions', async () => {
      const response = await request(server)
        .get('/api/payments/transactions')
        .set('Authorization', `Bearer ${consumerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter transactions by type', async () => {
      const response = await request(server)
        .get('/api/payments/transactions?type=purchase')
        .set('Authorization', `Bearer ${consumerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach(transaction => {
        expect(transaction.type).toBe('purchase');
      });
    });

    it('should filter transactions by status', async () => {
      const response = await request(server)
        .get('/api/payments/transactions?status=completed')
        .set('Authorization', `Bearer ${consumerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach(transaction => {
        expect(transaction.status).toBe('completed');
      });
    });
  });

  describe('POST /api/payments/webhook', () => {
    it('should handle payment webhook', async () => {
      const webhookData = {
        transactionId: 'test-transaction-123',
        status: 'completed',
        amount: 25,
        signature: 'test-signature',
      };

      const response = await request(server)
        .post('/api/payments/webhook')
        .send(webhookData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should validate webhook signature', async () => {
      const invalidWebhook = {
        transactionId: 'test-transaction-123',
        status: 'completed',
        amount: 25,
        signature: 'invalid-signature',
      };

      const response = await request(server)
        .post('/api/payments/webhook')
        .send(invalidWebhook)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('signature');
    });
  });

  describe('Royalty Distribution', () => {
    it('should calculate and distribute royalties', async () => {
      const purchaseData = {
        contentId: premiumContent._id,
        paymentMethod: 'stacks',
        amount: premiumContent.price,
      };

      // Make a purchase
      await request(server)
        .post('/api/payments/purchase')
        .set('Authorization', `Bearer ${consumerToken}`)
        .send(purchaseData)
        .expect(201);

      // Check royalty distribution
      const response = await request(server)
        .get('/api/payments/royalties')
        .set('Authorization', `Bearer ${creatorToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should track platform fees', async () => {
      const response = await request(server)
        .get('/api/admin/platform-fees')
        .set('Authorization', `Bearer ${creatorToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalFees');
    });
  });

  describe('Payment Security', () => {
    it('should prevent double-spending', async () => {
      const purchaseData = {
        contentId: premiumContent._id,
        paymentMethod: 'stacks',
        amount: premiumContent.price,
      };

      // First purchase
      await request(server)
        .post('/api/payments/purchase')
        .set('Authorization', `Bearer ${consumerToken}`)
        .send(purchaseData)
        .expect(201);

      // Attempt duplicate purchase
      const response = await request(server)
        .post('/api/payments/purchase')
        .set('Authorization', `Bearer ${consumerToken}`)
        .send(purchaseData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already purchased');
    });

    it('should validate payment amounts against content prices', async () => {
      const fraudulentPurchase = {
        contentId: premiumContent._id,
        paymentMethod: 'stacks',
        amount: 1, // Much lower than actual price
      };

      const response = await request(server)
        .post('/api/payments/purchase')
        .set('Authorization', `Bearer ${consumerToken}`)
        .send(fraudulentPurchase)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('amount');
    });
  });
});