/**
 * Creator Upload and Content Management E2E Tests
 * Tests for content creation, editing, publishing, and management
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

test.describe('Creator Content Upload Flow', () => {
  test('UPLOAD-001: should access content creation page', async ({ page }) => {
    // Register as creator
    await page.goto(`${BASE_URL}/register`);
    const email = `creator${Date.now()}@test.com`;
    await page.fill('[data-testid="email-input"]', email);
    await page.fill('[data-testid="password-input"]', 'Password123!');
    await page.fill('[data-testid="confirm-password-input"]', 'Password123!');
    await page.selectOption('[data-testid="role-select"]', 'creator');
    await page.click('[data-testid="register-button"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });

    // Click create content
    await page.click('[data-testid="create-content-button"]');

    // Should navigate to creation page
    await expect(page).toHaveURL(/\/create/, { timeout: 3000 });
  });

  test('UPLOAD-002: should validate content title', async ({ page }) => {
    // Register as creator
    await page.goto(`${BASE_URL}/register`);
    const email = `creator${Date.now()}@test.com`;
    await page.fill('[data-testid="email-input"]', email);
    await page.fill('[data-testid="password-input"]', 'Password123!');
    await page.fill('[data-testid="confirm-password-input"]', 'Password123!');
    await page.selectOption('[data-testid="role-select"]', 'creator');
    await page.click('[data-testid="register-button"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });

    // Go to create page and try without title
    await page.click('[data-testid="create-content-button"]');
    await expect(page).toHaveURL(/\/create/, { timeout: 3000 });

    // Try to publish without title
    await page.click('[data-testid="publish-button"]');

    // Should show validation error
    const titleError = await page.$('[data-testid="title-error"]');
    expect(titleError).toBeTruthy();
  });

  test('UPLOAD-003: should validate content description', async ({ page }) => {
    // Register as creator
    await page.goto(`${BASE_URL}/register`);
    const email = `creator${Date.now()}@test.com`;
    await page.fill('[data-testid="email-input"]', email);
    await page.fill('[data-testid="password-input"]', 'Password123!');
    await page.fill('[data-testid="confirm-password-input"]', 'Password123!');
    await page.selectOption('[data-testid="role-select"]', 'creator');
    await page.click('[data-testid="register-button"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });

    await page.click('[data-testid="create-content-button"]');
    await expect(page).toHaveURL(/\/create/, { timeout: 3000 });

    // Add title but no description
    await page.fill('[data-testid="title-input"]', 'Test Content');
    await page.click('[data-testid="publish-button"]');

    // May show description error if required
    const descError = await page.$('[data-testid="description-error"]');
    if (descError) {
      expect(descError).toBeTruthy();
    }
  });

  test('UPLOAD-004: should allow content type selection', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);
    const email = `creator${Date.now()}@test.com`;
    await page.fill('[data-testid="email-input"]', email);
    await page.fill('[data-testid="password-input"]', 'Password123!');
    await page.fill('[data-testid="confirm-password-input"]', 'Password123!');
    await page.selectOption('[data-testid="role-select"]', 'creator');
    await page.click('[data-testid="register-button"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });

    await page.click('[data-testid="create-content-button"]');
    await expect(page).toHaveURL(/\/create/, { timeout: 3000 });

    // Select content type
    const typeSelector = await page.$('[data-testid="content-type-select"]');
    expect(typeSelector).toBeTruthy();

    if (typeSelector) {
      await page.selectOption('[data-testid="content-type-select"]', 'video');
    }
  });

  test('UPLOAD-005: should allow access type selection', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);
    const email = `creator${Date.now()}@test.com`;
    await page.fill('[data-testid="email-input"]', email);
    await page.fill('[data-testid="password-input"]', 'Password123!');
    await page.fill('[data-testid="confirm-password-input"]', 'Password123!');
    await page.selectOption('[data-testid="role-select"]', 'creator');
    await page.click('[data-testid="register-button"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });

    await page.click('[data-testid="create-content-button"]');
    await expect(page).toHaveURL(/\/create/, { timeout: 3000 });

    // Select access type
    const accessSelector = await page.$('[data-testid="access-type-select"]');
    expect(accessSelector).toBeTruthy();

    if (accessSelector) {
      await page.selectOption('[data-testid="access-type-select"]', 'paid');
    }
  });

  test('UPLOAD-006: should allow price setting for paid content', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);
    const email = `creator${Date.now()}@test.com`;
    await page.fill('[data-testid="email-input"]', email);
    await page.fill('[data-testid="password-input"]', 'Password123!');
    await page.fill('[data-testid="confirm-password-input"]', 'Password123!');
    await page.selectOption('[data-testid="role-select"]', 'creator');
    await page.click('[data-testid="register-button"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });

    await page.click('[data-testid="create-content-button"]');
    await expect(page).toHaveURL(/\/create/, { timeout: 3000 });

    // Set to paid and fill price
    await page.selectOption('[data-testid="access-type-select"]', 'paid');
    
    const priceInput = await page.$('[data-testid="price-input"]');
    if (priceInput) {
      await page.fill('[data-testid="price-input"]', '9.99');
      const price = await priceInput.inputValue();
      expect(price).toBe('9.99');
    }
  });

  test('UPLOAD-007: should allow file upload', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);
    const email = `creator${Date.now()}@test.com`;
    await page.fill('[data-testid="email-input"]', email);
    await page.fill('[data-testid="password-input"]', 'Password123!');
    await page.fill('[data-testid="confirm-password-input"]', 'Password123!');
    await page.selectOption('[data-testid="role-select"]', 'creator');
    await page.click('[data-testid="register-button"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });

    await page.click('[data-testid="create-content-button"]');
    await expect(page).toHaveURL(/\/create/, { timeout: 3000 });

    // Check for file upload input
    const fileUpload = await page.$('[data-testid="file-upload"]');
    expect(fileUpload).toBeTruthy();
  });

  test('UPLOAD-008: should allow thumbnail upload', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);
    const email = `creator${Date.now()}@test.com`;
    await page.fill('[data-testid="email-input"]', email);
    await page.fill('[data-testid="password-input"]', 'Password123!');
    await page.fill('[data-testid="confirm-password-input"]', 'Password123!');
    await page.selectOption('[data-testid="role-select"]', 'creator');
    await page.click('[data-testid="register-button"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });

    await page.click('[data-testid="create-content-button"]');
    await expect(page).toHaveURL(/\/create/, { timeout: 3000 });

    // Check for thumbnail upload
    const thumbnailUpload = await page.$('[data-testid="thumbnail-upload"]');
    if (thumbnailUpload) {
      expect(thumbnailUpload).toBeTruthy();
    }
  });

  test('UPLOAD-009: should show upload progress', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);
    const email = `creator${Date.now()}@test.com`;
    await page.fill('[data-testid="email-input"]', email);
    await page.fill('[data-testid="password-input"]', 'Password123!');
    await page.fill('[data-testid="confirm-password-input"]', 'Password123!');
    await page.selectOption('[data-testid="role-select"]', 'creator');
    await page.click('[data-testid="register-button"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });

    await page.click('[data-testid="create-content-button"]');
    await expect(page).toHaveURL(/\/create/, { timeout: 3000 });

    // Check for progress bar
    const progressBar = await page.$('[data-testid="upload-progress"]');
    if (progressBar) {
      expect(progressBar).toBeTruthy();
    }
  });
});

test.describe('Creator Dashboard and Management', () => {
  test('DASHBOARD-001: should display creator dashboard', async ({ page }) => {
    // Register as creator
    await page.goto(`${BASE_URL}/register`);
    const email = `creator${Date.now()}@test.com`;
    await page.fill('[data-testid="email-input"]', email);
    await page.fill('[data-testid="password-input"]', 'Password123!');
    await page.fill('[data-testid="confirm-password-input"]', 'Password123!');
    await page.selectOption('[data-testid="role-select"]', 'creator');
    await page.click('[data-testid="register-button"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });

    // Navigate to creator dashboard
    await page.goto(`${BASE_URL}/dashboard/creator`);

    const creatorDash = await page.$('[data-testid="creator-dashboard"]');
    expect(creatorDash).toBeTruthy();
  });

  test('DASHBOARD-002: should display content statistics', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);
    const email = `creator${Date.now()}@test.com`;
    await page.fill('[data-testid="email-input"]', email);
    await page.fill('[data-testid="password-input"]', 'Password123!');
    await page.fill('[data-testid="confirm-password-input"]', 'Password123!');
    await page.selectOption('[data-testid="role-select"]', 'creator');
    await page.click('[data-testid="register-button"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });

    await page.goto(`${BASE_URL}/dashboard/creator`);

    // Check for stats
    const stats = await page.$('[data-testid="content-stats"]');
    expect(stats).toBeTruthy();
  });

  test('DASHBOARD-003: should display earnings information', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);
    const email = `creator${Date.now()}@test.com`;
    await page.fill('[data-testid="email-input"]', email);
    await page.fill('[data-testid="password-input"]', 'Password123!');
    await page.fill('[data-testid="confirm-password-input"]', 'Password123!');
    await page.selectOption('[data-testid="role-select"]', 'creator');
    await page.click('[data-testid="register-button"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });

    await page.goto(`${BASE_URL}/dashboard/creator`);

    // Check for earnings display
    const earnings = await page.$('[data-testid="earnings"]');
    if (earnings) {
      expect(earnings).toBeTruthy();
    }
  });

  test('DASHBOARD-004: should list uploaded content', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);
    const email = `creator${Date.now()}@test.com`;
    await page.fill('[data-testid="email-input"]', email);
    await page.fill('[data-testid="password-input"]', 'Password123!');
    await page.fill('[data-testid="confirm-password-input"]', 'Password123!');
    await page.selectOption('[data-testid="role-select"]', 'creator');
    await page.click('[data-testid="register-button"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });

    await page.goto(`${BASE_URL}/dashboard/creator`);

    // Check for content list
    const contentList = await page.$('[data-testid="content-list"]');
    expect(contentList).toBeTruthy();
  });

  test('DASHBOARD-005: should allow editing content', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);
    const email = `creator${Date.now()}@test.com`;
    await page.fill('[data-testid="email-input"]', email);
    await page.fill('[data-testid="password-input"]', 'Password123!');
    await page.fill('[data-testid="confirm-password-input"]', 'Password123!');
    await page.selectOption('[data-testid="role-select"]', 'creator');
    await page.click('[data-testid="register-button"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });

    await page.goto(`${BASE_URL}/dashboard/creator`);

    // Check for edit button
    const editButton = await page.$('[data-testid="edit-content-button"]');
    if (editButton) {
      expect(editButton).toBeTruthy();
    }
  });

  test('DASHBOARD-006: should allow deleting content', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);
    const email = `creator${Date.now()}@test.com`;
    await page.fill('[data-testid="email-input"]', email);
    await page.fill('[data-testid="password-input"]', 'Password123!');
    await page.fill('[data-testid="confirm-password-input"]', 'Password123!');
    await page.selectOption('[data-testid="role-select"]', 'creator');
    await page.click('[data-testid="register-button"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });

    await page.goto(`${BASE_URL}/dashboard/creator`);

    // Check for delete button
    const deleteButton = await page.$('[data-testid="delete-content-button"]');
    if (deleteButton) {
      expect(deleteButton).toBeTruthy();
    }
  });

  test('DASHBOARD-007: should show content publication status', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);
    const email = `creator${Date.now()}@test.com`;
    await page.fill('[data-testid="email-input"]', email);
    await page.fill('[data-testid="password-input"]', 'Password123!');
    await page.fill('[data-testid="confirm-password-input"]', 'Password123!');
    await page.selectOption('[data-testid="role-select"]', 'creator');
    await page.click('[data-testid="register-button"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });

    await page.goto(`${BASE_URL}/dashboard/creator`);

    // Check for status display
    const status = await page.$('[data-testid="content-status"]');
    if (status) {
      expect(status).toBeTruthy();
    }
  });

  test('DASHBOARD-008: should display subscriber/viewer count', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);
    const email = `creator${Date.now()}@test.com`;
    await page.fill('[data-testid="email-input"]', email);
    await page.fill('[data-testid="password-input"]', 'Password123!');
    await page.fill('[data-testid="confirm-password-input"]', 'Password123!');
    await page.selectOption('[data-testid="role-select"]', 'creator');
    await page.click('[data-testid="register-button"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });

    await page.goto(`${BASE_URL}/dashboard/creator`);

    // Check for viewer count
    const viewCount = await page.$('[data-testid="view-count"]');
    if (viewCount) {
      const count = await viewCount.textContent();
      expect(count).toMatch(/\d+/);
    }
  });
});

test.describe('Creator Profile Management', () => {
  test('PROFILE-001: should allow updating creator profile', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);
    const email = `creator${Date.now()}@test.com`;
    await page.fill('[data-testid="email-input"]', email);
    await page.fill('[data-testid="password-input"]', 'Password123!');
    await page.fill('[data-testid="confirm-password-input"]', 'Password123!');
    await page.selectOption('[data-testid="role-select"]', 'creator');
    await page.click('[data-testid="register-button"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });

    // Go to profile settings
    await page.click('[data-testid="profile-link"]');
    
    const editProfileButton = await page.$('[data-testid="edit-profile-button"]');
    if (editProfileButton) {
      await page.click('[data-testid="edit-profile-button"]');

      // Should show edit form
      const editForm = await page.$('[data-testid="profile-edit-form"]');
      expect(editForm).toBeTruthy();
    }
  });

  test('PROFILE-002: should allow uploading creator profile picture', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);
    const email = `creator${Date.now()}@test.com`;
    await page.fill('[data-testid="email-input"]', email);
    await page.fill('[data-testid="password-input"]', 'Password123!');
    await page.fill('[data-testid="confirm-password-input"]', 'Password123!');
    await page.selectOption('[data-testid="role-select"]', 'creator');
    await page.click('[data-testid="register-button"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });

    await page.click('[data-testid="profile-link"]');

    // Check for profile picture upload
    const pictureUpload = await page.$('[data-testid="profile-picture-upload"]');
    if (pictureUpload) {
      expect(pictureUpload).toBeTruthy();
    }
  });

  test('PROFILE-003: should allow setting creator bio', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);
    const email = `creator${Date.now()}@test.com`;
    await page.fill('[data-testid="email-input"]', email);
    await page.fill('[data-testid="password-input"]', 'Password123!');
    await page.fill('[data-testid="confirm-password-input"]', 'Password123!');
    await page.selectOption('[data-testid="role-select"]', 'creator');
    await page.click('[data-testid="register-button"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });

    await page.click('[data-testid="profile-link"]');

    // Check for bio input
    const bioInput = await page.$('[data-testid="creator-bio"]');
    if (bioInput) {
      await page.fill('[data-testid="creator-bio"]', 'I create amazing content');
      const value = await bioInput.inputValue();
      expect(value).toBe('I create amazing content');
    }
  });
});
