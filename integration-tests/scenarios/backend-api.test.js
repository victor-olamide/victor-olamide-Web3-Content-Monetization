const axios = require('axios');
const config = require('../config');

describe('Backend API Integration Test', () => {
  jest.setTimeout(config.timeout);

  const { user1 } = config.testAccounts;
  const contentId = 1;

  test('Health check endpoint', async () => {
    const response = await axios.get(`${config.backendApi.replace('/api', '')}/api/status`);
    expect(response.status).toBe(200);
    expect(response.data.server).toBe('up');
  });

  test('Verify access endpoint', async () => {
    const response = await axios.get(
      `${config.backendApi}/access/verify/${user1.address}/${contentId}`
    );
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('hasAccess');
  });

  test('Batch verify access endpoint', async () => {
    const response = await axios.post(
      `${config.backendApi}/access/verify-batch`,
      {
        user: user1.address,
        contentIds: [1, 2, 3]
      }
    );
    expect(response.status).toBe(200);
    expect(response.data.results).toHaveLength(3);
  });

  test('Content metadata endpoint', async () => {
    const response = await axios.get(
      `${config.backendApi}/delivery/${contentId}/metadata`,
      { validateStatus: () => true }
    );
    expect(response.status).toBeLessThan(500);
  });

  test('Access token generation', async () => {
    const response = await axios.post(
      `${config.backendApi}/delivery/${contentId}/access-token`,
      {},
      {
        headers: { 'X-Stacks-Address': user1.address },
        validateStatus: () => true
      }
    );
    
    if (response.status === 200) {
      expect(response.data).toHaveProperty('token');
      expect(response.data).toHaveProperty('expiresIn');
    }
  });

  test('Analytics user logs endpoint', async () => {
    const response = await axios.get(
      `${config.backendApi}/analytics/user/${user1.address}?limit=10`,
      { validateStatus: () => true }
    );
    expect(response.status).toBeLessThan(500);
  });

  test('Analytics content logs endpoint', async () => {
    const response = await axios.get(
      `${config.backendApi}/analytics/content/${contentId}?limit=10`,
      { validateStatus: () => true }
    );
    expect(response.status).toBeLessThan(500);
  });

  test('Analytics stats endpoint', async () => {
    const response = await axios.get(
      `${config.backendApi}/analytics/stats/${contentId}`,
      { validateStatus: () => true }
    );
    expect(response.status).toBeLessThan(500);
  });
});
