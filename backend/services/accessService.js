const Purchase = require('../models/Purchase');
const Subscription = require('../models/Subscription');
const WalletConnection = require('../models/WalletConnection');
const GatingRule = require('../models/GatingRule');
const { verifyFTBalance, verifyNFTOwnership } = require('./tokenService');
const { verifyPurchase, verifySubscription } = require('./blockchainVerification');
const NodeCache = require('node-cache');

// Cache access results for 5 minutes
const accessCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

/**
 * Verify if a user has access to content (either creator, purchased, or token-gated)
 * @param {Object} content - The content object from DB
 * @param {string} userAddress - The Stacks address of the user
 * @returns {Promise<Object>}
 */
async function hasAccess(content, userAddress) {
  if (!userAddress) {
    return { allowed: false, reason: 'No user address provided' };
  }
  
  // 0. Check if content is removed
  if (content.isRemoved) {
    return { allowed: false, reason: 'content-removed', method: null };
  }
  
  // 1. Creator always has access
  if (content.creator === userAddress) {
    return { allowed: true, reason: 'creator', method: 'creator' };
  }

  // 2. Verify on-chain purchase
  const hasPurchased = await verifyPurchase(userAddress, content.contentId);
  if (hasPurchased) {
    return { allowed: true, reason: 'purchase', method: 'pay-per-view' };
  }

  // 3. Check subscription (if applicable)
  if (content.subscriptionTier) {
    const hasSubscription = await verifySubscription(
      userAddress, 
      content.creator, 
      content.subscriptionTier
    );
    if (hasSubscription) {
      return { allowed: true, reason: 'subscription', method: 'subscription' };
    }
  }

  // 4. Check Token-Gating from database
  const gatingRule = await GatingRule.findOne({ contentId: content.contentId, isActive: true });
  if (gatingRule) {
    const { tokenContract, threshold, tokenType } = gatingRule;
    
    if (tokenType === 'FT') {
      const hasTokens = await verifyFTBalance(userAddress, tokenContract, threshold);
      if (hasTokens) {
        return { allowed: true, reason: 'token-gating', method: 'sip-010' };
      }
    } else if (tokenType === 'NFT') {
      const ownsNFT = await verifyNFTOwnership(userAddress, tokenContract, threshold);
      if (ownsNFT) {
        return { allowed: true, reason: 'token-gating', method: 'sip-009' };
      }
    }
  }

  return { allowed: false, reason: 'no-access', method: null };
}

/**
 * Verify access by contentId and user address
 * @param {number} contentId
 * @param {string} userAddress
 * @returns {Promise<Object>}
 */
async function verifyAccess(contentId, userAddress) {
  const cacheKey = `access:${contentId}:${userAddress}`;
  const cachedResult = accessCache.get(cacheKey);
  if (cachedResult) return cachedResult;

  const Content = require('../models/Content');
  const content = await Content.findOne({ contentId });

  if (!content) {
    return { allowed: false, reason: 'content-not-found' };
  }

  const result = await hasAccess(content, userAddress);
  if (result.allowed) {
    accessCache.set(cacheKey, result);
  }
  return result;
}

/**
 * Verify if a user has access to content by userId (checks all connected wallets)
 * @param {Object} content - The content object from DB
 * @param {string} userId - The user ID
 * @returns {Promise<Object>}
 */
async function hasAccessByUserId(content, userId) {
  if (!userId) {
    return { allowed: false, reason: 'No user ID provided' };
  }
  
  // 0. Check if content is removed
  if (content.isRemoved) {
    return { allowed: false, reason: 'content-removed', method: null };
  }
  
  // Get user's connected wallets
  const wallets = await WalletConnection.find({ userId, isConnected: true });
  const userAddresses = wallets.map(w => w.address);
  
  // 1. Creator always has access (check if any wallet is creator)
  if (userAddresses.includes(content.creator)) {
    return { allowed: true, reason: 'creator', method: 'creator' };
  }

  // 2. Check purchases for any of user's addresses
  for (const address of userAddresses) {
    const hasPurchased = await verifyPurchase(address, content.contentId);
    if (hasPurchased) {
      return { allowed: true, reason: 'purchase', method: 'pay-per-view' };
    }
  }

  // 3. Check subscription (if applicable)
  if (content.subscriptionTier) {
    for (const address of userAddresses) {
      const hasSubscription = await verifySubscription(
        address, 
        content.creator, 
        content.subscriptionTier
      );
      if (hasSubscription) {
        return { allowed: true, reason: 'subscription', method: 'subscription' };
      }
    }
  }

  // 4. Check Token-Gating from database
  const gatingRule = await GatingRule.findOne({ contentId: content.contentId, isActive: true });
  if (gatingRule) {
    const { tokenContract, threshold, tokenType } = gatingRule;
    
    for (const address of userAddresses) {
      if (tokenType === 'FT') {
        const hasTokens = await verifyFTBalance(address, tokenContract, threshold);
        if (hasTokens) {
          return { allowed: true, reason: 'token-gating', method: 'sip-010' };
        }
      } else if (tokenType === 'NFT') {
        const ownsNFT = await verifyNFTOwnership(address, tokenContract, threshold);
        if (ownsNFT) {
          return { allowed: true, reason: 'token-gating', method: 'sip-009' };
        }
      }
    }
  }

  return { allowed: false, reason: 'no-access', method: null };
}

/**
 * Verify access with caching by userId
 */
async function verifyAccessByUserId(contentId, userId) {
  const cacheKey = `access:${contentId}:user:${userId}`;
  const cachedResult = accessCache.get(cacheKey);
  if (cachedResult) return cachedResult;

  const Content = require('../models/Content');
  const content = await Content.findOne({ contentId });
  
  if (!content) {
    return { allowed: false, reason: 'content-not-found' };
  }
  
  const result = await hasAccessByUserId(content, userId);
  if (result.allowed) {
    accessCache.set(cacheKey, result);
  }
  return result;
}

module.exports = {
  hasAccess,
  verifyAccess,
  hasAccessByUserId,
  verifyAccessByUserId
};
