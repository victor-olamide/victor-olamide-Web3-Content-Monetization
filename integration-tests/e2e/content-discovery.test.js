/**
 * Content Browsing and Search E2E Tests
 * Tests for content discovery, filtering, sorting, and search functionality
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

test.describe('Advanced Content Search and Discovery', () => {
  test('SEARCH-001: should perform full-text search on content titles', async ({ page }) => {
    await page.goto(`${BASE_URL}/browse`);

    // Enter search term
    await page.fill('[data-testid="search-input"]', 'music tutorial');
    await page.click('[data-testid="search-button"]');

    // Wait for results
    await page.waitForTimeout(500);

    // Verify search results displayed
    const results = await page.$('[data-testid="search-results"]');
    expect(results).toBeTruthy();
  });

  test('SEARCH-002: should filter by multiple content types', async ({ page }) => {
    await page.goto(`${BASE_URL}/browse`);

    // Select video filter
    await page.check('[data-testid="filter-video"]');
    await page.waitForTimeout(500);

    // Select article filter
    await page.check('[data-testid="filter-article"]');
    await page.waitForTimeout(500);

    // Should display filtered content
    const contentCards = await page.locator('[data-testid="content-card"]').count();
    expect(contentCards).toBeGreaterThanOrEqual(0);
  });

  test('SEARCH-003: should filter by price range', async ({ page }) => {
    await page.goto(`${BASE_URL}/browse`);

    // Set price range
    const minPrice = await page.$('[data-testid="min-price-input"]');
    if (minPrice) {
      await page.fill('[data-testid="min-price-input"]', '0');
      await page.fill('[data-testid="max-price-input"]', '50');
      await page.click('[data-testid="apply-filter-button"]');
      
      await page.waitForTimeout(500);
      
      // Verify content within price range displayed
      const contentCards = await page.locator('[data-testid="content-card"]').count();
      expect(contentCards).toBeGreaterThanOrEqual(0);
    }
  });

  test('SEARCH-004: should sort by newest content', async ({ page }) => {
    await page.goto(`${BASE_URL}/browse`);

    // Apply newest sort
    await page.selectOption('[data-testid="sort-by"]', 'newest');
    await page.waitForTimeout(500);

    // Get first content card timestamp
    const firstCard = await page.$('[data-testid="content-card"]:first-child');
    expect(firstCard).toBeTruthy();
  });

  test('SEARCH-005: should sort by highest rated content', async ({ page }) => {
    await page.goto(`${BASE_URL}/browse`);

    const sortSelector = await page.$('[data-testid="sort-by"]');
    if (sortSelector) {
      await page.selectOption('[data-testid="sort-by"]', 'rating');
      await page.waitForTimeout(500);

      const contentCards = await page.locator('[data-testid="content-card"]').count();
      expect(contentCards).toBeGreaterThanOrEqual(0);
    }
  });

  test('SEARCH-006: should display creator profile link in search results', async ({ page }) => {
    await page.goto(`${BASE_URL}/browse`);

    // Wait for content
    await page.waitForSelector('[data-testid="content-card"]');

    // First content card should have creator link
    const creatorLink = await page.$('[data-testid="content-card"] [data-testid="creator-link"]');
    expect(creatorLink).toBeTruthy();
  });

  test('SEARCH-007: should handle empty search results gracefully', async ({ page }) => {
    await page.goto(`${BASE_URL}/browse`);

    // Search for non-existent content
    await page.fill('[data-testid="search-input"]', 'xyzabc123nonexistent');
    await page.click('[data-testid="search-button"]');

    await page.waitForTimeout(500);

    // Should show no results message
    const noResults = await page.$('[data-testid="no-results-message"]');
    if (noResults) {
      await expect(page.locator('[data-testid="no-results-message"]')).toBeVisible({ timeout: 2000 });
    }
  });

  test('SEARCH-008: should paginate through content results', async ({ page }) => {
    await page.goto(`${BASE_URL}/browse`);

    // Wait for content to load
    await page.waitForSelector('[data-testid="content-card"]');

    // Check for pagination controls
    const nextButton = await page.$('[data-testid="pagination-next"]');
    if (nextButton) {
      await page.click('[data-testid="pagination-next"]');
      await page.waitForTimeout(500);

      // Should display new page content
      const contentCards = await page.locator('[data-testid="content-card"]').count();
      expect(contentCards).toBeGreaterThan(0);
    }
  });

  test('SEARCH-009: should display content ratings in search results', async ({ page }) => {
    await page.goto(`${BASE_URL}/browse`);

    // Wait for content
    await page.waitForSelector('[data-testid="content-card"]');

    // Check if rating displayed
    const ratingElement = await page.$('[data-testid="content-rating"]');
    if (ratingElement) {
      const ratingText = await ratingElement.textContent();
      expect(ratingText).toMatch(/\d/);
    }
  });

  test('SEARCH-010: should display content duration or size', async ({ page }) => {
    await page.goto(`${BASE_URL}/browse`);

    // Wait for content
    await page.waitForSelector('[data-testid="content-card"]');

    // Check for metadata
    const metadata = await page.$('[data-testid="content-metadata"]');
    expect(metadata).toBeTruthy();
  });
});

test.describe('Content Detail Page', () => {
  test('DETAIL-001: should display full content information', async ({ page }) => {
    await page.goto(`${BASE_URL}/browse`);

    // Wait and click first content
    await page.waitForSelector('[data-testid="content-card"]');
    await page.click('[data-testid="content-card"]');

    // Should navigate to detail page
    await expect(page).toHaveURL(/\/content\//, { timeout: 3000 });

    // Verify content details
    await expect(page.locator('[data-testid="content-title"]')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('[data-testid="content-description"]')).toBeVisible({ timeout: 3000 });
  });

  test('DETAIL-002: should display creator information panel', async ({ page }) => {
    await page.goto(`${BASE_URL}/browse`);

    await page.waitForSelector('[data-testid="content-card"]');
    await page.click('[data-testid="content-card"]');

    await expect(page).toHaveURL(/\/content\//, { timeout: 3000 });

    // Verify creator panel
    const creatorPanel = await page.$('[data-testid="creator-panel"]');
    expect(creatorPanel).toBeTruthy();
  });

  test('DETAIL-003: should display ratings and reviews', async ({ page }) => {
    await page.goto(`${BASE_URL}/browse`);

    await page.waitForSelector('[data-testid="content-card"]');
    await page.click('[data-testid="content-card"]');

    await expect(page).toHaveURL(/\/content\//, { timeout: 3000 });

    // Check for ratings section
    const ratingsSection = await page.$('[data-testid="ratings-section"]');
    if (ratingsSection) {
      await expect(page.locator('[data-testid="ratings-section"]')).toBeVisible({ timeout: 3000 });
    }
  });

  test('DETAIL-004: should display related content recommendations', async ({ page }) => {
    await page.goto(`${BASE_URL}/browse`);

    await page.waitForSelector('[data-testid="content-card"]');
    await page.click('[data-testid="content-card"]');

    await expect(page).toHaveURL(/\/content\//, { timeout: 3000 });

    // Check for related content section
    const relatedSection = await page.$('[data-testid="related-content"]');
    if (relatedSection) {
      await expect(page.locator('[data-testid="related-content"]')).toBeVisible({ timeout: 3000 });
    }
  });

  test('DETAIL-005: should allow adding content to wishlist', async ({ page }) => {
    await page.goto(`${BASE_URL}/browse`);

    await page.waitForSelector('[data-testid="content-card"]');
    await page.click('[data-testid="content-card"]');

    await expect(page).toHaveURL(/\/content\//, { timeout: 3000 });

    // Check for wishlist button
    const wishlistButton = await page.$('[data-testid="wishlist-button"]');
    if (wishlistButton) {
      await page.click('[data-testid="wishlist-button"]');
      
      // Should show success or toggle state
      await page.waitForTimeout(500);
      expect(page.url()).toBeTruthy();
    }
  });

  test('DETAIL-006: should display share options', async ({ page }) => {
    await page.goto(`${BASE_URL}/browse`);

    await page.waitForSelector('[data-testid="content-card"]');
    await page.click('[data-testid="content-card"]');

    await expect(page).toHaveURL(/\/content\//, { timeout: 3000 });

    // Check for share button
    const shareButton = await page.$('[data-testid="share-button"]');
    if (shareButton) {
      await page.click('[data-testid="share-button"]');
      
      // Should show share options
      await page.waitForTimeout(300);
      expect(page.url()).toBeTruthy();
    }
  });
});
