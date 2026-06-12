/**
 * E2E Test Helpers and Utilities
 * Reusable functions for common E2E test operations
 */

const { test, expect } = require('@playwright/test');

/**
 * Register a new user with provided credentials
 * @param {Page} page - Playwright page object
 * @param {Object} credentials - User credentials {email, password, role}
 */
async function registerUser(page, credentials = {}) {
  const {
    email = `user${Date.now()}@test.com`,
    password = 'Password123!',
    role = 'user'
  } = credentials;

  await page.goto(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/register`);
  await page.fill('[data-testid="email-input"]', email);
  await page.fill('[data-testid="password-input"]', password);
  await page.fill('[data-testid="confirm-password-input"]', password);
  
  if (role !== 'user') {
    await page.selectOption('[data-testid="role-select"]', role);
  }

  await page.click('[data-testid="register-button"]');
  await expect(page).toHaveURL(/\/(dashboard|login)/, { timeout: 5000 });

  return { email, password, role };
}

/**
 * Login with provided credentials
 * @param {Page} page - Playwright page object
 * @param {Object} credentials - Login credentials {email, password}
 */
async function loginUser(page, credentials = {}) {
  const {
    email = 'test@test.com',
    password = 'Password123!'
  } = credentials;

  const BASE_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
  await page.goto(`${BASE_URL}/login`);
  await page.fill('[data-testid="email-input"]', email);
  await page.fill('[data-testid="password-input"]', password);
  await page.click('[data-testid="login-button"]');

  await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });
}

/**
 * Logout current user
 * @param {Page} page - Playwright page object
 */
async function logoutUser(page) {
  const logoutBtn = await page.$('[data-testid="logout-button"]');
  if (logoutBtn) {
    await logoutBtn.click();
    await expect(page).toHaveURL(/\/(login|register)/, { timeout: 3000 });
  }
}

/**
 * Navigate to content browse page
 * @param {Page} page - Playwright page object
 */
async function goToBrowsePage(page) {
  const BASE_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
  await page.goto(`${BASE_URL}/browse`);
  await page.waitForSelector('[data-testid="content-card"]', { timeout: 5000 }).catch(() => {});
}

/**
 * Navigate to dashboard
 * @param {Page} page - Playwright page object
 */
async function goToDashboard(page) {
  const BASE_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
  await page.goto(`${BASE_URL}/dashboard`);
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 3000 });
}

/**
 * Connect wallet
 * @param {Page} page - Playwright page object
 * @param {string} walletType - Type of wallet (hiro, leather)
 */
async function connectWallet(page, walletType = 'hiro') {
  const connectBtn = await page.$('[data-testid="connect-wallet-button"]');
  if (connectBtn) {
    await connectBtn.click();

    // Select wallet provider
    const providerBtn = await page.$(`[data-testid="wallet-${walletType}"]`);
    if (providerBtn) {
      await providerBtn.click();
      // Wait for wallet connection modal/flow
      await page.waitForTimeout(1000);
    }
  }
}

/**
 * Search for content
 * @param {Page} page - Playwright page object
 * @param {string} query - Search query
 */
async function searchContent(page, query) {
  const searchInput = await page.$('[data-testid="search-input"]');
  if (searchInput) {
    await page.fill('[data-testid="search-input"]', query);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
  }
}

/**
 * Filter content by type
 * @param {Page} page - Playwright page object
 * @param {string} type - Content type (video, audio, article, etc)
 */
async function filterContentByType(page, type) {
  const typeFilter = await page.$('[data-testid="content-type-filter"]');
  if (typeFilter) {
    await page.selectOption('[data-testid="content-type-filter"]', type);
    await page.waitForTimeout(500);
  }
}

/**
 * Filter content by price
 * @param {Page} page - Playwright page object
 * @param {number} minPrice - Minimum price
 * @param {number} maxPrice - Maximum price
 */
async function filterContentByPrice(page, minPrice, maxPrice) {
  const minInput = await page.$('[data-testid="min-price-input"]');
  const maxInput = await page.$('[data-testid="max-price-input"]');

  if (minInput) {
    await page.fill('[data-testid="min-price-input"]', minPrice.toString());
  }
  if (maxInput) {
    await page.fill('[data-testid="max-price-input"]', maxPrice.toString());
  }

  await page.waitForTimeout(500);
}

/**
 * Sort content
 * @param {Page} page - Playwright page object
 * @param {string} sortOption - Sort option (newest, trending, price-low, price-high)
 */
async function sortContent(page, sortOption) {
  const sortSelect = await page.$('[data-testid="sort-select"]');
  if (sortSelect) {
    await page.selectOption('[data-testid="sort-select"]', sortOption);
    await page.waitForTimeout(500);
  }
}

/**
 * Create content as creator
 * @param {Page} page - Playwright page object
 * @param {Object} contentData - Content data {title, description, type, accessType, price}
 */
async function createContent(page, contentData = {}) {
  const {
    title = `Test Content ${Date.now()}`,
    description = 'Test content description',
    type = 'video',
    accessType = 'free',
    price = null
  } = contentData;

  const createBtn = await page.$('[data-testid="create-content-button"]');
  if (createBtn) {
    await page.click('[data-testid="create-content-button"]');
    await expect(page).toHaveURL(/\/create/, { timeout: 3000 });

    // Fill form
    await page.fill('[data-testid="title-input"]', title);
    
    const descInput = await page.$('[data-testid="description-input"]');
    if (descInput) {
      await page.fill('[data-testid="description-input"]', description);
    }

    const typeSelect = await page.$('[data-testid="content-type-select"]');
    if (typeSelect) {
      await page.selectOption('[data-testid="content-type-select"]', type);
    }

    const accessSelect = await page.$('[data-testid="access-type-select"]');
    if (accessSelect) {
      await page.selectOption('[data-testid="access-type-select"]', accessType);
    }

    if (price && accessType === 'paid') {
      await page.fill('[data-testid="price-input"]', price.toString());
    }

    return { title, description, type, accessType, price };
  }
}

/**
 * Purchase content
 * @param {Page} page - Playwright page object
 * @param {string} paymentMethod - Payment method (stx, card)
 */
async function purchaseContent(page, paymentMethod = 'stx') {
  const purchaseBtn = await page.$('[data-testid="purchase-button"]');
  if (purchaseBtn) {
    await purchaseBtn.click();

    // Select payment method
    const paymentBtn = await page.$(`[data-testid="payment-${paymentMethod}"]`);
    if (paymentBtn) {
      await paymentBtn.click();
      await page.waitForTimeout(1000);
    }

    // Complete payment
    const completeBtn = await page.$('[data-testid="complete-payment-button"]');
    if (completeBtn) {
      await completeBtn.click();
      await page.waitForTimeout(1000);
    }
  }
}

/**
 * Subscribe to creator
 * @param {Page} page - Playwright page object
 * @param {string} planType - Subscription plan (basic, pro, premium)
 */
async function subscribeToCreator(page, planType = 'basic') {
  const subscribeBtn = await page.$('[data-testid="subscribe-button"]');
  if (subscribeBtn) {
    await subscribeBtn.click();

    // Select plan
    const planBtn = await page.$(`[data-testid="plan-${planType}"]`);
    if (planBtn) {
      await planBtn.click();
      await page.waitForTimeout(500);
    }

    // Confirm subscription
    const confirmBtn = await page.$('[data-testid="confirm-subscription-button"]');
    if (confirmBtn) {
      await confirmBtn.click();
      await page.waitForTimeout(1000);
    }
  }
}

/**
 * Check if user has access to content
 * @param {Page} page - Playwright page object
 * @returns {Promise<boolean>}
 */
async function hasContentAccess(page) {
  const accessDenied = await page.$('[data-testid="access-denied"]');
  const contentViewer = await page.$('[data-testid="content-viewer"]');

  return !accessDenied && contentViewer !== null;
}

/**
 * Wait for element and get text
 * @param {Page} page - Playwright page object
 * @param {string} selector - Element selector
 * @param {number} timeout - Wait timeout in ms
 * @returns {Promise<string>}
 */
async function getElementText(page, selector, timeout = 3000) {
  const element = await page.$(selector);
  if (element) {
    await element.waitForElementState('visible', { timeout });
    return await element.textContent();
  }
  return '';
}

/**
 * Wait for element to disappear
 * @param {Page} page - Playwright page object
 * @param {string} selector - Element selector
 * @param {number} timeout - Wait timeout in ms
 */
async function waitForElementToDisappear(page, selector, timeout = 3000) {
  try {
    await page.waitForSelector(selector, { state: 'hidden', timeout });
  } catch (error) {
    // Element already gone or wasn't there
  }
}

/**
 * Check if error message is displayed
 * @param {Page} page - Playwright page object
 * @param {string} errorText - Error text to look for
 * @returns {Promise<boolean>}
 */
async function hasErrorMessage(page, errorText = '') {
  const error = await page.$('[data-testid="error-message"]');
  if (error) {
    const text = await error.textContent();
    if (errorText) {
      return text.includes(errorText);
    }
    return !!text;
  }
  return false;
}

/**
 * Check if success message is displayed
 * @param {Page} page - Playwright page object
 * @param {string} successText - Success text to look for
 * @returns {Promise<boolean>}
 */
async function hasSuccessMessage(page, successText = '') {
  const success = await page.$('[data-testid="success-message"]');
  if (success) {
    const text = await success.textContent();
    if (successText) {
      return text.includes(successText);
    }
    return !!text;
  }
  return false;
}

/**
 * Take screenshot with timestamp
 * @param {Page} page - Playwright page object
 * @param {string} name - Screenshot name
 */
async function captureScreenshot(page, name) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `screenshots/${name}-${timestamp}.png`;
  await page.screenshot({ path: filename });
}

/**
 * Wait for navigation and verify URL
 * @param {Page} page - Playwright page object
 * @param {Function} triggerAction - Function that triggers navigation
 * @param {RegExp} expectedUrl - Expected URL pattern
 */
async function waitForNavigation(page, triggerAction, expectedUrl) {
  const navigationPromise = page.waitForNavigation({ url: expectedUrl });
  await triggerAction();
  await navigationPromise;
  expect(page.url()).toMatch(expectedUrl);
}

/**
 * Fill form field with error handling
 * @param {Page} page - Playwright page object
 * @param {string} selector - Field selector
 * @param {string} value - Value to fill
 */
async function fillFormField(page, selector, value) {
  const field = await page.$(selector);
  if (field) {
    await page.fill(selector, value);
    return true;
  }
  return false;
}

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  goToBrowsePage,
  goToDashboard,
  connectWallet,
  searchContent,
  filterContentByType,
  filterContentByPrice,
  sortContent,
  createContent,
  purchaseContent,
  subscribeToCreator,
  hasContentAccess,
  getElementText,
  waitForElementToDisappear,
  hasErrorMessage,
  hasSuccessMessage,
  captureScreenshot,
  waitForNavigation,
  fillFormField
};
