const axios = require('axios');
const Purchase = require('../models/Purchase');
const Content = require('../models/Content');

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
      // console.warn('CONTRACT_ADDRESS not set, skipping indexing');
      return;
    }

    try {
      // In a real scenario, we would fetch contract events
      // GET /extended/v1/address/{address}/transactions
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
      
      // In a real app, we'd decode the Clarity CV
      // For this MVP, we simulate extraction
      const purchaseData = {
        contentId: 1, // Extracted from payload
        buyer: tx.sender_address,
        amount: 10000000, // Extracted
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
    }
  }
}

module.exports = new Indexer();
