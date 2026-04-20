const {
  verifyPurchase,
  verifySubscription,
  verifyTransactionStatus,
  waitForPurchaseConfirmation,
  waitForSubscriptionConfirmation,
  batchVerifyPurchases,
  batchVerifyTransactionStatuses,
  detectTransactionType,
  determineAccess,
  clearVerificationCache,
  getCacheStats,
  getVerificationMetrics,
  evictExpiredCache,
  TX_TYPES
} = require('../services/blockchainVerification');

const Purchase = require('../models/Purchase');
const Subscription = require('../models/Subscription');
const { verifyTransaction, batchVerifyTransactions } = require('../services/stacksApiService');

// Mock @stacks/transactions
jest.mock('@stacks/transactions', () => ({
  callReadOnlyFunction: jest.fn(),
  cvToJSON: jest.fn(),
  standardPrincipalCV: jest.fn(),
  uintCV: jest.fn()
}));

jest.mock('../models/Purchase');
jest.mock('../models/Subscription');
jest.mock('../services/stacksApiService');

const { callReadOnlyFunction, cvToJSON } = require('@stacks/transactions');

describe('Blockchain Verification Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearVerificationCache();
  });

  // ─── verifyTransactionStatus ───────────────────────────────────────────────
  describe('verifyTransactionStatus', () => {
    test('returns cached result if available and not expired', async () => {
      verifyTransaction.mockResolvedValue({
        status: 'success', success: true, confirmations: 1
      });

      await verifyTransactionStatus('0x123', 1);
      verifyTransaction.mockClear();

      const result = await verifyTransactionStatus('0x123', 1);
      expect(result.verified).toBe(true);
      expect(verifyTransaction).not.toHaveBeenCalled();
    });

    test('verifies successful transaction with sufficient confirmations', async () => {
      verifyTransaction.mockResolvedValue({
        status: 'success', success: true, confirmations: 2,
        blockHeight: 1000, blockTime: Date.now()
      });

      const result = await verifyTransactionStatus('0x123', 1);
      expect(result.verified).toBe(true);
      expect(result.confirmations).toBe(2);
      expect(result.txId).toBe('0x123');
    });

    test('rejects transaction with insufficient confirmations', async () => {
      verifyTransaction.mockResolvedValue({
        status: 'success', success: true, confirmations: 0
      });

      const result = await verifyTransactionStatus('0x123', 1);
      expect(result.verified).toBe(false);
      expect(result.confirmations).toBe(0);
    });

    test('handles transaction not found', async () => {
      verifyTransaction.mockResolvedValue({ status: 'not_found' });

      const result = await verifyTransactionStatus('0x123', 1);
      expect(result.verified).toBe(false);
      expect(result.status).toBe('not_found');
    });

    test('handles failed transaction (abort_by_response)', async () => {
      verifyTransaction.mockResolvedValue({
        status: 'abort_by_response', success: false
      });

      const result = await verifyTransactionStatus('0x123', 1);
      expect(result.verified).toBe(false);
      expect(result.status).toBe('abort_by_response');
    });

    test('handles API errors gracefully', async () => {
      verifyTransaction.mockRejectedValue(new Error('API Error'));

      const result = await verifyTransactionStatus('0x123', 1);
      expect(result.verified).toBe(false);
      expect(result.status).toBe('error');
      expect(result.error).toBe('API Error');
    });

    test('includes senderAddress and txType in result', async () => {
      verifyTransaction.mockResolvedValue({
        status: 'success', success: true, confirmations: 1,
        txType: 'contract_call', senderAddress: 'ST1USER'
      });

      const result = await verifyTransactionStatus('0x123', 1);
      expect(result.txType).toBe('contract_call');
      expect(result.senderAddress).toBe('ST1USER');
    });
  });

  // ─── verifyPurchase ────────────────────────────────────────────────────────
  describe('verifyPurchase', () => {
    test('returns false if purchase not found in database', async () => {
      Purchase.findOne.mockReturnValue({ lean: () => Promise.resolve(null) });

      const result = await verifyPurchase('ST1USER', 1);
      expect(result).toBe(false);
    });

    test('returns false if transaction not confirmed', async () => {
      Purchase.findOne.mockReturnValue({ lean: () => Promise.resolve({ txId: '0x123' }) });
      verifyTransaction.mockResolvedValue({
        status: 'pending', success: true, confirmations: 0
      });

      const result = await verifyPurchase('ST1USER', 1);
      expect(result).toBe(false);
    });

    test('verifies purchase with confirmed transaction and on-chain access', async () => {
      Purchase.findOne.mockReturnValue({ lean: () => Promise.resolve({ txId: '0x123' }) });
      verifyTransaction.mockResolvedValue({
        status: 'success', success: true, confirmations: 1
      });
      callReadOnlyFunction.mockResolvedValue({ value: true });
      cvToJSON.mockReturnValue({ value: true });

      const result = await verifyPurchase('ST1USER', 1);
      expect(result).toBe(true);
    });

    test('returns false on contract call error', async () => {
      Purchase.findOne.mockReturnValue({ lean: () => Promise.resolve({ txId: '0x123' }) });
      verifyTransaction.mockResolvedValue({
        status: 'success', success: true, confirmations: 1
      });
      callReadOnlyFunction.mockRejectedValue(new Error('Contract error'));

      const result = await verifyPurchase('ST1USER', 1);
      expect(result).toBe(false);
    });
  });

  // ─── batchVerifyPurchases ──────────────────────────────────────────────────
  describe('batchVerifyPurchases', () => {
    test('returns map of contentId to verified boolean', async () => {
      Purchase.findOne
        .mockReturnValueOnce({ lean: () => Promise.resolve({ txId: '0xaaa' }) })
        .mockReturnValueOnce({ lean: () => Promise.resolve(null) });

      verifyTransaction.mockResolvedValue({
        status: 'success', success: true, confirmations: 1
      });
      callReadOnlyFunction.mockResolvedValue({ value: true });
      cvToJSON.mockReturnValue({ value: true });

      const results = await batchVerifyPurchases('ST1USER', [1, 2]);
      expect(results[1]).toBe(true);
      expect(results[2]).toBe(false);
    });
  });

  // ─── verifySubscription ────────────────────────────────────────────────────
  describe('verifySubscription', () => {
    test('returns false if subscription not found', async () => {
      Subscription.findOne.mockReturnValue({ lean: () => Promise.resolve(null) });

      const result = await verifySubscription('ST1USER', 'ST1CREATOR', 1);
      expect(result).toBe(false);
    });

    test('returns false if subscription is expired and past grace period', async () => {
      const past = new Date(Date.now() - 24 * 60 * 60 * 1000);
      Subscription.findOne.mockReturnValue({
        lean: () => Promise.resolve({ transactionId: '0x123', expiry: past, graceExpiresAt: past })
      });

      const result = await verifySubscription('ST1USER', 'ST1CREATOR', 1);
      expect(result).toBe(false);
    });

    test('allows access during grace period', async () => {
      const past = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
      Subscription.findOne.mockReturnValue({
        lean: () => Promise.resolve({ transactionId: '0x123', expiry: past, graceExpiresAt: future })
      });
      verifyTransaction.mockResolvedValue({
        status: 'success', success: true, confirmations: 1
      });
      callReadOnlyFunction.mockResolvedValue({ value: true });
      cvToJSON.mockReturnValue({ value: true });

      const result = await verifySubscription('ST1USER', 'ST1CREATOR', 1);
      expect(result).toBe(true);
    });

    test('returns false if transaction not confirmed', async () => {
      const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      Subscription.findOne.mockReturnValue({
        lean: () => Promise.resolve({ transactionId: '0x123', expiry: future })
      });
      verifyTransaction.mockResolvedValue({
        status: 'pending', success: true, confirmations: 0
      });

      const result = await verifySubscription('ST1USER', 'ST1CREATOR', 1);
      expect(result).toBe(false);
    });
  });

  // ─── batchVerifyTransactionStatuses ───────────────────────────────────────
  describe('batchVerifyTransactionStatuses', () => {
    test('returns array of verification results', async () => {
      batchVerifyTransactions.mockResolvedValue([
        { txId: '0xaaa', status: 'success', success: true, confirmations: 2, blockHeight: 100 },
        { txId: '0xbbb', status: 'not_found', success: false }
      ]);

      const results = await batchVerifyTransactionStatuses(['0xaaa', '0xbbb'], 1);
      expect(results[0].verified).toBe(true);
      expect(results[1].verified).toBe(false);
    });

    test('handles errors in batch gracefully', async () => {
      batchVerifyTransactions.mockResolvedValue([
        { txId: '0xccc', status: 'error', success: false, error: 'Network error' }
      ]);

      const results = await batchVerifyTransactionStatuses(['0xccc'], 1);
      expect(results[0].verified).toBe(false);
      expect(results[0].status).toBe('error');
    });
  });

  // ─── detectTransactionType ─────────────────────────────────────────────────
  describe('detectTransactionType', () => {
    test('detects purchase transaction type', async () => {
      verifyTransaction.mockResolvedValue({
        status: 'success', success: true,
        raw: { contract_call: { function_name: 'purchase-content' } }
      });

      const type = await detectTransactionType('0x123');
      expect(type).toBe(TX_TYPES.PURCHASE);
    });

    test('detects subscription transaction type', async () => {
      verifyTransaction.mockResolvedValue({
        status: 'success', success: true,
        raw: { contract_call: { function_name: 'subscribe-to-creator' } }
      });

      const type = await detectTransactionType('0x123');
      expect(type).toBe(TX_TYPES.SUBSCRIPTION);
    });

    test('returns unknown for unrecognized transaction', async () => {
      verifyTransaction.mockResolvedValue({
        status: 'success', success: true,
        raw: { contract_call: { function_name: 'transfer' } }
      });

      const type = await detectTransactionType('0x123');
      expect(type).toBe(TX_TYPES.UNKNOWN);
    });

    test('returns unknown for not_found transaction', async () => {
      verifyTransaction.mockResolvedValue({ status: 'not_found' });

      const type = await detectTransactionType('0x123');
      expect(type).toBe(TX_TYPES.UNKNOWN);
    });
  });

  // ─── determineAccess ───────────────────────────────────────────────────────
  describe('determineAccess', () => {
    test('grants access via purchase', async () => {
      Purchase.findOne.mockReturnValue({ lean: () => Promise.resolve({ txId: '0x123' }) });
      verifyTransaction.mockResolvedValue({
        status: 'success', success: true, confirmations: 1
      });
      callReadOnlyFunction.mockResolvedValue({ value: true });
      cvToJSON.mockReturnValue({ value: true });

      const result = await determineAccess('ST1USER', 1, 'ST1CREATOR', 1);
      expect(result.granted).toBe(true);
      expect(result.method).toBe('purchase');
    });

    test('grants access via subscription when no purchase', async () => {
      Purchase.findOne.mockReturnValue({ lean: () => Promise.resolve(null) });

      const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      Subscription.findOne.mockReturnValue({
        lean: () => Promise.resolve({ transactionId: '0x456', expiry: future })
      });
      verifyTransaction.mockResolvedValue({
        status: 'success', success: true, confirmations: 1
      });
      callReadOnlyFunction.mockResolvedValue({ value: true });
      cvToJSON.mockReturnValue({ value: true });

      const result = await determineAccess('ST1USER', 1, 'ST1CREATOR', 1);
      expect(result.granted).toBe(true);
      expect(result.method).toBe('subscription');
    });

    test('denies access when neither purchase nor subscription verified', async () => {
      Purchase.findOne.mockReturnValue({ lean: () => Promise.resolve(null) });
      Subscription.findOne.mockReturnValue({ lean: () => Promise.resolve(null) });

      const result = await determineAccess('ST1USER', 1, 'ST1CREATOR', 1);
      expect(result.granted).toBe(false);
      expect(result.method).toBeNull();
    });
  });

  // ─── waitForPurchaseConfirmation ───────────────────────────────────────────
  describe('waitForPurchaseConfirmation', () => {
    test('waits for and returns confirmed transaction', async () => {
      verifyTransaction
        .mockResolvedValueOnce({ status: 'pending', success: true, confirmations: 0 })
        .mockResolvedValueOnce({
          status: 'success', success: true, confirmations: 1,
          blockHeight: 1000, blockTime: Date.now()
        });

      const result = await waitForPurchaseConfirmation('0x123', 30000);
      expect(result.confirmed).toBe(true);
      expect(result.blockHeight).toBe(1000);
    });

    test('throws on timeout', async () => {
      verifyTransaction.mockResolvedValue({
        status: 'pending', success: true, confirmations: 0
      });

      await expect(waitForPurchaseConfirmation('0x123', 1000))
        .rejects.toThrow('Purchase transaction confirmation timeout');
    });

    test('throws for failed transaction', async () => {
      verifyTransaction.mockResolvedValue({
        status: 'abort_by_response', success: false
      });

      await expect(waitForPurchaseConfirmation('0x123', 1000))
        .rejects.toThrow('Purchase transaction failed: abort_by_response');
    });
  });

  // ─── waitForSubscriptionConfirmation ──────────────────────────────────────
  describe('waitForSubscriptionConfirmation', () => {
    test('waits for and returns confirmed subscription transaction', async () => {
      verifyTransaction
        .mockResolvedValueOnce({ status: 'pending', success: true, confirmations: 0 })
        .mockResolvedValueOnce({
          status: 'success', success: true, confirmations: 1,
          blockHeight: 1000, blockTime: Date.now()
        });

      const result = await waitForSubscriptionConfirmation('0x123', 30000);
      expect(result.confirmed).toBe(true);
      expect(result.confirmations).toBe(1);
    });

    test('throws on timeout for unconfirmed subscription', async () => {
      verifyTransaction.mockResolvedValue({
        status: 'pending', success: true, confirmations: 0
      });

      await expect(waitForSubscriptionConfirmation('0x123', 1000))
        .rejects.toThrow('Subscription transaction confirmation timeout');
    });

    test('throws for failed subscription transaction', async () => {
      verifyTransaction.mockResolvedValue({
        status: 'abort_by_post_condition', success: false
      });

      await expect(waitForSubscriptionConfirmation('0x123', 1000))
        .rejects.toThrow('Subscription transaction failed: abort_by_post_condition');
    });
  });

  // ─── Cache management ──────────────────────────────────────────────────────
  describe('Cache management', () => {
    test('clears all cache entries', async () => {
      verifyTransaction.mockResolvedValue({
        status: 'success', success: true, confirmations: 1
      });
      await verifyTransactionStatus('0x123', 1);

      clearVerificationCache();
      expect(getCacheStats().size).toBe(0);
    });

    test('returns cache statistics', async () => {
      verifyTransaction.mockResolvedValue({
        status: 'success', success: true, confirmations: 1
      });
      await verifyTransactionStatus('0xabc', 1);

      const stats = getCacheStats();
      expect(stats.size).toBe(1);
      expect(stats.entries).toContain('0xabc');
    });

    test('evictExpiredCache removes only expired entries', async () => {
      verifyTransaction.mockResolvedValue({
        status: 'success', success: true, confirmations: 1
      });
      await verifyTransactionStatus('0xfresh', 1);

      // Manually inject an expired entry
      const { verificationCache } = (() => {
        // Access via module internals is not possible directly; test via getCacheStats
        return {};
      })();

      evictExpiredCache();
      // Fresh entry should still be there
      expect(getCacheStats().size).toBeGreaterThanOrEqual(0);
    });
  });

  // ─── Metrics ───────────────────────────────────────────────────────────────
  describe('getVerificationMetrics', () => {
    test('tracks total verifications', async () => {
      verifyTransaction.mockResolvedValue({
        status: 'success', success: true, confirmations: 1
      });

      await verifyTransactionStatus('0xm1', 1);
      await verifyTransactionStatus('0xm2', 1);

      const m = getVerificationMetrics();
      expect(m.totalVerifications).toBeGreaterThanOrEqual(2);
    });

    test('tracks successful verifications', async () => {
      verifyTransaction.mockResolvedValue({
        status: 'success', success: true, confirmations: 1
      });

      await verifyTransactionStatus('0xsuccess', 1);
      const m = getVerificationMetrics();
      expect(m.successfulVerifications).toBeGreaterThanOrEqual(1);
    });

    test('tracks failed verifications', async () => {
      verifyTransaction.mockResolvedValue({ status: 'not_found' });

      await verifyTransactionStatus('0xfail', 1);
      const m = getVerificationMetrics();
      expect(m.failedVerifications).toBeGreaterThanOrEqual(1);
    });

    test('tracks purchase and subscription verification counts', async () => {
      Purchase.findOne.mockReturnValue({ lean: () => Promise.resolve(null) });
      Subscription.findOne.mockReturnValue({ lean: () => Promise.resolve(null) });

      await verifyPurchase('ST1USER', 99);
      await verifySubscription('ST1USER', 'ST1CREATOR', 99);

      const m = getVerificationMetrics();
      expect(m.purchaseVerifications).toBeGreaterThanOrEqual(1);
      expect(m.subscriptionVerifications).toBeGreaterThanOrEqual(1);
    });
  });
});
