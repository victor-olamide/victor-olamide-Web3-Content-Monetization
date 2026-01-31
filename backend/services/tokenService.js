const axios = require('axios');

const STACKS_API_URL = process.env.STACKS_API_URL || 'https://api.mainnet.hiro.so';

/**
 * Verify if an address has a minimum balance of a specific SIP-010 token
 * @param {string} address - The Stacks address to check
 * @param {string} contractAddress - The full contract identifier (e.g. 'SP3D6PV...token-alex::alex')
 * @param {number} minBalance - The minimum balance required
 * @returns {Promise<boolean>}
 */
async function verifyFTBalance(address, contractAddress, minBalance = 1) {
  try {
    const response = await axios.get(`${STACKS_API_URL}/extended/v1/address/${address}/balances`);
    const ftBalances = response.data.fungible_tokens;
    
    if (ftBalances && ftBalances[contractAddress]) {
      const balance = parseInt(ftBalances[contractAddress].balance);
      return balance >= minBalance;
    }
    
    return false;
  } catch (error) {
    console.error('Error verifying FT balance:', error.message);
    return false;
  }
}

/**
 * Verify if an address owns at least one SIP-009 NFT from a specific collection
 * @param {string} address - The Stacks address to check
 * @param {string} contractAddress - The full contract identifier (e.g. 'SP2KAF9...stacks-punks-v3::stacks-punks')
 * @param {number} minCount - The minimum count required
 * @returns {Promise<boolean>}
 */
async function verifyNFTOwnership(address, contractAddress, minCount = 1) {
  try {
    const response = await axios.get(`${STACKS_API_URL}/extended/v1/address/${address}/balances`);
    const nftBalances = response.data.non_fungible_tokens;
    
    if (nftBalances && nftBalances[contractAddress]) {
      const count = parseInt(nftBalances[contractAddress].count);
      return count >= minCount;
    }
    
    return false;
  } catch (error) {
    console.error('Error verifying NFT ownership:', error.message);
    return false;
  }
}

module.exports = {
  verifyFTBalance,
  verifyNFTOwnership
};
