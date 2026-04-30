/**
 * Pay-Per-View Transaction Indexer
 * 
 * This service continuously monitors the Stacks blockchain for
 * pay-per-view purchase transactions and syncs them with the backend database.
 * 
 * It polls the Stacks API for recent transactions related to the pay-per-view contract
 * and creates/updates purchase records in MongoDB.
 */

const axios = require('axios');
const Purchase = require('../models/Purchase');
const logger = require('../utils/logger');

const stacksApiUrl = process.env.STACKS_API_URL || (
  process.env.STACKS_NETWORK === 'mainnet'
    ? 'https://stacks-node-api.mainnet.stacks.co'
    : 'https://stacks-node-api.testnet.stacks.co'
);

const PAY_PER_VIEW_CONTRACT = process.env.PAY_PER_VIEW_CONTRACT || 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.pay-per-view';

// Indexer state
const indexerState = {
  lastBlockHeight: 0,
  transactionsProcessed: 0,
  purchasesCreated: 0,
  purchasesUpdated: 0,
  lastSyncTime: null,
  isRunning: false,
  syncInterval: null,
};

/**
 * Parse purchase data from transaction
 */
function parsePurchaseTransaction(tx) {
  try {
    // Extract function call data
    const functionCall = tx.contract_call;
    if (!functionCall || functionCall.function !== 'purchase-content') {
      return null;
    }

    // Parse arguments (content-id would be the first argument)
    const args = tx.tx_result?.repr || '';
    
    return {
      txId: tx.tx_id,
      senderAddress: tx.sender_address,
      blockHeight: tx.block_height,
      timestamp: tx.burn_block_time_iso,
      functionCall: functionCall.function,
      status: tx.tx_status,
      fee: tx.fee_rate,
    };
  } catch (error) {
    logger.warn('Failed to parse purchase transaction', {
      txId: tx.tx_id,
      error: error.message,
    });
    return null;
  }
}

/**
 * Fetch recent transactions for pay-per-view contract
 */
async function fetchContractTransactions(limit = 50, offset = 0) {
  try {
    const response = await axios.get(
      `${stacksApiUrl}/extended/v1/address/${PAY_PER_VIEW_CONTRACT}/transactions`,
      {
        params: {
          limit,
          offset,
        },
        timeout: 10000,
      }
    );

    return response.data.results || [];
  } catch (error) {
    logger.error('Error fetching contract transactions', {
      error: error.message,
      contract: PAY_PER_VIEW_CONTRACT,
    });
    throw error;
  }
}

/**
 * Sync purchases from blockchain to database
 */
async function syncPurchases() {
  if (indexerState.isRunning) {
    logger.debug('Indexer already syncing, skipping this cycle');
    return;
  }

  indexerState.isRunning = true;
  const syncStartTime = Date.now();

  try {
    logger.info('Starting pay-per-view indexer sync', {
      lastBlockHeight: indexerState.lastBlockHeight,
    });

    const transactions = await fetchContractTransactions(50, 0);

    if (transactions.length === 0) {
      logger.debug('No new transactions found');
      indexerState.isRunning = false;
      indexerState.lastSyncTime = new Date();
      return;
    }

    let created = 0;
    let updated = 0;

    for (const tx of transactions) {
      if (tx.tx_status !== 'success') {
        logger.debug('Skipping unsuccessful transaction', { txId: tx.tx_id });
        continue;
      }

      // Skip if we've already processed this block height
      if (tx.block_height <= indexerState.lastBlockHeight) {
        continue;
      }

      indexerState.transactionsProcessed++;

      try {
        // Check if purchase already exists
        const existingPurchase = await Purchase.findOne({ txId: tx.tx_id });

        if (existingPurchase) {
          // Update existing purchase
          existingPurchase.blockHeight = tx.block_height;
          existingPurchase.status = tx.tx_status;
          existingPurchase.indexedAt = new Date();
          await existingPurchase.save();
          updated++;

          logger.debug('Updated purchase record from on-chain data', {
            txId: tx.tx_id,
            purchaseId: existingPurchase._id,
          });
        } else {
          // Create new purchase record from on-chain data
          const purchase = new Purchase({
            txId: tx.tx_id,
            user: tx.sender_address,
            blockHeight: tx.block_height,
            status: tx.tx_status,
            confirmed: true,
            indexedAt: new Date(),
            indexedFrom: 'blockchain',
          });

          await purchase.save();
          created++;

          logger.info('Created purchase record from on-chain data', {
            txId: tx.tx_id,
            purchaseId: purchase._id,
            userAddress: tx.sender_address,
          });
        }

        // Update last block height
        if (tx.block_height > indexerState.lastBlockHeight) {
          indexerState.lastBlockHeight = tx.block_height;
        }
      } catch (error) {
        logger.error('Error processing transaction', {
          txId: tx.tx_id,
          error: error.message,
        });
      }
    }

    indexerState.purchasesCreated += created;
    indexerState.purchasesUpdated += updated;
    indexerState.lastSyncTime = new Date();

    const syncDuration = Date.now() - syncStartTime;

    logger.info('Indexer sync completed', {
      transactionsProcessed: indexerState.transactionsProcessed,
      purchasesCreated: created,
      purchasesUpdated: updated,
      duration: `${syncDuration}ms`,
      lastBlockHeight: indexerState.lastBlockHeight,
    });
  } catch (error) {
    logger.error('Indexer sync failed', {
      error: error.message,
      stack: error.stack,
    });
  } finally {
    indexerState.isRunning = false;
  }
}

/**
 * Start the indexer
 */
function startIndexer(syncIntervalMs = 30000) {
  if (indexerState.syncInterval) {
    logger.warn('Indexer is already running');
    return;
  }

  logger.info('Starting pay-per-view indexer', {
    syncInterval: syncIntervalMs,
    contract: PAY_PER_VIEW_CONTRACT,
  });

  // Run first sync immediately
  syncPurchases().catch(error => {
    logger.error('Initial indexer sync failed', { error: error.message });
  });

  // Set up recurring syncs
  indexerState.syncInterval = setInterval(() => {
    syncPurchases().catch(error => {
      logger.error('Indexer sync failed', { error: error.message });
    });
  }, syncIntervalMs);
}

/**
 * Stop the indexer
 */
function stopIndexer() {
  if (indexerState.syncInterval) {
    clearInterval(indexerState.syncInterval);
    indexerState.syncInterval = null;
    logger.info('Pay-per-view indexer stopped');
  }
}

/**
 * Get indexer statistics
 */
function getIndexerStats() {
  return {
    isRunning: indexerState.isRunning || !!indexerState.syncInterval,
    lastBlockHeight: indexerState.lastBlockHeight,
    transactionsProcessed: indexerState.transactionsProcessed,
    purchasesCreated: indexerState.purchasesCreated,
    purchasesUpdated: indexerState.purchasesUpdated,
    lastSyncTime: indexerState.lastSyncTime,
  };
}

/**
 * Reset indexer statistics
 */
function resetIndexerStats() {
  indexerState.transactionsProcessed = 0;
  indexerState.purchasesCreated = 0;
  indexerState.purchasesUpdated = 0;
  logger.info('Indexer statistics reset');
}

module.exports = {
  startIndexer,
  stopIndexer,
  syncPurchases,
  getIndexerStats,
  resetIndexerStats,
  fetchContractTransactions,
  parsePurchaseTransaction,
};
