const TransactionHistory = require('../models/TransactionHistory');

/**
 * Transaction History Service
 * Handles all transaction tracking, querying, and reporting operations
 */

class TransactionHistoryService {
  /**
   * Record a new transaction
   */
  async recordTransaction(userAddress, transactionData) {
    try {
      const transaction = new TransactionHistory({
        userAddress: userAddress.toLowerCase(),
        ...transactionData
      });

      await transaction.save();
      return transaction.toDisplay();
    } catch (error) {
      console.error('Error recording transaction:', error);
      throw error;
    }
  }

  /**
   * Get user's transaction history with pagination
   */
  async getTransactionHistory(userAddress, options = {}) {
    try {
      const { skip = 0, limit = 50, status = null, type = null, sortBy = 'date-desc' } = options;

      const query = { userAddress: userAddress.toLowerCase() };

      // Apply filters
      if (status) {
        query.status = status;
      }
      if (type) {
        query.transactionType = type;
      }

      // Apply sorting
      let sortOption = { createdAt: -1 };
      if (sortBy === 'date-asc') {
        sortOption = { createdAt: 1 };
      } else if (sortBy === 'amount-desc') {
        sortOption = { amount: -1 };
      } else if (sortBy === 'amount-asc') {
        sortOption = { amount: 1 };
      }

      const transactions = await TransactionHistory.find(query)
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .lean()
        .exec();

      const total = await TransactionHistory.countDocuments(query);

      return {
        data: transactions.map((tx) => this._formatTransaction(tx)),
        total,
        skip,
        limit,
        pages: Math.ceil(total / limit)
      };
    } catch (error) {
      console.error('Error fetching transaction history:', error);
      throw error;
    }
  }

  /**
   * Get transactions by date range
   */
  async getTransactionsByDateRange(userAddress, startDate, endDate, options = {}) {
    try {
      const { skip = 0, limit = 100 } = options;

      const query = {
        userAddress: userAddress.toLowerCase(),
        createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
      };

      const transactions = await TransactionHistory.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec();

      const total = await TransactionHistory.countDocuments(query);

      return {
        data: transactions.map((tx) => this._formatTransaction(tx)),
        total,
        startDate,
        endDate
      };
    } catch (error) {
      console.error('Error fetching transactions by date range:', error);
      throw error;
    }
  }

  /**
   * Get pending transactions
   */
  async getPendingTransactions(userAddress) {
    try {
      const transactions = await TransactionHistory.find({
        userAddress: userAddress.toLowerCase(),
        status: 'pending'
      })
        .sort({ createdAt: -1 })
        .lean()
        .exec();

      return transactions.map((tx) => this._formatTransaction(tx));
    } catch (error) {
      console.error('Error fetching pending transactions:', error);
      throw error;
    }
  }

  /**
   * Get transaction by hash
   */
  async getTransactionByHash(txHash) {
    try {
      const transaction = await TransactionHistory.findOne({ txHash }).lean().exec();

      if (!transaction) {
        return null;
      }

      return this._formatTransaction(transaction);
    } catch (error) {
      console.error('Error fetching transaction by hash:', error);
      throw error;
    }
  }

  /**
   * Get transaction by ID
   */
  async getTransactionById(txId, userAddress) {
    try {
      const transaction = await TransactionHistory.findOne({
        _id: txId,
        userAddress: userAddress.toLowerCase()
      })
        .lean()
        .exec();

      if (!transaction) {
        return null;
      }

      return this._formatTransaction(transaction);
    } catch (error) {
      console.error('Error fetching transaction by ID:', error);
      throw error;
    }
  }

  /**
   * Get transaction summary statistics
   */
  async getTransactionSummary(userAddress) {
    try {
      const summary = await TransactionHistory.getTransactionSummary(userAddress);

      return {
        totalAmount: summary.totalAmount || 0,
        totalUsd: summary.totalUsd || 0,
        transactionCount: summary.transactionCount || 0,
        byType: this._groupByType(summary.byType || []),
        byCategory: this._groupByCategory(summary.byCategory || [])
      };
    } catch (error) {
      console.error('Error generating transaction summary:', error);
      throw error;
    }
  }

