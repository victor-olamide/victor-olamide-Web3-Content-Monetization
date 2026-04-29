// Integration Tests for Tier Upgrade Rules
// Tests the complete tier upgrade workflow

const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { app } = require('../server');
const SubscriptionTier = require('../models/SubscriptionTier');
const Subscription = require('../models/Subscription');
const User = require('../models/User');

describe('Tier Upgrade Rules Integration Tests', () => {
  let testUser;
  let testCreator;
  let basicTier;
  let premiumTier;
  let userToken;
  let creatorToken;

  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

    // Create test users
    testUser = new User({
      username: 'testuser_upgrade',
      email: 'testuser_upgrade@example.com',
      password: 'password123',
      role: 'user'
    });
    await testUser.save();

    testCreator = new User({
      username: 'testcreator_upgrade',
      email: 'testcreator_upgrade@example.com',
      password: 'password123',
      role: 'creator'
    });
    await testCreator.save();

    // Create test tiers
    basicTier = new SubscriptionTier({
      creatorId: testCreator._id,
      name: 'Basic',
      description: 'Basic tier',
      price: 5.99,
      billingCycle: 'monthly',
      currency: 'USD',
      benefits: [
        { name: 'Basic access', included: true },
        { name: 'Email support', included: true }
      ],
      isActive: true,
      isVisible: true,
      position: 1
    });
    await basicTier.save();

    premiumTier = new SubscriptionTier({
      creatorId: testCreator._id,
      name: 'Premium',
      description: 'Premium tier',
      price: 14.99,
      billingCycle: 'monthly',
      currency: 'USD',
      benefits: [
        { name: 'Premium access', included: true },
        { name: 'Priority support', included: true },
        { name: 'Exclusive content', included: true }
      ],
      isActive: true,
      isVisible: true,
      position: 2,
      upgradeDiscount: 20
    });
    await premiumTier.save();

    // Generate tokens for testing
    userToken = jwt.sign({ id: testUser._id.toString(), role: testUser.role }, process.env.JWT_SECRET);
    creatorToken = jwt.sign({ id: testCreator._id.toString(), role: testCreator.role }, process.env.JWT_SECRET);
  });

  afterAll(async () => {
    await SubscriptionTier.deleteMany({});
    await Subscription.deleteMany({});
    await User.deleteMany({});
    await mongoose.connection.close();
  });

  describe('GET /api/tier-upgrades/users/:userId/creators/:creatorId/upgrades', () => {
    it('should return available upgrades for user with active subscription', async () => {
      // Create active subscription
      const subscription = new Subscription({
        userId: testUser._id,
        creatorId: testCreator._id,
        subscriptionTierId: basicTier._id,
        price: basicTier.price,
        billingCycle: basicTier.billingCycle,
        currency: basicTier.currency,
        status: 'active'
      });
      await subscription.save();

      const response = await request(app)
        .get(`/api/tier-upgrades/users/${testUser._id}/creators/${testCreator._id}/upgrades`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.upgrades.hasSubscription).toBe(true);
      expect(response.body.upgrades.upgradeOptions).toHaveLength(1);
      expect(response.body.upgrades.upgradeOptions[0].name).toBe('Premium');
    });

    it('should return 404 for user with no subscription', async () => {
      const response = await request(app)
        .get(`/api/tier-upgrades/users/${testUser._id}/creators/${testCreator._id}/upgrades`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/tier-upgrades/users/:userId/upgrade', () => {
    it('should successfully process a tier upgrade', async () => {
      // Create active subscription to basic tier
      const subscription = new Subscription({
        userId: testUser._id,
        creatorId: testCreator._id,
        subscriptionTierId: basicTier._id,
        price: basicTier.price,
        billingCycle: basicTier.billingCycle,
        currency: basicTier.currency,
        status: 'active'
      });
      await subscription.save();

      const response = await request(app)
        .post(`/api/tier-upgrades/users/${testUser._id}/upgrade`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          currentTierId: basicTier._id,
          targetTierId: premiumTier._id,
          paymentDetails: { method: 'card' }
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.upgrade.fromTier.name).toBe('Basic');
      expect(response.body.upgrade.toTier.name).toBe('Premium');
    });

    it('should reject upgrade to same tier', async () => {
      const response = await request(app)
        .post(`/api/tier-upgrades/users/${testUser._id}/upgrade`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          currentTierId: premiumTier._id,
          targetTierId: premiumTier._id
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/tier-upgrades/upgrade/validate', () => {
    it('should validate a valid upgrade', async () => {
      const response = await request(app)
        .post('/api/tier-upgrades/upgrade/validate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          currentTierId: basicTier._id,
          targetTierId: premiumTier._id,
          userId: testUser._id
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.valid).toBe(true);
      expect(response.body.upgradeDetails.isUpgrade).toBe(true);
    });

    it('should reject invalid upgrade (non-existent tier)', async () => {
      const response = await request(app)
        .post('/api/tier-upgrades/upgrade/validate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          currentTierId: basicTier._id,
          targetTierId: new mongoose.Types.ObjectId(),
          userId: testUser._id
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/tier-upgrades/users/:userId/upgrade-history', () => {
    it('should return upgrade history for user', async () => {
      const response = await request(app)
        .get(`/api/tier-upgrades/users/${testUser._id}/upgrade-history`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.history)).toBe(true);
    });
  });

  describe('GET /api/tier-upgrades/tiers/:tierId/upgrade-paths', () => {
    it('should return upgrade paths from a tier', async () => {
      const response = await request(app)
        .get(`/api/tier-upgrades/tiers/${basicTier._id}/upgrade-paths`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.currentTier.name).toBe('Basic');
      expect(response.body.upgradePaths.upgrades).toHaveLength(1);
      expect(response.body.upgradePaths.upgrades[0].name).toBe('Premium');
    });

    it('should return 404 for non-existent tier', async () => {
      const response = await request(app)
        .get(`/api/tier-upgrades/tiers/${new mongoose.Types.ObjectId()}/upgrade-paths`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });
});
