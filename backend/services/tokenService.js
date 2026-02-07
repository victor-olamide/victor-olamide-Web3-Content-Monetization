const axios = require('axios');

const STACKS_API_URL = process.env.STACKS_API_URL || 'https://api.mainnet.hiro.so';

// Simple in-memory cache for token balances (userAddress + contractAddress -> { balance, timestamp })
const balanceCache = new Map();
const CACHE_TTL = 60 * 1000; // 1 minute

/**
 * Get cached balance or fetch from API
 * @param {string} address 
 * @returns {Promise<Object>}
 */
async function getBalances(address) {
  const cacheKey = address;
  const now = Date.now();
  
  if (balanceCache.has(cacheKey)) {
    const cached = balanceCache.get(cacheKey);
    if (now - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
  }

  try {
    const response = await axios.get(`${STACKS_API_URL}/extended/v1/address/${address}/balances`, {
      timeout: 5000 // 5 seconds timeout
    });
    
    balanceCache.set(cacheKey, {
      data: response.data,
      timestamp: now
    });
    
    return response.data;
  } catch (error) {
    if (error.response) {
      // API responded with an error (e.g. 404, 429)
      console.error(`Hiro API error (${error.response.status}):`, error.response.data);
      if (error.response.status === 404) {
        // Address might not exist yet on chain, return empty balances
        return { stx: { balance: '0' }, fungible_tokens: {}, non_fungible_tokens: {} };
      }
    } else if (error.request) {
      // Request was made but no response was received
      console.error('Hiro API no response:', error.message);
    } else {
      console.error('Error setting up Hiro API request:', error.message);
    }
    throw error; // Propagate error so caller can handle it
  }
}

/**
 * Verify if an address has a minimum balance of a specific SIP-010 token
 * @param {string} address - The Stacks address to check
 * @param {string} contractAddress - The full contract identifier (e.g. 'SP3D6PV...token-alex::alex')
 * @param {number} minBalance - The minimum balance required
 * @returns {Promise<boolean>}
 */
async function verifyFTBalance(address, contractAddress, minBalance = 1) {
  try {
    const balances = await getBalances(address);
    const ftBalances = balances.fungible_tokens;
    
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
    const balances = await getBalances(address);
    const nftBalances = balances.non_fungible_tokens;
    
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
