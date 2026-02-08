const subscriptionTierService = require('../services/subscriptionTierService');
const SubscriptionTier = require('../models/SubscriptionTier');

// Mock data
const mockCreatorId = 'creator-123';
const mockTierData = {
  name: 'Premium',
  description: 'Premium subscription with exclusive content',
  price: 9.99,
  position: 0,
  benefits: [
    { feature: 'Exclusive Videos', description: 'Access to exclusive videos', included: true },
    { feature: 'Early Access', included: true }
  ],
  trialDays: 7
};

describe('SubscriptionTier Service', () => {
  // Clean up after tests
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createSubscriptionTier', () => {
    test('should create a new subscription tier successfully', async () => {
      jest.spyOn(SubscriptionTier, 'find').mockResolvedValue([]);
      jest.spyOn(SubscriptionTier.prototype, 'save').mockResolvedValue({
        _id: 'tier-123',
        creatorId: mockCreatorId,
        ...mockTierData,
        position: 0
      });

      const result = await subscriptionTierService.createSubscriptionTier(mockCreatorId, mockTierData);

      expect(result.success).toBe(true);
      expect(result.tier).toBeDefined();
      expect(result.tier.name).toBe('Premium');
    });

    test('should fail with missing required fields', async () => {
      const incompleteData = { name: 'Premium' }; // missing description and price

      const result = await subscriptionTierService.createSubscriptionTier(mockCreatorId, incompleteData);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should set correct position for new tier', async () => {
      const existingTiers = [
        { position: 0 },
        { position: 1 }
      ];

      jest.spyOn(SubscriptionTier, 'find').mockResolvedValue(existingTiers);
      jest.spyOn(SubscriptionTier.prototype, 'save').mockResolvedValue({
        position: 2
      });

      const result = await subscriptionTierService.createSubscriptionTier(mockCreatorId, mockTierData);

      expect(result.success).toBe(true);
    });
  });

  describe('getCreatorTiers', () => {
    test('should get all active and visible tiers for creator', async () => {
      const mockTiers = [
        { _id: 'tier-1', name: 'Basic', isActive: true, isVisible: true, position: 0 },
        { _id: 'tier-2', name: 'Premium', isActive: true, isVisible: true, position: 1 }
      ];

      jest.spyOn(SubscriptionTier, 'find').mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockTiers)
        })
      });

      const result = await subscriptionTierService.getCreatorTiers(mockCreatorId);

      expect(result.success).toBe(true);
      expect(result.count).toBe(2);
      expect(result.tiers).toHaveLength(2);
    });

    test('should filter by active status when specified', async () => {
      jest.spyOn(SubscriptionTier, 'find').mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([])
        })
      });

      const result = await subscriptionTierService.getCreatorTiers(mockCreatorId, {
        includeInactive: false
      });

      expect(result.success).toBe(true);
    });

    test('should fail without creator ID', async () => {
      const result = await subscriptionTierService.getCreatorTiers(null);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Creator ID');
    });
  });

  describe('getTierById', () => {
    test('should retrieve a tier by ID', async () => {
      const mockTier = {
        _id: 'tier-123',
        name: 'Premium',
        price: 9.99
      };

      jest.spyOn(SubscriptionTier, 'findById').mockResolvedValue(mockTier);

      const result = await subscriptionTierService.getTierById('tier-123');

      expect(result.success).toBe(true);
      expect(result.tier._id).toBe('tier-123');
    });

    test('should return error for non-existent tier', async () => {
      jest.spyOn(SubscriptionTier, 'findById').mockResolvedValue(null);

      const result = await subscriptionTierService.getTierById('invalid-id');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('updateSubscriptionTier', () => {
    test('should update a tier successfully', async () => {
      const updateData = { price: 14.99, name: 'Premium Plus' };
      const mockUpdatedTier = { _id: 'tier-123', ...updateData };

      jest.spyOn(SubscriptionTier, 'findByIdAndUpdate').mockResolvedValue(mockUpdatedTier);

      const result = await subscriptionTierService.updateSubscriptionTier('tier-123', updateData);

      expect(result.success).toBe(true);
      expect(result.tier.price).toBe(14.99);
    });

    test('should fail for invalid tier ID', async () => {
      jest.spyOn(SubscriptionTier, 'findByIdAndUpdate').mockResolvedValue(null);

      const result = await subscriptionTierService.updateSubscriptionTier('invalid-id', {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('deleteSubscriptionTier', () => {
    test('should soft delete a tier with no subscribers', async () => {
      jest.spyOn(SubscriptionTier, 'findByIdAndUpdate').mockResolvedValue({
        _id: 'tier-123',
        isActive: false,
        isVisible: false
      });

      const result = await subscriptionTierService.deleteSubscriptionTier('tier-123', false);

      expect(result.success).toBe(true);
      expect(result.message).toContain('deleted');
    });

    test('should prevent deletion of tier with active subscribers', async () => {
      const Subscription = require('../models/Subscription');
      jest.spyOn(Subscription, 'countDocuments').mockResolvedValue(5);

      const result = await subscriptionTierService.deleteSubscriptionTier('tier-123', false);

      expect(result.success).toBe(false);
      expect(result.error).toContain('5 active subscribers');
    });
  });

  describe('compareTiers', () => {
    test('should compare two tiers and return feature differences', async () => {
      const tier1 = {
        _id: 'tier-1',
        name: 'Basic',
        price: 4.99,
        benefits: [
          { feature: 'Standard Content', included: true },
          { feature: 'Community Access', included: true }
        ]
      };

      const tier2 = {
        _id: 'tier-2',
        name: 'Premium',
        price: 9.99,
        benefits: [
          { feature: 'Standard Content', included: true },
          { feature: 'Exclusive Videos', included: true },
          { feature: 'Community Access', included: true }
        ]
      };

      jest.spyOn(SubscriptionTier, 'findById')
        .mockResolvedValueOnce(tier1)
        .mockResolvedValueOnce(tier2);

      const result = await subscriptionTierService.compareTiers('tier-1', 'tier-2');

      expect(result.success).toBe(true);
      expect(result.comparison).toBeDefined();
      expect(result.comparison.priceDifference).toBe(5);
    });
  });

  describe('getTierHierarchy', () => {
    test('should return organized tier hierarchy for creator', async () => {
      const mockTiers = [
        {
          _id: 'tier-1',
          position: 0,
          name: 'Basic',
          price: 4.99,
          subscriberCount: 100,
          benefits: [{ feature: 'Standard', included: true }],
          availableSlots: Infinity,
          isFull: false,
          isPopular: false
        },
        {
          _id: 'tier-2',
          position: 1,
          name: 'Premium',
          price: 9.99,
          subscriberCount: 50,
          benefits: [{ feature: 'Exclusive', included: true }],
          availableSlots: 100,
          isFull: false,
          isPopular: true
        }
      ];

      jest.spyOn(SubscriptionTier, 'find').mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockTiers)
        })
      });

      const result = await subscriptionTierService.getTierHierarchy(mockCreatorId);

      expect(result.success).toBe(true);
      expect(result.hierarchy.tiers).toHaveLength(2);
      expect(result.hierarchy.minPrice).toBe(4.99);
      expect(result.hierarchy.maxPrice).toBe(9.99);
      expect(result.hierarchy.totalSubscribers).toBe(150);
    });
  });

  describe('getTierSuggestions', () => {
    test('should recommend creating tiers when none exist', async () => {
      jest.spyOn(SubscriptionTier, 'find').mockResolvedValue([]);

      const result = await subscriptionTierService.getTierSuggestions(mockCreatorId);

      expect(result.success).toBe(true);
      expect(result.suggestions.addTier).toBeDefined();
    });

    test('should suggest adding premium tier with single tier', async () => {
      const mockTiers = [{ _id: 'tier-1', name: 'Basic', price: 4.99 }];
      jest.spyOn(SubscriptionTier, 'find').mockResolvedValue(mockTiers);

      const result = await subscriptionTierService.getTierSuggestions(mockCreatorId);

      expect(result.success).toBe(true);
      expect(result.suggestions.addTier).toContain('premium');
    });
  });

  describe('recordTierPurchase', () => {
    test('should increment subscriber count and revenue', async () => {
      const mockTier = {
        _id: 'tier-123',
        subscriberCount: 10,
        revenueTotal: 100
      };

      jest.spyOn(SubscriptionTier, 'findByIdAndUpdate').mockResolvedValue({
        ...mockTier,
        subscriberCount: 11,
        revenueTotal: 109.99
      });

      const result = await subscriptionTierService.recordTierPurchase('tier-123', 9.99);

      expect(result.success).toBe(true);
      expect(result.tier.subscriberCount).toBe(11);
    });
  });

  describe('recordTierCancellation', () => {
    test('should decrement subscriber count', async () => {
      jest.spyOn(SubscriptionTier, 'findByIdAndUpdate').mockResolvedValue({
        _id: 'tier-123',
        subscriberCount: 9
      });

      const result = await subscriptionTierService.recordTierCancellation('tier-123');

      expect(result.success).toBe(true);
      expect(result.tier.subscriberCount).toBe(9);
    });
  });

  describe('reorderTiers', () => {
    test('should reorder multiple tiers', async () => {
      const tierPositions = [
        { tierId: 'tier-1', position: 1 },
        { tierId: 'tier-2', position: 0 }
      ];

      jest.spyOn(SubscriptionTier, 'findByIdAndUpdate')
        .mockResolvedValueOnce({ _id: 'tier-1', position: 1 })
        .mockResolvedValueOnce({ _id: 'tier-2', position: 0 });

      const result = await subscriptionTierService.reorderTiers(mockCreatorId, tierPositions);

      expect(result.success).toBe(true);
      expect(result.updated).toBe(2);
    });
  });

  describe('getTierStatistics', () => {
    test('should return statistics for creator tiers', async () => {
      const mockTiers = [
        {
          price: 4.99,
          subscriberCount: 100,
          revenueTotal: 499,
          averageChurn: 5,
          isActive: true,
          position: 0
        },
        {
          price: 9.99,
          subscriberCount: 50,
          revenueTotal: 499.5,
          averageChurn: 3,
          isActive: true,
          position: 1
        }
      ];

      jest.spyOn(SubscriptionTier, 'find').mockResolvedValue(mockTiers);

      const result = await subscriptionTierService.getTierStatistics(mockCreatorId);

      expect(result.success).toBe(true);
      expect(result.statistics.totalTiers).toBe(2);
      expect(result.statistics.activeTiers).toBe(2);
      expect(result.statistics.totalSubscribers).toBe(150);
      expect(result.statistics.totalRevenue).toBe(998.5);
    });

    test('should return zero statistics for creator with no tiers', async () => {
      jest.spyOn(SubscriptionTier, 'find').mockResolvedValue([]);

      const result = await subscriptionTierService.getTierStatistics(mockCreatorId);

      expect(result.success).toBe(true);
      expect(result.statistics.totalTiers).toBe(0);
      expect(result.statistics.totalSubscribers).toBe(0);
    });
  });
});
