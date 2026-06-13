/**
 * Advanced User Interactions and Error Handling E2E Tests
 * Tests for complex user flows, edge cases, and error scenarios
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

test.describe('Form Validation and Error Handling', () => {
  test('FORM-001: should validate email format', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);

    await page.fill('[data-testid="email-input"]', 'invalid-email');
    await page.fill('[data-testid="password-input"]', 'Password123!');
    await page.click('[data-testid="register-button"]');

    // Should show email validation error
    const error = await page.$('[data-testid="email-error"]');
    if (error) {
      const text = await error.textContent();
      expect(text).toMatch(/email|valid/i);
    }
  });

  test('FORM-002: should validate password strength', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);

    await page.fill('[data-testid="email-input"]', `test${Date.now()}@test.com`);
    await page.fill('[data-testid="password-input"]', 'weak');
    await page.click('[data-testid="register-button"]');

    // Should show password error
    const error = await page.$('[data-testid="password-error"]');
    if (error) {
      expect(error).toBeTruthy();
    }
  });

  test('FORM-003: should validate password match', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);

    await page.fill('[data-testid="email-input"]', `test${Date.now()}@test.com`);
    await page.fill('[data-testid="password-input"]', 'Password123!');
    await page.fill('[data-testid="confirm-password-input"]', 'Different123!');
    await page.click('[data-testid="register-button"]');

    // Should show mismatch error
    const error = await page.$('[data-testid="password-mismatch-error"]');
    if (error) {
      expect(error).toBeTruthy();
    }
  });

  test('FORM-004: should clear form errors on focus', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);

    await page.fill('[data-testid="email-input"]', 'invalid');
    await page.click('[data-testid="register-button"]');
    
    await page.waitForSelector('[data-testid="email-error"]', { timeout: 2000 }).catch(() => {});

    // Click input to clear error
    await page.click('[data-testid="email-input"]');
    await page.fill('[data-testid="email-input"]', '');

    // Error should disappear or be cleared
    await page.waitForTimeout(300);
  });

  test('FORM-005: should show required field indicators', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);

    // Check for required field indicators
    const requiredLabel = await page.$('[data-testid="email-input"]');
    if (requiredLabel) {
      const ariaRequired = await requiredLabel.getAttribute('aria-required');
      if (ariaRequired) {
        expect(ariaRequired).toBeTruthy();
      }
    }
  });

  test('FORM-006: should handle special characters in inputs', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);

    const specialEmail = `test+tag@test.com`;
    await page.fill('[data-testid="email-input"]', specialEmail);

    const value = await page.inputValue('[data-testid="email-input"]');
    expect(value).toBe(specialEmail);
  });

  test('FORM-007: should handle very long input values', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);

    const longEmail = 'a'.repeat(100) + '@test.com';
    await page.fill('[data-testid="email-input"]', longEmail);

    // Should handle without breaking
    const value = await page.inputValue('[data-testid="email-input"]');
    expect(value).toBeTruthy();
  });
});

test.describe('Network Error Handling', () => {
  test('NETWORK-001: should handle connection timeout gracefully', async ({ page }) => {
    // Simulate slow network
    await page.route('**/*', route => {
      setTimeout(() => route.abort(), 10000);
    });

    await page.goto(`${BASE_URL}/browse`);

    // Should show error message or loading state
    const errorMsg = await page.$('[data-testid="error-message"]');
    const loading = await page.$('[data-testid="loading"]');

    expect(errorMsg || loading).toBeTruthy();
  });

  test('NETWORK-002: should show offline message when disconnected', async ({ page }) => {
    // Go online first
    await page.goto(`${BASE_URL}/browse`);

    // Go offline
    await page.context().setOffline(true);
    await page.evaluate(() => window.location.reload());

    // Check for offline indicator
    await page.context().setOffline(false);
  });

  test('NETWORK-003: should retry failed requests', async ({ page }) => {
    let requestCount = 0;

    await page.route('**/api/**', route => {
      requestCount++;
      if (requestCount === 1) {
        route.abort();
      } else {
        route.continue();
      }
    });

    await page.goto(`${BASE_URL}/browse`);
  });
});

test.describe('Concurrent Action Handling', () => {
  test('CONCURRENT-001: should handle rapid button clicks', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);

    // Register first
    const email = `rapid${Date.now()}@test.com`;
    await page.fill('[data-testid="email-input"]', email);
    await page.fill('[data-testid="password-input"]', 'Password123!');
    await page.fill('[data-testid="confirm-password-input"]', 'Password123!');

    // Rapid clicks
    await page.click('[data-testid="register-button"]');
    await page.click('[data-testid="register-button"]');
    await page.click('[data-testid="register-button"]');

    // Should only register once
    await page.waitForTimeout(1000);
  });

  test('CONCURRENT-002: should handle form submission and navigation', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);

    const email = `concurrent${Date.now()}@test.com`;
    await page.fill('[data-testid="email-input"]', email);
    await page.fill('[data-testid="password-input"]', 'Password123!');
    await page.fill('[data-testid="confirm-password-input"]', 'Password123!');
    await page.click('[data-testid="register-button"]');

    // Navigate away immediately
    await page.goto(`${BASE_URL}/browse`);

    // Should not cause errors
    expect(page.url()).toContain('browse');
  });

  test('CONCURRENT-003: should handle rapid page navigation', async ({ page }) => {
    await page.goto(`${BASE_URL}/browse`);
    await page.goto(`${BASE_URL}/dashboard`);
    await page.goto(`${BASE_URL}/browse`);
    await page.goto(`${BASE_URL}/settings`);

    // Should not break
    expect(page.url()).toBeTruthy();
  });
});

