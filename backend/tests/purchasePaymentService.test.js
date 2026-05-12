const purchasePaymentService = require('../../services/purchasePaymentService');
const purchaseErrorService = require('../../services/purchaseErrorService');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Purchase = require('../../models/Purchase');

jest.mock('../../services/stacksApiService');
jest.mock('../../services/contractService');
jest.mock('../../services/transactionHistoryService');

let mongoServer;

describe('Purchase Payment Service - Issue #151', () => {
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

  describe('calculatePaymentSplit', () => {
    it('should calculate payment split correctly', async () => {
      const { calculatePlatformFee } = require('../../services/contractService');
      calculatePlatformFee.mockResolvedValue(100);

      const split = await purchasePaymentService.calculatePaymentSplit(1000);

      expect(split.totalAmount).toBe(1000);
      expect(split.platformFee).toBe(100);
      expect(split.creatorAmount).toBe(900);
      expect(split.feePercentage).toBe('10.00');
    });
  });

  describe('getPaymentStatus', () => {
    it('should return payment status for transaction', async () => {
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

      const status = await purchasePaymentService.getPaymentStatus(
        'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
      );

      expect(status.found).toBe(true);
      expect(status.purchase.amount).toBe(1000);
    });

    it('should indicate not found for missing transaction', async () => {
      const status = await purchasePaymentService.getPaymentStatus(
        'nonexistent1234567890abcdef1234567890abcdef12345678901234567890'
      );

      expect(status.found).toBe(false);
    });
  });

  describe('validatePaymentEligibility', () => {
    it('should allow payment for new content purchase', async () => {
      const result = await purchasePaymentService.validatePaymentEligibility(
        'SP1234567890123456789012345678901234567',
        1,
        1000
      );

      expect(result.eligible).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should reject purchase if user already has access', async () => {
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

      const result = await purchasePaymentService.validatePaymentEligibility(
        'SP1234567890123456789012345678901234567',
        1,
        1000
      );

      expect(result.eligible).toBe(false);
      expect(result.errors).toContain('User already has access to this content');
    });

    it('should reject purchase if refund is pending', async () => {
      const purchase = new Purchase({
        contentId: 1,
        user: 'SP1234567890123456789012345678901234567',
        creator: 'SP9876543210987654321098765432109876543',
        txId: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        amount: 1000,
        creatorAmount: 900,
        platformFee: 100,
        refundStatus: 'pending'
      });
      await purchase.save();

      const result = await purchasePaymentService.validatePaymentEligibility(
        'SP1234567890123456789012345678901234567',
        1,
        1000
      );

      expect(result.eligible).toBe(false);
      expect(result.errors).toContain('User has a pending refund for this content');
    });
  });

  describe('handlePaymentDispute', () => {
    it('should record a payment dispute', async () => {
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

      const result = await purchasePaymentService.handlePaymentDispute(
        'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        'Unauthorized payment',
        'Payment made without consent'
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('under review');

      // Verify purchase is marked for refund
      const updatedPurchase = await Purchase.findOne({
        txId: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
      });
      expect(updatedPurchase.refundStatus).toBe('pending');
    });
  });

  describe('getPaymentAnalytics', () => {
    it('should calculate payment analytics', async () => {
      await Purchase.create([
        {
          contentId: 1,
          user: 'SP1111111111111111111111111111111111111',
          creator: 'SP9999999999999999999999999999999999999',
          txId: 'tx1abcdef1234567890abcdef1234567890abcdef123',
          amount: 1000,
          creatorAmount: 900,
          platformFee: 100
        },
        {
          contentId: 2,
          user: 'SP2222222222222222222222222222222222222',
          creator: 'SP9999999999999999999999999999999999999',
          txId: 'tx2abcdef1234567890abcdef1234567890abcdef123',
          amount: 2000,
          creatorAmount: 1800,
          platformFee: 200
        }
      ]);

      const analytics = await purchasePaymentService.getPaymentAnalytics();

      expect(analytics.summary.totalPurchases).toBe(2);
      expect(analytics.summary.totalAmount).toBe(3000);
      expect(analytics.summary.totalCreatorAmount).toBe(2700);
      expect(analytics.summary.totalPlatformFees).toBe(300);
    });
  });
});
