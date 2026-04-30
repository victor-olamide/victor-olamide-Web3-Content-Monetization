const { verifyAccess } = require('../services/accessService');
const { verifyPurchase, verifySubscription } = require('../services/blockchainVerification');
const GatingRule = require('../models/GatingRule');

jest.mock('../services/blockchainVerification');
jest.mock('../models/Content');
jest.mock('../models/GatingRule');
jest.mock('node-cache');

describe('Access Control Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    GatingRule.findOne = jest.fn().mockResolvedValue(null);
    
    // Mock NodeCache to prevent cache persistence between tests
    const NodeCache = require('node-cache');
    NodeCache.mockImplementation(() => ({
      get: jest.fn().mockReturnValue(null),
      set: jest.fn(),
      del: jest.fn(),
      flushAll: jest.fn()
    }));
  });

  test('should grant access to creator', async () => {
    const Content = require('../models/Content');
    Content.findOne = jest.fn().mockResolvedValue({
      contentId: 1,
      creator: 'ST1CREATOR',
      price: 1000000
    });

    const result = await verifyAccess(1, 'ST1CREATOR');
    
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe('creator');
  });

  test('should grant access with valid purchase', async () => {
    const Content = require('../models/Content');
    Content.findOne = jest.fn().mockResolvedValue({
      contentId: 1,
      creator: 'ST1CREATOR',
      price: 1000000
    });

    verifyPurchase.mockResolvedValue(true);

    const result = await verifyAccess(1, 'ST1USER');
    
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe('purchase');
  });

  test('should deny access without purchase', async () => {
    const Content = require('../models/Content');
    Content.findOne = jest.fn().mockResolvedValue({
      contentId: 1,
      creator: 'ST1CREATOR',
      price: 1000000
    });

    verifyPurchase.mockResolvedValue(false);
    verifySubscription.mockResolvedValue(false);

    const result = await verifyAccess(1, 'ST1USER');
    
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('no-access');
  });

  test('should return error for non-existent content', async () => {
    const Content = require('../models/Content');
    Content.findOne = jest.fn().mockResolvedValue(null);

    const result = await verifyAccess(999, 'ST1USER');
    
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('content-not-found');
  });
});
