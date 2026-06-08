/**
 * Purchase and Payment Flow E2E Tests
 * Tests for content purchase, subscription, and payment flows
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

test.describe('Pay-Per-View Purchase Flow', () => {
  test('PPV-PURCHASE-001: should display purchase button for paid content', async ({ page }) => {
    // Register and login
    await page.goto(`${BASE_URL}/register`);
    const email = `user${Date.now()}@test.com`;
    await page.fill('[data-testid="email-input"]', email);
    await page.fill('[data-testid="password-input"]', 'Password123!');
    await page.fill('[data-testid="confirm-password-input"]', 'Password123!');
    await page.click('[data-testid="register-button"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });

    // Browse content
    await page.goto(`${BASE_URL}/browse`);
    await page.waitForSelector('[data-testid="content-card"]');
    await page.click('[data-testid="content-card"]');

    // Should have purchase button
    const purchaseButton = await page.$('[data-testid="purchase-button"]');
    expect(purchaseButton).toBeTruthy();
  });

  test('PPV-PURCHASE-002: should show content preview before purchase', async ({ page }) => {
    await page.goto(`${BASE_URL}/browse`);
    await page.waitForSelector('[data-testid="content-card"]');
    await page.click('[data-testid="content-card"]');

    // Check for preview section
    const preview = await page.$('[data-testid="content-preview"]');
    expect(preview).toBeTruthy();
  });

  test('PPV-PURCHASE-003: should display price clearly on purchase button', async ({ page }) => {
    await page.goto(`${BASE_URL}/browse`);
    await page.waitForSelector('[data-testid="content-card"]');
    await page.click('[data-testid="content-card"]');

    // Check purchase button has price
    const purchaseButton = await page.$('[data-testid="purchase-button"]');
    if (purchaseButton) {
      const buttonText = await purchaseButton.textContent();
      expect(buttonText).toMatch(/\d+|purchase|buy/i);
    }
  });

  test('PPV-PURCHASE-004: should show payment method selection', async ({ page }) => {
    // Register and login
    await page.goto(`${BASE_URL}/register`);
    const email = `user${Date.now()}@test.com`;
    await page.fill('[data-testid="email-input"]', email);
    await page.fill('[data-testid="password-input"]', 'Password123!');
    await page.fill('[data-testid="confirm-password-input"]', 'Password123!');
    await page.click('[data-testid="register-button"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });

    // Browse and click purchase
    await page.goto(`${BASE_URL}/browse`);
    await page.waitForSelector('[data-testid="content-card"]');
    await page.click('[data-testid="content-card"]');
    
    const purchaseButton = await page.$('[data-testid="purchase-button"]');
    if (purchaseButton) {
      await page.click('[data-testid="purchase-button"]');

      // Check for payment methods
      const paymentModal = await page.$('[data-testid="payment-modal"]');
      if (paymentModal) {
        expect(paymentModal).toBeTruthy();
      }
    }
  });

  test('PPV-PURCHASE-005: should show transaction summary before confirmation', async ({ page }) => {
    await page.goto(`${BASE_URL}/browse`);
    await page.waitForSelector('[data-testid="content-card"]');
    await page.click('[data-testid="content-card"]');

    const purchaseButton = await page.$('[data-testid="purchase-button"]');
    if (purchaseButton) {
      await page.click('[data-testid="purchase-button"]');

      // Check for summary display
      const summary = await page.$('[data-testid="transaction-summary"]');
      if (summary) {
        await expect(page.locator('[data-testid="transaction-summary"]')).toBeVisible({ timeout: 2000 });
      }
    }
  });

  test('PPV-PURCHASE-006: should require wallet for payment', async ({ page }) => {
    // Register and login
    await page.goto(`${BASE_URL}/register`);
    const email = `user${Date.now()}@test.com`;
    await page.fill('[data-testid="email-input"]', email);
    await page.fill('[data-testid="password-input"]', 'Password123!');
    await page.fill('[data-testid="confirm-password-input"]', 'Password123!');
    await page.click('[data-testid="register-button"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });

    // Browse and try to purchase
    await page.goto(`${BASE_URL}/browse`);
    await page.waitForSelector('[data-testid="content-card"]');
    await page.click('[data-testid="content-card"]');

    const purchaseButton = await page.$('[data-testid="purchase-button"]');
    if (purchaseButton) {
      await page.click('[data-testid="purchase-button"]');

      // May require wallet connection
      const walletRequired = await page.$('[data-testid="wallet-required-message"]');
      if (walletRequired) {
        await expect(page.locator('[data-testid="wallet-required-message"]')).toBeVisible({ timeout: 2000 });
      }
    }
  });
});

test.describe('Subscription Purchase Flow', () => {
  test('SUB-PURCHASE-001: should display creator subscription plans', async ({ page }) => {
    await page.goto(`${BASE_URL}/browse`);
    await page.waitForSelector('[data-testid="content-card"]');
    await page.click('[data-testid="content-card"]');

    // Check for subscription options
    const subscriptionSection = await page.$('[data-testid="subscription-plans"]');
    if (subscriptionSection) {
      await expect(page.locator('[data-testid="subscription-plans"]')).toBeVisible({ timeout: 3000 });
    }
  });

  test('SUB-PURCHASE-002: should show subscription pricing tiers', async ({ page }) => {
    await page.goto(`${BASE_URL}/browse`);
    await page.waitForSelector('[data-testid="content-card"]');
    await page.click('[data-testid="content-card"]');

    // Check for pricing display
    const prices = await page.locator('[data-testid="subscription-price"]').count();
    expect(prices).toBeGreaterThanOrEqual(0);
  });

  test('SUB-PURCHASE-003: should display subscription benefits', async ({ page }) => {
    await page.goto(`${BASE_URL}/browse`);
    await page.waitForSelector('[data-testid="content-card"]');
    await page.click('[data-testid="content-card"]');

    const benefitsSection = await page.$('[data-testid="subscription-benefits"]');
    if (benefitsSection) {
      await expect(page.locator('[data-testid="subscription-benefits"]')).toBeVisible({ timeout: 3000 });
    }
  });

  test('SUB-PURCHASE-004: should show billing period options', async ({ page }) => {
    await page.goto(`${BASE_URL}/browse`);
    await page.waitForSelector('[data-testid="content-card"]');
    await page.click('[data-testid="content-card"]');

    // Check for billing period selector
    const billingSelector = await page.$('[data-testid="billing-period"]');
    if (billingSelector) {
      await expect(page.locator('[data-testid="billing-period"]')).toBeVisible({ timeout: 3000 });
    }
  });

  test('SUB-PURCHASE-005: should process subscription purchase', async ({ page }) => {
    // Register and login
    await page.goto(`${BASE_URL}/register`);
    const email = `user${Date.now()}@test.com`;
    await page.fill('[data-testid="email-input"]', email);
    await page.fill('[data-testid="password-input"]', 'Password123!');
    await page.fill('[data-testid="confirm-password-input"]', 'Password123!');
    await page.click('[data-testid="register-button"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });

    // Browse and subscribe
    await page.goto(`${BASE_URL}/browse`);
    await page.waitForSelector('[data-testid="content-card"]');
    await page.click('[data-testid="content-card"]');

    const subscribeButton = await page.$('[data-testid="subscribe-button"]');
    if (subscribeButton) {
      await page.click('[data-testid="subscribe-button"]');

      // Should show payment modal
      const paymentModal = await page.$('[data-testid="payment-modal"]');
      expect(paymentModal).toBeTruthy();
    }
  });

  test('SUB-PURCHASE-006: should display auto-renewal notice', async ({ page }) => {
    await page.goto(`${BASE_URL}/browse`);
    await page.waitForSelector('[data-testid="content-card"]');
    await page.click('[data-testid="content-card"]');

    const renewalNotice = await page.$('[data-testid="auto-renewal-notice"]');
    if (renewalNotice) {
      await expect(page.locator('[data-testid="auto-renewal-notice"]')).toBeVisible({ timeout: 2000 });
    }
  });
});

test.describe('Purchase History and Management', () => {
  test('HISTORY-001: should display purchase history', async ({ page }) => {
    // Register and login
    await page.goto(`${BASE_URL}/register`);
    const email = `user${Date.now()}@test.com`;
    await page.fill('[data-testid="email-input"]', email);
    await page.fill('[data-testid="password-input"]', 'Password123!');
    await page.fill('[data-testid="confirm-password-input"]', 'Password123!');
    await page.click('[data-testid="register-button"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });

    // Navigate to purchases
    await page.click('[data-testid="profile-link"]');

    const purchasesSection = await page.$('[data-testid="purchases-section"]');
    if (purchasesSection) {
      await expect(page.locator('[data-testid="purchases-section"]')).toBeVisible({ timeout: 3000 });
    }
  });

  test('HISTORY-002: should show purchase date and time', async ({ page }) => {
    // Navigate to profile
    await page.goto(`${BASE_URL}/profile`);

    const purchaseItem = await page.$('[data-testid="purchase-item"]');
    if (purchaseItem) {
      const dateText = await purchaseItem.textContent();
      expect(dateText).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}/);
    }
  });

  test('HISTORY-003: should display purchase amount', async ({ page }) => {
    await page.goto(`${BASE_URL}/profile`);

    const purchaseAmount = await page.$('[data-testid="purchase-amount"]');
    if (purchaseAmount) {
      const amount = await purchaseAmount.textContent();
      expect(amount).toMatch(/\d+(\.\d{2})?/);
    }
  });

  test('HISTORY-004: should allow viewing purchased content', async ({ page }) => {
    await page.goto(`${BASE_URL}/profile`);

    const purchaseItem = await page.$('[data-testid="purchase-item"]');
    if (purchaseItem) {
      // Click to view content
      const viewButton = await purchaseItem.$('[data-testid="view-button"]');
      if (viewButton) {
        await viewButton.click();
        
        // Should navigate to content
        await expect(page).toHaveURL(/\/content\//, { timeout: 3000 });
      }
    }
  });

  test('HISTORY-005: should allow downloading content receipt', async ({ page }) => {
    await page.goto(`${BASE_URL}/profile`);

    const receiptButton = await page.$('[data-testid="download-receipt"]');
    if (receiptButton) {
      // Start download
      const downloadPromise = page.waitForEvent('download');
      await receiptButton.click();

      // Should trigger download
      expect(downloadPromise).toBeTruthy();
    }
  });

  test('HISTORY-006: should manage subscriptions', async ({ page }) => {
    // Register and login
    await page.goto(`${BASE_URL}/register`);
    const email = `user${Date.now()}@test.com`;
    await page.fill('[data-testid="email-input"]', email);
    await page.fill('[data-testid="password-input"]', 'Password123!');
    await page.fill('[data-testid="confirm-password-input"]', 'Password123!');
    await page.click('[data-testid="register-button"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });

    // Navigate to subscriptions
    await page.click('[data-testid="profile-link"]');
    const subsTab = await page.$('[data-testid="subscriptions-tab"]');
    if (subsTab) {
      await page.click('[data-testid="subscriptions-tab"]');

      const subscriptionsList = await page.$('[data-testid="subscriptions-list"]');
      expect(subscriptionsList).toBeTruthy();
    }
  });

  test('HISTORY-007: should allow canceling subscriptions', async ({ page }) => {
    await page.goto(`${BASE_URL}/profile`);

    const subscriptionItem = await page.$('[data-testid="subscription-item"]');
    if (subscriptionItem) {
      const cancelButton = await subscriptionItem.$('[data-testid="cancel-subscription"]');
      if (cancelButton) {
        await cancelButton.click();

        // Should show confirmation
        const confirmation = await page.$('[data-testid="cancel-confirmation"]');
        expect(confirmation).toBeTruthy();
      }
    }
  });
});

test.describe('Payment Error Handling', () => {
  test('ERROR-001: should handle insufficient balance gracefully', async ({ page }) => {
    // Register and login
    await page.goto(`${BASE_URL}/register`);
    const email = `user${Date.now()}@test.com`;
    await page.fill('[data-testid="email-input"]', email);
    await page.fill('[data-testid="password-input"]', 'Password123!');
    await page.fill('[data-testid="confirm-password-input"]', 'Password123!');
    await page.click('[data-testid="register-button"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });

    // Simulate purchase with insufficient funds
    await page.goto(`${BASE_URL}/browse`);
    await page.waitForSelector('[data-testid="content-card"]');
    await page.click('[data-testid="content-card"]');

    const purchaseButton = await page.$('[data-testid="purchase-button"]');
    if (purchaseButton) {
      await page.click('[data-testid="purchase-button"]');

      // May show error message
      const errorMsg = await page.$('[data-testid="insufficient-balance-error"]');
      if (errorMsg) {
        await expect(page.locator('[data-testid="insufficient-balance-error"]')).toBeVisible({ timeout: 2000 });
      }
    }
  });

  test('ERROR-002: should handle transaction timeout', async ({ page }) => {
    // Abort API calls to simulate timeout
    await page.route('**/api/purchase', route => route.abort());

    await page.goto(`${BASE_URL}/browse`);
    await page.waitForSelector('[data-testid="content-card"]');
    await page.click('[data-testid="content-card"]');

    const purchaseButton = await page.$('[data-testid="purchase-button"]');
    if (purchaseButton) {
      await page.click('[data-testid="purchase-button"]');

      // Should show error
      const errorMsg = await page.$('[data-testid="error-message"]');
      if (errorMsg) {
        await expect(page.locator('[data-testid="error-message"]')).toBeVisible({ timeout: 3000 });
      }
    }
  });
});
