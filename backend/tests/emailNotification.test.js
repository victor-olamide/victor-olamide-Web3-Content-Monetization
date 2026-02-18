const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const notificationService = require('../services/notificationService');
const Notification = require('../models/Notification');
const UserProfile = require('../models/UserProfile');

describe('Email Notification Integration', () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Notification.deleteMany({});
    await UserProfile.deleteMany({});
  });

  test('notifyPurchaseSuccess creates a notification and does not throw when no email', async () => {
    const profile = new UserProfile({
      address: 'SP2USERADDRESS',
      username: 'buyer1',
      preferences: { emailNotifications: true }
    });
    await profile.save();

    const purchaseData = {
      contentId: 100,
      contentTitle: 'Test Content',
      transactionId: 'tx-123'
    };

    const notification = await notificationService.notifyPurchaseSuccess(profile.address, purchaseData);

    expect(notification).toBeDefined();
    const found = await Notification.findOne({ 'metadata.contentId': 100 });
    expect(found).toBeTruthy();
    expect(found.type).toBe('purchase_success');
  });

  test('sendSubscriptionEmail returns error when email disabled or missing', async () => {
    const res = await notificationService.sendSubscriptionEmail('SP2USERADDRESS', { planName: 'Basic', subscriptionId: 'sub-1' });
    expect(res).toBeDefined();
    // Since EMAIL_ENABLED is not set in tests, default is falsy, expect disabled
    expect(res.success).toBe(false);
  });
});
