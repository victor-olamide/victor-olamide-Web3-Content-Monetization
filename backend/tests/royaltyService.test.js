const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

jest.setTimeout(30000);

const royaltyService = require('../services/royaltyService');
const Collaborator = require('../models/Collaborator');
const Purchase = require('../models/Purchase');
const Subscription = require('../models/Subscription');
const RoyaltyDistribution = require('../models/RoyaltyDistribution');

jest.mock('../services/contractService');
const { calculatePlatformFee } = require('../services/contractService');

describe('Royalty Service', () => {
  let mongoServer;

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
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  beforeEach(async () => {
    await Collaborator.deleteMany({});
    await Purchase.deleteMany({});
    await Subscription.deleteMany({});
    await RoyaltyDistribution.deleteMany({});
    jest.clearAllMocks();
    delete process.env.PLATFORM_FEE_PERCENTAGE;
  });

  describe('getPlatformFeePercentage', () => {
    it('should parse percentage values as a fraction when provided above 1', () => {
      process.env.PLATFORM_FEE_PERCENTAGE = '2.5';
      expect(royaltyService.getPlatformFeePercentage()).toBeCloseTo(0.025);
    });

    it('should accept a fractional fee percentage value', () => {
      process.env.PLATFORM_FEE_PERCENTAGE = '0.05';
      expect(royaltyService.getPlatformFeePercentage()).toBeCloseTo(0.05);
    });

    it('should return the default fee percentage when config is invalid', () => {
      process.env.PLATFORM_FEE_PERCENTAGE = 'invalid';
      expect(royaltyService.getPlatformFeePercentage()).toBeCloseTo(0.025);
    });
  });

  describe('calculatePlatformFee', () => {
    it('should use configured environment percentage when provided', async () => {
      process.env.PLATFORM_FEE_PERCENTAGE = '5';
      const fee = await royaltyService.calculatePlatformFee(1000);
      expect(fee).toBe(50);
      expect(calculatePlatformFee).not.toHaveBeenCalled();
    });

    it('should fall back to on-chain contract fee calculation when no config exists', async () => {
      calculatePlatformFee.mockResolvedValue(120);
      const fee = await royaltyService.calculatePlatformFee(1000);
      expect(fee).toBe(120);
      expect(calculatePlatformFee).toHaveBeenCalledWith(1000);
    });
  });

  describe('distributePurchaseRoyalties', () => {
    it('should create a single distribution for the creator when no collaborators exist', async () => {
      const purchase = await Purchase.create({
        contentId: 1,
        user: 'SP123',
        creator: 'SPCREATOR',
        txId: 'tx123',
        amount: 1000,
        platformFee: 100,
        creatorAmount: 900
      });

      const distributions = await royaltyService.distributePurchaseRoyalties(purchase);

      expect(distributions).toHaveLength(1);
      expect(distributions[0].collaboratorAddress).toBe('SPCREATOR');
      expect(distributions[0].royaltyAmount).toBe(900);
      expect(distributions[0].sourceType).toBe('purchase');
      expect(distributions[0].purchaseId.toString()).toBe(purchase._id.toString());
    });

    it('should distribute to collaborators and leave remainder to creator', async () => {
      await Collaborator.create({ contentId: 2, address: 'SPCOLL1', royaltyPercentage: 30 });
      await Collaborator.create({ contentId: 2, address: 'SPCOLL2', royaltyPercentage: 20 });

      const purchase = await Purchase.create({
        contentId: 2,
        user: 'SP123',
        creator: 'SPCREATOR',
        txId: 'tx456',
        amount: 1000,
        platformFee: 100,
        creatorAmount: 900
      });

      const distributions = await royaltyService.distributePurchaseRoyalties(purchase);

      expect(distributions).toHaveLength(3);
      expect(distributions.some(d => d.collaboratorAddress === 'SPCOLL1')).toBe(true);
      expect(distributions.some(d => d.collaboratorAddress === 'SPCOLL2')).toBe(true);
      expect(distributions.some(d => d.collaboratorAddress === 'SPCREATOR')).toBe(true);

      const creatorDistribution = distributions.find(d => d.collaboratorAddress === 'SPCREATOR');
      expect(creatorDistribution.royaltyAmount).toBeGreaterThan(0);
    });
  });

  describe('distributeSubscriptionRoyalties', () => {
    it('should create a creator distribution when no content collaborator data exists', async () => {
      const subscription = {
        _id: new mongoose.Types.ObjectId(),
        creator: 'SPCREATOR',
        amount: 2000,
        platformFee: 200,
        creatorAmount: 1800,
        contentId: null
      };

      const distributions = await royaltyService.distributeSubscriptionRoyalties(subscription);

      expect(distributions).toHaveLength(1);
      expect(distributions[0].collaboratorAddress).toBe('SPCREATOR');
      expect(distributions[0].royaltyAmount).toBe(1800);
      expect(distributions[0].sourceType).toBe('subscription');
    });
  });
});
