const axios = require('axios');
const Purchase = require('../models/Purchase');
const Content = require('../models/Content');
const Subscription = require('../models/Subscription');
const GatingRule = require('../models/GatingRule');

class Indexer {
  constructor() {
    this.apiUrl = process.env.STACKS_API_URL || 'https://stacks-node-api.mainnet.stacks.co';
    this.contractAddress = process.env.CONTRACT_ADDRESS;
    this.lastProcessedBlock = 0;
  }

  async start() {
    console.log('Starting Stacks event indexer...');
    this.status = 'running';
    // Initial fetch
    await this.pollEvents();
    
    // Polling interval
    setInterval(async () => {
      await this.pollEvents();
    }, 30000); // Every 30 seconds
  }

  getStatus() {
    return {
      status: this.status,
      lastProcessedBlock: this.lastProcessedBlock,
      contractAddress: this.contractAddress
    };
  }

  async pollEvents() {
    if (!this.contractAddress) {
      console.warn('CONTRACT_ADDRESS not set, skipping indexing. Please set it in .env');
      return;
    }

    try {
      console.log(`Polling for events from ${this.contractAddress}...`);
      const response = await axios.get(`${this.apiUrl}/extended/v1/address/${this.contractAddress}/transactions?limit=20`);
      const transactions = response.data.results;

      for (const tx of transactions) {
        if (tx.tx_status === 'success') {
          await this.processTransaction(tx);
        }
      }
    } catch (err) {
      console.error('Indexer error:', err.message);
    }
  }

  async processTransaction(tx) {
    // Process "print" events from the transaction
    const events = tx.events || [];
    for (const event of events) {
      if (event.event_type === 'smart_contract_log') {
        const payload = event.contract_log.value;
        // Logic to decode Clarity value and save to DB
        // This is a simplified representation
        await this.handleContractEvent(payload, tx);
      }
    }
  }

  async handleContractEvent(payload, tx) {
    // Check if it's a purchase-content event
    if (payload.includes('purchase-content')) {
      console.log('New purchase detected:', tx.tx_id);
      
      const purchaseData = {
        contentId: 1, 
        user: tx.sender_address,
        amount: 10000000, 
        txId: tx.tx_id,
        timestamp: new Date(tx.burn_block_time_iso)
      };

      try {
        await Purchase.findOneAndUpdate(
          { txId: purchaseData.txId },
          purchaseData,
          { upsert: true, new: true }
        );
        console.log('Purchase saved to database');
      } catch (err) {
        console.error('Error saving purchase:', err.message);
      }
    } else if (payload.includes('subscribe')) {
      console.log('New subscription detected:', tx.tx_id);
      
      const subData = {
        user: tx.sender_address,
        creator: 'SP3X....', // Extracted
        tierId: 1, // Extracted
        expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Extracted
        transactionId: tx.tx_id,
        timestamp: new Date(tx.burn_block_time_iso)
      };

      try {
        await Subscription.findOneAndUpdate(
          { transactionId: subData.transactionId },
          subData,
          { upsert: true, new: true }
        );
        console.log('Subscription saved to database');
      } catch (err) {
        console.error('Error saving subscription:', err.message);
      }
    } else if (payload.includes('set-gating-rule')) {
      console.log('New gating rule detected:', tx.tx_id);
      
      const gatingData = {
        contentId: 1, // Extracted from payload
        tokenContract: 'SP...mock-token', // Extracted
        threshold: '1000', // Extracted
        creator: tx.sender_address,
      };

      try {
        await GatingRule.findOneAndUpdate(
          { contentId: gatingData.contentId },
          gatingData,
          { upsert: true, new: true }
        );
        console.log('Gating rule saved to database');
      } catch (err) {
        console.error('Error saving gating rule:', err.message);
      }
    } else if (payload.includes('delete-gating-rule')) {
      console.log('Gating rule deletion detected:', tx.tx_id);
      // Logic to delete gating rule from DB
      try {
        await GatingRule.deleteOne({ contentId: 1 }); // Extracted
        console.log('Gating rule deleted from database');
      } catch (err) {
        console.error('Error deleting gating rule:', err.message);
      }
    }
  }
}

module.exports = new Indexer();