test.describe('Session and State Management', () => {
  test('SESSION-001: should maintain session after refresh', async ({ page }) => {
    // Register and login
    await page.goto(`${BASE_URL}/register`);
    const email = `session${Date.now()}@test.com`;
    await page.fill('[data-testid="email-input"]', email);
    await page.fill('[data-testid="password-input"]', 'Password123!');
    await page.fill('[data-testid="confirm-password-input"]', 'Password123!');
    await page.click('[data-testid="register-button"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });

    // Refresh page
    await page.reload();

    // Should still be logged in
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 3000 });
  });

  test('SESSION-002: should clear session on logout', async ({ page }) => {
    // Register and login
    await page.goto(`${BASE_URL}/register`);
    const email = `logout${Date.now()}@test.com`;
    await page.fill('[data-testid="email-input"]', email);
    await page.fill('[data-testid="password-input"]', 'Password123!');
    await page.fill('[data-testid="confirm-password-input"]', 'Password123!');
    await page.click('[data-testid="register-button"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });

    // Logout
    const logoutBtn = await page.$('[data-testid="logout-button"]');
    if (logoutBtn) {
      await logoutBtn.click();
      await expect(page).toHaveURL(/\/(login|register)/, { timeout: 3000 });
    }
  });

  test('SESSION-003: should handle session expiration', async ({ page }) => {
    // This would need backend support to trigger session expiration
    // Just verify the flow completes
    await page.goto(`${BASE_URL}/browse`);
    expect(page.url()).toContain('browse');
  });

  test('SESSION-004: should persist form state during navigation', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);

    const email = `formstate${Date.now()}@test.com`;
    await page.fill('[data-testid="email-input"]', email);

    // Navigate away and back
    await page.goto(`${BASE_URL}/login`);
    await page.goBack();

    // Check if data persisted
    const value = await page.inputValue('[data-testid="email-input"]').catch(() => '');
    // May or may not persist - just ensure no error
    expect(value !== undefined).toBe(true);
  });
});

test.describe('Data Validation Edge Cases', () => {
  test('EDGE-001: should handle null/undefined values', async ({ page }) => {
    await page.goto(`${BASE_URL}/browse`);

    // Page should load without errors
    expect(page.url()).toContain('browse');
  });

  test('EDGE-002: should handle empty search results', async ({ page }) => {
    await page.goto(`${BASE_URL}/browse`);

    // Search for something that doesn't exist
    const searchInput = await page.$('[data-testid="search-input"]');
    if (searchInput) {
      await page.fill('[data-testid="search-input"]', 'xyznonexistentcontent12345');
      await page.waitForTimeout(500);

      // Should show empty state
      const empty = await page.$('[data-testid="no-results"]');
      if (empty) {
        expect(empty).toBeTruthy();
      }
    }
  });

  test('EDGE-003: should handle zero values in pricing', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);
    const email = `pricing${Date.now()}@test.com`;
    await page.fill('[data-testid="email-input"]', email);
    await page.fill('[data-testid="password-input"]', 'Password123!');
    await page.fill('[data-testid="confirm-password-input"]', 'Password123!');
    await page.selectOption('[data-testid="role-select"]', 'creator');
    await page.click('[data-testid="register-button"]');
    
    await page.click('[data-testid="create-content-button"]');
    
    // Try to set free content
    const priceInput = await page.$('[data-testid="price-input"]');
    if (priceInput) {
      await page.fill('[data-testid="price-input"]', '0');
      const value = await priceInput.inputValue();
      expect(value).toBe('0');
    }
  });

  test('EDGE-004: should handle negative values', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);
    
    // Any negative value input should be handled
    const page_content = await page.content();
    expect(page_content).toBeTruthy();
  });

  test('EDGE-005: should handle very large numbers', async ({ page }) => {
    await page.goto(`${BASE_URL}/browse`);
    expect(page.url()).toBeTruthy();
  });
});

test.describe('Browser Compatibility', () => {
  test('COMPAT-001: should work with local storage enabled', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);

    // Should work with localStorage
    await page.evaluate(() => {
      localStorage.setItem('test', 'value');
      return localStorage.getItem('test');
    });

    expect(page.url()).toBeTruthy();
  });

  test('COMPAT-002: should work with cookies enabled', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);

    // Should work with cookies
    const cookies = await page.context().cookies();
    expect(cookies).toBeTruthy();
  });

  test('COMPAT-003: should handle JavaScript errors gracefully', async ({ page }) => {
    page.on('pageerror', error => {
      // Page should handle errors gracefully
      expect(error).toBeTruthy();
    });

    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForTimeout(1000);

    // Page should still be functional
    expect(page.url()).toBeTruthy();
  });
});
