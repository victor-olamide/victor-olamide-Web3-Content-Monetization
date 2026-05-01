const Subscription = require('../models/Subscription');
const ProRataRefund = require('../models/ProRataRefund');
const { initiateSubscriptionRefund } = require('../services/refundService');

describe('Refund Service', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns an error when subscription does not exist', async () => {
    Subscription.findById = jest.fn().mockResolvedValue(null);

    const result = await initiateSubscriptionRefund('missing-id');

    expect(result.success).toBe(false);
    expect(result.message).toBe('Subscription not found');
  });

  it('returns an error when the subscription is already cancelled', async () => {
    Subscription.findById = jest.fn().mockResolvedValue({ cancelledAt: new Date() });

    const result = await initiateSubscriptionRefund('sub-123');

    expect(result.success).toBe(false);
    expect(result.message).toBe('Subscription is already cancelled');
  });

  it('cancels the subscription and creates a pro-rata refund when eligible', async () => {
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

    const mockRefund = {
      _id: 'refund-123',
      refundAmount: 80,
      refundStatus: 'pending'
    };

    Subscription.findById = jest.fn().mockResolvedValue(mockSubscription);
    ProRataRefund.create = jest.fn().mockResolvedValue(mockRefund);

    const result = await initiateSubscriptionRefund('sub-123', {
      reason: 'User requested cancellation'
    });

    expect(result.success).toBe(true);
    expect(result.refund).toEqual(mockRefund);
    expect(mockSubscription.save).toHaveBeenCalled();
  });
});
