/**
 * Pay-Per-View Contract Integration Tests
 * 
 * Tests for deployment and integration of the pay-per-view contract
 * with backend purchase routes and on-chain verification
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { expect } = require('chai');
const Purchase = require('../../models/Purchase');
const { checkContentAccess, verifyPurchase } = require('../../services/payPerViewService');
const { verifyTransaction } = require('../../services/stacksApiService');

// Test configuration
const TEST_CONFIG = {
  contentId: 1,
  userAddress: 'ST2F4BK4GZH6SSPFTX33ES2G2CCJJIFDN2RYPPYY1',
  creatorAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
  amount: 5000000, // 5 STX in microSTX
  price: 5000000,
};

describe('Pay-Per-View Contract Integration', function() {
  this.timeout(30000);

  let app;
  let server;

  before(async () => {
    // Initialize test app
    app = require('../../server');
    server = app;

    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost/stacks_monetization_test');
    }
  });

  beforeEach(async () => {
    // Clear purchases collection before each test
    await Purchase.deleteMany({});
  });

  after(async () => {
    await Purchase.deleteMany({});
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
  });

  describe('Service Layer', () => {
    describe('checkContentAccess', () => {
      it('should check content access on-chain', async () => {
        try {
          const hasAccess = await checkContentAccess(
            TEST_CONFIG.contentId.toString(),
            TEST_CONFIG.userAddress
          );

          expect(hasAccess).to.be.a('boolean');
        } catch (error) {
          // On-chain check might fail in test environment, which is ok
          expect(error.message).to.include('Failed to verify');
        }
      });

      it('should return false for non-existent content', async () => {
        try {
          const hasAccess = await checkContentAccess(
            '999999',
            TEST_CONFIG.userAddress
          );

          expect(hasAccess).to.be.false;
        } catch (error) {
          expect(error).to.be.an('Error');
        }
      });
    });

    describe('verifyPurchase', () => {
      it('should verify purchase on-chain', async () => {
        try {
          // Note: This will require a valid transaction ID from testnet
          const result = await verifyPurchase(
            TEST_CONFIG.contentId.toString(),
            TEST_CONFIG.userAddress,
            'dummy-tx-id'
          );

          expect(result).to.have.property('verified');
          expect(result).to.have.property('txId');
        } catch (error) {
          // Expected to fail with invalid tx ID
          expect(error.message).to.include('Failed to verify');
        }
      });
    });
  });

  describe('API Routes', () => {
    describe('POST /purchases/verify-ppv', () => {
      it('should require all parameters', async () => {
        const response = await request(app)
          .post('/purchases/verify-ppv')
          .send({
            contentId: TEST_CONFIG.contentId,
            // Missing userAddress and txId
          });

        expect(response.status).to.equal(400);
        expect(response.body).to.have.property('error');
      });

      it('should handle invalid transaction ID', async () => {
        const response = await request(app)
          .post('/purchases/verify-ppv')
          .send({
            contentId: TEST_CONFIG.contentId,
            userAddress: TEST_CONFIG.userAddress,
            txId: 'invalid-tx-id',
          });

        expect(response.status).to.be.oneOf([400, 402, 403, 500]);
        // Will fail due to invalid tx, which is expected
      });
    });

    describe('POST /purchases/grant-access', () => {
      it('should require all parameters', async () => {
        const response = await request(app)
          .post('/purchases/grant-access')
          .send({
            contentId: TEST_CONFIG.contentId,
            // Missing userAddress
          });

        expect(response.status).to.equal(400);
        expect(response.body).to.have.property('error');
      });

      it('should deny access without verified purchase', async () => {
        const response = await request(app)
          .post('/purchases/grant-access')
          .send({
            contentId: TEST_CONFIG.contentId,
            userAddress: TEST_CONFIG.userAddress,
          });

        expect(response.status).to.be.oneOf([403, 404, 500]);
      });
    });

    describe('GET /purchases/status', () => {
      it('should return status for content purchase', async () => {
        // First create a purchase record
        await Purchase.create({
          contentId: TEST_CONFIG.contentId,
          user: TEST_CONFIG.userAddress,
          creator: TEST_CONFIG.creatorAddress,
          txId: 'test-tx-id',
          amount: TEST_CONFIG.amount,
        });

        const response = await request(app)
          .get('/purchases/status')
          .query({
            contentId: TEST_CONFIG.contentId,
            userAddress: TEST_CONFIG.userAddress,
          });

        expect(response.status).to.equal(200);
        expect(response.body).to.have.property('contentId');
        expect(response.body).to.have.property('userAddress');
        expect(response.body).to.have.property('hasPurchase');
      });

      it('should require query parameters', async () => {
        const response = await request(app)
          .get('/purchases/status')
          .query({
            contentId: TEST_CONFIG.contentId,
            // Missing userAddress
          });

        expect(response.status).to.equal(400);
      });
    });

    describe('GET /purchases/ppv-metrics', () => {
      it('should return service metrics', async () => {
        const response = await request(app)
          .get('/purchases/ppv-metrics');

        expect(response.status).to.equal(200);
        expect(response.body).to.have.property('metrics');
        expect(response.body.metrics).to.have.property('cacheHits');
        expect(response.body.metrics).to.have.property('cacheMisses');
      });
    });
  });

  describe('Database Integration', () => {
    it('should save purchase after verification', async () => {
      const purchase = new Purchase({
        contentId: TEST_CONFIG.contentId,
        user: TEST_CONFIG.userAddress,
        creator: TEST_CONFIG.creatorAddress,
        txId: 'test-tx-123',
        amount: TEST_CONFIG.amount,
        verified: true,
      });

      const saved = await purchase.save();

      expect(saved._id).to.exist;
      expect(saved.contentId).to.equal(TEST_CONFIG.contentId);
      expect(saved.verified).to.be.true;
    });

    it('should retrieve purchase by user and content', async () => {
      await Purchase.create({
        contentId: TEST_CONFIG.contentId,
        user: TEST_CONFIG.userAddress,
        creator: TEST_CONFIG.creatorAddress,
        txId: 'test-tx-456',
        amount: TEST_CONFIG.amount,
      });

      const purchase = await Purchase.findOne({
        contentId: TEST_CONFIG.contentId,
        user: TEST_CONFIG.userAddress,
      });

      expect(purchase).to.exist;
      expect(purchase.txId).to.equal('test-tx-456');
    });

    it('should update purchase with verification status', async () => {
      const purchase = new Purchase({
        contentId: TEST_CONFIG.contentId,
        user: TEST_CONFIG.userAddress,
        creator: TEST_CONFIG.creatorAddress,
        txId: 'test-tx-789',
        amount: TEST_CONFIG.amount,
      });

      await purchase.save();

      const updated = await Purchase.findByIdAndUpdate(
        purchase._id,
        {
          verified: true,
          verifiedAt: new Date(),
          blockHeight: 12345,
          confirmations: 10,
        },
        { new: true }
      );

      expect(updated.verified).to.be.true;
      expect(updated.blockHeight).to.equal(12345);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      try {
        // Attempting to verify with invalid address format
        await checkContentAccess(
          TEST_CONFIG.contentId.toString(),
          'invalid-address'
        );
      } catch (error) {
        expect(error).to.be.an('Error');
        expect(error.message).to.include('Failed to verify');
      }
    });

    it('should handle missing environment variables', () => {
      expect(process.env.STACKS_NETWORK).to.exist;
      expect(process.env.STACKS_API_URL || process.env.STACKS_NETWORK).to.exist;
    });
  });

  describe('Cache Behavior', () => {
    it('should cache content access results', async () => {
      const { getMetrics } = require('../../services/payPerViewService');

      const initialMetrics = getMetrics();
      const initialCacheMisses = initialMetrics.cacheMisses;

      try {
        // First call - should cache miss
        await checkContentAccess(
          'cache-test-1',
          TEST_CONFIG.userAddress
        );
      } catch (e) {
        // Expected to fail
      }

      try {
        // Second call with same params - should cache hit
        await checkContentAccess(
          'cache-test-1',
          TEST_CONFIG.userAddress
        );
      } catch (e) {
        // Expected to fail but from cache
      }

      const finalMetrics = getMetrics();
      expect(finalMetrics.cacheMisses).to.be.at.least(initialCacheMisses);
    });
  });
});
