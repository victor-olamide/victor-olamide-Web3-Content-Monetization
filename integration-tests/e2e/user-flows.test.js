/**
 * End-to-End User Flow Tests
 * Tests complete user journeys from registration to content consumption
 */

const { test, expect } = require('@playwright/test');
const TestUtils = require('../utils/test-setup');

test.describe('User Registration and Onboarding Flow', () => {
  test('should complete full user registration journey', async ({ page }) => {
    // Navigate to registration page
    await page.goto('/register');

    // Fill registration form
    const userData = TestUtils.generateUser();
    await page.fill('[data-testid="email-input"]', userData.email);
    await page.fill('[data-testid="password-input"]', userData.password);
    await page.fill('[data-testid="confirm-password-input"]', userData.password);
    await page.selectOption('[data-testid="role-select"]', userData.role);

    // Submit form
    await page.click('[data-testid="register-button"]');

    // Verify redirect to dashboard
    await expect(page).toHaveURL('/dashboard');

    // Verify welcome message
    await expect(page.locator('[data-testid="welcome-message"]')).toContainText('Welcome');

    // Verify user profile setup
    await page.click('[data-testid="profile-link"]');
    await expect(page.locator('[data-testid="profile-email"]')).toContainText(userData.email);
  });

  test('should handle registration validation errors', async ({ page }) => {
    await page.goto('/register');

    // Try to submit empty form
    await page.click('[data-testid="register-button"]');

    // Verify validation messages
    await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-error"]')).toBeVisible();

    // Try invalid email
    await page.fill('[data-testid="email-input"]', 'invalid-email');
    await page.click('[data-testid="register-button"]');
    await expect(page.locator('[data-testid="email-error"]')).toContainText('valid email');

    // Try weak password
    await page.fill('[data-testid="password-input"]', '123');
    await page.click('[data-testid="register-button"]');
    await expect(page.locator('[data-testid="password-error"]')).toContainText('strong');
  });

  test('should prevent duplicate email registration', async ({ page }) => {
    // First registration
    const userData = TestUtils.generateUser();
    await page.goto('/register');
    await page.fill('[data-testid="email-input"]', userData.email);
    await page.fill('[data-testid="password-input"]', userData.password);
    await page.fill('[data-testid="confirm-password-input"]', userData.password);
    await page.click('[data-testid="register-button"]');
    await expect(page).toHaveURL('/dashboard');

    // Logout
    await page.click('[data-testid="logout-button"]');

    // Try to register with same email
    await page.goto('/register');
    await page.fill('[data-testid="email-input"]', userData.email);
    await page.fill('[data-testid="password-input"]', 'DifferentPassword123!');
    await page.fill('[data-testid="confirm-password-input"]', 'DifferentPassword123!');
    await page.click('[data-testid="register-button"]');

    // Verify error message
    await expect(page.locator('[data-testid="error-message"]')).toContainText('already exists');
  });
});

test.describe('Authentication Flow', () => {
  test('should complete login to logout flow', async ({ page }) => {
    // Create test user first
    const userData = TestUtils.generateUser();
    await TestUtils.createTestUser(userData);

    // Navigate to login
    await page.goto('/login');

    // Login
    await page.fill('[data-testid="email-input"]', userData.email);
    await page.fill('[data-testid="password-input"]', userData.password);
    await page.click('[data-testid="login-button"]');

    // Verify dashboard access
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('[data-testid="user-menu"]')).toContainText(userData.email);

    // Logout
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');

    // Verify redirect to home
    await expect(page).toHaveURL('/');

    // Verify cannot access protected routes
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/login');
  });

  test('should handle login failures', async ({ page }) => {
    await page.goto('/login');

    // Wrong password
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'wrongpassword');
    await page.click('[data-testid="login-button"]');

    await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid credentials');

    // Non-existent user
    await page.fill('[data-testid="email-input"]', 'nonexistent@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');

    await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid credentials');
  });

  test('should handle password reset flow', async ({ page }) => {
    await page.goto('/forgot-password');

    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.click('[data-testid="reset-button"]');

    // Verify success message (even for non-existent emails for security)
    await expect(page.locator('[data-testid="success-message"]')).toContainText('reset');
  });
});

