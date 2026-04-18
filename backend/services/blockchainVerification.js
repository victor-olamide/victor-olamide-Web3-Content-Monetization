/**
 * Blockchain Transaction Verification Service
 *
 * This service handles verification of on-chain transactions for subscription payments
 * and pay-per-view (PPV) purchases on the Stacks blockchain. It polls the Stacks API
 * to confirm transaction status before granting access to content.
 *
 * Key features:
 * - Transaction status verification with caching
 * - Polling for transaction confirmation
 * - Purchase and subscription verification
 * - Batch verification for multiple transactions
 * - Access determination based on verified transactions
 */

const { callReadOnlyFunction, cvToJSON, standardPrincipalCV, uintCV } = require('@stacks/transactions');
const { StacksMainnet, StacksTestnet } = require('@stacks/network');
const { verifyTransaction, batchVerifyTransactions, getCurrentBlockHeight } = require('./stacksApiService');
const Purchase = require('../models/Purchase');
const Subscription = require('../models/Subscription');
const TransactionVerification = require('../models/TransactionVerification');

const network = process.env.STACKS_NETWORK === 'mainnet' ? new StacksMainnet() : new StacksTestnet();
const contractAddress = process.env.CONTRACT_ADDRESS || 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';

// ─── In-memory verification cache ────────────────────────────────────────────
const verificationCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ─── Simple metrics counters ─────────────────────────────────────────────────
const metrics = {
  totalVerifications: 0,
  cacheHits: 0,
  cacheMisses: 0,
  successfulVerifications: 0,
  failedVerifications: 0,
  purchaseVerifications: 0,
  subscriptionVerifications: 0,
  pollingAttempts: 0,
  pollingSuccesses: 0,
  pollingFailures: 0
};

// ─── Transaction type constants ───────────────────────────────────────────────
const TX_TYPES = {
  PURCHASE: 'purchase',
  SUBSCRIPTION: 'subscription',
  UNKNOWN: 'unknown'
};

// ─── Cache helpers ────────────────────────────────────────────────────────────
function getCachedVerification(txId) {
  const cached = verificationCache.get(txId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    metrics.cacheHits++;
    return cached.result;
  }
  verificationCache.delete(txId);
  metrics.cacheMisses++;
  return null;
}

function setCachedVerification(txId, result) {
  verificationCache.set(txId, { result, timestamp: Date.now() });
}

/**
 * Evict all expired entries from the cache
 */
function evictExpiredCache() {
  const now = Date.now();
  for (const [key, value] of verificationCache.entries()) {
    if (now - value.timestamp >= CACHE_TTL) {
      verificationCache.delete(key);
    }
  }
}

// ─── Transaction details ──────────────────────────────────────────────────────

/**
 * Get detailed transaction information from blockchain
 * @param {string} txId - Transaction ID
 * @returns {Promise<Object>} Detailed transaction info
 */
async function getTransactionDetails(txId) {
  try {
    const txResult = await verifyTransaction(txId);
    if (txResult.status === 'not_found') {
      return { found: false, txId };
    }
    return {
      found: true,
      txId,
      status: txResult.status,
      success: txResult.success,
      blockHeight: txResult.blockHeight,
      blockTime: txResult.blockTime,
      confirmations: txResult.confirmations,
      senderAddress: txResult.senderAddress,
      txType: txResult.txType,
      raw: txResult.raw
    };
  } catch (error) {
    console.error('Error getting transaction details:', error);
    return { found: false, txId, error: error.message };
  }
}

// ─── Core verification ────────────────────────────────────────────────────────

/**
 * Verify transaction status on blockchain with caching
 * @param {string} txId - Transaction ID
 * @param {number} minConfirmations - Minimum confirmations required
 * @returns {Promise<Object>} Verification result
 */
