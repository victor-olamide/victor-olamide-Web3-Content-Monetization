const Subscription = require('../models/Subscription');
const SubscriptionRenewal = require('../models/SubscriptionRenewal');
const {
  validateRenewalEligibility,
  isInGracePeriod,
  calculateRenewalStatus,
  initiateRenewal,
  completeRenewal,
  handleRenewalFailure,
  applyGracePeriod,
  getSubscriptionsDueForRenewal,
  getExpiredSubscriptionsInGracePeriod,
  getExpiredSubscriptionsGraceEnded,
  cancelSubscription,
  getRenewalHistory,
  getUserSubscriptionStatus
} = require('../services/renewalService');

describe('Subscription Renewal Service', () => {
  // Test Data
  const mockSubscriptionId = 'sub-test-123';
  const mockUserId = 'user-123';
  const mockCreatorId = 'creator-456';
  const mockTierId = 'tier-789';

  beforeEach(async () => {
    // Mock MongoDB connection if needed
    jest.clearAllMocks();
  });

  describe('validateRenewalEligibility', () => {
    it('should validate renewal eligibility for active subscription', async () => {
      const subscription = {
        _id: mockSubscriptionId,
        user: mockUserId,
        creator: mockCreatorId,
        tierId: mockTierId,
        expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        autoRenewal: true,
        status: 'active'
      };

      const result = await validateRenewalEligibility(subscription);
      expect(result.eligible).toBe(true);
    });

    it('should deny renewal for cancelled subscription', async () => {
      const subscription = {
        _id: mockSubscriptionId,
        status: 'cancelled',
        cancelledAt: new Date()
      };

      const result = await validateRenewalEligibility(subscription);
      expect(result.eligible).toBe(false);
      expect(result.reason).toContain('cancelled');
    });

    it('should deny renewal when autoRenewal is disabled', async () => {
      const subscription = {
        _id: mockSubscriptionId,
        autoRenewal: false,
        status: 'active'
      };

      const result = await validateRenewalEligibility(subscription);
      expect(result.eligible).toBe(false);
      expect(result.reason).toContain('autoRenewal');
    });
  });

  describe('isInGracePeriod', () => {
    it('should return true for subscription within grace period', async () => {
      const subscription = {
        expiryDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        graceExpiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        gracePeriodDays: 7
      };

      const result = isInGracePeriod(subscription);
      expect(result).toBe(true);
    });

    it('should return false for subscription past grace period', async () => {
      const subscription = {
        expiryDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
        graceExpiresAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        gracePeriodDays: 7
      };

      const result = isInGracePeriod(subscription);
      expect(result).toBe(false);
    });

    it('should return false for active subscription', async () => {
      const subscription = {
        expiryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        gracePeriodDays: 7
      };

      const result = isInGracePeriod(subscription);
      expect(result).toBe(false);
    });
  });

  describe('calculateRenewalStatus', () => {
    it('should return "active" for non-expired subscription', () => {
      const subscription = {
        expiryDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)
      };

      const status = calculateRenewalStatus(subscription);
      expect(status).toBe('active');
    });

    it('should return "expiring-soon" for subscription expiring within 3 days', () => {
      const subscription = {
        expiryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
      };

      const status = calculateRenewalStatus(subscription);
      expect(status).toBe('expiring-soon');
    });

    it('should return "grace-period" for expired but within grace period', () => {
      const subscription = {
        expiryDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        graceExpiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
      };

      const status = calculateRenewalStatus(subscription);
      expect(status).toBe('grace-period');
    });

    it('should return "expired" for subscription past grace period', () => {
      const subscription = {
        expiryDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        graceExpiresAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      };

      const status = calculateRenewalStatus(subscription);
      expect(status).toBe('expired');
    });
  });

  describe('initiateRenewal', () => {
    it('should create renewal record for eligible subscription', async () => {
      const mockRenewal = {
        _id: 'renewal-123',
        subscriptionId: mockSubscriptionId,
        status: 'pending',
        renewalType: 'automatic'
      };

      jest.spyOn(SubscriptionRenewal, 'create').mockResolvedValue(mockRenewal);

      const result = await initiateRenewal(mockSubscriptionId, 'automatic');

      expect(result.success).toBe(true);
      expect(result.renewal._id).toBe('renewal-123');
    });

    it('should handle renewal initiation failure', async () => {
      jest.spyOn(SubscriptionRenewal, 'create').mockRejectedValue(
        new Error('Database error')
      );

      const result = await initiateRenewal(mockSubscriptionId);

      expect(result.success).toBe(false);
      expect(result.message).toContain('error');
    });
  });

  describe('completeRenewal', () => {
    it('should mark renewal as completed with transaction ID', async () => {
      const mockTxId = 'tx-abc123def456';
      const mockRenewal = {
        _id: 'renewal-123',
        subscriptionId: mockSubscriptionId,
        status: 'completed',
        transactionId: mockTxId,
        save: jest.fn().mockResolvedValue(true)
      };

      jest.spyOn(SubscriptionRenewal, 'findById').mockResolvedValue(mockRenewal);

      const result = await completeRenewal('renewal-123', mockTxId);

      expect(result.success).toBe(true);
      expect(result.renewal.status).toBe('completed');
      expect(result.renewal.transactionId).toBe(mockTxId);
    });

    it('should handle renewal not found', async () => {
      jest.spyOn(SubscriptionRenewal, 'findById').mockResolvedValue(null);

      const result = await completeRenewal('invalid-renewal-id', 'tx-123');

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });
  });

  describe('handleRenewalFailure', () => {
    it('should schedule retry for failed renewal', async () => {
      const mockRenewal = {
        _id: 'renewal-123',
        subscriptionId: mockSubscriptionId,
        attemptNumber: 1,
        maxAttempts: 3,
        status: 'pending',
        save: jest.fn().mockResolvedValue(true)
      };

      jest.spyOn(SubscriptionRenewal, 'findById').mockResolvedValue(mockRenewal);

      const result = await handleRenewalFailure('renewal-123', 'Payment failed');

      expect(result.success).toBe(true);
      expect(result.willRetry).toBe(true);
    });

    it('should mark renewal as failed after max retries', async () => {
      const mockRenewal = {
        _id: 'renewal-123',
        subscriptionId: mockSubscriptionId,
        attemptNumber: 3,
        maxAttempts: 3,
        status: 'failed',
        save: jest.fn().mockResolvedValue(true)
      };

      jest.spyOn(SubscriptionRenewal, 'findById').mockResolvedValue(mockRenewal);

      const result = await handleRenewalFailure('renewal-123', 'Max retries exceeded');

      expect(result.willRetry).toBe(false);
      expect(result.message).toContain('max retries');
    });
  });

  describe('applyGracePeriod', () => {
    it('should apply grace period to expired subscription', async () => {
      const mockSubscription = {
        _id: mockSubscriptionId,
        expiryDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        gracePeriodDays: 7,
        graceExpiresAt: null,
        save: jest.fn().mockResolvedValue(true)
      };

      jest.spyOn(Subscription, 'findById').mockResolvedValue(mockSubscription);

      const result = await applyGracePeriod(mockSubscriptionId);

      expect(result.success).toBe(true);
      expect(result.gracePeriod).toBeDefined();
      expect(result.gracePeriod.daysRemaining).toBe(7);
    });

    it('should reject grace period for active subscription', async () => {
      const mockSubscription = {
        _id: mockSubscriptionId,
        expiryDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        gracePeriodDays: 7
      };

      jest.spyOn(Subscription, 'findById').mockResolvedValue(mockSubscription);

      const result = await applyGracePeriod(mockSubscriptionId);

      expect(result.success).toBe(false);
    });
  });

  describe('getSubscriptionsDueForRenewal', () => {
    it('should return subscriptions expiring within 3 days with autoRenewal', async () => {
      const mockSubscriptions = [
        {
          _id: 'sub-1',
          autoRenewal: true,
          expiryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
        }
      ];

      jest.spyOn(Subscription, 'find').mockResolvedValue(mockSubscriptions);

      const result = await getSubscriptionsDueForRenewal();

      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('getExpiredSubscriptionsInGracePeriod', () => {
    it('should return expired subscriptions still in grace period', async () => {
      const mockSubscriptions = [
        {
          _id: 'sub-1',
          expiryDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          graceExpiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
        }
      ];

      jest.spyOn(Subscription, 'find').mockResolvedValue(mockSubscriptions);

      const result = await getExpiredSubscriptionsInGracePeriod();

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getExpiredSubscriptionsGraceEnded', () => {
    it('should return subscriptions where grace period has ended', async () => {
      const mockSubscriptions = [
        {
          _id: 'sub-1',
          expiryDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
          graceExpiresAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
        }
      ];

      jest.spyOn(Subscription, 'find').mockResolvedValue(mockSubscriptions);

      const result = await getExpiredSubscriptionsGraceEnded();

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel active subscription with reason', async () => {
      const mockSubscription = {
        _id: mockSubscriptionId,
        status: 'active',
        cancelledAt: null,
        cancelReason: null,
        save: jest.fn().mockResolvedValue(true)
      };

      jest.spyOn(Subscription, 'findById').mockResolvedValue(mockSubscription);

      const result = await cancelSubscription(mockSubscriptionId, 'User request');

      expect(result.success).toBe(true);
      expect(result.subscription.status).toBe('cancelled');
      expect(result.subscription.cancelReason).toBe('User request');
    });

    it('should reject cancellation of already cancelled subscription', async () => {
      const mockSubscription = {
        _id: mockSubscriptionId,
        status: 'cancelled',
        cancelledAt: new Date()
      };

      jest.spyOn(Subscription, 'findById').mockResolvedValue(mockSubscription);

      const result = await cancelSubscription(mockSubscriptionId, 'User request');

      expect(result.success).toBe(false);
      expect(result.message).toContain('already cancelled');
    });
  });

  describe('getRenewalHistory', () => {
    it('should return all renewals for a subscription', async () => {
      const mockRenewals = [
        {
          _id: 'renewal-1',
          subscriptionId: mockSubscriptionId,
          status: 'completed',
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        },
        {
          _id: 'renewal-2',
          subscriptionId: mockSubscriptionId,
          status: 'completed',
          createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
        }
      ];

      jest.spyOn(SubscriptionRenewal, 'find').mockResolvedValue(mockRenewals);

      const result = await getRenewalHistory(mockSubscriptionId);

      expect(result.length).toBe(2);
      expect(result[0].subscriptionId).toBe(mockSubscriptionId);
    });
  });

  describe('getUserSubscriptionStatus', () => {
    it('should return status dashboard for user subscriptions', async () => {
      const mockSubscriptions = [
        {
          _id: 'sub-1',
          status: 'active',
          expiryDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)
        }
      ];

      jest.spyOn(Subscription, 'find').mockResolvedValue(mockSubscriptions);

      const result = await getUserSubscriptionStatus(mockUserId);

      expect(result.user).toBe(mockUserId);
      expect(result.subscriptions).toBeDefined();
      expect(result.statistics).toBeDefined();
    });
  });
});
