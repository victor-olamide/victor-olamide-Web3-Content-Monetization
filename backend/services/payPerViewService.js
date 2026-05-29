/**
 * Pay-Per-View Contract Service
 * 
 * This service handles all interactions with the pay-per-view Clarity contract
 * on the Stacks blockchain. It provides functions to:
 * - Add content with pricing
 * - Verify purchases on-chain
 * - Check access to content
 * - Update content pricing
 * - Remove content
 * - Handle refunds
 */

const logger = require('../utils/logger');
const {
  callReadOnlyFunction,
  cvToJSON,
  standardPrincipalCV,
  uintCV,
} = require('@stacks/transactions');
const { StacksMainnet, StacksTestnet } = require('@stacks/network');
const axios = require('axios');

// Network configuration
const network = process.env.STACKS_NETWORK === 'mainnet'
  ? new StacksMainnet()
  : new StacksTestnet();

const stacksApiUrl = process.env.STACKS_API_URL || (
  process.env.STACKS_NETWORK === 'mainnet'
    ? 'https://stacks-node-api.mainnet.stacks.co'
    : 'https://stacks-node-api.testnet.stacks.co'
);

// Contract configuration
const PAY_PER_VIEW_CONTRACT = process.env.PAY_PER_VIEW_CONTRACT || 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.pay-per-view';
const PAY_PER_VIEW_ADDRESS = process.env.PAY_PER_VIEW_ADDRESS || 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';

// Cache configuration
const verificationCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Metrics
const metrics = {
  contentAddedSuccess: 0,
  contentAddedFailed: 0,
  purchaseVerifications: 0,
  accessChecks: 0,
  cacheHits: 0,
  cacheMisses: 0,
};

/**
 * Get cached verification result
 * @param {string} cacheKey - Cache key
 * @returns {Object|null} Cached result or null
 */
function getCachedResult(cacheKey) {
  try {
    const cached = verificationCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      metrics.cacheHits++;
      return cached.result;
    }
    verificationCache.delete(cacheKey);
    metrics.cacheMisses++;
    return null;
  } catch (error) {
    logger.error('Cache retrieval failed', { cacheKey, error: error.message });
    return null;
  }
}

function setCachedResult(cacheKey, result) {
  try {
    verificationCache.set(cacheKey, {
      result,
      timestamp: Date.now(),
    });
  } catch (error) {
    logger.error('Failed to set cache result', { cacheKey, error: error.message });
  }
}

/**
 * Check if a user has access to content based on on-chain purchase
 * @param {string} contentId - Content ID
 * @param {string} userAddress - User's STX address
 * @returns {Promise<boolean>} Whether user has access
 */
async function checkContentAccess(contentId, userAddress) {
  metrics.accessChecks++;

  const cacheKey = `access-${contentId}-${userAddress}`;
  const cached = getCachedResult(cacheKey);
  if (cached !== null) {
    return cached;
  }

  try {
    const result = await callReadOnlyFunction({
      contractAddress: PAY_PER_VIEW_ADDRESS,
      contractName: 'pay-per-view',
      functionName: 'has-access',
      functionArgs: [uintCV(contentId), standardPrincipalCV(userAddress)],
      network,
      senderAddress: userAddress,
    });

    const decoded = cvToJSON(result);
    let hasAccess = false;

    if (typeof decoded === 'boolean') {
      hasAccess = decoded;
    } else if (decoded && typeof decoded === 'object') {
      if (decoded.type === 'bool') {
        hasAccess = decoded.value === true;
      } else if (decoded.value === true || decoded.ok === true) {
        hasAccess = true;
      }
    }

    setCachedResult(cacheKey, hasAccess);
    return hasAccess;
  } catch (error) {
    logger.error('Failed to check content access', { contentId, userAddress, error: error.message });
    throw new Error(`Failed to check content access: ${error.message}`);
  }
}

/**
 * Verify a user purchase against on-chain state
 * @param {string} contentId - Content ID
 * @param {string} userAddress - User's STX address
 * @param {string} txId - Transaction ID to verify
 * @returns {Promise<Object>} Verification result
 */
async function verifyPurchase(contentId, userAddress, txId) {
  metrics.purchaseVerifications++;

  const cacheKey = `purchase-${contentId}-${userAddress}-${txId}`;
  const cached = getCachedResult(cacheKey);
  if (cached !== null) {
    return cached;
  }

  try {
    // First verify the transaction is confirmed
    const txResponse = await axios.get(
      `${stacksApiUrl}/extended/v1/tx/${txId}`
    );

    if (txResponse.data.tx_status !== 'success') {
      return {
        verified: false,
        txStatus: txResponse.data.tx_status,
        error: 'Transaction not confirmed',
      };
    }

    // Then check on-chain access
    const hasAccess = await checkContentAccess(contentId, userAddress);

    const result = {
      verified: hasAccess,
      txId,
      txStatus: txResponse.data.tx_status,
      blockHeight: txResponse.data.block_height,
      confirmations: txResponse.data.confirmations || 0,
    };

    setCachedResult(cacheKey, result);
    return result;
  } catch (error) {
    logger.error('Purchase verification failed', { contentId, userAddress, txId, error: error.message });
    throw new Error(`Failed to verify purchase: ${error.message}`);
  }
}

/**
 * Get content pricing from on-chain contract
 * @param {string} contentId - Content ID
 * @returns {Promise<Object>} Content pricing info
 */
async function getContentPricing(contentId) {
  const cacheKey = `pricing-${contentId}`;
  const cached = getCachedResult(cacheKey);
  if (cached !== null) {
    return cached;
  }

  try {
    const result = await callReadOnlyFunction({
      contractAddress: PAY_PER_VIEW_ADDRESS,
      contractName: 'pay-per-view',
      functionName: 'get-content-pricing',
      functionArgs: [uintCV(contentId)],
      network,
      senderAddress: PAY_PER_VIEW_ADDRESS,
    });

    const pricingData = cvToJSON(result);
    setCachedResult(cacheKey, pricingData);
    return pricingData;
  } catch (error) {
    logger.error('Failed to get content pricing', { contentId, error: error.message });
    throw new Error(`Failed to get content pricing: ${error.message}`);
  }
}

/**
 * Invalidate cache for a content ID
 * @param {string} contentId - Content ID
 */
function invalidateContentCache(contentId) {
  try {
    const keysToDelete = [];
    for (const key of verificationCache.keys()) {
      if (key.includes(contentId)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => verificationCache.delete(key));
    logger.debug('Content cache invalidated', { contentId, keysRemoved: keysToDelete.length });
  } catch (error) {
    logger.error('Failed to invalidate content cache', { contentId, error: error.message });
  }
}

/**
 * Get service metrics
 * @returns {Object} Current metrics
 */
function getMetrics() {
  return {
    ...metrics,
    cacheSize: verificationCache.size,
  };
}

module.exports = {
  checkContentAccess,
  verifyPurchase,
  getContentPricing,
  invalidateContentCache,
  getMetrics,
  network,
  PAY_PER_VIEW_CONTRACT,
  PAY_PER_VIEW_ADDRESS,
};
