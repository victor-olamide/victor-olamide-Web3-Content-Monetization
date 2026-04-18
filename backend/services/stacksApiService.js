const { StacksMainnet, StacksTestnet } = require('@stacks/network');
const axios = require('axios');

const network = process.env.STACKS_NETWORK === 'mainnet' ? new StacksMainnet() : new StacksTestnet();
const stacksApiUrl = process.env.STACKS_API_URL || (process.env.STACKS_NETWORK === 'mainnet'
  ? 'https://stacks-node-api.mainnet.stacks.co'
  : 'https://stacks-node-api.testnet.stacks.co');

const DEFAULT_RETRY_ATTEMPTS = 3;
const DEFAULT_RETRY_DELAY_MS = 1000;

/**
 * Sleep helper
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Verify transaction status on Stacks blockchain with retry
 * @param {string} txId - Transaction ID
 * @param {number} retries - Number of retry attempts on transient errors
 * @returns {Promise<Object>} Transaction status and details
 */
async function verifyTransaction(txId, retries = DEFAULT_RETRY_ATTEMPTS) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
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
        txType: tx.tx_type,
        senderAddress: tx.sender_address,
        raw: tx
      };
    } catch (error) {
      if (error.response?.status === 404) {
        return { txId, status: 'not_found', success: false };
      }
      // Rate-limited — back off before retry
      if (error.response?.status === 429) {
        const retryAfter = parseInt(error.response.headers['retry-after'] || '5', 10) * 1000;
        await sleep(retryAfter);
        lastError = error;
        continue;
      }
      lastError = error;
      if (attempt < retries) {
        await sleep(DEFAULT_RETRY_DELAY_MS * Math.pow(2, attempt));
      }
    }
  }
  console.error('Error verifying transaction after retries:', lastError?.message);
  throw new Error('Failed to verify transaction');
}

/**
 * Fetch current block height from Stacks API
 * @returns {Promise<number>} Current block height
 */
async function getCurrentBlockHeight() {
  try {
    const response = await axios.get(`${stacksApiUrl}/v2/info`);
    return response.data.stacks_tip_height || 0;
  } catch (error) {
    console.error('Error fetching block height:', error.message);
    return 0;
  }
}

/**
 * Fetch multiple transactions in parallel
 * @param {string[]} txIds - Array of transaction IDs
 * @returns {Promise<Object[]>} Array of transaction results
 */
async function batchVerifyTransactions(txIds) {
  return Promise.all(txIds.map(txId => verifyTransaction(txId).catch(err => ({
    txId,
    status: 'error',
    success: false,
    error: err.message
  }))));
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

    await sleep(delayMs);
  }

  throw new Error('Transaction confirmation timeout');
}

module.exports = {
  verifyTransaction,
  waitForConfirmation,
  getCurrentBlockHeight,
  batchVerifyTransactions
};
