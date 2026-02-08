const request = require('supertest');
const express = require('express');
const subscriptionTierRoutes = require('../routes/subscriptionTierRoutes');
const subscriptionTierService = require('../services/subscriptionTierService');

// Mock the service
jest.mock('../services/subscriptionTierService');

const app = express();
app.use(express.json());
app.use('/api', subscriptionTierRoutes);

const mockCreatorId = 'creator-123';
const mockTierId = 'tier-123';
const mockTierData = {
  name: 'Premium',
  description: 'Premium subscription tier',
  price: 9.99,
  benefits: [{ feature: 'Exclusive Content', included: true }],
  trialDays: 7
};

describe('Subscription Tier API Endpoints', () => {
  describe('POST /api/tiers', () => {
    test('should create a new tier with valid data', async () => {
      subscriptionTierService.createSubscriptionTier.mockResolvedValue({
        success: true,
        tier: { _id: mockTierId, creatorId: mockCreatorId, ...mockTierData }
      });

      const response = await request(app)
        .post('/api/tiers')
        .send({
          creatorId: mockCreatorId,
          ...mockTierData
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.tier.name).toBe('Premium');
    });

    test('should reject creation with missing required fields', async () => {
      const response = await request(app)
        .post('/api/tiers')
        .send({
          creatorId: mockCreatorId,
          name: 'Premium'
          // missing description and price
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should reject creation with negative price', async () => {
      const response = await request(app)
        .post('/api/tiers')
        .send({
          creatorId: mockCreatorId,
          name: 'Premium',
          description: 'Test',
          price: -5
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should handle service errors gracefully', async () => {
      subscriptionTierService.createSubscriptionTier.mockResolvedValue({
        success: false,
        error: 'Service error'
      });

      const response = await request(app)
        .post('/api/tiers')
        .send({
          creatorId: mockCreatorId,
          ...mockTierData
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/creators/:creatorId/tiers', () => {
    test('should fetch all tiers for a creator', async () => {
      const mockTiers = [
        { _id: mockTierId, name: 'Premium', price: 9.99 },
        { _id: 'tier-456', name: 'Basic', price: 4.99 }
      ];

      subscriptionTierService.getCreatorTiers.mockResolvedValue({
        success: true,
        count: 2,
        tiers: mockTiers
      });

      const response = await request(app)
        .get(`/api/creators/${mockCreatorId}/tiers`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(2);
      expect(response.body.tiers).toHaveLength(2);
    });

    test('should support filtering by inactive status', async () => {
      subscriptionTierService.getCreatorTiers.mockResolvedValue({
        success: true,
        count: 1,
        tiers: [{ _id: mockTierId, isActive: false }]
      });

      const response = await request(app)
        .get(`/api/creators/${mockCreatorId}/tiers?includeInactive=true`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should require creator ID', async () => {
      const response = await request(app)
        .get('/api/creators//tiers');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/tiers/:tierId', () => {
    test('should fetch a specific tier by ID', async () => {
      subscriptionTierService.getTierById.mockResolvedValue({
        success: true,
        tier: { _id: mockTierId, name: 'Premium', price: 9.99 }
      });

      const response = await request(app)
        .get(`/api/tiers/${mockTierId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.tier.name).toBe('Premium');
    });

    test('should return 404 for non-existent tier', async () => {
      subscriptionTierService.getTierById.mockResolvedValue({
        success: false,
        error: 'Tier not found'
      });

      const response = await request(app)
        .get('/api/tiers/invalid-id');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/tiers/:tierId', () => {
    test('should update a tier successfully', async () => {
      subscriptionTierService.updateSubscriptionTier.mockResolvedValue({
        success: true,
        tier: { _id: mockTierId, name: 'Premium Plus', price: 14.99 }
      });

      const response = await request(app)
        .put(`/api/tiers/${mockTierId}`)
        .send({ name: 'Premium Plus', price: 14.99 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.tier.price).toBe(14.99);
    });

    test('should reject update with negative price', async () => {
      const response = await request(app)
        .put(`/api/tiers/${mockTierId}`)
        .send({ price: -5 });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should return 400 for non-existent tier', async () => {
      subscriptionTierService.updateSubscriptionTier.mockResolvedValue({
        success: false,
        error: 'Tier not found'
      });

      const response = await request(app)
        .put('/api/tiers/invalid-id')
        .send({ name: 'Updated' });

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/tiers/:tierId', () => {
    test('should delete a tier successfully', async () => {
      subscriptionTierService.deleteSubscriptionTier.mockResolvedValue({
        success: true,
        message: 'Tier deleted successfully'
      });

      const response = await request(app)
        .delete(`/api/tiers/${mockTierId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should prevent deletion of tier with active subscribers', async () => {
      subscriptionTierService.deleteSubscriptionTier.mockResolvedValue({
        success: false,
        error: 'Cannot delete tier with 5 active subscribers'
      });

      const response = await request(app)
        .delete(`/api/tiers/${mockTierId}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('active subscribers');
    });

    test('should support hard delete parameter', async () => {
      subscriptionTierService.deleteSubscriptionTier.mockResolvedValue({
        success: true,
        message: 'Tier deleted successfully'
      });

      const response = await request(app)
        .delete(`/api/tiers/${mockTierId}?hardDelete=true`);

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/creators/:creatorId/hierarchy', () => {
    test('should fetch tier hierarchy for creator', async () => {
      const mockHierarchy = {
        creatorId: mockCreatorId,
        tiers: [
          { id: 'tier-1', name: 'Basic', price: 4.99 },
          { id: 'tier-2', name: 'Premium', price: 9.99 }
        ],
        minPrice: 4.99,
        maxPrice: 9.99,
        totalSubscribers: 150,
        totalRevenue: 998.5
      };

      subscriptionTierService.getTierHierarchy.mockResolvedValue({
        success: true,
        hierarchy: mockHierarchy
      });

      const response = await request(app)
        .get(`/api/creators/${mockCreatorId}/hierarchy`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.hierarchy.tiers).toHaveLength(2);
      expect(response.body.hierarchy.minPrice).toBe(4.99);
    });
  });

  describe('GET /api/tiers/compare', () => {
    test('should compare two tiers', async () => {
      const mockComparison = {
        tier1: { name: 'Basic', price: 4.99 },
        tier2: { name: 'Premium', price: 9.99 },
        tier1Exclusive: [],
        tier2Exclusive: ['Exclusive Videos'],
        commonFeatures: ['Standard Content'],
        priceDifference: 5
      };

      subscriptionTierService.compareTiers.mockResolvedValue({
        success: true,
        comparison: mockComparison
      });

      const response = await request(app)
        .get(`/api/tiers/compare?tierId1=tier-1&tierId2=tier-2`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.comparison.priceDifference).toBe(5);
    });

    test('should require both tier IDs', async () => {
      const response = await request(app)
        .get('/api/tiers/compare?tierId1=tier-1');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/creators/:creatorId/suggestions', () => {
    test('should provide tier optimization suggestions', async () => {
      const mockSuggestions = {
        optimizeTiers: [],
        addTier: 'Consider creating a premium tier',
        removeTier: null
      };

      subscriptionTierService.getTierSuggestions.mockResolvedValue({
        success: true,
        suggestions: mockSuggestions
      });

      const response = await request(app)
        .get(`/api/creators/${mockCreatorId}/suggestions`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.suggestions).toBeDefined();
    });
  });

  describe('POST /api/creators/:creatorId/reorder', () => {
    test('should reorder tiers for a creator', async () => {
      subscriptionTierService.reorderTiers.mockResolvedValue({
        success: true,
        updated: 2,
        tiers: [
          { _id: 'tier-1', position: 1 },
          { _id: 'tier-2', position: 0 }
        ]
      });

      const response = await request(app)
        .post(`/api/creators/${mockCreatorId}/reorder`)
        .send({
          tierPositions: [
            { tierId: 'tier-1', position: 1 },
            { tierId: 'tier-2', position: 0 }
          ]
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.tiers).toHaveLength(2);
    });

    test('should require tier positions array', async () => {
      const response = await request(app)
        .post(`/api/creators/${mockCreatorId}/reorder`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/creators/:creatorId/statistics', () => {
    test('should fetch tier statistics for creator', async () => {
      const mockStatistics = {
        totalTiers: 2,
        activeTiers: 2,
        totalSubscribers: 150,
        totalRevenue: 998.5,
        averagePrice: 7.49,
        averageChurn: 4,
        popularTiers: 1,
        fullTiers: 0
      };

      subscriptionTierService.getTierStatistics.mockResolvedValue({
        success: true,
        statistics: mockStatistics
      });

      const response = await request(app)
        .get(`/api/creators/${mockCreatorId}/statistics`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.statistics.totalTiers).toBe(2);
      expect(response.body.statistics.totalRevenue).toBe(998.5);
    });
  });

  describe('POST /api/tiers/:tierId/activate', () => {
    test('should activate a tier', async () => {
      subscriptionTierService.updateSubscriptionTier.mockResolvedValue({
        success: true,
        tier: { _id: mockTierId, isActive: true }
      });

      const response = await request(app)
        .post(`/api/tiers/${mockTierId}/activate`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('activated');
    });
  });

  describe('POST /api/tiers/:tierId/deactivate', () => {
    test('should deactivate a tier', async () => {
      subscriptionTierService.updateSubscriptionTier.mockResolvedValue({
        success: true,
        tier: { _id: mockTierId, isActive: false }
      });

      const response = await request(app)
        .post(`/api/tiers/${mockTierId}/deactivate`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deactivated');
    });
  });

  describe('POST /api/tiers/:tierId/toggle-popular', () => {
    test('should toggle popular status of a tier', async () => {
      subscriptionTierService.getTierById.mockResolvedValue({
        success: true,
        tier: { _id: mockTierId, isPopular: false }
      });

      subscriptionTierService.updateSubscriptionTier.mockResolvedValue({
        success: true,
        tier: { _id: mockTierId, isPopular: true }
      });

      const response = await request(app)
        .post(`/api/tiers/${mockTierId}/toggle-popular`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('popular');
    });
  });

  describe('Error Handling', () => {
    test('should handle server errors gracefully', async () => {
      subscriptionTierService.getCreatorTiers.mockResolvedValue({
        success: false,
        error: 'Database connection error'
      });

      const response = await request(app)
        .get(`/api/creators/${mockCreatorId}/tiers`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should return 500 for unhandled exceptions', async () => {
      subscriptionTierService.getTierById.mockRejectedValue(
        new Error('Unexpected error')
      );

      const response = await request(app)
        .get(`/api/tiers/${mockTierId}`);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });
});
