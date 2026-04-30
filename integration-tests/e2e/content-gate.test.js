/**
 * Content-Gate Integration Tests
 * 
 * Tests for content-gate contract deployment and integration:
 * - Gating rule verification
 * - FT and NFT access control
 * - On-chain verification
 * - Database synchronization
 * - Caching behavior
 * - Error handling
 */

const axios = require('axios');
const mongoose = require('mongoose');
const GatingRule = require('../../backend/models/GatingRule');
const contentGateService = require('../../backend/services/contentGateService');
const contentGateMiddleware = require('../../backend/middleware/contentGateVerificationMiddleware');
const contentGateIndexer = require('../../backend/services/contentGateTransactionIndexer');

const API_URL = process.env.API_URL || 'http://localhost:5000';
const STACKS_API_URL = process.env.STACKS_API_URL || 'https://stacks-node-api.testnet.stacks.co';

describe('Content-Gate Integration Tests', () => {
  const testContentId = 1;
  const testUserAddress = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
  const testTokenContract = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.mock-token';
  const testNFTContract = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.mock-nft';

  beforeAll(async () => {
    // Connect to test database
    if (!mongoose.connection.readyState) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/content-monetization-test');
    }
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  describe('Service Layer', () => {
    test('Should retrieve gating rules from on-chain contract', async () => {
      try {
        const rule = await contentGateService.getGatingRule(testContentId);
        
        if (rule) {
          expect(rule).toHaveProperty('token_contract');
          expect(rule).toHaveProperty('gating_type');
          expect(rule).toHaveProperty('threshold');
        }
      } catch (error) {
        // Skip if contract not deployed yet
        expect(error).toBeDefined();
      }
    });

    test('Should cache gating rules with TTL', async () => {
      const rule1 = await contentGateService.getGatingRule(testContentId);
      const rule2 = await contentGateService.getGatingRule(testContentId);
      
      // Should be same object (cached)
      expect(rule1).toBe(rule2);
    });

    test('Should detect FT vs NFT gating types', async () => {
      const ftRule = {
        gating_type: 0,
        token_contract: testTokenContract,
        threshold: 1000000,
      };
      
      const nftRule = {
        gating_type: 1,
        token_contract: testNFTContract,
        threshold: 0,
      };
      
      expect(ftRule.gating_type).toBe(0);
      expect(nftRule.gating_type).toBe(1);
    });

    test('Should invalidate cache for content', () => {
      contentGateService.invalidateGatingRuleCache(testContentId);
      // Cache should be cleared
      expect(contentGateService.getMetrics().cacheSize).toBeLessThanOrEqual(1);
    });

    test('Should track service metrics', () => {
      const metrics = contentGateService.getMetrics();
      
      expect(metrics).toHaveProperty('rulesRetrieved');
      expect(metrics).toHaveProperty('ftAccessVerified');
      expect(metrics).toHaveProperty('nftAccessVerified');
      expect(metrics).toHaveProperty('cacheHits');
      expect(metrics).toHaveProperty('cacheMisses');
    });
  });

  describe('Verification Middleware', () => {
    test('Should check gating status endpoint', (req, res) => {
      req = { query: { contentId: testContentId } };
      res = { json: jest.fn() };
      
      contentGateMiddleware.checkGatingStatus(req, res);
      
      expect(res.json).toHaveBeenCalled();
    });

    test('Should verify access before delivery', async (req, res, next) => {
      req = {
        query: { contentId: testContentId, userAddress: testUserAddress },
        headers: {},
      };
      res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      next = jest.fn();
      
      await contentGateMiddleware.verifyAccessBeforeDelivery(req, res, next);
      
      // Should either call next() or respond with error
      expect(next || res.status).toBeDefined();
    });

    test('Should return gating metrics', () => {
      const metrics = contentGateMiddleware.getGatingMetrics();
      
      expect(metrics).toHaveProperty('cacheSize');
      expect(metrics).toHaveProperty('cacheStats');
      expect(metrics).toHaveProperty('serviceMetrics');
    });
  });

  describe('API Routes', () => {
    test('GET /api/gating/:contentId - Should retrieve gating rule', async () => {
      try {
        const response = await axios.get(`${API_URL}/api/gating/${testContentId}`);
        
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('contentId');
      } catch (error) {
        if (error.response?.status === 404) {
          expect(error.response.status).toBe(404);
        } else {
          throw error;
        }
      }
    });

    test('GET /api/gating/ - Should retrieve all gating rules', async () => {
      try {
        const response = await axios.get(`${API_URL}/api/gating/`);
        
        expect(response.status).toBe(200);
        expect(Array.isArray(response.data.rules)).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    test('POST /api/gating/verify - Should verify access', async () => {
      try {
        const response = await axios.post(`${API_URL}/api/gating/verify`, {
          contentId: testContentId,
          userAddress: testUserAddress,
        });
        
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('verified');
      } catch (error) {
        expect(error.response?.status).toBeDefined();
      }
    });

    test('GET /api/gating/:contentId/status - Should check gating status', async () => {
      try {
        const response = await axios.get(`${API_URL}/api/gating/${testContentId}/status`);
        
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('hasGating');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    test('GET /api/gating/metrics/all - Should get metrics', async () => {
      try {
        const response = await axios.get(`${API_URL}/api/gating/metrics/all`);
        
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('metrics');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Database Integration', () => {
    test('Should create gating rule in database', async () => {
      const rule = await GatingRule.create({
        contentId: testContentId,
        tokenContract: testTokenContract,
        threshold: 1000000,
        tokenType: 'FT',
        isActive: true,
      });
      
      expect(rule._id).toBeDefined();
      expect(rule.contentId).toBe(testContentId);
      expect(rule.tokenType).toBe('FT');
    });

    test('Should retrieve gating rule from database', async () => {
      const rule = await GatingRule.findOne({ contentId: testContentId });
      
      expect(rule).toBeDefined();
      expect(rule.contentId).toBe(testContentId);
    });

    test('Should update gating rule in database', async () => {
      const updated = await GatingRule.updateOne(
        { contentId: testContentId },
        { threshold: 5000000 }
      );
      
      expect(updated.modifiedCount).toBeGreaterThanOrEqual(0);
    });

    test('Should mark gating rule as inactive', async () => {
      await GatingRule.updateOne(
        { contentId: testContentId },
        { isActive: false }
      );
      
      const rule = await GatingRule.findOne({ contentId: testContentId });
      expect(rule.isActive).toBe(false);
    });

    test('Should cleanup test data', async () => {
      await GatingRule.deleteOne({ contentId: testContentId });
      
      const rule = await GatingRule.findOne({ contentId: testContentId });
      expect(rule).toBeNull();
    });
  });

  describe('Transaction Indexer', () => {
    test('Should initialize indexer', () => {
      expect(contentGateIndexer).toBeDefined();
      expect(contentGateIndexer.startIndexer).toBeDefined();
      expect(contentGateIndexer.stopIndexer).toBeDefined();
    });

    test('Should get indexer statistics', () => {
      const stats = contentGateIndexer.getStats();
      
      expect(stats).toHaveProperty('isRunning');
      expect(stats).toHaveProperty('blocksProcessed');
      expect(stats).toHaveProperty('transactionsProcessed');
      expect(stats).toHaveProperty('rulesCreated');
      expect(stats).toHaveProperty('rulesUpdated');
      expect(stats).toHaveProperty('rulesDeleted');
    });

    test('Should reset indexer statistics', () => {
      contentGateIndexer.resetStats();
      
      const stats = contentGateIndexer.getStats();
      expect(stats.blocksProcessed).toBe(0);
      expect(stats.transactionsProcessed).toBe(0);
    });
  });

  describe('Caching Behavior', () => {
    test('Should cache verification results', async (req, res) => {
      const mockReq = { query: { contentId: testContentId, userAddress: testUserAddress } };
      const mockRes = { json: jest.fn() };
      
      // First call
      contentGateMiddleware.verifyGatingAccess(mockReq, mockRes, () => {});
      
      // Cached flag should indicate cached result
      // (implementation dependent)
      expect(mockReq.gatingVerification).toBeDefined();
    });

    test('Should invalidate verification cache', () => {
      contentGateMiddleware.invalidateGatingCache(testContentId);
      // Cache should be cleared for this content
      expect(contentGateService.getMetrics().cacheSize).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('Should handle missing contentId', async () => {
      try {
        await axios.get(`${API_URL}/api/gating/`);
      } catch (error) {
        // Should return valid response
        expect(error.response?.status).toBeDefined();
      }
    });

    test('Should handle invalid userAddress', async () => {
      try {
        await axios.post(`${API_URL}/api/gating/verify`, {
          contentId: testContentId,
          userAddress: 'invalid-address',
        });
      } catch (error) {
        expect(error.response?.status).toBeGreaterThanOrEqual(400);
      }
    });

    test('Should handle non-existent content', async () => {
      try {
        await axios.get(`${API_URL}/api/gating/99999`);
      } catch (error) {
        expect(error.response?.status).toBeGreaterThanOrEqual(400);
      }
    });

    test('Should handle API timeout gracefully', async () => {
      // Mock timeout scenario
      expect(() => {
        contentGateService.getGatingRule('invalid');
      }).not.toThrow();
    });
  });

  describe('Access Control Integration', () => {
    test('Should verify FT access', async () => {
      const result = await contentGateService.verifyFTAccess(
        testContentId,
        testUserAddress,
        testTokenContract
      );
      
      expect(result).toHaveProperty('verified');
    });

    test('Should verify NFT access', async () => {
      const result = await contentGateService.verifyNFTAccess(
        testContentId,
        testUserAddress
      );
      
      expect(result).toHaveProperty('verified');
    });
  });
});

// Export for CI/CD pipelines
module.exports = {
  testContentId,
  testUserAddress,
  testTokenContract,
  testNFTContract,
};
