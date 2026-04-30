/**
 * Content-Gate Transaction Indexer
 * 
 * Continuously monitors the Stacks blockchain for content-gate contract events.
 * Syncs gating rule changes from the blockchain to the database.
 * 
 * Features:
 * - Continuous polling for new blocks
 * - Event parsing and database synchronization
 * - Block height tracking to avoid duplicates
 * - Statistics and metrics collection
 */

const axios = require('axios');
const GatingRule = require('../models/GatingRule');

class ContentGateTransactionIndexer {
  constructor() {
    this.isRunning = false;
    this.lastBlockHeight = 0;
    this.pollingInterval = null;
    this.stats = {
      blocksProcessed: 0,
      transactionsProcessed: 0,
      rulesCreated: 0,
      rulesUpdated: 0,
      rulesDeleted: 0,
      errors: 0,
    };

    // Configuration
    this.apiUrl = process.env.STACKS_API_URL || 'https://stacks-node-api.testnet.stacks.co';
    this.contentGateContract = process.env.CONTENT_GATE_CONTRACT || 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.content-gate';
    this.pollInterval = parseInt(process.env.CG_INDEXER_INTERVAL_MS, 10) || 30000; // 30 seconds default
  }

  /**
   * Start the indexer
   */
  async startIndexer() {
    if (this.isRunning) {
      console.log('[CG-Indexer] Indexer already running');
      return;
    }

    console.log('[CG-Indexer] Starting content-gate transaction indexer');
    this.isRunning = true;

    // Get starting block height
    try {
      const response = await axios.get(`${this.apiUrl}/extended/v1/block`);
      this.lastBlockHeight = response.data.blocks[0].height - 1;
    } catch (error) {
      console.error('[CG-Indexer] Failed to get initial block height:', error.message);
      this.lastBlockHeight = 0;
    }

    // Start polling
    this.pollingInterval = setInterval(async () => {
      try {
        await this.syncTransactions();
      } catch (error) {
        console.error('[CG-Indexer] Error during sync:', error.message);
        this.stats.errors++;
      }
    }, this.pollInterval);

    console.log(`[CG-Indexer] Indexer started (polling every ${this.pollInterval}ms)`);
  }

  /**
   * Stop the indexer
   */
  stopIndexer() {
    if (!this.isRunning) {
      console.log('[CG-Indexer] Indexer not running');
      return;
    }

    console.log('[CG-Indexer] Stopping content-gate transaction indexer');
    this.isRunning = false;

    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    console.log('[CG-Indexer] Indexer stopped');
  }

  /**
   * Sync transactions from the blockchain
   */
  async syncTransactions() {
    try {
      // Get recent transactions
      const response = await axios.get(
        `${this.apiUrl}/extended/v1/contract/${this.contentGateContract}/transactions`,
        {
          params: {
            limit: 50,
          },
        }
      );

      const transactions = response.data.results || [];

      for (const tx of transactions) {
        // Skip if we've already processed this transaction
        if (tx.block_height <= this.lastBlockHeight) {
          continue;
        }

        // Process transaction events
        await this.processTxEvents(tx);

        // Update last block height
        if (tx.block_height > this.lastBlockHeight) {
          this.lastBlockHeight = tx.block_height;
        }

        this.stats.transactionsProcessed++;
      }

      if (transactions.length > 0) {
        this.stats.blocksProcessed++;
      }
    } catch (error) {
      console.error('[CG-Indexer] Error syncing transactions:', error.message);
      this.stats.errors++;
    }
  }

  /**
   * Process transaction events
   */
  async processTxEvents(tx) {
    try {
      // Parse contract logs for set-gating-rule events
      if (tx.events && Array.isArray(tx.events)) {
        for (const event of tx.events) {
          if (event.type === 'smart_contract_log') {
            const contractLog = event.contract_log;
            if (!contractLog) continue;

            // Parse event data
            const eventData = this.parseEventData(contractLog.value);
            if (!eventData) continue;

            if (eventData.event === 'set-gating-rule') {
              await this.handleGatingRuleSet(eventData, tx);
            } else if (eventData.event === 'delete-gating-rule') {
              await this.handleGatingRuleDelete(eventData, tx);
            }
          }
        }
      }
    } catch (error) {
      console.error('[CG-Indexer] Error processing events:', error.message);
    }
  }

  /**
   * Parse event data from contract log
   */
  parseEventData(logValue) {
    try {
      // Extract event information from Clarity return value
      // This is a simplified parser - adjust based on actual contract output
      if (typeof logValue === 'string') {
        try {
          return JSON.parse(logValue);
        } catch {
          return null;
        }
      }
      return logValue;
    } catch (error) {
      return null;
    }
  }

  /**
   * Handle set-gating-rule event
   */
  async handleGatingRuleSet(eventData, tx) {
    try {
      const {
        content_id,
        token_contract,
        threshold,
        gating_type,
        creator,
      } = eventData;

      if (!content_id) {
        console.warn('[CG-Indexer] Missing contentId in gating rule event');
        return;
      }

      // Check if rule exists
      const existingRule = await GatingRule.findOne({ contentId: content_id });

      if (existingRule) {
        // Update existing rule
        await GatingRule.updateOne(
          { contentId: content_id },
          {
            tokenContract: token_contract,
            threshold: gating_type === 0 ? threshold : 0, // NFT has no threshold
            tokenType: gating_type === 0 ? 'FT' : 'NFT',
            isActive: true,
            lastUpdatedOnChain: new Date(),
            lastTxId: tx.tx_id,
            blockHeight: tx.block_height,
          }
        );
        this.stats.rulesUpdated++;
        console.log(`[CG-Indexer] Updated gating rule for content ${content_id}`);
      } else {
        // Create new rule
        await GatingRule.create({
          contentId: content_id,
          tokenContract: token_contract,
          threshold: gating_type === 0 ? threshold : 0,
          tokenType: gating_type === 0 ? 'FT' : 'NFT',
          createdBy: creator,
          isActive: true,
          createdOnChain: new Date(),
          lastTxId: tx.tx_id,
          blockHeight: tx.block_height,
        });
        this.stats.rulesCreated++;
        console.log(`[CG-Indexer] Created gating rule for content ${content_id}`);
      }
    } catch (error) {
      console.error('[CG-Indexer] Error handling gating rule set:', error.message);
      this.stats.errors++;
    }
  }

  /**
   * Handle delete-gating-rule event
   */
  async handleGatingRuleDelete(eventData, tx) {
    try {
      const { content_id } = eventData;

      if (!content_id) {
        console.warn('[CG-Indexer] Missing contentId in delete event');
        return;
      }

      // Mark as inactive instead of deleting
      await GatingRule.updateOne(
        { contentId: content_id },
        {
          isActive: false,
          deletedOnChain: new Date(),
          lastTxId: tx.tx_id,
          blockHeight: tx.block_height,
        }
      );

      this.stats.rulesDeleted++;
      console.log(`[CG-Indexer] Marked gating rule as inactive for content ${content_id}`);
    } catch (error) {
      console.error('[CG-Indexer] Error handling gating rule delete:', error.message);
      this.stats.errors++;
    }
  }

  /**
   * Get indexer statistics
   */
  getStats() {
    return {
      isRunning: this.isRunning,
      lastBlockHeight: this.lastBlockHeight,
      pollInterval: this.pollInterval,
      ...this.stats,
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      blocksProcessed: 0,
      transactionsProcessed: 0,
      rulesCreated: 0,
      rulesUpdated: 0,
      rulesDeleted: 0,
      errors: 0,
    };
  }
}

module.exports = new ContentGateTransactionIndexer();
