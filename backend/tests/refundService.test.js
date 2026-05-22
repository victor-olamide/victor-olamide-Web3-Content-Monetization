const Subscription = require('../models/Subscription');
const ProRataRefund = require('../models/ProRataRefund');
const {
  initiateSubscriptionRefund,
  triggerOnChainRefund,
  approveRefund,
  completeRefund,
  rejectRefund
} = require('../services/refundService');

jest.mock('../services/contractService', () => ({
  triggerSubscriptionRefund: jest.fn()
}));

const { triggerSubscriptionRefund } = require('../services/contractService');

describe('Refund Service', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  // --- initiateSubscriptionRefund ---

  it('returns error when subscriptionId is missing', async () => {
    const result = await initiateSubscriptionRefund(null);
    expect(result.success).toBe(false);
    expect(result.message).toBe('Subscription ID is required');
  });

  it('returns error when subscription does not exist', async () => {
    Subscription.findById = jest.fn().mockResolvedValue(null);
    const result = await initiateSubscriptionRefund('missing-id');
    expect(result.success).toBe(false);
    expect(result.message).toBe('Subscription not found');
  });

  it('returns error when subscription is already cancelled', async () => {
    Subscription.findById = jest.fn().mockResolvedValue({ cancelledAt: new Date() });
    const result = await initiateSubscriptionRefund('sub-123');
    expect(result.success).toBe(false);
    expect(result.message).toBe('Subscription is already cancelled');
  });

  it('cancels subscription and creates pro-rata refund when eligible', async () => {
    const mockSubscription = {
      _id: 'sub-123',
      user: 'SP1...user',
      creator: 'SP1...creator',
      amount: 100,
      timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      expiry: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
      refundEligible: true,
      refundWindowDays: 30,
      cancelledAt: null,
      save: jest.fn().mockResolvedValue(true)
    };

    const mockRefund = { _id: 'refund-123', refundAmount: 80, refundStatus: 'pending' };

    Subscription.findById = jest.fn().mockResolvedValue(mockSubscription);
    ProRataRefund.create = jest.fn().mockResolvedValue(mockRefund);

    const result = await initiateSubscriptionRefund('sub-123', {
      reason: 'User requested cancellation'
    });

    expect(result.success).toBe(true);
    expect(result.refund).toEqual(mockRefund);
    expect(mockSubscription.save).toHaveBeenCalled();
  });

  it('cancels subscription without refund when not eligible', async () => {
    const mockSubscription = {
      _id: 'sub-456',
      user: 'SP1...user',
      creator: 'SP1...creator',
      amount: 100,
      timestamp: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      expiry: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      refundEligible: false,
      refundWindowDays: 30,
      cancelledAt: null,
      save: jest.fn().mockResolvedValue(true)
    };

    Subscription.findById = jest.fn().mockResolvedValue(mockSubscription);

    const result = await initiateSubscriptionRefund('sub-456');

    expect(result.success).toBe(true);
    expect(result.refund.eligible).toBe(false);
    expect(mockSubscription.save).toHaveBeenCalled();
  });

  // --- triggerOnChainRefund ---

  it('returns error when proRataRefundId is missing', async () => {
    const result = await triggerOnChainRefund(null, {
      subscriberPrincipal: 'SP1',
      creatorPrincipal: 'SP2',
      tierId: 1,
      senderKey: 'key'
    });
    expect(result.success).toBe(false);
    expect(result.message).toBe('ProRataRefund ID is required');
  });

  it('returns error when required options are missing', async () => {
    const result = await triggerOnChainRefund('refund-123', {});
    expect(result.success).toBe(false);
    expect(result.message).toContain('required');
  });

  it('returns error when ProRataRefund is not found', async () => {
    ProRataRefund.findById = jest.fn().mockResolvedValue(null);
    const result = await triggerOnChainRefund('refund-123', {
      subscriberPrincipal: 'SP1',
      creatorPrincipal: 'SP2',
      tierId: 1,
      senderKey: 'key'
    });
    expect(result.success).toBe(false);
    expect(result.message).toBe('ProRataRefund not found');
  });

  it('returns error when refund status is not approved or processing', async () => {
    const mockRefund = {
      _id: 'refund-123',
      refundStatus: 'pending',
      refundAmount: 50,
      onChainTriggerAttempts: 0,
      save: jest.fn()
    };
    ProRataRefund.findById = jest.fn().mockResolvedValue(mockRefund);

    const result = await triggerOnChainRefund('refund-123', {
      subscriberPrincipal: 'SP1',
      creatorPrincipal: 'SP2',
      tierId: 1,
      senderKey: 'key'
    });
    expect(result.success).toBe(false);
    expect(result.message).toContain('Cannot trigger on-chain refund');
  });

  it('triggers on-chain refund successfully for approved refund', async () => {
    const mockRefund = {
      _id: 'refund-123',
      refundStatus: 'approved',
      refundAmount: 50,
      onChainTriggerAttempts: 0,
      onChainTriggered: false,
      transactionId: null,
      onChainTriggerError: null,
      save: jest.fn().mockResolvedValue(true)
    };
    ProRataRefund.findById = jest.fn().mockResolvedValue(mockRefund);
    triggerSubscriptionRefund.mockResolvedValue({ txid: '0xabc123' });

    const result = await triggerOnChainRefund('refund-123', {
      subscriberPrincipal: 'SP1...user',
      creatorPrincipal: 'SP1...creator',
      tierId: 1,
      senderKey: 'private-key'
    });

    expect(result.success).toBe(true);
    expect(result.transactionId).toBe('0xabc123');
    expect(mockRefund.onChainTriggered).toBe(true);
    expect(mockRefund.save).toHaveBeenCalledTimes(2);
  });

  it('records error on refund when on-chain trigger fails', async () => {
    const mockRefund = {
      _id: 'refund-123',
      refundStatus: 'approved',
      refundAmount: 50,
      onChainTriggerAttempts: 0,
      onChainTriggerError: null,
      save: jest.fn().mockResolvedValue(true)
    };
    ProRataRefund.findById = jest.fn()
      .mockResolvedValueOnce(mockRefund)
      .mockResolvedValueOnce(mockRefund);
    triggerSubscriptionRefund.mockRejectedValue(new Error('Network error'));

    const result = await triggerOnChainRefund('refund-123', {
      subscriberPrincipal: 'SP1',
      creatorPrincipal: 'SP2',
      tierId: 1,
      senderKey: 'key'
    });

    expect(result.success).toBe(false);
    expect(result.message).toBe('Network error');
  });

  // --- approveRefund ---

  it('returns error when refundId is missing for approveRefund', async () => {
    const result = await approveRefund(null, 'admin');
    expect(result.success).toBe(false);
    expect(result.message).toBe('Refund ID is required');
  });

  it('returns error when approvedBy is missing', async () => {
    const result = await approveRefund('refund-123', null);
    expect(result.success).toBe(false);
    expect(result.message).toContain('Approver address is required');
  });

  // --- completeRefund ---

  it('returns error when txId is missing for completeRefund', async () => {
    const result = await completeRefund('refund-123', null);
    expect(result.success).toBe(false);
    expect(result.message).toContain('Transaction ID is required');
  });

  // --- rejectRefund ---

  it('returns error when refundId is missing for rejectRefund', async () => {
    const result = await rejectRefund(null);
    expect(result.success).toBe(false);
    expect(result.message).toBe('Refund ID is required');
  });
});
