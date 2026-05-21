const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const express = require('express');
const Purchase = require('../../models/Purchase');
const Content = require('../../models/Content');
const purchaseRoutes = require('../../routes/purchaseRoutes');
const purchaseAccessRoutes = require('../../routes/purchaseAccessRoutes');

let app;
let mongoServer;

describe('Pay-Per-View Purchase API - Issue #151', () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    app = express();
    app.use(express.json());
    app.use('/purchases', purchaseRoutes);
    app.use('/access', purchaseAccessRoutes);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Purchase.deleteMany({});
    await Content.deleteMany({});
  });

  describe('POST /purchases - Create purchase', () => {
    it('should create a new purchase with valid payment', async () => {
      const purchaseData = {
        contentId: 1,
        user: 'SP1234567890123456789012345678901234567', 
        creator: 'SP9876543210987654321098765432109876543',
        txId: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        amount: 1000
      };

      const response = await request(app)
        .post('/purchases/purchases')
        .send(purchaseData)
        .expect(201);

      expect(response.body.purchase).toBeDefined();
      expect(response.body.purchase.contentId).toBe(purchaseData.contentId);
      expect(response.body.purchase.user).toBe(purchaseData.user);
    });

    it('should reject purchase with missing fields', async () => {
      const incompleteData = {
        contentId: 1,
        user: 'SP1234567890123456789012345678901234567'
      };

      const response = await request(app)
        .post('/purchases/purchases')
        .send(incompleteData)
        .expect(400);

      expect(response.body.message).toContain('Missing required fields');
    });

    it('should reject purchase with invalid transaction ID', async () => {
      const purchaseData = {
        contentId: 1,
        user: 'SP1234567890123456789012345678901234567',
        creator: 'SP9876543210987654321098765432109876543',
        txId: 'invalid-tx-id',
        amount: 1000
      };

      const response = await request(app)
        .post('/purchases/purchases')
        .send(purchaseData)
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('should prevent duplicate purchases with same transaction ID', async () => {
      const purchaseData = {
        contentId: 1,
        user: 'SP1234567890123456789012345678901234567',
        creator: 'SP9876543210987654321098765432109876543',
        txId: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        amount: 1000
      };

      // First purchase
      await Purchase.create(purchaseData);

      // Attempt duplicate
      const response = await request(app)
        .post('/purchases/purchases')
        .send(purchaseData)
        .expect(409);

      expect(response.body.message).toContain('already exists');
    });

    it('should calculate platform fee correctly', async () => {
      const purchaseData = {
        contentId: 1,
        user: 'SP1234567890123456789012345678901234567',
        creator: 'SP9876543210987654321098765432109876543',
        txId: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        amount: 1000
      };

      const response = await request(app)
        .post('/purchases/purchases')
        .send(purchaseData)
        .expect(201);

      expect(response.body.purchase.platformFee).toBeDefined();
      expect(response.body.purchase.creatorAmount).toBeDefined();
      expect(response.body.purchase.platformFee + response.body.purchase.creatorAmount).toBe(1000);
    });
  });

  describe('GET /access - Check access', () => {
    beforeEach(async () => {
      const purchase = new Purchase({
        contentId: 1,
        user: 'SP1234567890123456789012345678901234567',
        creator: 'SP9876543210987654321098765432109876543',
        txId: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        amount: 1000,
        platformFee: 100,
        creatorAmount: 900
      });
      await purchase.save();
    });

    it('should return access info for purchased content', async () => {
      const response = await request(app)
        .get('/access/access/1/SP1234567890123456789012345678901234567')
        .expect(200);

      expect(response.body.hasAccess).toBe(true);
      expect(response.body.details.purchaseId).toBeDefined();
    });

    it('should deny access for unpurchased content', async () => {
      const response = await request(app)
        .get('/access/access/999/SP1111111111111111111111111111111111111')
        .expect(200);

      expect(response.body.hasAccess).toBe(false);
    });

    it('should validate address format', async () => {
      const response = await request(app)
        .get('/access/access/1/invalid-address')
        .expect(400);

      expect(response.body.message).toBeDefined();
    });
  });

  describe('GET /purchases/history - Purchase history', () => {
    it('should return purchase history for user', async () => {
      const userAddress = 'SP1234567890123456789012345678901234567';
      
      await Purchase.create({
        contentId: 1,
        user: userAddress,
        creator: 'SP9876543210987654321098765432109876543',
        txId: 'tx1abcdef1234567890abcdef1234567890abcdef123',
        amount: 1000,
        platformFee: 100,
        creatorAmount: 900
      });

      await Purchase.create({
        contentId: 2,
        user: userAddress,
        creator: 'SP9876543210987654321098765432109876543',
        txId: 'tx2abcdef1234567890abcdef1234567890abcdef123',
        amount: 2000,
        platformFee: 200,
        creatorAmount: 1800
      });

      const response = await request(app)
        .get(`/purchases/history/${userAddress}`)
        .expect(200);

      expect(response.body.data.length).toBe(2);
      expect(response.body.total).toBe(2);
    });

    it('should support pagination', async () => {
      const userAddress = 'SP1234567890123456789012345678901234567';
      
      // Create 3 purchases
      for (let i = 1; i <= 3; i++) {
        await Purchase.create({
          contentId: i,
          user: userAddress,
          creator: 'SP9876543210987654321098765432109876543',
          txId: `txId${i}abcdef1234567890abcdef1234567890abcdef1`,
          amount: 1000 * i,
          platformFee: 100 * i,
          creatorAmount: 900 * i
        });
      }

      const response = await request(app)
        .get(`/purchases/history/${userAddress}?skip=0&limit=2`)
        .expect(200);

      expect(response.body.data.length).toBe(2);
      expect(response.body.total).toBe(3);
      expect(response.body.pages).toBe(2);
    });
  });

  describe('POST /revoke-access - Access management', () => {
    beforeEach(async () => {
      await Purchase.create({
        contentId: 1,
        user: 'SP1234567890123456789012345678901234567',
        creator: 'SP9876543210987654321098765432109876543',
        txId: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        amount: 1000,
        platformFee: 100,
        creatorAmount: 900
      });
    });

    it('should revoke access to purchased content', async () => {
      const response = await request(app)
        .post('/access/revoke-access')
        .send({
          contentId: 1,
          userAddress: 'SP1234567890123456789012345678901234567'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.accessRevokedAt).toBeDefined();

      // Verify access is revoked
      const purchaseAfter = await Purchase.findOne({
        contentId: 1,
        user: 'SP1234567890123456789012345678901234567'
      });
      expect(purchaseAfter.accessRevoked).toBe(true);
    });
  });

  describe('GET /stats - Purchase statistics', () => {
    beforeEach(async () => {
      const purchases = [
        {
          contentId: 1,
          user: 'SP1111111111111111111111111111111111111',
          creator: 'SP9999999999999999999999999999999999999',
          txId: 'tx1abcdef1234567890abcdef1234567890abcdef123',
          amount: 1000,
          platformFee: 100,
          creatorAmount: 900
        },
        {
          contentId: 1,
          user: 'SP2222222222222222222222222222222222222',
          creator: 'SP9999999999999999999999999999999999999',
          txId: 'tx2abcdef1234567890abcdef1234567890abcdef123',
          amount: 2000,
          platformFee: 200,
          creatorAmount: 1800
        }
      ];

      await Purchase.insertMany(purchases);
    });

    it('should calculate purchase statistics for content', async () => {
      const response = await request(app)
        .get('/access/stats/1')
        .expect(200);

      expect(response.body.contentId).toBe(1);
      expect(response.body.totalPurchases).toBe(2);
      expect(response.body.totalRevenue).toBe(2700);
      expect(response.body.totalPlatformFees).toBe(300);
      expect(response.body.activeAccess).toBe(2);
    });
  });
});
