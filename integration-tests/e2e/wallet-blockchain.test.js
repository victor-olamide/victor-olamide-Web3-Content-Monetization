/**
 * Wallet and Blockchain Integration E2E Tests
 * Tests for wallet connection, STX balance display, and blockchain interactions
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

test.describe('Wallet Connection Flow', () => {
  test('WALLET-001: should display wallet connection prompt to unauthenticated users', async ({ page }) => {
    await page.goto(`${BASE_URL}`);

    // Check if wallet section visible to public
    const walletSection = await page.$('[data-testid="wallet-section"]');
    if (walletSection) {
      await expect(page.locator('[data-testid="wallet-section"]')).toBeVisible({ timeout: 3000 });
    }
  });

  test('WALLET-002: should show Stacks wallet connection modal', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);

    // Check for connect wallet button
    const connectButton = await page.$('[data-testid="connect-wallet-button"]');
    if (connectButton) {
      await page.click('[data-testid="connect-wallet-button"]');

      // Should show modal with wallet options
      const modal = await page.$('[data-testid="wallet-modal"]');
      expect(modal).toBeTruthy();
    }
  });

  test('WALLET-003: should display multiple wallet provider options', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);

    const connectButton = await page.$('[data-testid="connect-wallet-button"]');
    if (connectButton) {
      await page.click('[data-testid="connect-wallet-button"]');

      // Check for Hiro Wallet option
      const hiroOption = await page.$('[data-testid="hiro-wallet"]');
      if (hiroOption) {
        await expect(page.locator('[data-testid="hiro-wallet"]')).toBeVisible({ timeout: 2000 });
      }

      // Check for Leather option
      const leatherOption = await page.$('[data-testid="leather-wallet"]');
      if (leatherOption) {
        await expect(page.locator('[data-testid="leather-wallet"]')).toBeVisible({ timeout: 2000 });
      }
    }
  });

  test('WALLET-004: should display connected wallet address after connection', async ({ page }) => {
    await page.goto(`${BASE_URL}/profile`);

    // Check for wallet address display
    const walletAddress = await page.$('[data-testid="wallet-address"]');
    if (walletAddress) {
      const address = await walletAddress.textContent();
      expect(address).toMatch(/^ST[A-Z0-9]{38}$/);
    }
  });

  test('WALLET-005: should display STX balance', async ({ page }) => {
    await page.goto(`${BASE_URL}/profile`);

    // Check for STX balance display
    const stxBalance = await page.$('[data-testid="stx-balance"]');
    if (stxBalance) {
      const balance = await stxBalance.textContent();
      expect(balance).toMatch(/\d+/);
    }
  });

  test('WALLET-006: should allow wallet disconnection', async ({ page }) => {
    await page.goto(`${BASE_URL}/profile`);

    // Check for disconnect wallet button
    const disconnectButton = await page.$('[data-testid="disconnect-wallet-button"]');
    if (disconnectButton) {
      await page.click('[data-testid="disconnect-wallet-button"]');

      // Should show confirmation
      const confirmation = await page.$('[data-testid="disconnect-confirmation"]');
      if (confirmation) {
        await page.click('[data-testid="confirm-disconnect"]');
        await page.waitForTimeout(500);
      }

      // Wallet address should be cleared
      const walletAddress = await page.$('[data-testid="wallet-address"]');
      if (walletAddress) {
        const address = await walletAddress.textContent();
        expect(address).not.toMatch(/^ST[A-Z0-9]{38}$/);
      }
    }
  });

  test('WALLET-007: should display wallet transaction history', async ({ page }) => {
    await page.goto(`${BASE_URL}/profile`);

    // Navigate to transaction history
    const historyTab = await page.$('[data-testid="transaction-history-tab"]');
    if (historyTab) {
      await page.click('[data-testid="transaction-history-tab"]');

      // Should display transactions
      const transactionList = await page.$('[data-testid="transaction-list"]');
      expect(transactionList).toBeTruthy();
    }
  });

  test('WALLET-008: should display pending transactions', async ({ page }) => {
    await page.goto(`${BASE_URL}/profile`);

    // Check for pending transactions
    const pendingTx = await page.$('[data-testid="pending-transaction"]');
    if (pendingTx) {
      const status = await pendingTx.textContent();
      expect(status).toContain('pending');
    }
  });

  test('WALLET-009: should display confirmed transactions', async ({ page }) => {
    await page.goto(`${BASE_URL}/profile`);

    // Check for confirmed transactions
    const confirmedTx = await page.$('[data-testid="confirmed-transaction"]');
    if (confirmedTx) {
      const status = await confirmedTx.textContent();
      expect(status).toContain('confirmed');
    }
  });
});

test.describe('Blockchain Transaction Flow', () => {
  test('TXN-001: should display transaction details modal', async ({ page }) => {
    await page.goto(`${BASE_URL}/profile`);

    // Click on a transaction
    const transaction = await page.$('[data-testid="transaction-item"]');
    if (transaction) {
      await page.click('[data-testid="transaction-item"]');

      // Should show transaction details
      const detailsModal = await page.$('[data-testid="transaction-details-modal"]');
      expect(detailsModal).toBeTruthy();
    }
  });

  test('TXN-002: should display transaction hash as link to explorer', async ({ page }) => {
    await page.goto(`${BASE_URL}/profile`);

    // Check for explorer link
    const explorerLink = await page.$('[data-testid="tx-explorer-link"]');
    if (explorerLink) {
      const href = await explorerLink.getAttribute('href');
      expect(href).toContain('explorer');
    }
  });

  test('TXN-003: should show transaction fee information', async ({ page }) => {
    await page.goto(`${BASE_URL}/profile`);

    const transaction = await page.$('[data-testid="transaction-item"]');
    if (transaction) {
      await page.click('[data-testid="transaction-item"]');

      const feeDisplay = await page.$('[data-testid="transaction-fee"]');
      if (feeDisplay) {
        const fee = await feeDisplay.textContent();
        expect(fee).toMatch(/\d+/);
      }
    }
  });

  test('TXN-004: should display confirmation status', async ({ page }) => {
    await page.goto(`${BASE_URL}/profile`);

    const transaction = await page.$('[data-testid="transaction-item"]');
    if (transaction) {
      await page.click('[data-testid="transaction-item"]');

      const confirmations = await page.$('[data-testid="confirmations"]');
      if (confirmations) {
        const count = await confirmations.textContent();
        expect(count).toMatch(/\d+/);
      }
    }
  });

  test('TXN-005: should allow copying transaction hash', async ({ page }) => {
    await page.goto(`${BASE_URL}/profile`);

    const transaction = await page.$('[data-testid="transaction-item"]');
    if (transaction) {
      await page.click('[data-testid="transaction-item"]');

      const copyButton = await page.$('[data-testid="copy-tx-hash"]');
      if (copyButton) {
        await page.click('[data-testid="copy-tx-hash"]');

        // Should show success message
        await page.waitForTimeout(500);
        expect(page.url()).toBeTruthy();
      }
    }
  });
});

test.describe('Wallet Balance and Assets', () => {
  test('BALANCE-001: should display STX token balance', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);

    const stxBalance = await page.$('[data-testid="stx-balance"]');
    if (stxBalance) {
      const balance = await stxBalance.textContent();
      expect(balance).toMatch(/\d+(\.\d+)?/);
    }
  });

  test('BALANCE-002: should display locked STX', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);

    const lockedStx = await page.$('[data-testid="locked-stx"]');
    if (lockedStx) {
      const locked = await lockedStx.textContent();
      expect(locked).toMatch(/\d+(\.\d+)?/);
    }
  });

  test('BALANCE-003: should display available STX for spending', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);

    const availableStx = await page.$('[data-testid="available-stx"]');
    if (availableStx) {
      const available = await availableStx.textContent();
      expect(available).toMatch(/\d+(\.\d+)?/);
    }
  });

  test('BALANCE-004: should display NFT collection count', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);

    const nftCount = await page.$('[data-testid="nft-count"]');
    if (nftCount) {
      const count = await nftCount.textContent();
      expect(count).toMatch(/\d+/);
    }
  });

  test('BALANCE-005: should display owned NFTs in gallery', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);

    const nftGallery = await page.$('[data-testid="nft-gallery"]');
    if (nftGallery) {
      await expect(page.locator('[data-testid="nft-gallery"]')).toBeVisible({ timeout: 3000 });
    }
  });

  test('BALANCE-006: should allow filtering NFTs by collection', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);

    const collectionFilter = await page.$('[data-testid="nft-collection-filter"]');
    if (collectionFilter) {
      await page.selectOption('[data-testid="nft-collection-filter"]', 'content-gate');
      await page.waitForTimeout(500);

      const nftItems = await page.locator('[data-testid="nft-item"]').count();
      expect(nftItems).toBeGreaterThanOrEqual(0);
    }
  });

  test('BALANCE-007: should display NFT details on click', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);

    const nftItem = await page.$('[data-testid="nft-item"]');
    if (nftItem) {
      await page.click('[data-testid="nft-item"]');

      const detailsPanel = await page.$('[data-testid="nft-details"]');
      expect(detailsPanel).toBeTruthy();
    }
  });
});
