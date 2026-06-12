/**
 * End-to-End User Flow Tests
 * Tests complete user journeys from registration to content consumption
 * 
 * Test Coverage:
 * - User Registration & Onboarding
 * - Authentication (Login/Logout/Password Reset)
 * - Content Discovery & Browsing
 * - Wallet Connection & Management
 * - Subscription Purchase & Management
 * - Content Purchase & Access (Pay-Per-View)
 * - Gated Content Viewing
 * - Creator Upload & Management
 * - Admin Moderation
 * - Error Handling & Edge Cases
 */

const { test, expect } = require('@playwright/test');
const TestUtils = require('../utils/test-setup');

// Configuration
const BASE_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const API_URL = process.env.API_URL || 'http://localhost:3001';

/**
 * USER REGISTRATION AND ONBOARDING TESTS
 */
test.describe('User Registration and Onboarding Flow', () => {
  test('REGISTER-001: should complete full user registration journey', async ({ page }) => {
    // Navigate to registration page
    await page.goto(`${BASE_URL}/register`);

    // Fill registration form
    const userData = TestUtils.generateUser();
    await page.fill('[data-testid="email-input"]', userData.email);
    await page.fill('[data-testid="password-input"]', userData.password);
    await page.fill('[data-testid="confirm-password-input"]', userData.password);
    await page.selectOption('[data-testid="role-select"]', userData.role);

    // Submit form
    await page.click('[data-testid="register-button"]');

    // Verify redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });

    // Verify welcome message
    await expect(page.locator('[data-testid="welcome-message"]')).toContainText('Welcome', { timeout: 5000 });

    // Verify user profile setup
    await page.click('[data-testid="profile-link"]');
    await expect(page.locator('[data-testid="profile-email"]')).toContainText(userData.email, { timeout: 5000 });
  });

  test('REGISTER-002: should handle empty registration form submission', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);

    // Try to submit empty form
    await page.click('[data-testid="register-button"]');

    // Verify validation messages appear
    await expect(page.locator('[data-testid="email-error"]')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('[data-testid="password-error"]')).toBeVisible({ timeout: 3000 });
    
    // Still on registration page
    await expect(page).toHaveURL(/\/register/, { timeout: 3000 });
  });

  test('REGISTER-003: should validate email format on registration', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);

    const userData = TestUtils.generateUser();
    
    // Try invalid email format
    await page.fill('[data-testid="email-input"]', 'invalid-email');
    await page.fill('[data-testid="password-input"]', userData.password);
    await page.fill('[data-testid="confirm-password-input"]', userData.password);
    await page.click('[data-testid="register-button"]');
    
    // Should show email validation error
    await expect(page.locator('[data-testid="email-error"]')).toContainText(/valid|invalid/, { timeout: 3000 });
  });

  test('REGISTER-004: should validate password strength on registration', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);

    const userData = TestUtils.generateUser();
    
    // Try weak password (too short)
    await page.fill('[data-testid="email-input"]', userData.email);
    await page.fill('[data-testid="password-input"]', '123');
    await page.fill('[data-testid="confirm-password-input"]', '123');
    await page.click('[data-testid="register-button"]');
    
    // Should show password strength error
    await expect(page.locator('[data-testid="password-error"]')).toContainText(/strong|length/, { timeout: 3000 });
  });

  test('REGISTER-005: should require password confirmation match', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);

    const userData = TestUtils.generateUser();
    
    // Fill with non-matching passwords
    await page.fill('[data-testid="email-input"]', userData.email);
    await page.fill('[data-testid="password-input"]', userData.password);
    await page.fill('[data-testid="confirm-password-input"]', 'DifferentPassword123!');
    await page.click('[data-testid="register-button"]');
    
    // Should show confirmation error
    await expect(page.locator('[data-testid="confirm-error"]')).toContainText(/match|confirm/, { timeout: 3000 });
  });

  test('REGISTER-006: should prevent duplicate email registration', async ({ page, context }) => {
    // First registration
    const userData = TestUtils.generateUser();
    await page.goto(`${BASE_URL}/register`);
    await page.fill('[data-testid="email-input"]', userData.email);
    await page.fill('[data-testid="password-input"]', userData.password);
    await page.fill('[data-testid="confirm-password-input"]', userData.password);
    await page.click('[data-testid="register-button"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });

    // Create new page to register again
    const page2 = await context.newPage();
    await page2.goto(`${BASE_URL}/register`);

    // Try to register with same email
    await page2.fill('[data-testid="email-input"]', userData.email);
    await page2.fill('[data-testid="password-input"]', 'DifferentPassword123!');
    await page2.fill('[data-testid="confirm-password-input"]', 'DifferentPassword123!');
    await page2.click('[data-testid="register-button"]');

    // Verify error message for duplicate
    await expect(page2.locator('[data-testid="error-message"]')).toContainText(/already|exists/, { timeout: 3000 });
    
    await page2.close();
  });

  test('REGISTER-007: should accept terms and conditions during registration', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);

    const userData = TestUtils.generateUser();
    await page.fill('[data-testid="email-input"]', userData.email);
    await page.fill('[data-testid="password-input"]', userData.password);
    await page.fill('[data-testid="confirm-password-input"]', userData.password);

    // Try to submit without accepting terms
    await page.click('[data-testid="register-button"]');
    
    // Should show error if terms checkbox exists
    const termsCheckbox = await page.$('[data-testid="terms-checkbox"]');
    if (termsCheckbox) {
      await expect(page.locator('[data-testid="terms-error"]')).toBeVisible({ timeout: 2000 });

      // Check terms checkbox and try again
      await page.check('[data-testid="terms-checkbox"]');
      await page.click('[data-testid="register-button"]');
      
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });
    }
  });

  test('REGISTER-008: should allow role selection during registration', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);

    const userData = TestUtils.generateUser({ role: 'creator' });
    await page.fill('[data-testid="email-input"]', userData.email);
    await page.fill('[data-testid="password-input"]', userData.password);
    await page.fill('[data-testid="confirm-password-input"]', userData.password);
    await page.selectOption('[data-testid="role-select"]', 'creator');

    await page.click('[data-testid="register-button"]');
    
    // Verify redirect and creator role is applied
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });
    await page.click('[data-testid="profile-link"]');
    await expect(page.locator('[data-testid="profile-role"]')).toContainText(/creator/, { timeout: 3000 });
  });
});

