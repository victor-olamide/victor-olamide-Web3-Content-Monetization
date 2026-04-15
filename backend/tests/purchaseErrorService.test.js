const purchaseErrorService = require('../../services/purchaseErrorService');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Purchase = require('../../models/Purchase');
const TransactionHistory = require('../../models/TransactionHistory');

let mongoServer;

describe('Purchase Error Service - Issue #151', () => {
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
    await TransactionHistory.deleteMany({});
  });

  describe('handlePaymentVerificationFailure', () => {
    it('should record payment verification failure', async () => {
      const txId = 'failedtx1234567890abcdef1234567890abcdef1234567890abc';
      const reason = 'Transaction not found on blockchain';

      const result = await purchaseErrorService.handlePaymentVerificationFailure(txId, reason);

      expect(result.txId).toBe(txId);
      expect(result.reason).toBe(reason);
      expect(result.status).toBe('payment_verification_failed');
    });
  });

  describe('handleFailedTransaction', () => {
    it('should mark transaction for refund on failure', async () => {
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

      const result = await purchaseErrorService.handleFailedTransaction(
        'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        'Post-condition violation'
      );

      expect(result.success).toBe(true);
      expect(result.refundInitiated).toBe(true);

      // Verify purchase is marked for refund
      const updatedPurchase = await Purchase.findOne({
        txId: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
      });
      expect(updatedPurchase.refundStatus).toBe('pending');
    });
  });

  describe('handleDuplicateTransaction', () => {
    it('should detect duplicate transactions', async () => {
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

      const result = await purchaseErrorService.handleDuplicateTransaction(
        'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
      );

      expect(result.isDuplicate).toBe(true);
      expect(result.existingPurchase).toBeDefined();
    });

    it('should not flag as duplicate for new transaction', async () => {
      const result = await purchaseErrorService.handleDuplicateTransaction(
        'newtxid1234567890abcdef1234567890abcdef1234567890abcdef12345678'
      );

      expect(result.isDuplicate).toBe(false);
    });
  });

  describe('retryFailedPurchase', () => {
    it('should retry a failed purchase', async () => {
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
      const savedPurchase = await purchase.save();

      const result = await purchaseErrorService.retryFailedPurchase(savedPurchase._id);

      expect(result.success).toBe(true);

      // Verify refund status is reset
      const updatedPurchase = await Purchase.findById(savedPurchase._id);
      expect(updatedPurchase.refundStatus).toBe('none');
    });
  });

  describe('getErrorMetrics', () => {
    it('should calculate error metrics', async () => {
      // Create some records for testing
      await Purchase.create({
        contentId: 1,
        user: 'SP1234567890123456789012345678901234567',
        creator: 'SP9876543210987654321098765432109876543',
        txId: 'tx1abcdef1234567890abcdef1234567890abcdef123',
        amount: 1000,
        creatorAmount: 900,
        platformFee: 100,
        refundStatus: 'pending'
      });

      const metrics = await purchaseErrorService.getErrorMetrics();

      expect(metrics.failedTransactions).toBeDefined();
      expect(metrics.pendingRefunds).toBeDefined();
      expect(metrics.revokedAccess).toBeDefined();
      expect(metrics.timestamp).toBeDefined();
    });
  });

  describe('getAuditTrail', () => {
    it('should generate audit trail for purchase', async () => {
      const txId = 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
      const purchase = new Purchase({
        contentId: 1,
        user: 'SP1234567890123456789012345678901234567',
        creator: 'SP9876543210987654321098765432109876543',
        txId: txId,
        amount: 1000,
        creatorAmount: 900,
        platformFee: 100
      });
      await purchase.save();

      const trail = await purchaseErrorService.getAuditTrail(txId, null, null);

      expect(trail.purchases.length).toBe(1);
      expect(trail.auditTimestamp).toBeDefined();
    });
  });
});
