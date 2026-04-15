const {
  grantAccessToContent,
  revokeAccessToContent,
  getAccessInfo,
  hasAccessToContent,
  transferAccess,
  getPurchaseStats
} = require('../../services/purchaseAccessService');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Purchase = require('../../models/Purchase');

let mongoServer;

describe('Purchase Access Service - Issue #151', () => {
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
  });

  describe('hasAccessToContent', () => {
    it('should return true for purchased content', async () => {
      const purchase = new Purchase({
        contentId: 1,
        user: 'SP1234567890123456789012345678901234567',
        creator: 'SP9876543210987654321098765432109876543',
        txId: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        amount: 1000,
        creatorAmount: 900,
        platformFee: 100
      });
      await purchase.save();

      const hasAccess = await hasAccessToContent(1, 'SP1234567890123456789012345678901234567');
      expect(hasAccess).toBe(true);
    });

    it('should return false for unpurchased content', async () => {
      const hasAccess = await hasAccessToContent(999, 'SP9999999999999999999999999999999999999');
      expect(hasAccess).toBe(false);
    });

    it('should return false when access is revoked', async () => {
      const purchase = new Purchase({
        contentId: 1,
        user: 'SP1234567890123456789012345678901234567',
        creator: 'SP9876543210987654321098765432109876543',
        txId: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        amount: 1000,
        creatorAmount: 900,
        platformFee: 100,
        accessRevoked: true,
        accessRevokedAt: new Date()
      });
      await purchase.save();

      const hasAccess = await hasAccessToContent(1, 'SP1234567890123456789012345678901234567');
      expect(hasAccess).toBe(false);
    });
  });

  describe('getAccessInfo', () => {
    it('should return access info for purchased content', async () => {
      const purchase = new Purchase({
        contentId: 1,
        user: 'SP1234567890123456789012345678901234567',
        creator: 'SP9876543210987654321098765432109876543',
        txId: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        amount: 1000,
        creatorAmount: 900,
        platformFee: 100
      });
      await purchase.save();

      const info = await getAccessInfo(1, 'SP1234567890123456789012345678901234567');
      expect(info.hasAccess).toBe(true);
      expect(info.amount).toBe(1000);
      expect(info.creatorAddress).toBe('SP9876543210987654321098765432109876543');
    });

    it('should indicate no access for unpurchased content', async () => {
      const info = await getAccessInfo(999, 'SP9999999999999999999999999999999999999');
      expect(info.hasAccess).toBe(false);
      expect(info.reason).toBe('No purchase found');
    });
  });

  describe('revokeAccessToContent', () => {
    it('should revoke access successfully', async () => {
      const purchase = new Purchase({
        contentId: 1,
        user: 'SP1234567890123456789012345678901234567',
        creator: 'SP9876543210987654321098765432109876543',
        txId: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        amount: 1000,
        creatorAmount: 900,
        platformFee: 100
      });
      await purchase.save();

      const result = await revokeAccessToContent(1, 'SP1234567890123456789012345678901234567');
      expect(result.success).toBe(true);
      expect(result.accessRevokedAt).toBeDefined();

      // Verify revocation
      const hasAccess = await hasAccessToContent(1, 'SP1234567890123456789012345678901234567');
      expect(hasAccess).toBe(false);
    });

    it('should return error for non-existent purchase', async () => {
      const result = await revokeAccessToContent(999, 'SP9999999999999999999999999999999999999');
      expect(result.success).toBe(false);
    });
  });

  describe('grantAccessToContent', () => {
    it('should grant access to content', async () => {
      const purchase = new Purchase({
        contentId: 1,
        user: 'SP1234567890123456789012345678901234567',
        creator: 'SP9876543210987654321098765432109876543',
        txId: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        amount: 1000,
        creatorAmount: 900,
        platformFee: 100
      });
      await purchase.save();

      const result = await grantAccessToContent(1, 'SP1234567890123456789012345678901234567', purchase);
      expect(result.accessGranted).toBe(true);
      expect(result.grantedAt).toBeDefined();
    });
  });

  describe('transferAccess', () => {
    it('should transfer access from one user to another', async () => {
      const purchase = new Purchase({
        contentId: 1,
        user: 'SP1111111111111111111111111111111111111',
        creator: 'SP9876543210987654321098765432109876543',
        txId: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        amount: 1000,
        creatorAmount: 900,
        platformFee: 100
      });
      await purchase.save();

      const result = await transferAccess(
        'SP1111111111111111111111111111111111111',
        'SP2222222222222222222222222222222222222',
        1
      );

      expect(result.success).toBe(true);
      expect(result.fromAddress).toBe('SP1111111111111111111111111111111111111');
      expect(result.toAddress).toBe('SP2222222222222222222222222222222222222');

      // Verify original user lost access
      const originalHasAccess = await hasAccessToContent(1, 'SP1111111111111111111111111111111111111');
      expect(originalHasAccess).toBe(false);

      // Verify new user has access
      const newUserHasAccess = await hasAccessToContent(1, 'SP2222222222222222222222222222222222222');
      expect(newUserHasAccess).toBe(true);
    });

    it('should reject transfer if recipient already has access', async () => {
      await Purchase.create({
        contentId: 1,
        user: 'SP1111111111111111111111111111111111111',
        creator: 'SP9876543210987654321098765432109876543',
        txId: 'tx1abcdef1234567890abcdef1234567890abcdef123',
        amount: 1000,
        creatorAmount: 900,
        platformFee: 100
      });

      await Purchase.create({
        contentId: 1,
        user: 'SP2222222222222222222222222222222222222',
        creator: 'SP9876543210987654321098765432109876543',
        txId: 'tx2abcdef1234567890abcdef1234567890abcdef123',
        amount: 1000,
        creatorAmount: 900,
        platformFee: 100
      });

      const result = await transferAccess(
        'SP1111111111111111111111111111111111111',
        'SP2222222222222222222222222222222222222',
        1
      );

      expect(result.success).toBe(false);
      expect(result.reason).toContain('already has access');
    });
  });

  describe('getPurchaseStats', () => {
    it('should calculate purchase statistics', async () => {
      await Purchase.create({
        contentId: 1,
        user: 'SP1111111111111111111111111111111111111',
        creator: 'SP9999999999999999999999999999999999999',
        txId: 'tx1abcdef1234567890abcdef1234567890abcdef123',
        amount: 1000,
        creatorAmount: 900,
        platformFee: 100
      });

      await Purchase.create({
        contentId: 1,
        user: 'SP2222222222222222222222222222222222222',
        creator: 'SP9999999999999999999999999999999999999',
        txId: 'tx2abcdef1234567890abcdef1234567890abcdef123',
        amount: 1000,
        creatorAmount: 900,
        platformFee: 100,
        accessRevoked: true
      });

      const stats = await getPurchaseStats(1);
      expect(stats.totalPurchases).toBe(2);
      expect(stats.totalRevenue).toBe(1800);
      expect(stats.totalPlatformFees).toBe(200);
      expect(stats.activeAccess).toBe(1);
      expect(stats.revokedAccess).toBe(1);
    });
  });
});
