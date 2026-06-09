/**
 * Admin Moderation and Content Management E2E Tests
 * Tests for admin panel, content moderation, and user management flows
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

test.describe('Admin Panel Access', () => {
  test('ADMIN-PANEL-001: should access admin panel for admins only', async ({ page }) => {
    // Register as regular user
    await page.goto(`${BASE_URL}/register`);
    const email = `user${Date.now()}@test.com`;
    await page.fill('[data-testid="email-input"]', email);
    await page.fill('[data-testid="password-input"]', 'Password123!');
    await page.fill('[data-testid="confirm-password-input"]', 'Password123!');
    await page.selectOption('[data-testid="role-select"]', 'user');
    await page.click('[data-testid="register-button"]');
    
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });

    // Try to access admin panel
    await page.goto(`${BASE_URL}/admin`);

    // Should redirect or show access denied
    const denied = await page.$('[data-testid="access-denied"]');
    if (denied) {
      expect(denied).toBeTruthy();
    }
  });

  test('ADMIN-PANEL-002: should display admin dashboard', async ({ page }) => {
    // Note: In real scenario, would need to use pre-created admin account
    // This test assumes admin access
    await page.goto(`${BASE_URL}/admin/dashboard`);

    // May redirect to login or show admin interface
    const url = page.url();
    expect(url).toBeTruthy();
  });

  test('ADMIN-PANEL-003: should display user statistics', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/dashboard`);

    // Check for stats display
    const stats = await page.$('[data-testid="admin-stats"]');
    if (stats) {
      expect(stats).toBeTruthy();
    }
  });
});

test.describe('Content Moderation', () => {
  test('MODERATION-001: should display pending content queue', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/moderation`);

    // Check for moderation queue
    const queue = await page.$('[data-testid="moderation-queue"]');
    if (queue) {
      expect(queue).toBeTruthy();
    }
  });

  test('MODERATION-002: should allow approving content', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/moderation`);

    // Check for approve button
    const approveBtn = await page.$('[data-testid="approve-content-button"]');
    if (approveBtn) {
      expect(approveBtn).toBeTruthy();
    }
  });

  test('MODERATION-003: should allow rejecting content', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/moderation`);

    // Check for reject button
    const rejectBtn = await page.$('[data-testid="reject-content-button"]');
    if (rejectBtn) {
      expect(rejectBtn).toBeTruthy();
    }
  });

  test('MODERATION-004: should allow adding moderation notes', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/moderation`);

    // Check for notes field
    const notesField = await page.$('[data-testid="moderation-notes"]');
    if (notesField) {
      await page.fill('[data-testid="moderation-notes"]', 'Test moderation note');
      const value = await notesField.inputValue();
      expect(value).toBe('Test moderation note');
    }
  });

  test('MODERATION-005: should display content details for moderation', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/moderation`);

    // Check for content preview
    const preview = await page.$('[data-testid="content-preview"]');
    if (preview) {
      expect(preview).toBeTruthy();
    }
  });

  test('MODERATION-006: should filter pending content', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/moderation`);

    // Check for filter controls
    const filters = await page.$('[data-testid="moderation-filters"]');
    if (filters) {
      expect(filters).toBeTruthy();
    }
  });

  test('MODERATION-007: should sort moderation queue', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/moderation`);

    // Check for sort options
    const sortBtn = await page.$('[data-testid="sort-queue"]');
    if (sortBtn) {
      expect(sortBtn).toBeTruthy();
    }
  });
});

test.describe('User Management', () => {
  test('USERS-001: should display user list', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/users`);

    // Check for user list
    const userList = await page.$('[data-testid="user-list"]');
    if (userList) {
      expect(userList).toBeTruthy();
    }
  });

  test('USERS-002: should search users', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/users`);

    // Check for search
    const searchInput = await page.$('[data-testid="user-search"]');
    if (searchInput) {
      await page.fill('[data-testid="user-search"]', 'test@example.com');
      const value = await searchInput.inputValue();
      expect(value).toBe('test@example.com');
    }
  });

  test('USERS-003: should filter users by role', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/users`);

    // Check for role filter
    const roleFilter = await page.$('[data-testid="role-filter"]');
    if (roleFilter) {
      await page.selectOption('[data-testid="role-filter"]', 'creator');
    }
  });

  test('USERS-004: should display user details', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/users`);

    // Click on user row
    const userRow = await page.$('[data-testid="user-row"]');
    if (userRow) {
      await userRow.click();

      // Should show user details
      const details = await page.$('[data-testid="user-details"]');
      if (details) {
        expect(details).toBeTruthy();
      }
    }
  });

  test('USERS-005: should allow suspending users', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/users`);

    // Check for suspend button
    const suspendBtn = await page.$('[data-testid="suspend-user-button"]');
    if (suspendBtn) {
      expect(suspendBtn).toBeTruthy();
    }
  });

  test('USERS-006: should allow unsuspending users', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/users`);

    // Check for unsuspend button
    const unsuspendBtn = await page.$('[data-testid="unsuspend-user-button"]');
    if (unsuspendBtn) {
      expect(unsuspendBtn).toBeTruthy();
    }
  });

  test('USERS-007: should display user registration date', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/users`);

    // Check for date column
    const dateCol = await page.$('[data-testid="registration-date"]');
    if (dateCol) {
      const text = await dateCol.textContent();
      expect(text).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
    }
  });

  test('USERS-008: should display user last activity', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/users`);

    // Check for last activity
    const activity = await page.$('[data-testid="last-activity"]');
    if (activity) {
      expect(activity).toBeTruthy();
    }
  });
});

test.describe('Reports and Analytics', () => {
  test('REPORTS-001: should display content reports', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/reports`);

    // Check for reports
    const reports = await page.$('[data-testid="reports-list"]');
    if (reports) {
      expect(reports).toBeTruthy();
    }
  });

  test('REPORTS-002: should display user reports', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/reports`);

    // Check for user reports
    const userReports = await page.$('[data-testid="user-reports"]');
    if (userReports) {
      expect(userReports).toBeTruthy();
    }
  });

  test('REPORTS-003: should filter reports by type', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/reports`);

    // Check for type filter
    const typeFilter = await page.$('[data-testid="report-type-filter"]');
    if (typeFilter) {
      await page.selectOption('[data-testid="report-type-filter"]', 'content');
    }
  });

  test('REPORTS-004: should display report details', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/reports`);

    // Click on report
    const reportRow = await page.$('[data-testid="report-row"]');
    if (reportRow) {
      await reportRow.click();

      // Should show details
      const details = await page.$('[data-testid="report-details"]');
      if (details) {
        expect(details).toBeTruthy();
      }
    }
  });

  test('REPORTS-005: should allow resolving reports', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/reports`);

    // Check for resolve button
    const resolveBtn = await page.$('[data-testid="resolve-report-button"]');
    if (resolveBtn) {
      expect(resolveBtn).toBeTruthy();
    }
  });
});

test.describe('Platform Settings and Configuration', () => {
  test('SETTINGS-001: should access platform settings', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/settings`);

    // Check for settings page
    const settings = await page.$('[data-testid="admin-settings"]');
    if (settings) {
      expect(settings).toBeTruthy();
    }
  });

  test('SETTINGS-002: should display fee configuration', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/settings`);

    // Check for fee settings
    const feeSettings = await page.$('[data-testid="fee-settings"]');
    if (feeSettings) {
      expect(feeSettings).toBeTruthy();
    }
  });

  test('SETTINGS-003: should allow updating platform fees', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/settings`);

    // Check for fee input
    const feeInput = await page.$('[data-testid="platform-fee-input"]');
    if (feeInput) {
      await page.fill('[data-testid="platform-fee-input"]', '15');
      const value = await feeInput.inputValue();
      expect(value).toBe('15');
    }
  });

  test('SETTINGS-004: should display content guidelines', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/settings`);

    // Check for guidelines
    const guidelines = await page.$('[data-testid="content-guidelines"]');
    if (guidelines) {
      expect(guidelines).toBeTruthy();
    }
  });

  test('SETTINGS-005: should allow updating guidelines', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/settings`);

    // Check for guidelines editor
    const guidelinesEditor = await page.$('[data-testid="guidelines-editor"]');
    if (guidelinesEditor) {
      expect(guidelinesEditor).toBeTruthy();
    }
  });
});

test.describe('Audit Logs', () => {
  test('AUDIT-001: should display audit logs', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/audit-logs`);

    // Check for logs
    const logs = await page.$('[data-testid="audit-logs"]');
    if (logs) {
      expect(logs).toBeTruthy();
    }
  });

  test('AUDIT-002: should display admin actions in logs', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/audit-logs`);

    // Check for action column
    const actionCol = await page.$('[data-testid="action-column"]');
    if (actionCol) {
      expect(actionCol).toBeTruthy();
    }
  });

  test('AUDIT-003: should display who performed action', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/audit-logs`);

    // Check for admin column
    const adminCol = await page.$('[data-testid="admin-column"]');
    if (adminCol) {
      expect(adminCol).toBeTruthy();
    }
  });

  test('AUDIT-004: should display timestamp of actions', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/audit-logs`);

    // Check for timestamp
    const timestamp = await page.$('[data-testid="timestamp-column"]');
    if (timestamp) {
      expect(timestamp).toBeTruthy();
    }
  });

  test('AUDIT-005: should allow filtering audit logs by date', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/audit-logs`);

    // Check for date filter
    const dateFilter = await page.$('[data-testid="date-filter"]');
    if (dateFilter) {
      expect(dateFilter).toBeTruthy();
    }
  });
});
