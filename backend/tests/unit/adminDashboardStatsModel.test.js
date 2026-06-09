const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const AdminDashboardStats = require('../../models/AdminDashboardStats');

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

describe('AdminDashboardStats model', () => {
  test('getLatestStats returns the most recent snapshot', async () => {
    await AdminDashboardStats.updateStats({
      totalUsers: 5,
      totalContent: 2,
      activeSubscriptions: 1,
      totalRevenue: 100,
      date: new Date('2026-05-25T00:00:00.000Z'),
    });

    await AdminDashboardStats.updateStats({
      totalUsers: 10,
      totalContent: 4,
      activeSubscriptions: 2,
      totalRevenue: 200,
      date: new Date('2026-05-26T00:00:00.000Z'),
    });

    const latest = await AdminDashboardStats.getLatestStats();
    expect(latest.totalUsers).toBe(10);
    expect(latest.totalRevenue).toBe(200);
  });

  test('getStatsByDateRange returns ordered snapshots', async () => {
    await AdminDashboardStats.updateStats({
      totalUsers: 1,
      totalContent: 1,
      activeSubscriptions: 0,
      totalRevenue: 10,
      date: new Date('2026-05-20T00:00:00.000Z'),
    });
    await AdminDashboardStats.updateStats({
      totalUsers: 2,
      totalContent: 2,
      activeSubscriptions: 1,
      totalRevenue: 20,
      date: new Date('2026-05-22T00:00:00.000Z'),
    });
    await AdminDashboardStats.updateStats({
      totalUsers: 3,
      totalContent: 3,
      activeSubscriptions: 2,
      totalRevenue: 30,
      date: new Date('2026-05-24T00:00:00.000Z'),
    });

    const results = await AdminDashboardStats.getStatsByDateRange(
      new Date('2026-05-21T00:00:00.000Z'),
      new Date('2026-05-23T23:59:59.999Z')
    );

    expect(results).toHaveLength(1);
    expect(results[0].totalRevenue).toBe(20);
  });

  test('formatForResponse shapes persisted snapshots correctly', async () => {
    const snapshot = await AdminDashboardStats.updateStats({
      totalUsers: 4,
      totalContent: 4,
      activeSubscriptions: 1,
      totalRevenue: 40,
      date: new Date('2026-05-27T00:00:00.000Z'),
    });

    const formatted = AdminDashboardStats.formatForResponse(snapshot);
    expect(formatted).toMatchObject({
      totalUsers: 4,
      totalContent: 4,
      activeSubscriptions: 1,
      totalRevenue: 40,
      users: {
        total: 4,
      },
      content: {
        total: 4,
      },
    });
  });
});