async function verifyTransactionStatus(txId, minConfirmations = 1) {
  metrics.totalVerifications++;
  console.log(`Verifying transaction ${txId} with min confirmations ${minConfirmations}`);
  try {
    const cached = getCachedVerification(txId);
    if (cached) return cached;

    const txResult = await verifyTransaction(txId);

    if (txResult.status === 'not_found') {
      const result = { verified: false, status: 'not_found', confirmations: 0 };
      setCachedVerification(txId, result);
      metrics.failedVerifications++;
      return result;
    }

    if (!txResult.success) {
      const result = { verified: false, status: txResult.status, confirmations: 0 };
      setCachedVerification(txId, result);
      metrics.failedVerifications++;
      return result;
    }

    const confirmations = txResult.confirmations || 0;
    const verified = confirmations >= minConfirmations;

    const result = {
      verified,
      status: txResult.status,
      confirmations,
      blockHeight: txResult.blockHeight,
      blockTime: txResult.blockTime,
      txType: txResult.txType,
      senderAddress: txResult.senderAddress,
      txId
    };

    if (verified) {
      setCachedVerification(txId, result);
      metrics.successfulVerifications++;
    } else {
      metrics.failedVerifications++;
    }

    // Persist verification result asynchronously (non-blocking)
    TransactionVerification.findOneAndUpdate(
      { txId },
      { ...result, updatedAt: new Date() },
      { upsert: true, new: true }
    ).catch(err => console.error('Failed to persist verification:', err.message));

    return result;
  } catch (error) {
    console.error('Transaction verification error:', error);
    metrics.failedVerifications++;
    return { verified: false, status: 'error', confirmations: 0, error: error.message };
  }
}

/**
 * Detect the type of a transaction (purchase vs subscription) from on-chain data
 * @param {string} txId - Transaction ID
 * @returns {Promise<string>} Transaction type
 */
async function detectTransactionType(txId) {
  try {
    const txResult = await verifyTransaction(txId);
    if (!txResult || txResult.status === 'not_found') return TX_TYPES.UNKNOWN;

    const contractCall = txResult.raw?.contract_call;
    if (!contractCall) return TX_TYPES.UNKNOWN;

    const fnName = contractCall.function_name || '';
    if (fnName.includes('purchase') || fnName.includes('buy')) return TX_TYPES.PURCHASE;
    if (fnName.includes('subscribe') || fnName.includes('subscription')) return TX_TYPES.SUBSCRIPTION;
    return TX_TYPES.UNKNOWN;
  } catch {
    return TX_TYPES.UNKNOWN;
  }
}

// ─── Purchase verification ────────────────────────────────────────────────────

/**
 * Verify if user has purchased content on-chain with transaction confirmation
 * @param {string} userAddress - User Stacks address
 * @param {number} contentId - Content ID
 * @returns {Promise<boolean>}
 */
async function verifyPurchase(userAddress, contentId) {
  metrics.purchaseVerifications++;
  try {
    const purchase = await Purchase.findOne({ user: userAddress, contentId }).lean();
    if (!purchase) return false;

    const txVerification = await verifyTransactionStatus(purchase.txId, 1);
    if (!txVerification.verified) {
      console.warn(`Purchase tx ${purchase.txId} not confirmed: ${txVerification.status}`);
      return false;
    }

    const result = await callReadOnlyFunction({
      contractAddress,
      contractName: 'pay-per-view',
      functionName: 'has-access',
      functionArgs: [uintCV(contentId), standardPrincipalCV(userAddress)],
      network,
      senderAddress: userAddress
    });

    return cvToJSON(result).value;
  } catch (err) {
    console.error('Purchase verification error:', err);
    return false;
  }
}

/**
 * Verify multiple purchases in batch
 * @param {string} userAddress - User Stacks address
 * @param {number[]} contentIds - Array of content IDs
 * @returns {Promise<Object>} Map of contentId -> verified boolean
 */
async function batchVerifyPurchases(userAddress, contentIds) {
  const results = {};
  await Promise.all(
    contentIds.map(async (contentId) => {
      results[contentId] = await verifyPurchase(userAddress, contentId);
    })
  );
  return results;
}

// ─── Subscription verification ────────────────────────────────────────────────

/**
 * Verify if user has active subscription on-chain with transaction confirmation
 * @param {string} userAddress - User Stacks address
 * @param {string} creatorAddress - Creator Stacks address
 * @param {number} tierId - Subscription tier ID
 * @returns {Promise<boolean>}
 */
