const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Subscription = require('../../models/Subscription');
const {
  purchaseSubscription,
  getActiveSubscriptionsForUser
} = require('../../services/subscriptionManagementService');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri(), {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await Subscription.deleteMany({});
});

describe('subscriptionManagementService', () => {
  it('creates a subscription purchase successfully', async () => {
    const payload = {
      user: 'user-service-test',
      creator: 'creator-service-test',
      tierId: 1,
      amount: 12.5,
      transactionId: 'tx-service-1',
      expiry: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
    };

    const subscription = await purchaseSubscription(payload);

    expect(subscription).toBeDefined();
    expect(subscription.user).toBe(payload.user);
    expect(subscription.creator).toBe(payload.creator);
    expect(subscription.transactionId).toBe(payload.transactionId);
    expect(subscription.expiry).toBeInstanceOf(Date);
    expect(subscription.nextRenewalDate).toBeInstanceOf(Date);
    expect(subscription.renewalStatus).toBe('active');
  });

  it('throws when required subscription purchase fields are missing', async () => {
    await expect(purchaseSubscription({ creator: 'creator-test', amount: 10 })).rejects.toThrow(
      /Missing required subscription purchase fields/
    );
  });

  it('returns only active subscriptions by default', async () => {
    await Subscription.create([{
      user: 'service-user-1',
      creator: 'creator-test',
      tierId: 1,
      amount: 5.0,
      expiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      transactionId: 'tx-service-active',
      renewalStatus: 'active'
    }, {
      user: 'service-user-1',
      creator: 'creator-test',
      tierId: 2,
      amount: 8.0,
      expiry: new Date(Date.now() - 24 * 60 * 60 * 1000),
      transactionId: 'tx-service-expired',
      renewalStatus: 'expired'
    }]);

    const subscriptions = await getActiveSubscriptionsForUser('service-user-1');

    expect(subscriptions.length).toBe(1);
    expect(subscriptions[0].transactionId).toBe('tx-service-active');
    expect(subscriptions[0].renewalState.status).toBe('active');
  });

  it('includes inactive subscriptions when requested', async () => {
    await Subscription.create([{
      user: 'service-user-2',
      creator: 'creator-test',
      tierId: 1,
      amount: 5.0,
      expiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      transactionId: 'tx-service-active-2',
      renewalStatus: 'active'
    }, {
      user: 'service-user-2',
      creator: 'creator-test',
      tierId: 2,
      amount: 8.0,
      expiry: new Date(Date.now() - 24 * 60 * 60 * 1000),
      transactionId: 'tx-service-expired-2',
      renewalStatus: 'expired'
    }]);

    const subscriptions = await getActiveSubscriptionsForUser('service-user-2', true);
    expect(subscriptions.length).toBe(2);
  });
});
