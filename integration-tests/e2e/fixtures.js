/**
 * E2E Test Helpers and Fixtures
 * Common utilities for E2E testing
 */

const { test as base } = require('@playwright/test');
const TestUtils = require('../utils/test-setup');

/**
 * Fixture: authenticated user
 */
const test = base.extend({
  authenticatedUser: async ({ page }, use) => {
    const userData = TestUtils.generateUser();
    
    // Register user
    await page.goto('http://localhost:3000/register');
    await page.fill('[data-testid="email-input"]', userData.email);
    await page.fill('[data-testid="password-input"]', userData.password);
    await page.fill('[data-testid="confirm-password-input"]', userData.password);
    await page.click('[data-testid="register-button"]');
    
    // Wait for dashboard
    await page.waitForURL('**/dashboard');
    
    // Use the data
    await use({
      ...userData,
      email: userData.email,
      password: userData.password,
    });
  },

  authenticatedCreator: async ({ page }, use) => {
    const creatorData = TestUtils.generateUser({ role: 'creator' });
    
    // Register creator
    await page.goto('http://localhost:3000/register');
    await page.fill('[data-testid="email-input"]', creatorData.email);
    await page.fill('[data-testid="password-input"]', creatorData.password);
    await page.fill('[data-testid="confirm-password-input"]', creatorData.password);
    await page.selectOption('[data-testid="role-select"]', 'creator');
    await page.click('[data-testid="register-button"]');
    
    // Wait for dashboard
    await page.waitForURL('**/dashboard');
    
    await use({
      ...creatorData,
      email: creatorData.email,
      password: creatorData.password,
      role: 'creator',
    });
  },

  testContent: async ({}, use) => {
    const content = TestUtils.generateContent();
    await use(content);
  },
});

module.exports = { test };
