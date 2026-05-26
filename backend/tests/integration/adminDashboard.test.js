const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../server');
const User = require('../../models/User');
const Content = require('../../models/Content');
const Purchase = require('../../models/Purchase');
const Subscription = require('../../models/Subscription');

describe('Admin Dashboard Stats API', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
  });

  test('returns platform stats for an admin user', async () => {
    const adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'Password123!',
      role: 'admin',
    });

    await Content.create({
      contentId: 100,
      title: 'Admin Content',
      description: 'Test content for admin stats',
      contentType: 'video',
      price: 20,
      creator: adminUser._id.toString(),
      url: 'https://example.com/content/100',
      storageType: 'ipfs',
      isRemoved: false,
    });

    await Purchase.create({
      contentId: 100,
      user: adminUser._id.toString(),
      creator: adminUser._id.toString(),
      txId: 'txn-admin-001',
      amount: 20,
      platformFee: 2,
      creatorAmount: 18,
      timestamp: new Date(),
    });

    await Subscription.create({
      user: adminUser._id.toString(),
      creator: adminUser._id.toString(),
      tierId: 1,
      amount: 20,
      platformFee: 2,
      creatorAmount: 18,
      expiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      transactionId: 'sub-admin-001',
      renewalStatus: 'active',
    });

    const token = jwt.sign({ id: adminUser._id.toString(), role: adminUser.role }, process.env.JWT_SECRET);
    const response = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      data: {
        totalUsers: 1,
        totalContent: 1,
        totalRevenue: 20,
        activeSubscriptions: 1,
      },
    });
    expect(response.body.data.users.total).toBe(1);
    expect(response.body.data.content.active).toBe(1);
  });

  test('denies access to a non-admin user', async () => {
    const subscriberUser = await User.create({
      name: 'Subscriber User',
      email: 'subscriber@example.com',
      password: 'Password123!',
      role: 'subscriber',
    });

    const token = jwt.sign({ id: subscriberUser._id.toString(), role: subscriberUser.role }, process.env.JWT_SECRET);
    const response = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);

    expect(response.body).toMatchObject({
      success: false,
      message: expect.stringContaining('not authorized'),
    });
  });

  test('returns dashboard overview snapshot for admin user', async () => {
    const adminUser = await User.create({
      name: 'Overview Admin',
      email: 'overview-admin@example.com',
      password: 'Password123!',
      role: 'admin',
    });

    const token = jwt.sign({ id: adminUser._id.toString(), role: adminUser.role }, process.env.JWT_SECRET);
    const response = await request(app)
      .get('/api/admin/dashboard/overview')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');
  });
});
