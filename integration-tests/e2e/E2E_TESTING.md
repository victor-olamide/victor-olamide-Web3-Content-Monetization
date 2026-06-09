# E2E Testing Guide

## Overview

This directory contains comprehensive end-to-end (E2E) tests for the Web3 Content Platform using Playwright. The test suite covers all major user flows and interactions across the application.

## Test Files

### Core Test Suites

1. **user-flows.test.js** - Main user flow tests
   - User registration and authentication (8 tests)
   - Content browsing and discovery (7 tests)
   - Wallet connectivity (3 tests)
   - Content purchases (4 tests)
   - Pay-per-view content (7 tests)
   - Creator upload flows (9 tests)
   - Error handling (8 tests)
   - Admin moderation (2 tests)

2. **content-discovery.test.js** - Content search and filtering
   - Full-text search functionality (10 tests)
   - Content detail pages and interactions (6 tests)

3. **wallet-blockchain.test.js** - Blockchain and wallet operations
   - Wallet connection and management (9 tests)
   - Transaction handling (5 tests)
   - Balance and NFT management (7 tests)

4. **purchase-payment.test.js** - Purchase and payment flows
   - Pay-per-view purchases (6 tests)
   - Subscription management (6 tests)
   - Purchase history (7 tests)
   - Payment error handling (2 tests)

5. **creator-upload.test.js** - Creator content management
   - Content upload and validation (9 tests)
   - Creator dashboard (8 tests)
   - Creator profile management (3 tests)

6. **accessibility-responsive.test.js** - Accessibility and responsive design
   - Accessibility compliance (10 tests)
   - Mobile responsiveness (5 tests)
   - Tablet responsiveness (2 tests)
   - Desktop layout (3 tests)
   - Performance metrics (4 tests)
   - Theme support (2 tests)

7. **advanced-interactions.test.js** - Complex scenarios
   - Form validation (7 tests)
   - Network error handling (3 tests)
   - Concurrent actions (3 tests)
   - Session management (4 tests)
   - Edge cases (5 tests)
   - Browser compatibility (3 tests)

8. **admin-moderation.test.js** - Admin panel and moderation
   - Admin panel access (3 tests)
   - Content moderation (7 tests)
   - User management (8 tests)
   - Reports and analytics (5 tests)
   - Platform settings (5 tests)
   - Audit logs (5 tests)

### Supporting Files

- **fixtures.js** - Test fixtures for authenticated contexts
- **helpers.js** - Utility functions for common operations
- **data-factories.js** - Test data generation factories
- **playwright.config.js** - Playwright configuration

## Running Tests

### Run All Tests

```bash
npm test -- integration-tests/e2e
```

### Run Specific Test Suite

```bash
npm test -- integration-tests/e2e/user-flows.test.js
npm test -- integration-tests/e2e/wallet-blockchain.test.js
```

### Run Tests with Specific Browser

```bash
# Chromium only
npx playwright test --project=chromium

# Firefox only
npx playwright test --project=firefox

# WebKit only
npx playwright test --project=webkit

# Mobile (Pixel 5)
npx playwright test --project="Pixel 5"

# Mobile (iPhone 12)
npx playwright test --project="iPhone 12"
```

### Run Tests in Debug Mode

```bash
npx playwright test --debug
```

### Run Tests with UI Mode

```bash
npx playwright test --ui
```

### Run Tests with Head Mode (See Browser)

```bash
npx playwright test --headed
```

## Test Configuration

Configuration is defined in `playwright.config.js`:

- **Test Timeout**: 30 seconds per test
- **Assertion Timeout**: 10 seconds
- **Retries**: 0 (can be changed per test)
- **Parallelization**: Full parallel execution across workers
- **Reporters**: HTML, JSON, JUnit for CI/CD
- **Artifacts**: Screenshots and videos on failure only
- **Web Server**: Auto-starts `npm run dev` on localhost:3000

## Environment Variables

Configure these environment variables for the test environment:

```bash
# Frontend URL (default: http://localhost:3000)
FRONTEND_URL=http://localhost:3000

# API URL (default: http://localhost:3001)
API_URL=http://localhost:3001

# Test Database URL
MONGODB_URI=mongodb://localhost:27017/web3-content-test

# Admin credentials (for admin tests)
ADMIN_EMAIL=admin@test.com
ADMIN_PASSWORD=AdminPassword123!
```

Create a `.env.local` file in `integration-tests/` directory:

```
FRONTEND_URL=http://localhost:3000
API_URL=http://localhost:3001
MONGODB_URI=mongodb://localhost:27017/web3-content-test
ADMIN_EMAIL=admin@test.com
ADMIN_PASSWORD=AdminPassword123!
```

## Test Data

### Using Factories

Use the data factory functions to generate test data:

```javascript
const { generateUser, generateContent, generatePurchase } = require('./data-factories');

// Generate a user
const user = generateUser({ role: 'creator' });

// Generate content
const content = generateContent('creator-1', { price: 9.99 });

// Generate purchase
const purchase = generatePurchase('user-1', 'content-1');
```

