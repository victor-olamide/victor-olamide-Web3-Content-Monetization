const request = require('supertest');
const app = require('../index');

describe('Recommendations API', () => {
  it('returns 400 without userId', async () => {
    const res = await request(app).get('/api/recommendations');
    expect(res.status).toBe(400);
  });
});
