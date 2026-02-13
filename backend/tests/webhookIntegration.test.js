const request = require('supertest');
const app = require('../index');

describe('Webhook integration', () => {
  it('should accept a webhook event', async () => {
    const res = await request(app)
      .post('/api/webhooks/events')
      .send({ id: `test-${Date.now()}`, type: 'content.updated', contentId: 12345 });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status');
  });
});