async function verifySubscription(userAddress, creatorAddress, tierId) {
  metrics.subscriptionVerifications++;
  try {
    const subscription = await Subscription.findOne({
      user: userAddress,
      creator: creatorAddress,
      tierId,
      cancelledAt: null
    }).lean();

    if (!subscription) return false;

    if (subscription.expiry && new Date() > subscription.expiry) {
      if (subscription.graceExpiresAt && new Date() < subscription.graceExpiresAt) {
        // Within grace period — allow access
      } else {
        return false;
      }
    }

    const txVerification = await verifyTransactionStatus(subscription.transactionId, 1);
    if (!txVerification.verified) {
      console.warn(`Subscription tx ${subscription.transactionId} not confirmed: ${txVerification.status}`);
      return false;
    }

    const result = await callReadOnlyFunction({
      contractAddress,
      contractName: 'subscription',
      functionName: 'is-subscribed',
      functionArgs: [
        standardPrincipalCV(userAddress),
        standardPrincipalCV(creatorAddress),
        uintCV(tierId)
      ],
      network,
      senderAddress: userAddress
    });

    return cvToJSON(result).value;
  } catch (err) {
    console.error('Subscription verification error:', err);
    return false;
  }
}

// ─── On-chain read helpers ────────────────────────────────────────────────────

/**
 * Get content info from on-chain contract
 */
async function getContentInfo(contentId) {
  try {
    const result = await callReadOnlyFunction({
      contractAddress,
      contractName: 'pay-per-view',
      functionName: 'get-content-info',
      functionArgs: [uintCV(contentId)],
      network,
      senderAddress: contractAddress
    });

    const data = cvToJSON(result);
    return data.value ? data.value : null;
  } catch (err) {
    console.error('Content info error:', err);
    return null;
  }
}

/**
 * Verify token gating rule from on-chain
 */
async function verifyGatingRule(contentId) {
  try {
    const result = await callReadOnlyFunction({
      contractAddress,
      contractName: 'content-gate',
      functionName: 'get-gating-rule',
      functionArgs: [uintCV(contentId)],
      network,
      senderAddress: contractAddress
    });

    const data = cvToJSON(result);
    return data.value ? data.value : null;
  } catch (err) {
    console.error('Gating rule error:', err);
    return null;
  }
}

// ─── Transaction status helpers ───────────────────────────────────────────────

/**
 * Check if a transaction is in pending state
 * @param {string} txId - Transaction ID
 * @returns {Promise<boolean>} True if pending
 */
async function isTransactionPending(txId) {
  try {
    const result = await verifyTransactionStatus(txId, 0); // 0 confirmations to check status
    return result.status === 'pending';
  } catch {
    return false;
  }
}

/**
 * Check if a transaction is confirmed
 * @param {string} txId - Transaction ID
 * @param {number} minConfirmations - Minimum confirmations
 * @returns {Promise<boolean>} True if confirmed
 */
async function isTransactionConfirmed(txId, minConfirmations = 1) {
  try {
    const result = await verifyTransactionStatus(txId, minConfirmations);
    return result.verified;
  } catch {
    return false;
  }
}

/**
 * Get the time taken for transaction confirmation
 * @param {string} txId - Transaction ID
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise<Object>} Confirmation time result
 */
async function getConfirmationTime(txId, timeoutMs = 300000) {
  const startTime = Date.now();
  try {
    const result = await _pollForConfirmation(txId, timeoutMs, 'Transaction');
    const confirmationTime = Date.now() - startTime;
    return {
      confirmed: true,
      confirmationTimeMs: confirmationTime,
      ...result
    };
  } catch (error) {
    const elapsedTime = Date.now() - startTime;
    return {
      confirmed: false,
      elapsedTimeMs: elapsedTime,
      error: error.message
    };
  }
}

// ─── Polling / wait helpers ───────────────────────────────────────────────────

/**
 * Poll for transaction confirmation with exponential backoff
 * @param {string} txId - Transaction ID
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {string} txLabel - Label for error messages ('Purchase' | 'Subscription')
 * @returns {Promise<Object>} Confirmation result
 */
async function _pollForConfirmation(txId, timeoutMs, txLabel) {
  const maxAttempts = Math.ceil(timeoutMs / 10000);
  let delay = 10000;
  let attempts = 0;

  for (let i = 0; i < maxAttempts; i++) {
    attempts++;
    metrics.pollingAttempts++;
    console.log(`Polling attempt ${attempts} for ${txLabel} transaction ${txId}`);
    const verification = await verifyTransactionStatus(txId, 1);

    if (verification.verified) {
      console.log(`${txLabel} transaction ${txId} confirmed after ${attempts} attempts`);
      metrics.pollingSuccesses++;
      return {
        confirmed: true,
        confirmations: verification.confirmations,
        blockHeight: verification.blockHeight,
        blockTime: verification.blockTime
      };
    }

    if (verification.status === 'abort_by_response' || verification.status === 'abort_by_post_condition') {
      metrics.pollingFailures++;
      throw new Error(`${txLabel} transaction failed: ${verification.status}`);
    }

    await new Promise(resolve => setTimeout(resolve, delay));
    delay = Math.min(delay * 1.5, 30000); // cap at 30s
  }

  metrics.pollingFailures++;
  throw new Error(`${txLabel} transaction confirmation timeout after ${attempts} attempts`);
}