test.describe('Content Creation and Management Flow', () => {
  test('should complete content creation workflow', async ({ page, context }) => {
    // Login as creator
    const creatorData = TestUtils.generateUser({ role: 'creator' });
    await TestUtils.createTestUser(creatorData);

    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', creatorData.email);
    await page.fill('[data-testid="password-input"]', creatorData.password);
    await page.click('[data-testid="login-button"]');

    // Navigate to content creation
    await page.click('[data-testid="create-content-button"]');

    // Fill content form
    const contentData = TestUtils.generateContent();
    await page.fill('[data-testid="title-input"]', contentData.title);
    await page.fill('[data-testid="description-input"]', contentData.description);
    await page.selectOption('[data-testid="content-type-select"]', contentData.contentType);
    await page.fill('[data-testid="price-input"]', contentData.price.toString());
    await page.selectOption('[data-testid="access-type-select"]', contentData.accessType);

    // Upload file
    await page.setInputFiles('[data-testid="file-upload"]', {
      name: 'test-video.mp4',
      mimeType: 'video/mp4',
      buffer: Buffer.from('fake video content')
    });

    // Submit
    await page.click('[data-testid="publish-button"]');

    // Verify content published
    await expect(page.locator('[data-testid="success-message"]')).toContainText('published');

    // Verify content appears in creator's dashboard
    await page.goto('/dashboard/creator');
    await expect(page.locator('[data-testid="content-list"]')).toContainText(contentData.title);
  });

  test('should handle content editing', async ({ page }) => {
    // Login and create content first
    const creatorData = TestUtils.generateUser({ role: 'creator' });
    await TestUtils.createTestUser(creatorData);
    const contentData = await TestUtils.createTestContent(creatorData._id);

    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', creatorData.email);
    await page.fill('[data-testid="password-input"]', creatorData.password);
    await page.click('[data-testid="login-button"]');

    // Navigate to content management
    await page.goto('/dashboard/creator/content');

    // Click edit on first content
    await page.click('[data-testid="edit-content-button"]:first-child');

    // Update content
    const newTitle = 'Updated Title';
    await page.fill('[data-testid="title-input"]', newTitle);
    await page.click('[data-testid="save-button"]');

    // Verify update
    await expect(page.locator('[data-testid="success-message"]')).toContainText('updated');
    await expect(page.locator('[data-testid="content-title"]')).toContainText(newTitle);
  });
});

test.describe('Content Consumption Flow', () => {
  test('should complete content purchase and access flow', async ({ page }) => {
    // Setup: creator and content
    const creatorData = TestUtils.generateUser({ role: 'creator' });
    await TestUtils.createTestUser(creatorData);
    const contentData = await TestUtils.createTestContent(creatorData._id, { accessType: 'paid', price: 10 });

    // Setup: consumer
    const consumerData = TestUtils.generateUser({ role: 'consumer' });
    await TestUtils.createTestUser(consumerData);

    // Consumer login
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', consumerData.email);
    await page.fill('[data-testid="password-input"]', consumerData.password);
    await page.click('[data-testid="login-button"]');

    // Browse content
    await page.goto('/content');
    await expect(page.locator('[data-testid="content-card"]')).toContainText(contentData.title);

    // Click on content
    await page.click(`[data-testid="content-card"]:has-text("${contentData.title}")`);

    // Verify paywall
    await expect(page.locator('[data-testid="purchase-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="content-preview"]')).toBeVisible();

    // Purchase content
    await page.click('[data-testid="purchase-button"]');

    // Complete payment flow (mocked)
    await page.fill('[data-testid="payment-amount"]', contentData.price.toString());
    await page.click('[data-testid="confirm-payment-button"]');

    // Verify access granted
    await expect(page.locator('[data-testid="content-full"]')).toBeVisible();
    await expect(page.locator('[data-testid="purchase-button"]')).toBeHidden();
  });

  test('should handle subscription-based content access', async ({ page }) => {
    // Setup: creator with subscription
    const creatorData = TestUtils.generateUser({ role: 'creator' });
    await TestUtils.createTestUser(creatorData);
    const subscriptionData = await TestUtils.createTestSubscription(creatorData._id);
    const contentData = await TestUtils.createTestContent(creatorData._id, {
      accessType: 'subscription',
      subscriptionRequired: subscriptionData._id
    });

    // Setup: consumer
    const consumerData = TestUtils.generateUser({ role: 'consumer' });
    await TestUtils.createTestUser(consumerData);

    // Consumer login and subscribe
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', consumerData.email);
    await page.fill('[data-testid="password-input"]', consumerData.password);
    await page.click('[data-testid="login-button"]');

    // Subscribe to creator
    await page.goto(`/creator/${creatorData._id}`);
    await page.click('[data-testid="subscribe-button"]');

    // Complete subscription payment
    await page.fill('[data-testid="subscription-price"]', subscriptionData.price.toString());
    await page.click('[data-testid="confirm-subscription-button"]');

    // Now access subscription content
    await page.goto(`/content/${contentData._id}`);
    await expect(page.locator('[data-testid="content-full"]')).toBeVisible();
  });
});

