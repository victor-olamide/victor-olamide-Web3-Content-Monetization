const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const adminService = require('../../services/adminService');
const User = require('../../models/User');
const Content = require('../../models/Content');
const Purchase = require('../../models/Purchase');
const Subscription = require('../../models/Subscription');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri(), {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Admin Service', () => {
  test('getPlatformStats returns required top-level metrics', async () => {
    const adminUser = await User.create({
      name: 'Test Admin',
      email: 'adminstats@example.com',
      password: 'Password123!',
      role: 'admin',
    });

    await Content.create({
      contentId: 200,
      title: 'Stats Content',
      description: 'Stats test content',
      contentType: 'video',
      price: 30,
      creator: adminUser._id.toString(),
      url: 'https://example.com/content/200',
      storageType: 'ipfs',
    });

    await Purchase.create({
      contentId: 200,
      user: adminUser._id.toString(),
      creator: adminUser._id.toString(),
      txId: 'txn-test-200',
      amount: 30,
      platformFee: 3,
      creatorAmount: 27,
      timestamp: new Date(),
    });

    await Subscription.create({
      user: adminUser._id.toString(),
      creator: adminUser._id.toString(),
      tierId: 1,
      amount: 30,
      platformFee: 3,
      creatorAmount: 27,
      expiry: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      transactionId: 'sub-test-200',
      renewalStatus: 'active',
    });

    const stats = await adminService.getPlatformStats();

    expect(stats).toEqual(expect.objectContaining({
      totalUsers: 1,
      totalContent: 1,
      totalRevenue: 30,
      activeSubscriptions: 1,
    }));
    expect(stats.users.active).toBe(1);
    expect(stats.revenue.total).toBe(30);
  });

  test('getLatestStats returns formatted cached snapshot when available', async () => {
    const cached = await adminService.getPlatformStats();
    const latest = await adminService.getLatestStats();

    expect(latest).toEqual(expect.objectContaining({
      totalUsers: cached.totalUsers,
      totalContent: cached.totalContent,
      totalRevenue: cached.totalRevenue,
      activeSubscriptions: cached.activeSubscriptions,
    }));
  });

  test('getDashboardStats alias returns the same platform stats payload', async () => {
    const payload = await adminService.getDashboardStats();

    expect(payload).toHaveProperty('totalUsers');
    expect(payload).toHaveProperty('totalRevenue');
    expect(payload).toHaveProperty('totalContent');
    expect(payload).toHaveProperty('activeSubscriptions');
  });
});
