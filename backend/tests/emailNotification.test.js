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
      contentId: '100',
      contentTitle: 'Test Content',
      transactionId: 'tx-123'
    };

    const notification = await notificationService.notifyPurchaseSuccess(profile.address, purchaseData);

    expect(notification).toBeDefined();
    const found = await Notification.findOne({ 'metadata.contentId': '100' });
    expect(found).toBeTruthy();
    expect(found.type).toBe('purchase_success');
  });

  test('sendSubscriptionEmail returns error when email disabled or missing', async () => {
    const res = await notificationService.sendSubscriptionEmail('SP2USERADDRESS', { planName: 'Basic', subscriptionId: 'sub-1' });
    expect(res).toBeDefined();
    // Since EMAIL_ENABLED is not set in tests, default is falsy, expect disabled
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/disabled|No recipient email available/);
  });

  test('notifyUserRegistration creates registration notification and includes email result', async () => {
    const profile = new UserProfile({
      address: 'SP2REGISTER',
      username: 'newuser',
      email: 'newuser@example.com',
      preferences: { emailNotifications: true }
    });
    await profile.save();

    const result = await notificationService.notifyUserRegistration(profile.address, {
      email: 'newuser@example.com',
      userName: 'New User'
    });

    expect(result).toBeDefined();
    expect(result.notification.type).toBe('registration');
    expect(result.email.success).toBe(true);
    expect(result.email.result).toBeDefined();
    expect(result.email.result.simulated).toBe(true);
  });

  test('notifySubscriptionConfirmation creates subscription notification with email result', async () => {
    const profile = new UserProfile({
      address: 'SP2SUBSCR',
      username: 'subscriber',
      email: 'subscriber@example.com',
      preferences: { emailNotifications: true }
    });
    await profile.save();

    const result = await notificationService.notifySubscriptionConfirmation(profile.address, {
      email: 'subscriber@example.com',
      userName: 'Subscriber',
      planName: 'Premium',
      subscriptionId: 'sub-123',
      amount: 10,
      currency: 'STX',
      startDate: '2026-05-30',
      renewalDate: '2026-06-30'
    });

    expect(result).toBeDefined();
    expect(result.notification.type).toBe('subscription_confirmation');
    expect(result.email.success).toBe(true);
    expect(result.email.result).toBeDefined();
    expect(result.email.result.simulated).toBe(true);
  });

  test('notifyPaymentReceipt creates payment receipt notification with email result', async () => {
    const profile = new UserProfile({
      address: 'SP2PAYREC',
      username: 'payer',
      email: 'payer@example.com',
      preferences: { emailNotifications: true }
    });
    await profile.save();

    const result = await notificationService.notifyPaymentReceipt(profile.address, {
      email: 'payer@example.com',
      userName: 'Payer',
      transactionId: 'tx-789',
      itemName: 'Premium Content',
      amount: 20,
      currency: 'STX',
      transactionDate: '2026-05-25',
      paymentMethod: 'Blockchain'
    });

    expect(result).toBeDefined();
    expect(result.notification.type).toBe('payment_receipt');
    expect(result.email.success).toBe(true);
    expect(result.email.result).toBeDefined();
    expect(result.email.result.simulated).toBe(true);
  });

  test('notifyRenewalReminder creates renewal reminder notification with email result', async () => {
    const profile = new UserProfile({
      address: 'SP2RENEW',
      username: 'renewaluser',
      email: 'renewal@example.com',
      preferences: { emailNotifications: true }
    });
    await profile.save();

    const result = await notificationService.notifyRenewalReminder(profile.address, {
      email: 'renewal@example.com',
      userName: 'Renewal User',
      planName: 'Gold',
      amount: 15,
      currency: 'STX',
      renewalDate: '2026-06-15'
    });

    expect(result).toBeDefined();
    expect(result.notification.type).toBe('renewal_reminder');
    expect(result.email.success).toBe(true);
    expect(result.email.result).toBeDefined();
    expect(result.email.result.simulated).toBe(true);
  });
});