### Using Helpers

Use helper functions for common operations:

```javascript
const helpers = require('./helpers');

// Register user
const credentials = await helpers.registerUser(page, {
  email: 'test@example.com',
  role: 'creator'
});

// Login
await helpers.loginUser(page, credentials);

// Search content
await helpers.searchContent(page, 'tutorial');

// Purchase content
await helpers.purchaseContent(page, 'stx');
```

## Test Patterns

### Basic Test Structure

```javascript
test('TEST-ID: should do something', async ({ page }) => {
  // 1. Setup
  await page.goto(`${BASE_URL}/page`);
  
  // 2. Action
  await page.click('[data-testid="button"]');
  
  // 3. Assert
  await expect(page).toHaveURL(/\/expected-page/);
});
```

### Fixture-based Tests

```javascript
test('should work with authenticated user', async ({ authenticatedUser, page }) => {
  // User is automatically logged in
  await page.goto(`${BASE_URL}/dashboard`);
  const dashboard = await page.$('[data-testid="dashboard"]');
  expect(dashboard).toBeTruthy();
});
```

## Best Practices

### 1. Use Data Test IDs

Always use `data-testid` attributes for element selection:

```javascript
await page.click('[data-testid="submit-button"]');
```

### 2. Handle Optional Elements

Check if elements exist before interacting:

```javascript
const element = await page.$('[data-testid="optional-element"]');
if (element) {
  await element.click();
}
```

### 3. Use Appropriate Waits

- Use `waitForSelector` for element appearance
- Use `waitForNavigation` for page changes
- Use `waitForTimeout` sparingly (usually 300-500ms)

```javascript
await page.waitForSelector('[data-testid="content-card"]', { timeout: 5000 });
```

### 4. Use Flexible Assertions

Use regex and range checks for varying data:

```javascript
// Instead of exact match
expect(price).toBe('9.99');

// Use regex for flexible matching
expect(price).toMatch(/\d+\.\d{2}/);

// Use range for potentially varying values
expect(count).toBeGreaterThan(0);
```

### 5. Handle Async Operations

Always await async operations:

```javascript
await page.fill('[data-testid="input"]', 'value');
await page.click('[data-testid="button"]');
await expect(page).toHaveURL(/\/expected-page/);
```

### 6. Clean Up Resources

Use proper cleanup in after hooks:

```javascript
test.afterEach(async ({ page }) => {
  // Close dialogs, clear data, etc.
  await page.close();
});
```

## Debugging Failed Tests

### 1. View Test Report

After running tests, open the HTML report:

```bash
npx playwright show-report
```

### 2. Use Debug Mode

Run test with debug mode to step through:

```bash
npx playwright test --debug integration-tests/e2e/user-flows.test.js
```

### 3. Check Artifacts

Failed tests generate screenshots and videos in `test-results/` directory:

- `screenshots/` - Screenshots on failure
- `videos/` - Video recordings on failure

### 4. Add Debug Logging

Add console logs to help identify issues:

```javascript
console.log('Current URL:', page.url());
console.log('Element text:', await page.textContent('[data-testid="element"]'));
```

### 5. Inspect Elements

Use Playwright Inspector:

```bash
PWDEBUG=1 npx playwright test integration-tests/e2e/user-flows.test.js
```

## CI/CD Integration

### GitHub Actions

Example workflow for running E2E tests in GitHub Actions:

```yaml
- name: Run E2E Tests
  run: npm test -- integration-tests/e2e

- name: Upload Test Results
  if: always()
  uses: actions/upload-artifact@v2
  with:
    name: playwright-report
    path: integration-tests/e2e/test-results/
```

### Test Result Formats

Tests generate multiple report formats:

- **HTML Report**: `test-results/playwright-report/index.html`
- **JSON Report**: `test-results/results.json`
- **JUnit Report**: `test-results/junit.xml`

## Maintenance

### Updating Selectors

When UI changes:

1. Find new selectors using DevTools
2. Update `data-testid` attributes in component
3. Update test selectors in E2E tests
4. Verify tests pass with new selectors

### Adding New Tests

1. Create test in appropriate suite file
2. Use consistent naming: `TEST-ID: should action`
3. Add to summary in this README
4. Run locally to verify
5. Commit with descriptive message

### Known Issues

- Wallet connection tests may require mock wallet extension
- Transaction confirmation tests need simulated blockchain
- Some timing-based tests may be flaky on slow systems

## Performance Targets

- Page load time: < 3 seconds
- API response time: < 1 second
- Content purchase flow: < 5 seconds
- Search results: < 2 seconds

## Support

For issues or questions:

1. Check test logs: `npm test -- --verbose`
2. Review Playwright docs: https://playwright.dev
3. Check test artifacts in `test-results/`
4. Debug with `--debug` flag