test.describe('Admin Panel Flow', () => {
  test('should complete admin content moderation workflow', async ({ page }) => {
    // Setup: admin user
    const adminData = TestUtils.generateUser({ role: 'admin' });
    await TestUtils.createTestUser(adminData);

    // Setup: content requiring moderation
    const creatorData = TestUtils.generateUser({ role: 'creator' });
    await TestUtils.createTestUser(creatorData);
    const contentData = await TestUtils.createTestContent(creatorData._id, { status: 'pending' });

    // Admin login
    await page.goto('/admin/login');
    await page.fill('[data-testid="email-input"]', adminData.email);
    await page.fill('[data-testid="password-input"]', adminData.password);
    await page.click('[data-testid="login-button"]');

    // Navigate to moderation queue
    await page.click('[data-testid="moderation-queue-link"]');

    // Review content
    await expect(page.locator('[data-testid="pending-content"]')).toContainText(contentData.title);

    // Approve content
    await page.click('[data-testid="approve-button"]');

    // Verify content approved
    await expect(page.locator('[data-testid="success-message"]')).toContainText('approved');
    await expect(page.locator('[data-testid="pending-content"]')).not.toContainText(contentData.title);
  });

  test('should handle user management', async ({ page }) => {
    // Setup: admin and test user
    const adminData = TestUtils.generateUser({ role: 'admin' });
    await TestUtils.createTestUser(adminData);
    const testUser = TestUtils.generateUser();
    await TestUtils.createTestUser(testUser);

    // Admin login
    await page.goto('/admin/login');
    await page.fill('[data-testid="email-input"]', adminData.email);
    await page.fill('[data-testid="password-input"]', adminData.password);
    await page.click('[data-testid="login-button"]');

    // Navigate to user management
    await page.click('[data-testid="user-management-link"]');

    // Search for user
    await page.fill('[data-testid="user-search"]', testUser.email);
    await page.click('[data-testid="search-button"]');

    // Verify user found
    await expect(page.locator('[data-testid="user-list"]')).toContainText(testUser.email);

    // View user details
    await page.click(`[data-testid="user-row"]:has-text("${testUser.email}")`);

    // Verify user details page
    await expect(page.locator('[data-testid="user-email"]')).toContainText(testUser.email);
    await expect(page.locator('[data-testid="user-role"]')).toContainText(testUser.role);
  });
});

test.describe('Error Handling and Edge Cases', () => {
  test('should handle network errors gracefully', async ({ page }) => {
    // Simulate network failure
    await page.route('**/api/**', route => route.abort());

    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');

    // Verify error handling
    await expect(page.locator('[data-testid="error-message"]')).toContainText('network');
  });

  test('should handle session timeout', async ({ page }) => {
    // Login first
    const userData = TestUtils.generateUser();
    await TestUtils.createTestUser(userData);

    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', userData.email);
    await page.fill('[data-testid="password-input"]', userData.password);
    await page.click('[data-testid="login-button"]');

    // Simulate session timeout (would need to mock token expiry)
    // For now, just verify logout works
    await page.click('[data-testid="logout-button"]');
    await expect(page).toHaveURL('/');
  });

  test('should handle browser back/forward navigation', async ({ page }) => {
    const userData = TestUtils.generateUser();
    await TestUtils.createTestUser(userData);

    // Login flow
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', userData.email);
    await page.fill('[data-testid="password-input"]', userData.password);
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL('/dashboard');

    // Navigate away and back
    await page.goto('/profile');
    await page.goBack();
    await expect(page).toHaveURL('/dashboard');

    // Forward navigation
    await page.goForward();
    await expect(page).toHaveURL('/profile');
  });
});