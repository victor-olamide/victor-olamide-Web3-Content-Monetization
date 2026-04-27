// Unit Tests for Subscription Tier Service
// Comprehensive test suite for tier management functionality

const { expect } = require('chai');
const sinon = require('sinon');
const subscriptionTierService = require('../services/subscriptionTierService');
const SubscriptionTier = require('../models/SubscriptionTier');
const TierLogger = require('../utils/subscriptionTierLogger');

describe('Subscription Tier Service', () => {
  let sandbox;
  let mockTier;
  let mockLogger;

  beforeEach(() => {
    sandbox = sinon.createSandbox();

    // Mock tier data
    mockTier = {
      _id: '507f1f77bcf86cd799439011',
      creatorId: '507f1f77bcf86cd799439012',
      name: 'Premium Tier',
      description: 'Premium subscription tier',
      price: 9.99,
      benefits: [{ feature: 'HD Streaming', included: true }],
      isActive: true,
      isVisible: true,
      position: 0,
      subscriberCount: 0,
      revenueTotal: 0,
      averageChurn: 0,
      isPopular: false,
      isFull: false,
      availableSlots: null,
      trialDays: 7,
      visibility: 'public',
      currency: 'USD',
      billingCycle: 'monthly',
      maxSubscribers: null,
      upgradeDiscount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      save: sandbox.stub().resolves(),
      toObject: sandbox.stub().returns(mockTier)
    };

    // Mock logger
    mockLogger = {
      logTierCreated: sandbox.stub(),
      logTierUpdated: sandbox.stub(),
      logTierDeleted: sandbox.stub(),
      logValidationFailure: sandbox.stub(),
      logError: sandbox.stub(),
      logCreatorTiersFetched: sandbox.stub(),
      logTierFetched: sandbox.stub(),
      logPurchaseRecorded: sandbox.stub(),
      logCancellationRecorded: sandbox.stub(),
      logTiersReordered: sandbox.stub(),
      logStatisticsRetrieved: sandbox.stub(),
      logBulkOperation: sandbox.stub(),
      logTierArchived: sandbox.stub(),
      logTierUnarchived: sandbox.stub()
    };

    // Stub the logger constructor
    sandbox.stub(TierLogger.prototype, 'logTierCreated').callsFake(mockLogger.logTierCreated);
    sandbox.stub(TierLogger.prototype, 'logTierUpdated').callsFake(mockLogger.logTierUpdated);
    sandbox.stub(TierLogger.prototype, 'logTierDeleted').callsFake(mockLogger.logTierDeleted);
    sandbox.stub(TierLogger.prototype, 'logValidationFailure').callsFake(mockLogger.logValidationFailure);
    sandbox.stub(TierLogger.prototype, 'logError').callsFake(mockLogger.logError);
    sandbox.stub(TierLogger.prototype, 'logCreatorTiersFetched').callsFake(mockLogger.logCreatorTiersFetched);
    sandbox.stub(TierLogger.prototype, 'logTierFetched').callsFake(mockLogger.logTierFetched);
    sandbox.stub(TierLogger.prototype, 'logPurchaseRecorded').callsFake(mockLogger.logPurchaseRecorded);
    sandbox.stub(TierLogger.prototype, 'logCancellationRecorded').callsFake(mockLogger.logCancellationRecorded);
    sandbox.stub(TierLogger.prototype, 'logTiersReordered').callsFake(mockLogger.logTiersReordered);
    sandbox.stub(TierLogger.prototype, 'logStatisticsRetrieved').callsFake(mockLogger.logStatisticsRetrieved);
    sandbox.stub(TierLogger.prototype, 'logBulkOperation').callsFake(mockLogger.logBulkOperation);
    sandbox.stub(TierLogger.prototype, 'logTierArchived').callsFake(mockLogger.logTierArchived);
    sandbox.stub(TierLogger.prototype, 'logTierUnarchived').callsFake(mockLogger.logTierUnarchived);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('createSubscriptionTier', () => {
    it('should create a subscription tier successfully', async () => {
      // Mock database operations
      sandbox.stub(SubscriptionTier, 'findOne').resolves(null);
      sandbox.stub(SubscriptionTier, 'find').resolves([]);
      const mockNewTier = { ...mockTier, save: sandbox.stub().resolves(mockTier) };
      sandbox.stub(SubscriptionTier.prototype, 'save').resolves(mockTier);

      const result = await subscriptionTierService.createSubscriptionTier(
        mockTier.creatorId,
        {
          name: mockTier.name,
          description: mockTier.description,
          price: mockTier.price
        }
      );

      expect(result.success).to.be.true;
      expect(result.tier).to.exist;
      expect(mockLogger.logTierCreated).to.have.been.calledOnce;
    });

    it('should fail when required parameters are missing', async () => {
      const result = await subscriptionTierService.createSubscriptionTier(null, {});

      expect(result.success).to.be.false;
      expect(result.error).to.equal('Creator ID and tier data are required');
      expect(mockLogger.logValidationFailure).to.have.been.called;
    });

    it('should fail when tier name already exists for creator', async () => {
      sandbox.stub(SubscriptionTier, 'findOne').resolves(mockTier);

      const result = await subscriptionTierService.createSubscriptionTier(
        mockTier.creatorId,
        {
          name: mockTier.name,
          description: mockTier.description,
          price: mockTier.price
        }
      );

      expect(result.success).to.be.false;
      expect(result.error).to.include('already exists');
    });
  });

  describe('getCreatorTiers', () => {
    it('should retrieve creator tiers successfully', async () => {
      const mockTiers = [mockTier];
      sandbox.stub(SubscriptionTier, 'find').returns({
        sort: sandbox.stub().returns({
          lean: sandbox.stub().resolves(mockTiers)
        })
      });

      const result = await subscriptionTierService.getCreatorTiers(mockTier.creatorId);

      expect(result.success).to.be.true;
      expect(result.tiers).to.deep.equal(mockTiers);
      expect(result.count).to.equal(1);
      expect(mockLogger.logCreatorTiersFetched).to.have.been.called;
    });

    it('should fail when creator ID is missing', async () => {
      const result = await subscriptionTierService.getCreatorTiers(null);

      expect(result.success).to.be.false;
      expect(result.error).to.equal('Creator ID is required');
    });
  });

  describe('updateSubscriptionTier', () => {
    it('should update a subscription tier successfully', async () => {
      sandbox.stub(SubscriptionTier, 'findByIdAndUpdate').resolves(mockTier);

      const updateData = { name: 'Updated Tier Name' };
      const result = await subscriptionTierService.updateSubscriptionTier(mockTier._id, updateData);

      expect(result.success).to.be.true;
      expect(result.tier).to.equal(mockTier);
      expect(mockLogger.logTierUpdated).to.have.been.calledWith(mockTier._id, updateData);
    });

    it('should fail when tier ID is missing', async () => {
      const result = await subscriptionTierService.updateSubscriptionTier(null, {});

      expect(result.success).to.be.false;
      expect(result.error).to.equal('Tier ID and update data are required');
    });

    it('should fail when tier is not found', async () => {
      sandbox.stub(SubscriptionTier, 'findByIdAndUpdate').resolves(null);

      const result = await subscriptionTierService.updateSubscriptionTier(mockTier._id, { name: 'New Name' });

      expect(result.success).to.be.false;
      expect(result.error).to.equal('Tier not found');
    });
  });

  describe('deleteSubscriptionTier', () => {
    it('should delete a subscription tier successfully', async () => {
      sandbox.stub(SubscriptionTier, 'findByIdAndUpdate').resolves(mockTier);

      const result = await subscriptionTierService.deleteSubscriptionTier(mockTier._id);

      expect(result.success).to.be.true;
      expect(result.message).to.equal('Tier deleted successfully');
      expect(mockLogger.logTierDeleted).to.have.been.calledWith(mockTier._id, false);
    });

    it('should fail when tier has active subscribers', async () => {
      // Mock active subscribers
      const Subscription = require('../models/Subscription');
      sandbox.stub(Subscription, 'countDocuments').resolves(5);
      sandbox.stub(SubscriptionTier, 'findByIdAndUpdate').resolves(mockTier);

      const result = await subscriptionTierService.deleteSubscriptionTier(mockTier._id);

      expect(result.success).to.be.false;
      expect(result.error).to.include('active subscribers');
    });
  });

  describe('recordTierPurchase', () => {
    it('should record a purchase successfully', async () => {
      sandbox.stub(SubscriptionTier, 'findByIdAndUpdate').resolves(mockTier);

      const amount = 9.99;
      const result = await subscriptionTierService.recordTierPurchase(mockTier._id, amount);

      expect(result.success).to.be.true;
      expect(result.tier).to.equal(mockTier);
      expect(mockLogger.logPurchaseRecorded).to.have.been.calledWith(mockTier._id, amount);
    });

    it('should fail when parameters are missing', async () => {
      const result = await subscriptionTierService.recordTierPurchase(null, null);

      expect(result.success).to.be.false;
      expect(result.error).to.equal('Tier ID and amount are required');
    });
  });

  describe('getTierHierarchy', () => {
    it('should retrieve tier hierarchy successfully', async () => {
      const mockTiers = [mockTier];
      sandbox.stub(SubscriptionTier, 'find').resolves(mockTiers);

      const result = await subscriptionTierService.getTierHierarchy(mockTier.creatorId);

      expect(result.success).to.be.true;
      expect(result.hierarchy).to.exist;
      expect(result.hierarchy.tiers).to.have.lengthOf(1);
    });
  });

  describe('bulk operations', () => {
    describe('createBulkTiers', () => {
      it('should create multiple tiers successfully', async () => {
        const tiers = [
          { name: 'Tier 1', description: 'Description 1', price: 5.99 },
          { name: 'Tier 2', description: 'Description 2', price: 9.99 }
        ];

        sandbox.stub(SubscriptionTier, 'find').resolves([]);
        sandbox.stub(SubscriptionTier.prototype, 'save').resolves();

        const result = await subscriptionTierService.createBulkTiers(tiers, mockTier.creatorId);

        expect(result.success).to.be.true;
        expect(result.createdTiers).to.have.lengthOf(2);
        expect(result.totalCreated).to.equal(2);
        expect(result.totalFailed).to.equal(0);
      });

      it('should handle partial failures in bulk creation', async () => {
        const tiers = [
          { name: 'Valid Tier', description: 'Valid', price: 5.99 },
          { name: '', description: 'Invalid', price: 9.99 } // Invalid: missing name
        ];

        sandbox.stub(SubscriptionTier, 'find').resolves([]);
        sandbox.stub(SubscriptionTier.prototype, 'save').resolves();

        const result = await subscriptionTierService.createBulkTiers(tiers, mockTier.creatorId);

        expect(result.success).to.be.true;
        expect(result.createdTiers).to.have.lengthOf(1);
        expect(result.failedTiers).to.have.lengthOf(1);
        expect(result.totalCreated).to.equal(1);
        expect(result.totalFailed).to.equal(1);
      });
    });

    describe('updateBulkTiers', () => {
      it('should update multiple tiers successfully', async () => {
        const updates = [
          { tierId: mockTier._id, updateData: { name: 'Updated Tier 1' } },
          { tierId: 'another-tier-id', updateData: { name: 'Updated Tier 2' } }
        ];

        sandbox.stub(SubscriptionTier, 'findOne').resolves(mockTier);
        sandbox.stub(SubscriptionTier, 'findByIdAndUpdate').resolves(mockTier);

        const result = await subscriptionTierService.updateBulkTiers(updates, mockTier.creatorId);

        expect(result.success).to.be.true;
        expect(result.updatedTiers).to.have.lengthOf(2);
        expect(result.totalUpdated).to.equal(2);
        expect(result.totalFailed).to.equal(0);
      });
    });

    describe('deleteBulkTiers', () => {
      it('should delete multiple tiers successfully', async () => {
        const tierIds = [mockTier._id, 'another-tier-id'];

        sandbox.stub(Subscription, 'countDocuments').resolves(0);
        sandbox.stub(SubscriptionTier, 'findOneAndDelete').resolves(mockTier);

        const result = await subscriptionTierService.deleteBulkTiers(tierIds, mockTier.creatorId);

        expect(result.success).to.be.true;
        expect(result.deletedTiers).to.have.lengthOf(2);
        expect(result.totalDeleted).to.equal(2);
        expect(result.totalFailed).to.equal(0);
      });
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      sandbox.stub(SubscriptionTier, 'find').throws(new Error('Database connection failed'));

      const result = await subscriptionTierService.getCreatorTiers(mockTier.creatorId);

      expect(result.success).to.be.false;
      expect(result.error).to.equal('Database connection failed');
      expect(mockLogger.logError).to.have.been.called;
    });

    it('should handle validation errors', async () => {
      const result = await subscriptionTierService.createSubscriptionTier('', {});

      expect(result.success).to.be.false;
      expect(mockLogger.logValidationFailure).to.have.been.called;
    });
  });
});
