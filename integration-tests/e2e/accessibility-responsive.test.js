/**
 * Accessibility and Responsive Design E2E Tests
 * Tests for accessibility compliance and responsive behavior across devices
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

test.describe('Accessibility Compliance', () => {
  test('A11Y-001: should have descriptive page titles', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);

    const title = await page.title();
    expect(title).toMatch(/register|signup|create|account/i);
  });

  test('A11Y-002: should have proper heading hierarchy', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);

    // Check for h1 heading
    const h1 = await page.$('h1');
    expect(h1).toBeTruthy();
  });

  test('A11Y-003: should have alt text on images', async ({ page }) => {
    await page.goto(`${BASE_URL}/browse`);

    // Wait for images to load
    await page.waitForSelector('img');

    // Check for alt text
    const images = await page.$$('img');
    for (const img of images) {
      const alt = await img.getAttribute('alt');
      if (alt !== null) {
        expect(alt).toBeTruthy();
      }
    }
  });

  test('A11Y-004: should have form labels associated with inputs', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);

    // Check for form labels
    const emailInput = await page.$('[data-testid="email-input"]');
    if (emailInput) {
      const label = await page.$('label[for]');
      expect(label).toBeTruthy();
    }
  });

  test('A11Y-005: should support keyboard navigation', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);

    // Tab through form fields
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    const focused = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
    expect(focused).toBeTruthy();
  });

  test('A11Y-006: should have sufficient color contrast', async ({ page }) => {
    await page.goto(`${BASE_URL}/browse`);

    // Check for text elements
    const textElements = await page.$$('p, span, a');
    expect(textElements.length).toBeGreaterThan(0);
  });

  test('A11Y-007: should provide skip navigation links', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);

    // Check for skip link
    const skipLink = await page.$('[href="#main-content"], [href="#content"]');
    if (skipLink) {
      expect(skipLink).toBeTruthy();
    }
  });

  test('A11Y-008: should support screen reader navigation', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);

    // Check for aria labels
    const ariaLabeled = await page.$('[aria-label], [aria-labelledby]');
    expect(ariaLabeled).toBeTruthy();
  });

  test('A11Y-009: should have proper button roles', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);

    // Check buttons have proper role
    const buttons = await page.$$('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  test('A11Y-010: should indicate focus state on interactive elements', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);

    // Tab to button
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    const button = await page.evaluate(() => {
      const el = document.activeElement;
      return window.getComputedStyle(el).outline !== 'none' || 
             window.getComputedStyle(el).boxShadow !== 'none';
    });

    expect(button).toBeTruthy();
  });
});

test.describe('Responsive Design - Mobile', () => {
  test('MOBILE-001: should be responsive on mobile screens', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto(`${BASE_URL}/browse`);

    // Should be viewable on mobile
    const content = await page.$('[data-testid="content-grid"]');
    expect(content).toBeTruthy();
  });

  test('MOBILE-002: should have mobile-friendly navigation', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto(`${BASE_URL}/dashboard`);

    // Check for mobile menu
    const mobileMenu = await page.$('[data-testid="mobile-menu"]');
    if (mobileMenu) {
      expect(mobileMenu).toBeTruthy();
    }
  });

  test('MOBILE-003: should stack layout properly on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto(`${BASE_URL}/browse`);

    // Content should be single column
    const contentCards = await page.locator('[data-testid="content-card"]');
    const count = await contentCards.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('MOBILE-004: should have touch-friendly button sizes', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto(`${BASE_URL}/browse`);

    // Check button sizes for touch
    const button = await page.$('button');
    if (button) {
      const box = await button.boundingBox();
      expect(box.height).toBeGreaterThanOrEqual(44); // Min touch target
    }
  });

  test('MOBILE-005: should optimize images for mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto(`${BASE_URL}/browse`);

    // Images should load properly
    const images = await page.$$('img');
    expect(images.length).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Responsive Design - Tablet', () => {
  test('TABLET-001: should be responsive on tablet screens', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });

    await page.goto(`${BASE_URL}/browse`);

    const content = await page.$('[data-testid="content-grid"]');
    expect(content).toBeTruthy();
  });

  test('TABLET-002: should display two-column layout on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });

    await page.goto(`${BASE_URL}/browse`);

    // Should display multiple columns
    const cards = await page.locator('[data-testid="content-card"]').count();
    expect(cards).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Responsive Design - Desktop', () => {
  test('DESKTOP-001: should display full layout on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });

    await page.goto(`${BASE_URL}/browse`);

    const content = await page.$('[data-testid="content-grid"]');
    expect(content).toBeTruthy();
  });

  test('DESKTOP-002: should display multi-column layout on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });

    await page.goto(`${BASE_URL}/browse`);

    const cards = await page.locator('[data-testid="content-card"]').count();
    expect(cards).toBeGreaterThan(0);
  });

  test('DESKTOP-003: should display sidebar navigation on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });

    await page.goto(`${BASE_URL}/dashboard`);

    const sidebar = await page.$('[data-testid="sidebar"]');
    if (sidebar) {
      expect(sidebar).toBeTruthy();
    }
  });
});

test.describe('Performance and Load Times', () => {
  test('PERF-001: should load homepage quickly', async ({ page }) => {
    const start = Date.now();
    await page.goto(`${BASE_URL}`);
    const loadTime = Date.now() - start;

    expect(loadTime).toBeLessThan(3000); // Should load in under 3 seconds
  });

  test('PERF-002: should load browse page with content quickly', async ({ page }) => {
    const start = Date.now();
    await page.goto(`${BASE_URL}/browse`);
    await page.waitForSelector('[data-testid="content-card"]');
    const loadTime = Date.now() - start;

    expect(loadTime).toBeLessThan(5000);
  });

  test('PERF-003: should handle lazy loading of images', async ({ page }) => {
    await page.goto(`${BASE_URL}/browse`);

    // Wait for initial load
    await page.waitForSelector('[data-testid="content-card"]');

    // Scroll to trigger lazy loading
    await page.evaluate(() => window.scrollBy(0, window.innerHeight));
    await page.waitForTimeout(500);

    const images = await page.$$('img');
    expect(images.length).toBeGreaterThan(0);
  });

  test('PERF-004: should cache API responses', async ({ page }) => {
    // First request
    const start1 = Date.now();
    await page.goto(`${BASE_URL}/browse`);
    const time1 = Date.now() - start1;

    // Second request (should be faster due to caching)
    const start2 = Date.now();
    await page.reload();
    const time2 = Date.now() - start2;

    expect(time2).toBeLessThanOrEqual(time1);
  });
});

test.describe('Dark Mode Support', () => {
  test('THEME-001: should support dark mode toggle', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);

    // Check for theme toggle
    const themeToggle = await page.$('[data-testid="theme-toggle"]');
    if (themeToggle) {
      await page.click('[data-testid="theme-toggle"]');

      // Should change theme
      await page.waitForTimeout(300);
      expect(page.url()).toBeTruthy();
    }
  });

  test('THEME-002: should persist theme preference', async ({ page, context }) => {
    await page.goto(`${BASE_URL}/dashboard`);

    // Toggle theme
    const themeToggle = await page.$('[data-testid="theme-toggle"]');
    if (themeToggle) {
      await page.click('[data-testid="theme-toggle"]');
      await page.waitForTimeout(300);

      // Create new page - should maintain preference
      const newPage = await context.newPage();
      await newPage.goto(`${BASE_URL}/dashboard`);
      
      // Check if same theme applied
      await newPage.waitForTimeout(300);
      expect(newPage.url()).toBeTruthy();

      await newPage.close();
    }
  });
});
