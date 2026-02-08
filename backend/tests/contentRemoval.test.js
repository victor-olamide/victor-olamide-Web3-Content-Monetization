const Content = require('../models/Content');
const Purchase = require('../models/Purchase');
const Refund = require('../models/Refund');
const { 
  calculateRefundEligibility, 
  validateRefundEligibility,
  initiateRefund, 
  approveRefund, 
  completeRefund, 
  rejectRefund 
} = require('../services/refundService');

describe('Content Removal and Refund System', () => {
  describe('Content Model', () => {
    test('should create content with removal fields', () => {
      const contentData = {
        contentId: 1,
        title: 'Test Content',
        price: 100,
        creator: 'SP1...creator',
        url: 'ipfs://...',
        isRemoved: false,
        refundable: true,
        refundWindowDays: 30
      };
      
      const content = new Content(contentData);
      
      expect(content.isRemoved).toBe(false);
      expect(content.removedAt).toBeNull();
      expect(content.refundable).toBe(true);
      expect(content.refundWindowDays).toBe(30);
    });

    test('should update removal fields correctly', () => {
      const content = new Content({
        contentId: 1,
        title: 'Test',
        price: 100,
        creator: 'SP1...creator',
        url: 'ipfs://...'
      });
      
      const removalTime = new Date();
      content.isRemoved = true;
      content.removedAt = removalTime;
      content.removalReason = 'Requested by creator';
      
      expect(content.isRemoved).toBe(true);
      expect(content.removedAt).toEqual(removalTime);
      expect(content.removalReason).toBe('Requested by creator');
    });
  });

  describe('Purchase Model with Refund Fields', () => {
    test('should track refund status', () => {
      const purchaseData = {
        contentId: 1,
        user: 'SP2...user',
        creator: 'SP1...creator',
        txId: '0x123...abc',
        amount: 100,
        platformFee: 10,
        creatorAmount: 90,
        refundStatus: 'pending'
      };
      
      const purchase = new Purchase(purchaseData);
      
      expect(purchase.refundStatus).toBe('pending');
      expect(purchase.refundAmount).toBeNull();
      expect(purchase.refundTxId).toBeNull();
    });

    test('should validate refund status enum', () => {
      const purchase = new Purchase({
        contentId: 1,
        user: 'SP2...user',
        creator: 'SP1...creator',
        txId: '0x123...abc',
        amount: 100,
        creatorAmount: 90,
        refundStatus: 'invalid-status'
      });
      
      const err = purchase.validateSync();
      expect(err.errors.refundStatus).toBeDefined();
    });
  });

  describe('Refund Eligibility Calculation', () => {
    test('should deny refund for non-refundable content', () => {
      const content = {
        refundable: false,
        refundWindowDays: 30
      };
      
      const purchase = {
        refundStatus: 'none',
        timestamp: new Date()
      };
      
      const result = calculateRefundEligibility(purchase, content);
      
      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('content-not-refundable');
    });

    test('should deny refund if already processed', () => {
      const content = {
        refundable: true,
        refundWindowDays: 30
      };
      
      const purchase = {
        refundStatus: 'completed',
        timestamp: new Date(),
        amount: 100
      };
      
      const result = calculateRefundEligibility(purchase, content);
      
      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('refund-already-processed');
    });

    test('should deny refund outside window', () => {
      const content = {
        refundable: true,
        refundWindowDays: 1
      };
      
      const twoMonthsAgo = new Date();
      twoMonthsAgo.setDate(twoMonthsAgo.getDate() - 60);
      
      const purchase = {
        refundStatus: 'none',
        timestamp: twoMonthsAgo,
        amount: 100
      };
      
      const result = calculateRefundEligibility(purchase, content);
      
      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('refund-window-expired');
    });

    test('should approve refund within window', () => {
      const content = {
        refundable: true,
        refundWindowDays: 30
      };
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const purchase = {
        refundStatus: 'none',
        timestamp: yesterday,
        amount: 100
      };
      
      const result = calculateRefundEligibility(purchase, content);
      
      expect(result.eligible).toBe(true);
      expect(result.reason).toBe('within-refund-window');
      expect(result.refundAmount).toBe(100);
    });
  });

  describe('Refund Eligibility Validation', () => {
    test('should reject null purchase', () => {
      const result = validateRefundEligibility(null, {});
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Purchase not found');
    });

    test('should reject null content', () => {
      const result = validateRefundEligibility({}, null);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Content not found');
    });

    test('should reject invalid refundable status', () => {
      const result = validateRefundEligibility(
        { refundStatus: 'none' },
        { refundable: 'yes' }
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain('refundability');
    });

    test('should reject negative refund window', () => {
      const result = validateRefundEligibility(
        { refundStatus: 'none' },
        { refundable: true, refundWindowDays: -1 }
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain('refund window');
    });

    test('should reject invalid purchase status', () => {
      const result = validateRefundEligibility(
        { refundStatus: 'invalid' },
        { refundable: true, refundWindowDays: 30 }
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain('refund status');
    });

    test('should accept valid inputs', () => {
      const result = validateRefundEligibility(
        { refundStatus: 'none' },
        { refundable: true, refundWindowDays: 30 }
      );
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('Refund Status Transitions', () => {
    test('should require refundId for approval', async () => {
      const result = await approveRefund(null, 'SP1...approver');
      expect(result.success).toBe(false);
      expect(result.message).toContain('Refund ID');
    });

    test('should require approvedBy for approval', async () => {
      const result = await approveRefund('someId', null);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Approver address');
    });

    test('should require txId for completion', async () => {
      const result = await completeRefund('someId', null);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Transaction ID');
    });

    test('should validate txId as string', async () => {
      const result = await completeRefund('someId', 123);
      expect(result.success).toBe(false);
      expect(result.message).toContain('string');
    });

    test('should require valid reason for initiation', async () => {
      const result = await initiateRefund('someId', 'invalid-reason');
      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid refund reason');
    });
  });

  describe('Refund Model', () => {
    test('should create refund with all fields', () => {
      const refundData = {
        purchaseId: '507f1f77bcf86cd799439011',
        contentId: 1,
        user: 'SP2...user',
        creator: 'SP1...creator',
        originalPurchaseAmount: 100,
        refundAmount: 100,
        reason: 'content-removed',
        status: 'pending'
      };
      
      const refund = new Refund(refundData);
      
      expect(refund.purchaseId).toBe(refundData.purchaseId);
      expect(refund.originalPurchaseAmount).toBe(100);
      expect(refund.reason).toBe('content-removed');
      expect(refund.status).toBe('pending');
      expect(refund.createdAt).toBeDefined();
    });

    test('should validate refund status enum', () => {
      const refund = new Refund({
        purchaseId: '507f1f77bcf86cd799439011',
        contentId: 1,
        user: 'SP2...user',
        creator: 'SP1...creator',
        originalPurchaseAmount: 100,
        refundAmount: 100,
        reason: 'content-removed',
        status: 'invalid-status'
      });
      
      const err = refund.validateSync();
      expect(err.errors.status).toBeDefined();
    });

    test('should validate refund reason enum', () => {
      const refund = new Refund({
        purchaseId: '507f1f77bcf86cd799439011',
        contentId: 1,
        user: 'SP2...user',
        creator: 'SP1...creator',
        originalPurchaseAmount: 100,
        refundAmount: 100,
        reason: 'invalid-reason',
        status: 'pending'
      });
      
      const err = refund.validateSync();
      expect(err.errors.reason).toBeDefined();
    });
  });
});
