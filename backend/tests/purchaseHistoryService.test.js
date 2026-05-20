const purchaseHistoryService = require('../../services/purchaseHistoryService');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Purchase = require('../../models/Purchase');

jest.mock('../../services/stxPriceService');

let mongoServer;

describe('Purchase History Service - Issue #151', () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Purchase.deleteMany({});
    jest.clearAllMocks();
  });

  describe('getPurchaseTransactions', () => {
    it('should retrieve purchase transactions for user', async () => {
      const userAddress = 'SP1234567890123456789012345678901234567';

      await Purchase.create([
        {
          contentId: 1,
          user: userAddress,
          creator: 'SP9876543210987654321098765432109876543',
          txId: 'tx1abcdef1234567890abcdef1234567890abcdef123',
          amount: 1000,
          creatorAmount: 900,
          platformFee: 100
        },
        {
          contentId: 2,
          user: userAddress,
          creator: 'SP9876543210987654321098765432109876543',
          txId: 'tx2abcdef1234567890abcdef1234567890abcdef123',
          amount: 2000,
          creatorAmount: 1800,
          platformFee: 200
        }
      ]);

      const result = await purchaseHistoryService.getPurchaseTransactions(userAddress);

      expect(result.total).toBe(2);
      expect(result.data.length).toBe(2);
      expect(result.pages).toBe(1);
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
          creatorAmount: 900 * i,
          platformFee: 100 * i
        });
      }

      const result = await purchaseHistoryService.getPurchaseTransactions(userAddress, {
        skip: 0,
        limit: 2
      });

      expect(result.data.length).toBe(2);
      expect(result.total).toBe(3);
      expect(result.pages).toBe(2);
    });
  });

  describe('getPurchaseSummary', () => {
    it('should calculate purchase summary for user', async () => {
      const userAddress = 'SP1234567890123456789012345678901234567';
      const creatorAddress = 'SP9876543210987654321098765432109876543';

      await Purchase.create([
        {
          contentId: 1,
          user: userAddress,
          creator: creatorAddress,
          txId: 'tx1abcdef1234567890abcdef1234567890abcdef123',
          amount: 1000,
          creatorAmount: 900,
          platformFee: 100
        },
        {
          contentId: 2,
          user: userAddress,
          creator: creatorAddress,
          txId: 'tx2abcdef1234567890abcdef1234567890abcdef123',
          amount: 2000,
          creatorAmount: 1800,
          platformFee: 200
        }
      ]);

      const summary = await purchaseHistoryService.getPurchaseSummary(userAddress);

      expect(summary.totalSpent).toBe(3000);
      expect(summary.purchaseCount).toBe(2);
      expect(summary.avgPurchaseValue).toBe(1500);
    });
  });

  describe('getPurchasesByContent', () => {
    it('should retrieve purchases for specific content', async () => {
      const contentId = 1;

      await Purchase.create([
        {
          contentId: contentId,
          user: 'SP1111111111111111111111111111111111111',
          creator: 'SP9999999999999999999999999999999999999',
          txId: 'tx1abcdef1234567890abcdef1234567890abcdef123',
          amount: 1000,
          creatorAmount: 900,
          platformFee: 100
        },
        {
          contentId: contentId,
          user: 'SP2222222222222222222222222222222222222',
          creator: 'SP9999999999999999999999999999999999999',
          txId: 'tx2abcdef1234567890abcdef1234567890abcdef123',
          amount: 1000,
          creatorAmount: 900,
          platformFee: 100
        }
      ]);

      const result = await purchaseHistoryService.getPurchasesByContent(contentId);

      expect(result.total).toBe(2);
      expect(result.data.length).toBe(2);
    });
  });

  describe('getPurchasesByCreator', () => {
    it('should calculate revenue for creator', async () => {
      const creatorAddress = 'SP9999999999999999999999999999999999999';

      await Purchase.create([
        {
          contentId: 1,
          user: 'SP1111111111111111111111111111111111111',
          creator: creatorAddress,
          txId: 'tx1abcdef1234567890abcdef1234567890abcdef123',
          amount: 1000,
          creatorAmount: 900,
          platformFee: 100
        },
        {
          contentId: 2,
          user: 'SP2222222222222222222222222222222222222',
          creator: creatorAddress,
          txId: 'tx2abcdef1234567890abcdef1234567890abcdef123',
          amount: 2000,
          creatorAmount: 1800,
          platformFee: 200
        }
      ]);

      const result = await purchaseHistoryService.getPurchasesByCreator(creatorAddress);

      expect(result.revenue.totalRevenue).toBe(2700);
      expect(result.revenue.totalPlatformFees).toBe(300);
    });
  });

  describe('getCreatorRevenueReport', () => {
    it('should generate revenue report for creator', async () => {
      const creatorAddress = 'SP9999999999999999999999999999999999999';

      await Purchase.create({
        contentId: 1,
        user: 'SP1111111111111111111111111111111111111',
        creator: creatorAddress,
        txId: 'tx1abcdef1234567890abcdef1234567890abcdef123',
        amount: 1000,
        creatorAmount: 900,
        platformFee: 100
      });

      const report = await purchaseHistoryService.getCreatorRevenueReport(creatorAddress);

      expect(report.summary.totalRevenue).toBe(900);
      expect(report.summary.netMargin).toBeDefined();
      expect(report.byDate).toBeDefined();
    });
  });

  describe('getContentPurchaseTrends', () => {
    it('should calculate purchase trends for content', async () => {
      const contentId = 1;

      await Purchase.create({
        contentId: contentId,
        user: 'SP1111111111111111111111111111111111111',
        creator: 'SP9999999999999999999999999999999999999',
        txId: 'tx1abcdef1234567890abcdef1234567890abcdef123',
        amount: 1000,
        creatorAmount: 900,
        platformFee: 100
      });

      const trends = await purchaseHistoryService.getContentPurchaseTrends(contentId);

      expect(trends.totalPurchases).toBe(1);
      expect(trends.totalAmount).toBe(1000);
      expect(trends.trends).toBeDefined();
    });
  });
});
