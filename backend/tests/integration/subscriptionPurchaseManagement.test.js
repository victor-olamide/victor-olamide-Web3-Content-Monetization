const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { app } = require('../../server');
const Subscription = require('../../models/Subscription');

jest.setTimeout(30000);

let mongoServer;

describe('Subscription Purchase Management API', () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
  });

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  afterEach(async () => {
    await Subscription.deleteMany({});
  });

  it('should create a new subscription purchase', async () => {
    const payload = {
      user: 'purchase-user-123',
      creator: 'creator-abc-123',
      tierId: 1,
      tierName: 'Starter',
      tierPrice: 9.99,
      amount: 9.99,
      transactionId: 'tx-purchase-12345',
      expiry: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      autoRenewal: true,
      gracePeriodDays: 5,
      currency: 'USD',
      email: 'purchase-user@example.com'
    };

    const response = await request(app)
      .post('/api/subscriptions')
      .send(payload)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.subscription.user).toBe(payload.user);
    expect(response.body.subscription.transactionId).toBe(payload.transactionId);
    expect(response.body.subscription.autoRenewal).toBe(true);
    expect(response.body.subscription.nextRenewalDate).toBeDefined();
  });

  it('should return validation errors for missing purchase fields', async () => {
    const response = await request(app)
      .post('/api/subscriptions')
      .send({ creator: 'creator-abc-123', amount: 0 })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(Array.isArray(response.body.errors)).toBe(true);
    expect(response.body.errors.some(e => e.field === 'user')).toBe(true);
    expect(response.body.errors.some(e => e.field === 'tierId')).toBe(true);
    expect(response.body.errors.some(e => e.field === 'amount')).toBe(true);
  });

  it('should reject duplicate transaction IDs for subscription purchases', async () => {
    const payload = {
      user: 'purchase-user-abc',
      creator: 'creator-abc-123',
      tierId: 1,
      amount: 9.99,
      transactionId: 'tx-duplicate-999',
      expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };

    await request(app)
      .post('/api/subscriptions')
      .send(payload)
      .expect(201);

    const duplicateResponse = await request(app)
      .post('/api/subscriptions')
      .send(payload)
      .expect(400);

    expect(duplicateResponse.body.message).toContain('transaction ID');
  });

  it('should return active subscriptions for a user by default', async () => {
    const activeSubscription = await Subscription.create({
      user: 'active-user-1',
      creator: 'creator-1',
      tierId: 1,
      amount: 5.99,
      expiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      transactionId: 'tx-active-1',
      renewalStatus: 'active'
    });

    const expiredSubscription = await Subscription.create({
      user: 'active-user-1',
      creator: 'creator-1',
      tierId: 2,
      amount: 12.99,
      expiry: new Date(Date.now() - 24 * 60 * 60 * 1000),
      transactionId: 'tx-expired-1',
      renewalStatus: 'expired'
    });

    const response = await request(app)
      .get(`/api/subscriptions/${activeSubscription.user}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(1);
    expect(response.body[0]._id).toBe(activeSubscription._id.toString());
    expect(response.body[0].renewalState.status).toBe('active');
  });

  it('should include inactive subscriptions when includeInactive=true', async () => {
    await Subscription.create({
      user: 'inactive-user-1',
      creator: 'creator-1',
      tierId: 1,
      amount: 5.99,
      expiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      transactionId: 'tx-active-2',
      renewalStatus: 'active'
    });

    await Subscription.create({
      user: 'inactive-user-1',
      creator: 'creator-1',
      tierId: 2,
      amount: 12.99,
      expiry: new Date(Date.now() - 24 * 60 * 60 * 1000),
      transactionId: 'tx-expired-2',
      renewalStatus: 'expired'
    });

    const response = await request(app)
      .get('/api/subscriptions/inactive-user-1?includeInactive=true')
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(2);
  });
});
