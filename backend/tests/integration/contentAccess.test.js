const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { app, server } = require('../../server');
const User = require('../../models/User');
const Content = require('../../models/Content');
const GatingRule = require('../../models/GatingRule');
const WalletConnection = require('../../models/WalletConnection');

describe('Content Access Control', () => {
  let user;
  let creator;
  let authToken;
  let creatorToken;
  let content;
  let gatedContent;
  let testWallet = {
    address: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7',
    walletType: 'hiro',
    publicKey: '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
    blockchain: 'stacks'
  };

  beforeAll(async () => {
    // Create test users
    user = new User({
      username: 'testuser',
      email: 'user@example.com',
      name: 'Test User',
      password: 'password123'
    });
    await user.save();

    creator = new User({
      username: 'creator',
      email: 'creator@example.com',
      name: 'Test Creator',
      password: 'password123'
    });
    await creator.save();

    authToken = jwt.sign(
      { id: user._id, email: user.email, role: user.role || 'user' },
      process.env.JWT_SECRET || 'test-jwt-secret',
      { expiresIn: '24h' }
    );

    creatorToken = jwt.sign(
      { id: creator._id, email: creator.email, role: creator.role || 'user' },
      process.env.JWT_SECRET || 'test-jwt-secret',
      { expiresIn: '24h' }
    );

    // Create test content
    content = new Content({
      contentId: 1001,
      title: 'Test Content',
      description: 'Test description',
      contentType: 'video',
      price: 10,
      creator: testWallet.address,
      url: 'https://example.com/content'
    });
    await content.save();

    // Create gated content
    gatedContent = new Content({
      contentId: 1002,
      title: 'Gated Content',
      description: 'Token gated content',
      contentType: 'video',
      price: 0,
      creator: testWallet.address,
      url: 'https://example.com/gated'
    });
    await gatedContent.save();

    // Create gating rule
    const gatingRule = new GatingRule({
      contentId: 1002,
      tokenContract: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7',
      tokenSymbol: 'TEST',
      threshold: '100'
    });
    await gatingRule.save();

    // Connect wallet to user
    const walletConnection = new WalletConnection({
      userId: user._id,
      address: testWallet.address,
      walletType: testWallet.walletType,
      blockchain: testWallet.blockchain,
      publicKey: testWallet.publicKey,
      isConnected: true
    });
    await walletConnection.save();
  });

  afterAll(async () => {
    await Content.deleteMany({});
    await GatingRule.deleteMany({});
    await WalletConnection.deleteMany({});
    await User.deleteMany({});
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    if (server) {
      server.close();
    }
  }, 30000);

  describe('Access Control Middleware', () => {
    it('should deny access without authentication', async () => {
      const res = await request(app)
        .get('/api/content/1001/access')
        .expect(401);

      expect(res.body.message).toContain('Authentication required');
    });

    it('should allow creator access', async () => {
      // Connect creator's wallet
      const creatorWallet = new WalletConnection({
        userId: creator._id,
        address: testWallet.address,
        walletType: testWallet.walletType,
        blockchain: testWallet.blockchain,
        publicKey: testWallet.publicKey,
        isConnected: true
      });
      await creatorWallet.save();

      const res = await request(app)
        .get('/api/content/1001/access')
        .set('Authorization', `Bearer ${creatorToken}`)
        .expect(200);

      expect(res.body.allowed).toBe(true);
      expect(res.body.reason).toBe('creator');
    });

    it('should check token gating', async () => {
      // This would require mocking token balance check
      // For now, expect access denied since no tokens
      const res = await request(app)
        .get('/api/content/1002/access')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(res.body.hasAccess).toBe(false);
    });
  });
});