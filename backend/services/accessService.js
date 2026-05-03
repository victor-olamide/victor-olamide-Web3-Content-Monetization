const Purchase = require('../models/Purchase');
const Subscription = require('../models/Subscription');
const { verifyFTBalance, verifyNFTOwnership } = require('./tokenService');
const { verifyPurchase, verifySubscription, verifyGatingRule } = require('./blockchainVerification');

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

  // 4. Check Token-Gating from on-chain
  const gatingRule = await verifyGatingRule(content.contentId);
  if (gatingRule) {
    const { 'token-contract': tokenContract, threshold, 'gating-type': gatingType } = gatingRule;
    
    if (gatingType === 0) { // FT
      const hasTokens = await verifyFTBalance(userAddress, tokenContract, threshold);
      if (hasTokens) {
        return { allowed: true, reason: 'token-gating', method: 'sip-010' };
      }
    } else if (gatingType === 1) { // NFT
      const ownsNFT = await verifyNFTOwnership(userAddress, tokenContract, threshold);
      if (ownsNFT) {
        return { allowed: true, reason: 'token-gating', method: 'sip-009' };
      }
    }
  }

  return { allowed: false, reason: 'no-access', method: null };
}

/**
 * Verify access with caching
 */
async function verifyAccess(contentId, userAddress) {
  const Content = require('../models/Content');
  const content = await Content.findOne({ contentId });
  
  if (!content) {
    return { allowed: false, reason: 'content-not-found' };
  }
  
  return await hasAccess(content, userAddress);
}

module.exports = {
  hasAccess,
  verifyAccess
};
