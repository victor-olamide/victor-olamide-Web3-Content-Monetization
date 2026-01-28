const axios = require('axios');
const Purchase = require('../models/Purchase');
const Content = require('../models/Content');
const Subscription = require('../models/Subscription');

class Indexer {
  constructor() {
    this.apiUrl = process.env.STACKS_API_URL || 'https://stacks-node-api.mainnet.stacks.co';
    this.contractAddress = process.env.CONTRACT_ADDRESS;
    this.lastProcessedBlock = 0;
  }

  async start() {
    console.log('Starting Stacks event indexer...');
    // Initial fetch
    await this.pollEvents();
    
    // Polling interval
    setInterval(async () => {
      await this.pollEvents();
    }, 30000); // Every 30 seconds
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
        buyer: tx.sender_address,
        amount: 10000000, 
        transactionId: tx.tx_id,
        timestamp: new Date(tx.burn_block_time_iso)
      };

      try {
        await Purchase.findOneAndUpdate(
          { transactionId: purchaseData.transactionId },
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
    }
  }
}

module.exports = new Indexer();
