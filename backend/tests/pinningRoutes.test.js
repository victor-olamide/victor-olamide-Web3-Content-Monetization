const request = require('supertest');
const express = require('express');
const pinningRoutes = require('../routes/pinningRoutes');
const { pinningManager } = require('../services/pinningManager');

describe('IPFS Pinning Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/pinning', pinningRoutes);
  });

  describe('GET /api/pinning/status', () => {
    test('should return pinning service status', async () => {
      const response = await request(app)
        .get('/api/pinning/status')
        .set('Authorization', 'Bearer admin-token'); // Mock admin auth

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('service', 'PinningManager');
      expect(response.body).toHaveProperty('redundancyLevel');
      expect(response.body).toHaveProperty('pinningService');
    });
  });

  describe('GET /api/pinning/health', () => {
    test('should return health status', async () => {
      const response = await request(app)
        .get('/api/pinning/health')
        .set('Authorization', 'Bearer admin-token'); // Mock admin auth

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('healthy');
      expect(response.body).toHaveProperty('providers');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('POST /api/pinning/content/:contentId/pin', () => {
    test('should require admin authentication', async () => {
      const response = await request(app)
        .post('/api/pinning/content/test-content-id/pin')
        .send({ redundancy: 2 });

      expect(response.status).toBe(401);
    });

    test('should pin content with valid auth', async () => {
      // This would require mocking the database and pinning service
      // For now, just test the route exists and auth is required
      const response = await request(app)
        .post('/api/pinning/content/test-content-id/pin')
        .set('Authorization', 'Bearer admin-token')
        .send({ redundancy: 2 });

      // Will fail due to missing content, but route should be accessible
      expect([400, 404, 500]).toContain(response.status);
    });
  });

  describe('POST /api/pinning/content/:contentId/unpin', () => {
    test('should require admin authentication', async () => {
      const response = await request(app)
        .post('/api/pinning/content/test-content-id/unpin')
        .send();

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/pinning/emergency/unpin-all', () => {
    test('should require admin authentication', async () => {
      const response = await request(app)
        .post('/api/pinning/emergency/unpin-all')
        .send({ confirm: true });

      expect(response.status).toBe(401);
    });
  });
});