/**
 * Wait for purchase transaction confirmation
 * @param {string} txId - Transaction ID
 * @param {number} timeoutMs - Timeout in milliseconds (default 5 minutes)
 * @returns {Promise<Object>} Confirmation result
 */
async function waitForPurchaseConfirmation(txId, timeoutMs = 300000) {
  try {
    return await _pollForConfirmation(txId, timeoutMs, 'Purchase');
  } catch (error) {
    console.error('Error waiting for purchase confirmation:', error);
    if (error.message.includes('timeout') || error.message.includes('failed')) throw error;
    return { confirmed: false, error: error.message };
  }
}

/**
 * Wait for subscription transaction confirmation
 * @param {string} txId - Transaction ID
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise<Object>} Confirmation result
 */
async function waitForSubscriptionConfirmation(txId, timeoutMs = 300000) {
  try {
    return await _pollForConfirmation(txId, timeoutMs, 'Subscription');
  } catch (error) {
    console.error('Error waiting for subscription confirmation:', error);
    if (error.message.includes('timeout') || error.message.includes('failed')) throw error;
    return { confirmed: false, error: error.message };
  }
}

// ─── Batch transaction verification ──────────────────────────────────────────

/**
 * Verify multiple transaction IDs in parallel
 * @param {string[]} txIds - Array of transaction IDs
 * @param {number} minConfirmations - Minimum confirmations required
 * @returns {Promise<Object[]>} Array of verification results
 */
async function batchVerifyTransactionStatuses(txIds, minConfirmations = 1) {
  const rawResults = await batchVerifyTransactions(txIds);
  return rawResults.map(txResult => {
    if (txResult.status === 'error' || txResult.status === 'not_found' || !txResult.success) {
      return { txId: txResult.txId, verified: false, status: txResult.status || 'error' };
    }
    const confirmations = txResult.confirmations || 0;
    return {
      txId: txResult.txId,
      verified: confirmations >= minConfirmations,
      status: txResult.status,
      confirmations,
      blockHeight: txResult.blockHeight
    };
  });
}

// ─── Access granting ──────────────────────────────────────────────────────────

/**
 * Determine if access should be granted based on transaction verification
 * Checks both purchase and subscription paths
 * @param {string} userAddress - User Stacks address
 * @param {number} contentId - Content ID
 * @param {string} creatorAddress - Creator Stacks address
 * @param {number} tierId - Subscription tier ID
 * @returns {Promise<Object>} { granted, method, reason }
 */
async function determineAccess(userAddress, contentId, creatorAddress, tierId) {
  const hasPurchase = await verifyPurchase(userAddress, contentId);
  if (hasPurchase) {
    return { granted: true, method: 'purchase', reason: 'on-chain purchase verified' };
  }

  if (creatorAddress && tierId !== undefined) {
    const hasSubscription = await verifySubscription(userAddress, creatorAddress, tierId);
    if (hasSubscription) {
      return { granted: true, method: 'subscription', reason: 'on-chain subscription verified' };
    }
  }

  return { granted: false, method: null, reason: 'no verified purchase or subscription' };
}

// ─── Cache management ─────────────────────────────────────────────────────────

function clearVerificationCache() {
  verificationCache.clear();
}

/**
 * Invalidate cache for a specific transaction
 * @param {string} txId - Transaction ID
 */
function invalidateCacheForTx(txId) {
  verificationCache.delete(txId);
}

function getCacheStats() {
  return {
    size: verificationCache.size,
    entries: Array.from(verificationCache.keys())
  };
}

function getVerificationMetrics() {
  return { ...metrics };
}

module.exports = {
  verifyPurchase,
  verifySubscription,
  getContentInfo,
  verifyGatingRule,
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
};