  /**
   * Get transactions by type
   */
  async getTransactionsByType(userAddress, type, options = {}) {
    try {
      const { skip = 0, limit = 50 } = options;

      const transactions = await TransactionHistory.find({
        userAddress: userAddress.toLowerCase(),
        transactionType: type
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec();

      const total = await TransactionHistory.countDocuments({
        userAddress: userAddress.toLowerCase(),
        transactionType: type
      });

      return {
        data: transactions.map((tx) => this._formatTransaction(tx)),
        total,
        type
      };
    } catch (error) {
      console.error('Error fetching transactions by type:', error);
      throw error;
    }
  }

  /**
   * Get transactions by category
   */
  async getTransactionsByCategory(userAddress, category, options = {}) {
    try {
      const { skip = 0, limit = 50 } = options;

      const transactions = await TransactionHistory.find({
        userAddress: userAddress.toLowerCase(),
        category
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec();

      const total = await TransactionHistory.countDocuments({
        userAddress: userAddress.toLowerCase(),
        category
      });

      return {
        data: transactions.map((tx) => this._formatTransaction(tx)),
        total,
        category
      };
    } catch (error) {
      console.error('Error fetching transactions by category:', error);
      throw error;
    }
  }

  /**
   * Update transaction status (e.g., pending to confirmed)
   */
  async updateTransactionStatus(txHash, status, blockHeight = null, blockTime = null) {
    try {
      const updateData = { status };

      if (blockHeight) {
        updateData.blockHeight = blockHeight;
      }

      if (blockTime) {
        updateData.blockTime = new Date(blockTime);
      }

      const transaction = await TransactionHistory.findOneAndUpdate({ txHash }, updateData, {
        new: true
      })
        .lean()
        .exec();

      return transaction ? this._formatTransaction(transaction) : null;
    } catch (error) {
      console.error('Error updating transaction status:', error);
      throw error;
    }
  }

  /**
   * Update transaction confirmations
   */
  async updateConfirmations(txHash, confirmationCount) {
    try {
      const transaction = await TransactionHistory.findOne({ txHash });

      if (!transaction) {
        return null;
      }

      await transaction.updateConfirmations(confirmationCount);
      return this._formatTransaction(transaction);
    } catch (error) {
      console.error('Error updating confirmations:', error);
      throw error;
    }
  }

  /**
   * Get STX price at transaction time
   */
  getStxPriceAtTime(transaction) {
    return transaction.stxPrice || 0;
  }

  /**
   * Calculate USD value based on amount and price
   */
  calculateUsdValue(amount, stxPrice) {
    return amount * stxPrice;
  }

  /**
   * Get monthly transaction summary
   */
  async getMonthlyTransactionSummary(userAddress, year, month) {
    try {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      return await this.getTransactionsByDateRange(userAddress, startDate, endDate, {
        limit: 1000
      });
    } catch (error) {
      console.error('Error generating monthly summary:', error);
      throw error;
    }
  }

  /**
   * Export transactions for tax reporting
   */
  async exportForTaxReporting(userAddress, year) {
    try {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31, 23, 59, 59);

      const transactions = await TransactionHistory.find({
        userAddress: userAddress.toLowerCase(),
        createdAt: { $gte: startDate, $lte: endDate },
        taxRelevant: true
      })
        .sort({ createdAt: 1 })
        .lean()
        .exec();

      // Calculate totals by category
      const totals = {
        income: 0,
        expense: 0,
        fees: 0,
        rewards: 0
      };

      transactions.forEach((tx) => {
        if (tx.category === 'income') {
          totals.income += tx.amount;
        } else if (tx.category === 'expense') {
          totals.expense += tx.amount;
        } else if (tx.category === 'fee') {
          totals.fees += tx.amount;
        } else if (tx.category === 'reward') {
          totals.rewards += tx.amount;
        }
      });

      return {
        year,
        userAddress,
        transactions: transactions.map((tx) => this._formatTransaction(tx)),
        totals
      };
    } catch (error) {
      console.error('Error exporting for tax reporting:', error);
      throw error;
    }
  }

  /**
   * Get balance over time (for charts)
   */
  async getBalanceOverTime(userAddress, days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const transactions = await TransactionHistory.find({
        userAddress: userAddress.toLowerCase(),
        createdAt: { $gte: startDate },
        status: 'confirmed'
      })
        .sort({ createdAt: 1 })
        .lean()
        .exec();

      // Build balance history
      let runningBalance = 0;
      const balanceHistory = [];

      transactions.forEach((tx) => {
        if (tx.category === 'income' || tx.category === 'reward') {
          runningBalance += tx.amount;
        } else if (tx.category === 'expense' || tx.category === 'fee') {
          runningBalance -= tx.amount;
        }

        balanceHistory.push({
          date: tx.createdAt,
          balance: runningBalance,
          transaction: tx._id
        });
      });

      return balanceHistory;
    } catch (error) {
      console.error('Error calculating balance over time:', error);
      throw error;
    }
  }

  /**
   * Get transaction statistics for user
   */
  async getUserTransactionStats(userAddress) {
    try {
      const totalTransactions = await TransactionHistory.countDocuments({
        userAddress: userAddress.toLowerCase()
      });

      const confirmedTransactions = await TransactionHistory.countDocuments({
        userAddress: userAddress.toLowerCase(),
        status: 'confirmed'
      });

      const pendingTransactions = await TransactionHistory.countDocuments({
        userAddress: userAddress.toLowerCase(),
        status: 'pending'
      });

      const summary = await this.getTransactionSummary(userAddress);

      const lastTransaction = await TransactionHistory.findOne({
        userAddress: userAddress.toLowerCase()
      })
        .sort({ createdAt: -1 })
        .lean()
        .exec();

      return {
        totalTransactions,
        confirmedTransactions,
        pendingTransactions,
        failedTransactions: totalTransactions - confirmedTransactions - pendingTransactions,
        totalAmount: summary.totalAmount,
        totalUsd: summary.totalUsd,
        averageAmount: totalTransactions > 0 ? summary.totalAmount / totalTransactions : 0,
        lastTransactionDate: lastTransaction?.createdAt || null
      };
    } catch (error) {
      console.error('Error generating user stats:', error);
      throw error;
    }
  }

  /**
   * Reconcile transaction with blockchain data
   */
  async reconcileTransaction(txHash, blockchainData) {
    try {
      const transaction = await TransactionHistory.findOne({ txHash });

      if (!transaction) {
        return null;
      }

      transaction.blockHeight = blockchainData.blockHeight;
      transaction.blockTime = new Date(blockchainData.blockTime);
      transaction.confirmations = blockchainData.confirmations;

      if (blockchainData.confirmations >= 1) {
        transaction.status = 'confirmed';
      }

      transaction.isReconciled = true;
      transaction.reconcileDate = new Date();

      await transaction.save();
      return this._formatTransaction(transaction);
    } catch (error) {
      console.error('Error reconciling transaction:', error);
      throw error;
    }
  }

  // ===== Private Helper Methods =====

  /**
   * Format transaction for API response
   */
  _formatTransaction(tx) {
    return {
      id: tx._id,
      userAddress: tx.userAddress,
      type: tx.transactionType,
      amount: parseFloat(tx.amount.toFixed(6)),
      amountUsd: parseFloat((tx.amountUsd || 0).toFixed(2)),
      stxPrice: parseFloat((tx.stxPrice || 0).toFixed(2)),
      txHash: tx.txHash,
      blockHeight: tx.blockHeight,
      blockTime: tx.blockTime,
      status: tx.status,
      confirmations: tx.confirmations,
      description: tx.description,
      category: tx.category,
      contentId: tx.relatedContentId,
      contentTitle: tx.relatedContentTitle,
      relatedAddress: tx.relatedAddress,
      relatedAddressName: tx.relatedAddressName,
      relatedAddressType: tx.relatedAddressType,
      timestamp: tx.createdAt,
      metadata: tx.metadata
    };
  }

  /**
   * Group transactions by type
   */
  _groupByType(transactions) {
    const grouped = {};

    transactions.forEach((item) => {
      if (!grouped[item.type]) {
        grouped[item.type] = 0;
      }
      grouped[item.type] += item.amount;
    });

    return grouped;
  }

  /**
   * Group transactions by category
   */
  _groupByCategory(transactions) {
    const grouped = {};

    transactions.forEach((item) => {
      if (!grouped[item.category]) {
        grouped[item.category] = 0;
      }
      grouped[item.category] += item.amount;
    });

    return grouped;
  }
}

module.exports = new TransactionHistoryService();
