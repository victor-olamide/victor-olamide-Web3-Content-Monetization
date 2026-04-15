const { makeContractCall, broadcastTransaction, callReadOnlyFunction, cvToJSON, uintCV, boolCV, principalCV } = require('@stacks/transactions');

jest.mock('@stacks/transactions', () => ({
  makeContractCall: jest.fn(() => ({ rawTx: 'TX' })),
  broadcastTransaction: jest.fn(async () => ({ success: true, txId: 'test-tx-id' })),
  callReadOnlyFunction: jest.fn(async () => ({ result: 'ok' })),
  cvToJSON: jest.fn((value) => value),
  uintCV: jest.fn((value) => ({ type: 'uint', value })),
  boolCV: jest.fn((value) => ({ type: 'bool', value })),
  stringAsciiCV: jest.fn((value) => ({ type: 'string-ascii', value })),
  principalCV: jest.fn((value) => ({ type: 'principal', value })),
  AnchorMode: { Any: 'Any' },
  PostConditionMode: { Allow: 'Allow' }
}));

const contractService = require('../services/contractService');

describe('contractService subscription integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CONTRACT_ADDRESS = 'ST1TESTADDRESS0000000000000000000000000';
    process.env.NODE_ENV = 'test';
  });

  it('should verify subscription on-chain', async () => {
    cvToJSON.mockReturnValue({ value: true });
    const result = await contractService.verifySubscription('ST1USERADDR', 'ST1CREATORADDR', 1);
    expect(callReadOnlyFunction).toHaveBeenCalledWith(expect.objectContaining({
      contractName: 'subscription',
      functionName: 'is-subscribed'
    }));
    expect(result).toBe(true);
  });

  it('should get subscription tier info from chain', async () => {
    cvToJSON.mockReturnValue({ value: { price: 100, duration: 30, active: true } });
    const info = await contractService.getSubscriptionTierInfo('ST1CREATORADDR', 2);
    expect(callReadOnlyFunction).toHaveBeenCalledWith(expect.objectContaining({
      contractName: 'subscription',
      functionName: 'get-tier-info'
    }));
    expect(info).toEqual({ price: 100, duration: 30, active: true });
  });

  it('should create a subscription tier transaction', async () => {
    const response = await contractService.createSubscriptionTier(5, 250, 15, 'dummy-key');
    expect(makeContractCall).toHaveBeenCalledWith(expect.objectContaining({
      contractName: 'subscription',
      functionName: 'create-tier'
    }));
    expect(broadcastTransaction).toHaveBeenCalled();
    expect(response).toEqual({ success: true, txId: 'test-tx-id' });
  });

  it('should subscribe to a tier transaction', async () => {
    const response = await contractService.subscribeToTier('ST1CREATORADDR', 3, 'subscriber-key');
    expect(makeContractCall).toHaveBeenCalledWith(expect.objectContaining({
      functionName: 'subscribe'
    }));
    expect(response.txId).toBe('test-tx-id');
  });

  it('should renew a subscription transaction', async () => {
    const response = await contractService.renewSubscription('ST1CREATORADDR', 4, 'subscriber-key');
    expect(makeContractCall).toHaveBeenCalledWith(expect.objectContaining({
      functionName: 'renew-subscription'
    }));
    expect(response.txId).toBe('test-tx-id');
  });
});
