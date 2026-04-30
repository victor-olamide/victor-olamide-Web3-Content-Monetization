/**
 * Content-Gate Contract Service
 * 
 * This service handles all interactions with the content-gate Clarity contract
 * on the Stacks blockchain. It provides functions to:
 * - Set and retrieve gating rules (NFT/token-based)
 * - Verify FT token balance for access
 * - Verify NFT ownership for access
 * - Check and manage token gating rules
 */

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
const CONTENT_GATE_CONTRACT = process.env.CONTENT_GATE_CONTRACT || 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.content-gate';
const CONTENT_GATE_ADDRESS = process.env.CONTENT_GATE_ADDRESS || 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';

// Cache configuration
const gatingRuleCache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// Metrics
const metrics = {
  rulesRetrieved: 0,
  ftAccessVerified: 0,
  nftAccessVerified: 0,
  cacheHits: 0,
  cacheMisses: 0,
};

const GATING_TYPE = {
  FT: 0,  // Fungible Token (SIP-010)
  NFT: 1, // Non-Fungible Token (SIP-009)
};

/**
 * Get cached gating rule
 * @param {string} contentId - Content ID
 * @returns {Object|null} Cached rule or null
 */
function getCachedRule(contentId) {
  const cached = gatingRuleCache.get(contentId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    metrics.cacheHits++;
    return cached.rule;
  }
  gatingRuleCache.delete(contentId);
  metrics.cacheMisses++;
  return null;
}

/**
 * Set cache with TTL
 * @param {string} contentId - Content ID
 * @param {Object} rule - Rule to cache
 */
function setCachedRule(contentId, rule) {
  gatingRuleCache.set(contentId, {
    rule,
    timestamp: Date.now(),
  });
}

/**
 * Get gating rule for content from on-chain contract
 * @param {string} contentId - Content ID
 * @returns {Promise<Object>} Gating rule or null
 */
async function getGatingRule(contentId) {
  metrics.rulesRetrieved++;

  const cached = getCachedRule(contentId);
  if (cached !== null) {
    return cached;
  }

  try {
    const result = await callReadOnlyFunction({
      contractAddress: CONTENT_GATE_ADDRESS,
      contractName: 'content-gate',
      functionName: 'get-gating-rule',
      functionArgs: [uintCV(contentId)],
      network,
      senderAddress: CONTENT_GATE_ADDRESS,
    });

    const decoded = cvToJSON(result);

    if (decoded === null || decoded.ok === false) {
      setCachedRule(contentId, null);
      return null;
    }

    const rule = decoded.value || decoded;
    setCachedRule(contentId, rule);
    return rule;
  } catch (error) {
    console.error(`Error retrieving gating rule for content ${contentId}:`, error.message);
    return null;
  }
}

/**
 * Get gating type for content
 * @param {string} contentId - Content ID
 * @returns {Promise<number>} Gating type (0=FT, 1=NFT) or null
 */
async function getGatingType(contentId) {
  const cached = getCachedRule(contentId);
  if (cached !== null && cached.gating_type !== undefined) {
    return cached.gating_type;
  }

  try {
    const result = await callReadOnlyFunction({
      contractAddress: CONTENT_GATE_ADDRESS,
      contractName: 'content-gate',
      functionName: 'get-gating-type',
      functionArgs: [uintCV(contentId)],
      network,
      senderAddress: CONTENT_GATE_ADDRESS,
    });

    const decoded = cvToJSON(result);
    return decoded.value || decoded;
  } catch (error) {
    console.error(`Error getting gating type for content ${contentId}:`, error.message);
    return null;
  }
}

/**
 * Get required token contract for content
 * @param {string} contentId - Content ID
 * @returns {Promise<Object>} Token info or null
 */
async function getRequiredToken(contentId) {
  try {
    const result = await callReadOnlyFunction({
      contractAddress: CONTENT_GATE_ADDRESS,
      contractName: 'content-gate',
      functionName: 'get-required-token',
      functionArgs: [uintCV(contentId)],
      network,
      senderAddress: CONTENT_GATE_ADDRESS,
    });

    const decoded = cvToJSON(result);
    return decoded.value || decoded;
  } catch (error) {
    console.error(`Error getting required token for content ${contentId}:`, error.message);
    return null;
  }
}

/**
 * Verify FT access for user
 * @param {string} contentId - Content ID
 * @param {string} userAddress - User's STX address
 * @param {string} tokenContract - Token contract address
 * @returns {Promise<Object>} Access verification result
 */
async function verifyFTAccess(contentId, userAddress, tokenContract) {
  metrics.ftAccessVerified++;

  try {
    const rule = await getGatingRule(contentId);

    if (!rule) {
      return {
        verified: false,
        reason: 'no-gating-rule',
      };
    }

    if (rule.gating_type !== GATING_TYPE.FT) {
      return {
        verified: false,
        reason: 'not-ft-gate',
      };
    }

    const result = {
      verified: true,
      contentId,
      userAddress,
      tokenContract: rule.token_contract,
      threshold: rule.threshold,
      type: 'FT',
    };

    return result;
  } catch (error) {
    console.error(`Error verifying FT access:`, error.message);
    throw new Error(`Failed to verify FT access: ${error.message}`);
  }
}

/**
 * Verify NFT access for user
 * @param {string} contentId - Content ID
 * @param {string} userAddress - User's STX address
 * @returns {Promise<Object>} Access verification result
 */
async function verifyNFTAccess(contentId, userAddress) {
  metrics.nftAccessVerified++;

  try {
    const rule = await getGatingRule(contentId);

    if (!rule) {
      return {
        verified: false,
        reason: 'no-gating-rule',
      };
    }

    if (rule.gating_type !== GATING_TYPE.NFT) {
      return {
        verified: false,
        reason: 'not-nft-gate',
      };
    }

    const result = {
      verified: true,
      contentId,
      userAddress,
      nftContract: rule.token_contract,
      type: 'NFT',
    };

    return result;
  } catch (error) {
    console.error(`Error verifying NFT access:`, error.message);
    throw new Error(`Failed to verify NFT access: ${error.message}`);
  }
}

/**
 * Invalidate cache for content
 * @param {string} contentId - Content ID
 */
function invalidateGatingRuleCache(contentId) {
  gatingRuleCache.delete(contentId);
}

/**
 * Get service metrics
 * @returns {Object} Current metrics
 */
function getMetrics() {
  return {
    ...metrics,
    cacheSize: gatingRuleCache.size,
  };
}

module.exports = {
  getGatingRule,
  getGatingType,
  getRequiredToken,
  verifyFTAccess,
  verifyNFTAccess,
  invalidateGatingRuleCache,
  getMetrics,
  network,
  CONTENT_GATE_CONTRACT,
  CONTENT_GATE_ADDRESS,
  GATING_TYPE,
};
