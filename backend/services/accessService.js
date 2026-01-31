const Purchase = require('../models/Purchase');
const { verifyFTBalance, verifyNFTOwnership } = require('./tokenService');

/**
 * Verify if a user has access to content (either creator, purchased, or token-gated)
 * @param {Object} content - The content object from DB
 * @param {string} userAddress - The Stacks address of the user
 * @returns {Promise<boolean>}
 */
async function hasAccess(content, userAddress) {
  if (!userAddress) return false;
  
  // 1. Creator always has access
  if (content.creator === userAddress) {
    return true;
  }

  // 2. Check Token-Gating if enabled
  if (content.tokenGating && content.tokenGating.enabled) {
    const { tokenType, tokenContract, minBalance } = content.tokenGating;
    
    if (tokenType === 'sip-010') {
      const hasTokens = await verifyFTBalance(userAddress, tokenContract, minBalance);
      if (hasTokens) return true;
    } else if (tokenType === 'sip-009') {
      const ownsNFT = await verifyNFTOwnership(userAddress, tokenContract, minBalance);
      if (ownsNFT) return true;
    }
  }

  // 3. Check Pay-Per-View purchase
  const purchase = await Purchase.findOne({ 
    user: userAddress, 
    contentId: content.contentId 
  });
  
  if (purchase) {
    return true;
  }

  return false;
}

module.exports = {
  hasAccess
};
