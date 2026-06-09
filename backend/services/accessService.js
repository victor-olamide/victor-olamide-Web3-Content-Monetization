const logger = require('../utils/logger');
const Purchase = require('../models/Purchase');
const Subscription = require('../models/Subscription');
const WalletConnection = require('../models/WalletConnection');
const GatingRule = require('../models/GatingRule');
const { verifyFTBalance, verifyNFTOwnership } = require('./tokenService');
const { verifyPurchase, verifySubscription } = require('./blockchainVerification');
const contentGateService = require('./contentGateService');
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
  try {
    if (!userAddress) {
      return { allowed: false, reason: 'No user address provided' };
    }
    
    if (content.isRemoved) {
      return { allowed: false, reason: 'content-removed', method: null };
    }
    
    if (content.creator === userAddress) {
      return { allowed: true, reason: 'creator', method: 'creator' };
    }

    const hasPurchased = await verifyPurchase(userAddress, content.contentId);
    if (hasPurchased) {
      return { allowed: true, reason: 'purchase', method: 'pay-per-view' };
    }

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

    const onChainRule = await contentGateService.getGatingRule(content.contentId);
    if (onChainRule) {
      if (onChainRule.gating_type === 0) {
        const ftAccess = await contentGateService.verifyFTAccess(
          content.contentId,
          userAddress,
          onChainRule.token_contract
        );
        if (ftAccess.verified) {
          return { allowed: true, reason: 'token-gating', method: 'sip-010' };
        }
      } else if (onChainRule.gating_type === 1) {
        const nftAccess = await contentGateService.verifyNFTAccess(
          content.contentId,
          userAddress
        );
        if (nftAccess.verified) {
          return { allowed: true, reason: 'token-gating', method: 'sip-009' };
        }
      }
    }

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
  } catch (error) {
    logger.error('Access verification failed for content', { contentId: content.contentId, error: error.message });
    throw new Error(`Access verification failed for content ${content.contentId}: ${error.message}`);
  }
}

/**
 * Verify access by contentId and user address
 * @param {number} contentId
 * @param {string} userAddress
 * @returns {Promise<Object>}
 */
async function verifyAccess(contentId, userAddress) {
  try {
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
  } catch (error) {
    throw new Error(`Access verification failed for contentId ${contentId}: ${error.message}`);
  }
}

/**
 * Verify if a user has access to content by userId (checks all connected wallets)
 * @param {Object} content - The content object from DB
 * @param {string} userId - The user ID
 * @returns {Promise<Object>}
 */
async function hasAccessByUserId(content, userId) {
  try {
    if (!userId) {
      return { allowed: false, reason: 'No user ID provided' };
    }
    
    if (content.isRemoved) {
      return { allowed: false, reason: 'content-removed', method: null };
    }
    
    const wallets = await WalletConnection.find({ userId, isConnected: true });
    const userAddresses = wallets.map(w => w.address);
    
    if (userAddresses.includes(content.creator)) {
      return { allowed: true, reason: 'creator', method: 'creator' };
    }

    for (const address of userAddresses) {
      const hasPurchased = await verifyPurchase(address, content.contentId);
      if (hasPurchased) {
        return { allowed: true, reason: 'purchase', method: 'pay-per-view' };
      }
    }

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

    const onChainRule = await contentGateService.getGatingRule(content.contentId);
    if (onChainRule) {
      for (const address of userAddresses) {
        if (onChainRule.gating_type === 0) {
          const ftAccess = await contentGateService.verifyFTAccess(
            content.contentId,
            address,
            onChainRule.token_contract
          );
          if (ftAccess.verified) {
            return { allowed: true, reason: 'token-gating', method: 'sip-010' };
          }
        } else if (onChainRule.gating_type === 1) {
          const nftAccess = await contentGateService.verifyNFTAccess(
            content.contentId,
            address
          );
          if (nftAccess.verified) {
            return { allowed: true, reason: 'token-gating', method: 'sip-009' };
          }
        }
      }
    }

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
  } catch (error) {
    throw new Error(`Access verification by userId failed for user ${userId}: ${error.message}`);
  }
}

/**
 * Verify access with caching by userId
 */
async function verifyAccessByUserId(contentId, userId) {
  try {
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
  } catch (error) {
    throw new Error(`Access verification by userId failed for contentId ${contentId}: ${error.message}`);
  }
}

module.exports = {
  hasAccess,
  verifyAccess,
  hasAccessByUserId,
  verifyAccessByUserId
};
