const Subscription = require('../models/Subscription');
const ProRataRefund = require('../models/ProRataRefund');
const {
  calculateProRataRefund,
  checkRefundEligibility,
  cancelSubscriptionWithRefund,
  getProRataRefundDetails,
  approveProRataRefund,
  completeProRataRefund,
  rejectProRataRefund,
  getPendingRefundsForCreator,
  getUserRefunds,
  getRefundStatistics
} = require('../services/proRataRefundService');

describe('Pro-Rata Refund Service', () => {
  const mockSubscriptionData = {
    user: 'user-test-123',
    creator: 'creator-test-456',
    tierId: 1,
    amount: 29.99,
    expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    transactionId: 'tx-test-' + Date.now(),
    autoRenewal: true,
    timestamp: new Date()
  };

  describe('calculateProRataRefund', () => {
    it('should calculate refund for mid-subscription cancellation', () => {
      const subscription = { ...mockSubscriptionData };
      subscription.timestamp = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
      subscription.expiry = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000); // 20 days from now

      const cancellationDate = new Date(Date.now()); // Today

      const result = calculateProRataRefund(subscription, cancellationDate);

      expect(result.eligible).toBe(true);
      expect(result.totalDays).toBeGreaterThan(0);
      expect(result.usedDays).toBeGreaterThan(0);
      expect(result.unusedDays).toBeGreaterThan(0);
      expect(result.refundAmount).toBeGreaterThan(0);
      expect(result.refundAmount).toBeLessThan(subscription.amount);
    });

    it('should calculate full refund for early cancellation', () => {
      const subscription = { ...mockSubscriptionData };
      subscription.timestamp = new Date(); // Just now
      subscription.expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const cancellationDate = new Date(Date.now() + 1000); // 1 second later

      const result = calculateProRataRefund(subscription, cancellationDate);

      expect(result.usedDays).toBeLessThan(1);
      expect(result.unusedDays).toBeCloseTo(30, -1);
      expect(result.refundAmount).toBeCloseTo(subscription.amount, -1);
    });

    it('should calculate minimal refund for late cancellation', () => {
      const subscription = { ...mockSubscriptionData };
      const startDate = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000); // 29 days ago
      subscription.timestamp = startDate;
      subscription.expiry = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);

      const cancellationDate = new Date(Date.now()); // Today

      const result = calculateProRataRefund(subscription, cancellationDate);

      expect(result.usedDays).toBeGreaterThan(28);
      expect(result.unusedDays).toBeLessThan(2);
      expect(result.refundAmount).toBeLessThan(subscription.amount * 0.1); // Less than 10%
    });

    it('should throw error for cancellation before start date', () => {
      const subscription = { ...mockSubscriptionData };
      subscription.timestamp = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000); // 10 days in future

      const cancellationDate = new Date(); // Today

      expect(() => {
        calculateProRataRefund(subscription, cancellationDate);
      }).toThrow();
    });

    it('should throw error for cancellation after expiry date', () => {
      const subscription = { ...mockSubscriptionData };
      subscription.expiry = new Date(Date.now() - 1000); // Already expired

      const cancellationDate = new Date(); // Today

      expect(() => {
        calculateProRataRefund(subscription, cancellationDate);
      }).toThrow();
    });
  });

  describe('checkRefundEligibility', () => {
    it('should mark as eligible within refund window', () => {
      const subscription = { ...mockSubscriptionData };
      subscription.refundEligible = true;
      subscription.refundWindowDays = 30;

      const cancellationDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000); // 5 days later

      const result = checkRefundEligibility(subscription, cancellationDate);

      expect(result.isEligible).toBe(true);
      expect(result.withinWindow).toBe(true);
      expect(result.refundEnabled).toBe(true);
    });

    it('should mark as ineligible outside refund window', () => {
      const subscription = { ...mockSubscriptionData };
      subscription.refundEligible = true;
      subscription.refundWindowDays = 7;
      subscription.timestamp = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 days ago

      const cancellationDate = new Date(); // Today

      const result = checkRefundEligibility(subscription, cancellationDate);

      expect(result.isEligible).toBe(false);
      expect(result.withinWindow).toBe(false);
    });

    it('should mark as ineligible when refunds disabled', () => {
      const subscription = { ...mockSubscriptionData };
      subscription.refundEligible = false;
      subscription.refundWindowDays = 30;

      const cancellationDate = new Date(); // Today

      const result = checkRefundEligibility(subscription, cancellationDate);

      expect(result.isEligible).toBe(false);
      expect(result.refundEnabled).toBe(false);
    });
  });

  describe('cancelSubscriptionWithRefund', () => {
    it('should cancel subscription and create refund record', async () => {
      const mockSub = {
        ...mockSubscriptionData,
        _id: 'sub-123',
        save: jest.fn().mockResolvedValue(true)
      };

      jest.spyOn(Subscription, 'findById').mockResolvedValue(mockSub);
      jest.spyOn(ProRataRefund, 'create').mockResolvedValue({
        _id: 'refund-123',
        refundAmount: 10,
        refundStatus: 'pending'
      });

      const result = await cancelSubscriptionWithRefund('sub-123', {
        reason: 'User request'
      });

      expect(result.success).toBe(true);
      expect(result.subscription._id).toBe('sub-123');
      expect(result.refund).toBeDefined();
    });

    it('should return error for non-existent subscription', async () => {
      jest.spyOn(Subscription, 'findById').mockResolvedValue(null);

      const result = await cancelSubscriptionWithRefund('invalid-id', {
        reason: 'User request'
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });

    it('should return error for already cancelled subscription', async () => {
      const mockSub = {
        ...mockSubscriptionData,
        _id: 'sub-123',
        cancelledAt: new Date()
      };

      jest.spyOn(Subscription, 'findById').mockResolvedValue(mockSub);

      const result = await cancelSubscriptionWithRefund('sub-123', {
        reason: 'User request'
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('already cancelled');
    });
  });

  describe('Refund Approval Workflow', () => {
    it('should approve pending refund', async () => {
      const mockRefund = {
        _id: 'refund-123',
        refundStatus: 'pending',
        save: jest.fn().mockResolvedValue(true)
      };

      jest.spyOn(ProRataRefund, 'findById').mockResolvedValue(mockRefund);

      const result = await approveProRataRefund('refund-123', 'admin-user');

      expect(result.success).toBe(true);
      expect(result.refund.refundStatus).toBe('approved');
    });

    it('should reject non-pending refund', async () => {
      const mockRefund = {
        _id: 'refund-123',
        refundStatus: 'approved'
      };

      jest.spyOn(ProRataRefund, 'findById').mockResolvedValue(mockRefund);

      const result = await approveProRataRefund('refund-123', 'admin-user');

      expect(result.success).toBe(false);
    });

    it('should complete approved refund with transaction', async () => {
      const mockRefund = {
        _id: 'refund-123',
        refundStatus: 'approved',
        markAsCompleted: jest.fn().mockResolvedValue(true)
      };

      jest.spyOn(ProRataRefund, 'findById').mockResolvedValue(mockRefund);

      const result = await completeProRataRefund('refund-123', 'tx-abc123');

      expect(result.success).toBe(true);
    });

    it('should reject pending refund with reason', async () => {
      const mockRefund = {
        _id: 'refund-123',
        refundStatus: 'pending',
        save: jest.fn().mockResolvedValue(true)
      };

      jest.spyOn(ProRataRefund, 'findById').mockResolvedValue(mockRefund);

      const result = await rejectProRataRefund('refund-123', 'Invalid claim');

      expect(result.success).toBe(true);
      expect(result.refund.refundStatus).toBe('rejected');
      expect(result.refund.failureReason).toBe('Invalid claim');
    });
  });

  describe('Refund Queries', () => {
    it('should get pending refunds for creator', async () => {
      const mockRefunds = [
        {
          _id: 'refund-1',
          creatorId: 'creator-456',
          refundStatus: 'pending'
        }
      ];

      jest.spyOn(ProRataRefund, 'find').mockResolvedValue(mockRefunds);

      const result = await getPendingRefundsForCreator('creator-456');

      expect(result.success).toBe(true);
      expect(result.totalPending).toBe(1);
      expect(result.refunds.length).toBe(1);
    });

    it('should get all user refunds with summary', async () => {
      const mockRefunds = [
        {
          _id: 'refund-1',
          userId: 'user-123',
          refundStatus: 'completed',
          refundAmount: 10
        },
        {
          _id: 'refund-2',
          userId: 'user-123',
          refundStatus: 'pending',
          refundAmount: 15
        }
      ];

      jest.spyOn(ProRataRefund, 'find').mockResolvedValue(mockRefunds);

      const result = await getUserRefunds('user-123');

      expect(result.success).toBe(true);
      expect(result.summary.total).toBe(2);
      expect(result.summary.completed).toBe(1);
      expect(result.summary.pending).toBe(1);
    });
  });

  describe('Refund Statistics', () => {
    it('should calculate statistics for all refunds', async () => {
      const mockRefunds = [
        { refundStatus: 'completed', refundAmount: 20 },
        { refundStatus: 'completed', refundAmount: 15 },
        { refundStatus: 'pending', refundAmount: 10 }
      ];

      jest.spyOn(ProRataRefund, 'find').mockResolvedValue(mockRefunds);

      const result = await getRefundStatistics();

      expect(result.success).toBe(true);
      expect(result.statistics.totalRefunds).toBe(3);
      expect(result.statistics.byStatus.completed).toBe(2);
      expect(result.statistics.byStatus.pending).toBe(1);
      expect(result.statistics.totalAmount.requested).toBe(45);
      expect(result.statistics.totalAmount.completed).toBe(35);
    });
  });

  describe('Refund Edge Cases', () => {
    it('should handle zero refund amount correctly', () => {
      const subscription = {
        ...mockSubscriptionData,
        amount: 0
      };

      const result = calculateProRataRefund(subscription);
      expect(result.refundAmount).toBe(0);
    });

    it('should handle negative or null amounts correctly', () => {
      const subscription = {
        ...mockSubscriptionData,
        amount: null
      };

      expect(() => {
        calculateProRataRefund(subscription);
      }).toThrow();
    });
  });
});