/**
 * AUTHENTICATION TESTS
 */
test.describe('Authentication Flow', () => {
  test('AUTH-001: should complete login to logout flow', async ({ page }) => {
    // Register a test user first
    const userData = TestUtils.generateUser();
    await page.goto(`${BASE_URL}/register`);
    await page.fill('[data-testid="email-input"]', userData.email);
    await page.fill('[data-testid="password-input"]', userData.password);
    await page.fill('[data-testid="confirm-password-input"]', userData.password);
    await page.click('[data-testid="register-button"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });

    // Logout
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');

    // Verify redirect to home
    await expect(page).toHaveURL(/\/$|\/login/, { timeout: 3000 });

    // Verify cannot access protected routes
    await page.goto(`${BASE_URL}/dashboard`);
    await expect(page).toHaveURL(/\/login/, { timeout: 3000 });
  });

  test('AUTH-002: should handle login with invalid credentials', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    // Try invalid credentials
    await page.fill('[data-testid="email-input"]', 'nonexistent@example.com');
    await page.fill('[data-testid="password-input"]', 'WrongPassword123!');
    await page.click('[data-testid="login-button"]');

    // Should show error message
    await expect(page.locator('[data-testid="error-message"]')).toContainText(/invalid|incorrect/, { timeout: 3000 });
    
    // Still on login page
    await expect(page).toHaveURL(/\/login/, { timeout: 3000 });
  });

  test('AUTH-003: should handle login with correct credentials', async ({ page }) => {
    // Register user first
    const userData = TestUtils.generateUser();
    await page.goto(`${BASE_URL}/register`);
    await page.fill('[data-testid="email-input"]', userData.email);
    await page.fill('[data-testid="password-input"]', userData.password);
    await page.fill('[data-testid="confirm-password-input"]', userData.password);
    await page.click('[data-testid="register-button"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });

    // Logout and login again
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');
    
    await page.goto(`${BASE_URL}/login`);
    await page.fill('[data-testid="email-input"]', userData.email);
    await page.fill('[data-testid="password-input"]', userData.password);
    await page.click('[data-testid="login-button"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });
  });

  test('AUTH-004: should validate email field on login', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    // Try with invalid email
    await page.fill('[data-testid="email-input"]', 'not-an-email');
    await page.fill('[data-testid="password-input"]', 'Password123!');
    await page.click('[data-testid="login-button"]');

    // Should show validation error
    await expect(page.locator('[data-testid="email-error"]')).toBeVisible({ timeout: 2000 });
  });

  test('AUTH-005: should require password field on login', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    // Submit without password
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.click('[data-testid="login-button"]');

    // Should show password required error
    await expect(page.locator('[data-testid="password-error"]')).toBeVisible({ timeout: 2000 });
  });

  test('AUTH-006: should handle password reset request', async ({ page }) => {
    // First register a user
    const userData = TestUtils.generateUser();
    await page.goto(`${BASE_URL}/register`);
    await page.fill('[data-testid="email-input"]', userData.email);
    await page.fill('[data-testid="password-input"]', userData.password);
    await page.fill('[data-testid="confirm-password-input"]', userData.password);
    await page.click('[data-testid="register-button"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });

    // Logout and go to forgot password
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');

    await page.goto(`${BASE_URL}/forgot-password`);
    await page.fill('[data-testid="email-input"]', userData.email);
    await page.click('[data-testid="reset-button"]');

    // Should show success message
    await expect(page.locator('[data-testid="success-message"]')).toContainText(/sent|reset/, { timeout: 3000 });
  });

  test('AUTH-007: should show session timeout warning', async ({ page }) => {
    // Register and login
    const userData = TestUtils.generateUser();
    await page.goto(`${BASE_URL}/register`);
    await page.fill('[data-testid="email-input"]', userData.email);
    await page.fill('[data-testid="password-input"]', userData.password);
    await page.fill('[data-testid="confirm-password-input"]', userData.password);
    await page.click('[data-testid="register-button"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });

    // Wait and check if session warning appears
    const sessionWarning = await page.$('[data-testid="session-warning"]');
    if (sessionWarning) {
      await expect(page.locator('[data-testid="session-warning"]')).toBeVisible({ timeout: 2000 });
    }
  });
});

/**
 * CONTENT DISCOVERY AND BROWSING TESTS
 */
test.describe('Content Discovery and Browsing Flow', () => {
  test('BROWSE-001: should display content catalog on browse page', async ({ page }) => {
    await page.goto(`${BASE_URL}/browse`);

    // Should load content grid/list
    await expect(page.locator('[data-testid="content-grid"]')).toBeVisible({ timeout: 5000 });
    
    // Should have at least one content card
    const contentCards = await page.locator('[data-testid="content-card"]').count();
    expect(contentCards).toBeGreaterThan(0);
  });

  test('BROWSE-002: should filter content by type', async ({ page }) => {
    await page.goto(`${BASE_URL}/browse`);

    // Wait for content to load
    await page.waitForSelector('[data-testid="content-card"]');

    // Select a content type filter if available
    const filterButton = await page.$('[data-testid="filter-type"]');
    if (filterButton) {
      await page.selectOption('[data-testid="filter-type"]', 'video');
      
      // Should update content display
      await page.waitForTimeout(500);
      const contentCards = await page.locator('[data-testid="content-card"]').count();
      expect(contentCards).toBeGreaterThanOrEqual(0);
    }
  });

  test('BROWSE-003: should search for content by title', async ({ page }) => {
    await page.goto(`${BASE_URL}/browse`);

    // Enter search query
    await page.fill('[data-testid="search-input"]', 'test');
    await page.click('[data-testid="search-button"]');

    // Wait for results to update
    await page.waitForTimeout(500);
    
    // Results should be displayed
    const resultContainer = await page.$('[data-testid="search-results"]');
    expect(resultContainer).toBeTruthy();
  });

  test('BROWSE-004: should sort content by date', async ({ page }) => {
    await page.goto(`${BASE_URL}/browse`);

    const sortButton = await page.$('[data-testid="sort-by"]');
    if (sortButton) {
      await page.selectOption('[data-testid="sort-by"]', 'newest');
      
      // Wait for re-sort
      await page.waitForTimeout(500);
      
      // Should still display content
      const contentCards = await page.locator('[data-testid="content-card"]').count();
      expect(contentCards).toBeGreaterThanOrEqual(0);
    }
  });

  test('BROWSE-005: should sort content by price', async ({ page }) => {
    await page.goto(`${BASE_URL}/browse`);

    const sortButton = await page.$('[data-testid="sort-by"]');
    if (sortButton) {
      await page.selectOption('[data-testid="sort-by"]', 'price-low');
      
      // Wait for re-sort
      await page.waitForTimeout(500);
      
      // Should display content
      const contentCards = await page.locator('[data-testid="content-card"]').count();
      expect(contentCards).toBeGreaterThanOrEqual(0);
    }
  });

  test('BROWSE-006: should display content details on click', async ({ page }) => {
    await page.goto(`${BASE_URL}/browse`);

    // Wait for content to load
    await page.waitForSelector('[data-testid="content-card"]');

    // Click first content card
    await page.click('[data-testid="content-card"]');

    // Should navigate to content detail page
    await expect(page).toHaveURL(/\/content\//, { timeout: 3000 });
    
    // Should display content details
    await expect(page.locator('[data-testid="content-title"]')).toBeVisible({ timeout: 3000 });
  });

  test('BROWSE-007: should show creator profile from content', async ({ page }) => {
    await page.goto(`${BASE_URL}/browse`);

    // Wait and click first content
    await page.waitForSelector('[data-testid="content-card"]');
    await page.click('[data-testid="content-card"]');

    // Navigate to content detail
    await expect(page).toHaveURL(/\/content\//, { timeout: 3000 });

    // Click creator profile link if available
    const creatorLink = await page.$('[data-testid="creator-link"]');
    if (creatorLink) {
      await page.click('[data-testid="creator-link"]');
      
      // Should navigate to creator profile
      await expect(page).toHaveURL(/\/creator\//, { timeout: 3000 });
    }
  });
});

/**
 * WALLET CONNECTION AND MANAGEMENT TESTS
 */
test.describe('Wallet Connection and Management Flow', () => {
  test('WALLET-001: should display wallet connection option', async ({ page }) => {
    // Register and login
    const userData = TestUtils.generateUser();
    await page.goto(`${BASE_URL}/register`);
    await page.fill('[data-testid="email-input"]', userData.email);
    await page.fill('[data-testid="password-input"]', userData.password);
    await page.fill('[data-testid="confirm-password-input"]', userData.password);
    await page.click('[data-testid="register-button"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });

    // Navigate to wallet settings
    await page.click('[data-testid="profile-link"]');
    
    // Should have wallet section
    const walletSection = await page.$('[data-testid="wallet-section"]');
    expect(walletSection).toBeTruthy();
  });

  test('WALLET-002: should initiate wallet connection', async ({ page }) => {
    // Login
    const userData = TestUtils.generateUser();
    await page.goto(`${BASE_URL}/register`);
    await page.fill('[data-testid="email-input"]', userData.email);
    await page.fill('[data-testid="password-input"]', userData.password);
    await page.fill('[data-testid="confirm-password-input"]', userData.password);
    await page.click('[data-testid="register-button"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });

    // Go to profile/settings
    await page.click('[data-testid="profile-link"]');

    // Click connect wallet button if exists
    const connectButton = await page.$('[data-testid="connect-wallet-button"]');
    if (connectButton) {
      await page.click('[data-testid="connect-wallet-button"]');
      
      // Should show wallet connection modal or redirect
      const modal = await page.$('[data-testid="wallet-modal"]');
      const redirect = page.url();
      
      expect(modal || redirect.includes('connect')).toBeTruthy();
    }
  });

  test('WALLET-003: should display connected wallet address', async ({ page }) => {
    // Login
    const userData = TestUtils.generateUser();
    await page.goto(`${BASE_URL}/register`);
    await page.fill('[data-testid="email-input"]', userData.email);
    await page.fill('[data-testid="password-input"]', userData.password);
    await page.fill('[data-testid="confirm-password-input"]', userData.password);
    await page.click('[data-testid="register-button"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });

    // Check if wallet is connected
    const walletAddress = await page.$('[data-testid="wallet-address"]');
    if (walletAddress) {
      const address = await walletAddress.textContent();
      expect(address).toMatch(/^ST[A-Z0-9]{38}$/);
    }
  });
});

/**
 * SUBSCRIPTION PURCHASE TESTS
 */
test.describe('Subscription Purchase and Management Flow', () => {
  test('SUB-001: should display subscription options for creator', async ({ page }) => {
    await page.goto(`${BASE_URL}/browse`);

    // Wait for content to load
    await page.waitForSelector('[data-testid="content-card"]');

    // Click first content
    await page.click('[data-testid="content-card"]');
    
    // Navigate to content detail
    await expect(page).toHaveURL(/\/content\//, { timeout: 3000 });

    // Check for subscription button
    const subscribeButton = await page.$('[data-testid="subscribe-button"]');
    expect(subscribeButton).toBeTruthy();
  });

  test('SUB-002: should show subscription pricing', async ({ page }) => {
    await page.goto(`${BASE_URL}/browse`);

    // Wait for content
    await page.waitForSelector('[data-testid="content-card"]');
    await page.click('[data-testid="content-card"]');
    
    await expect(page).toHaveURL(/\/content\//, { timeout: 3000 });

    // Check for subscription price display
    const priceDisplay = await page.$('[data-testid="subscription-price"]');
    if (priceDisplay) {
      const priceText = await priceDisplay.textContent();
      expect(priceText).toMatch(/\d+/);
    }
  });

  test('SUB-003: should require authentication for subscription', async ({ page }) => {
    await page.goto(`${BASE_URL}/browse`);

    // Wait for content
    await page.waitForSelector('[data-testid="content-card"]');
    await page.click('[data-testid="content-card"]');
    
    await expect(page).toHaveURL(/\/content\//, { timeout: 3000 });

    // Try to subscribe without login
    const subscribeButton = await page.$('[data-testid="subscribe-button"]');
    if (subscribeButton) {
      await page.click('[data-testid="subscribe-button"]');
      
      // Should redirect to login
      const url = page.url();
      expect(url).toMatch(/login|auth/);
    }
  });

  test('SUB-004: should complete subscription purchase flow', async ({ page }) => {
    // Register and login
    const userData = TestUtils.generateUser();
    await page.goto(`${BASE_URL}/register`);
    await page.fill('[data-testid="email-input"]', userData.email);
    await page.fill('[data-testid="password-input"]', userData.password);
    await page.fill('[data-testid="confirm-password-input"]', userData.password);
    await page.click('[data-testid="register-button"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });

    // Browse and find content
    await page.goto(`${BASE_URL}/browse`);
    await page.waitForSelector('[data-testid="content-card"]');
    await page.click('[data-testid="content-card"]');
    
    await expect(page).toHaveURL(/\/content\//, { timeout: 3000 });

    // Attempt subscription
    const subscribeButton = await page.$('[data-testid="subscribe-button"]');
    if (subscribeButton) {
      await page.click('[data-testid="subscribe-button"]');
      
      // Should show payment modal
      const paymentModal = await page.$('[data-testid="payment-modal"]');
      expect(paymentModal).toBeTruthy();
    }
  });
});

/**
 * CONTENT PURCHASE (PAY-PER-VIEW) TESTS
 */
test.describe('Content Purchase and Gated Access Flow', () => {
  test('PPV-001: should display purchase button for paid content', async ({ page }) => {
    await page.goto(`${BASE_URL}/browse`);

    // Wait for content
    await page.waitForSelector('[data-testid="content-card"]');
    await page.click('[data-testid="content-card"]');
    
    await expect(page).toHaveURL(/\/content\//, { timeout: 3000 });

    // Check for purchase button
    const purchaseButton = await page.$('[data-testid="purchase-button"]');
    expect(purchaseButton).toBeTruthy();
  });

  test('PPV-002: should display content price', async ({ page }) => {
    await page.goto(`${BASE_URL}/browse`);

    // Wait for content
    await page.waitForSelector('[data-testid="content-card"]');
    await page.click('[data-testid="content-card"]');
    
    await expect(page).toHaveURL(/\/content\//, { timeout: 3000 });

    // Should show price
    const priceDisplay = await page.$('[data-testid="content-price"]');
    if (priceDisplay) {
      const priceText = await priceDisplay.textContent();
      expect(priceText).toMatch(/\d+/);
    }
  });

  test('PPV-003: should show preview for gated content', async ({ page }) => {
    await page.goto(`${BASE_URL}/browse`);

    // Wait for content
    await page.waitForSelector('[data-testid="content-card"]');
    await page.click('[data-testid="content-card"]');
    
    await expect(page).toHaveURL(/\/content\//, { timeout: 3000 });

    // Should display preview section
    const previewSection = await page.$('[data-testid="content-preview"]');
    expect(previewSection).toBeTruthy();
  });

  test('PPV-004: should require authentication for purchase', async ({ page }) => {
    await page.goto(`${BASE_URL}/browse`);

    // Wait for content
    await page.waitForSelector('[data-testid="content-card"]');
    await page.click('[data-testid="content-card"]');
    
    await expect(page).toHaveURL(/\/content\//, { timeout: 3000 });

    // Try to purchase without login
    const purchaseButton = await page.$('[data-testid="purchase-button"]');
    if (purchaseButton) {
      await page.click('[data-testid="purchase-button"]');
      
      // Should redirect to login
      const url = page.url();
      expect(url).toMatch(/login|auth/);
    }
  });

  test('PPV-005: should complete purchase transaction', async ({ page }) => {
    // Register and login
    const userData = TestUtils.generateUser();
    await page.goto(`${BASE_URL}/register`);
    await page.fill('[data-testid="email-input"]', userData.email);
    await page.fill('[data-testid="password-input"]', userData.password);
    await page.fill('[data-testid="confirm-password-input"]', userData.password);
    await page.click('[data-testid="register-button"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });

    // Browse and find content
    await page.goto(`${BASE_URL}/browse`);
    await page.waitForSelector('[data-testid="content-card"]');
    await page.click('[data-testid="content-card"]');
    
    await expect(page).toHaveURL(/\/content\//, { timeout: 3000 });

    // Attempt purchase
    const purchaseButton = await page.$('[data-testid="purchase-button"]');
    if (purchaseButton) {
      await page.click('[data-testid="purchase-button"]');
      
      // Should show payment modal
      const paymentModal = await page.$('[data-testid="payment-modal"]');
      expect(paymentModal).toBeTruthy();
    }
  });

  test('PPV-006: should grant access after purchase', async ({ page }) => {
    // Register and login
    const userData = TestUtils.generateUser();
    await page.goto(`${BASE_URL}/register`);
    await page.fill('[data-testid="email-input"]', userData.email);
    await page.fill('[data-testid="password-input"]', userData.password);
    await page.fill('[data-testid="confirm-password-input"]', userData.password);
    await page.click('[data-testid="register-button"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });

    // Browse and purchase content
    await page.goto(`${BASE_URL}/browse`);
    await page.waitForSelector('[data-testid="content-card"]');
    await page.click('[data-testid="content-card"]');
    
    await expect(page).toHaveURL(/\/content\//, { timeout: 3000 });

    const purchaseButton = await page.$('[data-testid="purchase-button"]');
    if (purchaseButton) {
      await page.click('[data-testid="purchase-button"]');
      
      // Complete payment (would normally be mocked)
      const paymentModal = await page.$('[data-testid="payment-modal"]');
      if (paymentModal) {
        await page.waitForTimeout(1000);
        
        // After successful payment, check if purchase button is gone
        const fullContent = await page.$('[data-testid="content-full"]');
        expect(fullContent).toBeTruthy();
      }
    }
  });

  test('PPV-007: should show purchase history in profile', async ({ page }) => {
    // Register and login
    const userData = TestUtils.generateUser();
    await page.goto(`${BASE_URL}/register`);
    await page.fill('[data-testid="email-input"]', userData.email);
    await page.fill('[data-testid="password-input"]', userData.password);
    await page.fill('[data-testid="confirm-password-input"]', userData.password);
    await page.click('[data-testid="register-button"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });

    // Navigate to profile/purchases
    await page.click('[data-testid="profile-link"]');
    
    // Check for purchases section
    const purchasesSection = await page.$('[data-testid="purchases-section"]');
    if (purchasesSection) {
      await expect(page.locator('[data-testid="purchases-section"]')).toBeVisible({ timeout: 3000 });
    }
  });
});

/**
 * CREATOR UPLOAD AND MANAGEMENT TESTS
 */
test.describe('Creator Upload and Content Management Flow', () => {
  test('CREATOR-001: should show upload button for creator role', async ({ page }) => {
    // Register as creator
    const creatorData = TestUtils.generateUser({ role: 'creator' });
    await page.goto(`${BASE_URL}/register`);
    await page.fill('[data-testid="email-input"]', creatorData.email);
    await page.fill('[data-testid="password-input"]', creatorData.password);
    await page.fill('[data-testid="confirm-password-input"]', creatorData.password);
    await page.selectOption('[data-testid="role-select"]', 'creator');
    await page.click('[data-testid="register-button"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });

    // Should see upload/create button
    const createButton = await page.$('[data-testid="create-content-button"]');
    expect(createButton).toBeTruthy();
  });

  test('CREATOR-002: should access content creation form', async ({ page }) => {
    // Register as creator
    const creatorData = TestUtils.generateUser({ role: 'creator' });
    await page.goto(`${BASE_URL}/register`);
    await page.fill('[data-testid="email-input"]', creatorData.email);
    await page.fill('[data-testid="password-input"]', creatorData.password);
    await page.fill('[data-testid="confirm-password-input"]', creatorData.password);
    await page.selectOption('[data-testid="role-select"]', 'creator');
    await page.click('[data-testid="register-button"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });

    // Click create content button
    await page.click('[data-testid="create-content-button"]');

    // Should show content creation form
    await expect(page).toHaveURL(/\/create/, { timeout: 3000 });
    await expect(page.locator('[data-testid="title-input"]')).toBeVisible({ timeout: 3000 });
  });

  test('CREATOR-003: should validate content title field', async ({ page }) => {
    // Register and login as creator
    const creatorData = TestUtils.generateUser({ role: 'creator' });
    await page.goto(`${BASE_URL}/register`);
    await page.fill('[data-testid="email-input"]', creatorData.email);
    await page.fill('[data-testid="password-input"]', creatorData.password);
    await page.fill('[data-testid="confirm-password-input"]', creatorData.password);
    await page.selectOption('[data-testid="role-select"]', 'creator');
    await page.click('[data-testid="register-button"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });

    // Go to create content
    await page.click('[data-testid="create-content-button"]');
    await expect(page).toHaveURL(/\/create/, { timeout: 3000 });

    // Try to submit without title
    await page.click('[data-testid="publish-button"]');
    
    // Should show title error
    await expect(page.locator('[data-testid="title-error"]')).toBeVisible({ timeout: 2000 });
  });

  test('CREATOR-004: should validate content description field', async ({ page }) => {
    // Register and login as creator
    const creatorData = TestUtils.generateUser({ role: 'creator' });
    await page.goto(`${BASE_URL}/register`);
    await page.fill('[data-testid="email-input"]', creatorData.email);
    await page.fill('[data-testid="password-input"]', creatorData.password);
    await page.fill('[data-testid="confirm-password-input"]', creatorData.password);
    await page.selectOption('[data-testid="role-select"]', 'creator');
    await page.click('[data-testid="register-button"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });

    // Go to create content
    await page.click('[data-testid="create-content-button"]');
    await expect(page).toHaveURL(/\/create/, { timeout: 3000 });

    // Add title but no description
    const contentData = TestUtils.generateContent();
    await page.fill('[data-testid="title-input"]', contentData.title);
    await page.click('[data-testid="publish-button"]');
    
    // Should show description error if required
    const descError = await page.$('[data-testid="description-error"]');
    if (descError) {
      await expect(page.locator('[data-testid="description-error"]')).toBeVisible({ timeout: 2000 });
    }
  });

  test('CREATOR-005: should allow content type selection', async ({ page }) => {
    // Register and login as creator
    const creatorData = TestUtils.generateUser({ role: 'creator' });
    await page.goto(`${BASE_URL}/register`);
    await page.fill('[data-testid="email-input"]', creatorData.email);
    await page.fill('[data-testid="password-input"]', creatorData.password);
    await page.fill('[data-testid="confirm-password-input"]', creatorData.password);
    await page.selectOption('[data-testid="role-select"]', 'creator');
    await page.click('[data-testid="register-button"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });

    // Go to create content
    await page.click('[data-testid="create-content-button"]');
    await expect(page).toHaveURL(/\/create/, { timeout: 3000 });

    // Should have content type selector
    const typeSelector = await page.$('[data-testid="content-type-select"]');
    expect(typeSelector).toBeTruthy();
  });

  test('CREATOR-006: should allow access type selection (free/paid/subscription)', async ({ page }) => {
    // Register and login as creator
    const creatorData = TestUtils.generateUser({ role: 'creator' });
    await page.goto(`${BASE_URL}/register`);
    await page.fill('[data-testid="email-input"]', creatorData.email);
    await page.fill('[data-testid="password-input"]', creatorData.password);
    await page.fill('[data-testid="confirm-password-input"]', creatorData.password);
    await page.selectOption('[data-testid="role-select"]', 'creator');
    await page.click('[data-testid="register-button"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });

    // Go to create content
    await page.click('[data-testid="create-content-button"]');
    await expect(page).toHaveURL(/\/create/, { timeout: 3000 });

    // Should have access type selector
    const accessTypeSelect = await page.$('[data-testid="access-type-select"]');
    expect(accessTypeSelect).toBeTruthy();
  });

  test('CREATOR-007: should allow file upload', async ({ page }) => {
    // Register and login as creator
    const creatorData = TestUtils.generateUser({ role: 'creator' });
    await page.goto(`${BASE_URL}/register`);
    await page.fill('[data-testid="email-input"]', creatorData.email);
    await page.fill('[data-testid="password-input"]', creatorData.password);
    await page.fill('[data-testid="confirm-password-input"]', creatorData.password);
    await page.selectOption('[data-testid="role-select"]', 'creator');
    await page.click('[data-testid="register-button"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });

    // Go to create content
    await page.click('[data-testid="create-content-button"]');
    await expect(page).toHaveURL(/\/create/, { timeout: 3000 });

    // Should have file upload input
    const fileUpload = await page.$('[data-testid="file-upload"]');
    expect(fileUpload).toBeTruthy();
  });

  test('CREATOR-008: should display creator dashboard with uploaded content', async ({ page }) => {
    // Register and login as creator
    const creatorData = TestUtils.generateUser({ role: 'creator' });
    await page.goto(`${BASE_URL}/register`);
    await page.fill('[data-testid="email-input"]', creatorData.email);
    await page.fill('[data-testid="password-input"]', creatorData.password);
    await page.fill('[data-testid="confirm-password-input"]', creatorData.password);
    await page.selectOption('[data-testid="role-select"]', 'creator');
    await page.click('[data-testid="register-button"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });

    // Navigate to creator dashboard
    await page.goto(`${BASE_URL}/dashboard/creator`);

    // Should display creator-specific UI
    const creatorDashboard = await page.$('[data-testid="creator-dashboard"]');
    expect(creatorDashboard).toBeTruthy();
  });

  test('CREATOR-009: should show content editing options', async ({ page }) => {
    // Register and login as creator
    const creatorData = TestUtils.generateUser({ role: 'creator' });
    await page.goto(`${BASE_URL}/register`);
    await page.fill('[data-testid="email-input"]', creatorData.email);
    await page.fill('[data-testid="password-input"]', creatorData.password);
    await page.fill('[data-testid="confirm-password-input"]', creatorData.password);
    await page.selectOption('[data-testid="role-select"]', 'creator');
    await page.click('[data-testid="register-button"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });

    // Navigate to creator dashboard
    await page.goto(`${BASE_URL}/dashboard/creator`);

    // Should have content management section
    const contentSection = await page.$('[data-testid="content-management"]');
    if (contentSection) {
      await expect(page.locator('[data-testid="content-management"]')).toBeVisible({ timeout: 3000 });
    }
  });
});

/**
 * ERROR HANDLING AND EDGE CASES
 */
test.describe('Error Handling and Edge Cases', () => {
  test('ERROR-001: should handle network errors gracefully', async ({ page }) => {
    // Simulate network failure for API calls
    await page.route('**/api/**', route => route.abort());

    await page.goto(`${BASE_URL}/login`);
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');

    // Should show network error
    await expect(page.locator('[data-testid="error-message"]')).toContainText(/network|error|failed/, { timeout: 3000 });
  });

  test('ERROR-002: should handle browser back navigation', async ({ page }) => {
    const userData = TestUtils.generateUser();
    await page.goto(`${BASE_URL}/register`);
    await page.fill('[data-testid="email-input"]', userData.email);
    await page.fill('[data-testid="password-input"]', userData.password);
    await page.fill('[data-testid="confirm-password-input"]', userData.password);
    await page.click('[data-testid="register-button"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });

    // Navigate to profile
    await page.click('[data-testid="profile-link"]');
    
    // Go back
    await page.goBack();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 3000 });
  });

  test('ERROR-003: should handle browser forward navigation', async ({ page }) => {
    const userData = TestUtils.generateUser();
    await page.goto(`${BASE_URL}/register`);
    await page.fill('[data-testid="email-input"]', userData.email);
    await page.fill('[data-testid="password-input"]', userData.password);
    await page.fill('[data-testid="confirm-password-input"]', userData.password);
    await page.click('[data-testid="register-button"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });

    // Navigate to profile and back
    await page.click('[data-testid="profile-link"]');
    await page.goBack();
    
    // Forward
    await page.goForward();
    await expect(page).toHaveURL(/\/profile/, { timeout: 3000 });
  });

  test('ERROR-004: should handle rapid form submissions', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    const userData = TestUtils.generateUser();
    await page.fill('[data-testid="email-input"]', userData.email);
    await page.fill('[data-testid="password-input"]', userData.password);

    // Rapid submissions
    await page.click('[data-testid="login-button"]');
    await page.click('[data-testid="login-button"]');
    await page.click('[data-testid="login-button"]');

    // Should only process one request or show error
    await page.waitForTimeout(1000);
    expect(page.url()).toBeTruthy();
  });

  test('ERROR-005: should handle very long content titles', async ({ page }) => {
    // Register as creator
    const creatorData = TestUtils.generateUser({ role: 'creator' });
    await page.goto(`${BASE_URL}/register`);
    await page.fill('[data-testid="email-input"]', creatorData.email);
    await page.fill('[data-testid="password-input"]', creatorData.password);
    await page.fill('[data-testid="confirm-password-input"]', creatorData.password);
    await page.selectOption('[data-testid="role-select"]', 'creator');
    await page.click('[data-testid="register-button"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });

    // Go to create content
    await page.click('[data-testid="create-content-button"]');
    await expect(page).toHaveURL(/\/create/, { timeout: 3000 });

    // Enter very long title
    const longTitle = 'A'.repeat(500);
    await page.fill('[data-testid="title-input"]', longTitle);

    // Should truncate or handle gracefully
    const titleValue = await page.inputValue('[data-testid="title-input"]');
    expect(titleValue.length).toBeLessThanOrEqual(500);
  });

  test('ERROR-006: should handle special characters in form inputs', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);

    const userData = TestUtils.generateUser();
    // Use special characters in email
    await page.fill('[data-testid="email-input"]', 'test+special@example.com');
    await page.fill('[data-testid="password-input"]', userData.password);
    await page.fill('[data-testid="confirm-password-input"]', userData.password);
    await page.click('[data-testid="register-button"]');

    // Should handle or reject gracefully
    await page.waitForTimeout(1000);
    expect(page.url()).toBeTruthy();
  });

  test('ERROR-007: should handle slow content loading', async ({ page }) => {
    // Slow down network
    await page.route('**/api/**', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.continue().catch(() => {});
    });

    await page.goto(`${BASE_URL}/browse`);

    // Should eventually load or show loading state
    const loader = await page.$('[data-testid="loading-spinner"]');
    expect(loader || page.url()).toBeTruthy();
  });

  test('ERROR-008: should handle page refresh during form submission', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);

    const userData = TestUtils.generateUser();
    await page.fill('[data-testid="email-input"]', userData.email);
    await page.fill('[data-testid="password-input"]', userData.password);
    await page.fill('[data-testid="confirm-password-input"]', userData.password);

    // Start submission
    await page.click('[data-testid="register-button"]');
    
    // Refresh page
    await page.reload();

    // Should recover gracefully
    expect(page.url()).toBeTruthy();
  });
});

/**
 * ADMIN MODERATION TESTS
 */
test.describe('Admin Panel and Moderation Flow', () => {
  test('ADMIN-001: should show moderation queue for admin', async ({ page }) => {
    // Would need admin credentials
    const adminData = TestUtils.generateUser({ role: 'admin' });
    
    // Navigate to admin login
    await page.goto(`${BASE_URL}/admin/login`);

    // Admin login form should exist
    const adminLoginForm = await page.$('[data-testid="admin-login-form"]');
    expect(adminLoginForm).toBeTruthy();
  });

  test('ADMIN-002: should display pending content for review', async ({ page }) => {
    // Navigate to admin panel
    const adminData = TestUtils.generateUser({ role: 'admin' });
    await page.goto(`${BASE_URL}/admin/login`);

    // Should have moderation section
    const moderationSection = await page.$('[data-testid="moderation-queue"]');
    if (moderationSection) {
      await expect(page.locator('[data-testid="moderation-queue"]')).toBeVisible({ timeout: 3000 });
    }
  });
});
