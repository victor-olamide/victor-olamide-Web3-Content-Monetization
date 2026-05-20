const { StacksMainnet, StacksTestnet } = require('@stacks/network');
const axios = require('axios');

const network = process.env.STACKS_NETWORK === 'mainnet' ? new StacksMainnet() : new StacksTestnet();
const stacksApiUrl = process.env.STACKS_API_URL || (process.env.STACKS_NETWORK === 'mainnet'
  ? 'https://stacks-node-api.mainnet.stacks.co'
  : 'https://stacks-node-api.testnet.stacks.co');

/**
 * Verify transaction status on Stacks blockchain
 * @param {string} txId - Transaction ID
 * @returns {Promise<Object>} Transaction status and details
 */
async function verifyTransaction(txId) {
  try {
    const response = await axios.get(`${stacksApiUrl}/extended/v1/tx/${txId}`);
    const tx = response.data;

    return {
      txId,
      status: tx.tx_status,
      success: tx.tx_status === 'success',
      blockHeight: tx.block_height,
      blockTime: tx.burn_block_time_iso,
      confirmations: tx.confirmations || 0,
      raw: tx
    };
  } catch (error) {
    if (error.response?.status === 404) {
      return { txId, status: 'not_found', success: false };
    }
    console.error('Error verifying transaction:', error.message);
    throw new Error('Failed to verify transaction');
  }
}

/**
 * Wait for transaction confirmation
 * @param {string} txId - Transaction ID
 * @param {number} maxAttempts - Maximum attempts
 * @param {number} delayMs - Delay between attempts
 * @returns {Promise<Object>} Transaction details when confirmed
 */
async function waitForConfirmation(txId, maxAttempts = 30, delayMs = 10000) {
  for (let i = 0; i < maxAttempts; i++) {
    const result = await verifyTransaction(txId);

    if (result.success) {
      return result;
    }

    if (result.status === 'abort_by_response' || result.status === 'abort_by_post_condition') {
      throw new Error(`Transaction failed: ${result.status}`);
    }

    await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  throw new Error('Transaction confirmation timeout');
}

module.exports = {
  verifyTransaction,
  waitForConfirmation
};