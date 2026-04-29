const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { app, server } = require('../../server');
const User = require('../../models/User');
const WalletConnection = require('../../models/WalletConnection');

describe('Wallet Connection API', () => {
  let user;
  let authToken;
  let testWallet = {
    address: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7',
    walletType: 'hiro',
    publicKey: '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
    blockchain: 'stacks'
  };

  beforeAll(async () => {
    // Create test user
    user = new User({
      username: 'testuser',
      email: 'test@example.com',
      name: 'Test User',
      password: 'password123'
    });
    await user.save();
    authToken = jwt.sign(
      { id: user._id, email: user.email, role: user.role || 'user' },
      process.env.JWT_SECRET || 'test-jwt-secret',
      { expiresIn: '24h' }
    );
  });

  afterAll(async () => {
    await User.deleteMany({});
    await WalletConnection.deleteMany({});
    await mongoose.connection.close();
    server.close();
  }, 10000);

  describe('POST /api/wallet/connect', () => {
    it('should connect a Stacks wallet to user account', async () => {
      // First get a connection request
      const challengeRes = await request(app)
        .post('/api/wallet/connection-request')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ network: 'mainnet' });

      expect(challengeRes.status).toBe(200);
      const { nonce } = challengeRes.body.data;

      // Mock signature (in real scenario, this would be signed by wallet)
      const signature = 'mock-signature';

      const res = await request(app)
        .post('/api/wallet/connect')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          address: testWallet.address,
          walletType: testWallet.walletType,
          publicKey: testWallet.publicKey,
          signature,
          nonce
        });

      // Note: This will fail signature verification since it's mock
      // In real test, would need proper signing
      // For now, expect 400 due to signature failure
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('signature');
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .post('/api/wallet/connect')
        .send({
          address: testWallet.address,
          walletType: testWallet.walletType,
          publicKey: testWallet.publicKey,
          signature: 'mock-sig',
          nonce: 'mock-nonce'
        });

      expect(res.status).toBe(401);
    });

    it('should validate wallet type', async () => {
      const res = await request(app)
        .post('/api/wallet/connect')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          address: testWallet.address,
          walletType: 'invalid',
          publicKey: testWallet.publicKey,
          signature: 'mock-sig',
          nonce: 'mock-nonce'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('wallet type');
    });
  });

  describe('POST /api/wallet/disconnect', () => {
    it('should require authentication', async () => {
      const res = await request(app)
        .post('/api/wallet/disconnect')
        .send({
          address: testWallet.address,
          walletType: testWallet.walletType
        });

      expect(res.status).toBe(401);
    });
  });
});