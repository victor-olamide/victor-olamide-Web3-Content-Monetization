const express = require('express');
const transactionHistoryService = require('../services/transactionHistoryService');
const {
  validateTransactionData,
  validatePaginationParams,
  validateDateRangeParams,
  validateTransactionFilter,
  validateTransactionHash,
  validateTransactionId,
  validateTransactionStatusUpdate,
  validateExportYear,
  validateMonth,
  validateDaysParam
} = require('../middleware/transactionValidation');

const router = express.Router();

// Middleware - verify wallet authentication (example, adjust based on your auth setup)
const verifyWalletAuth = (req, res, next) => {
  const sessionId = req.headers['x-session-id'];
  const walletAddress = req.headers['x-wallet-address'] || req.user?.address;

  if (!sessionId || !walletAddress) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized - wallet authentication required'
    });
  }

  req.walletAddress = walletAddress.toLowerCase();
  next();
};

/**
 * GET /api/transactions/history
 * Get user's transaction history with pagination and filters
 */
router.get('/history', verifyWalletAuth, validatePaginationParams, validateTransactionFilter, async (req, res) => {
  try {
    const { skip, limit, sortBy } = req.validatedPagination;
    const { status, type } = req.query;

    const result = await transactionHistoryService.getTransactionHistory(req.walletAddress, {
      skip,
      limit,
      status,
      type,
      sortBy
    });

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: {
        skip,
        limit,
        total: result.total,
        pages: result.pages
      }
    });
  } catch (error) {
    console.error('Error fetching transaction history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transaction history'
    });
  }
});

/**
 * GET /api/transactions/summary
 * Get transaction summary statistics
 */
router.get('/summary', verifyWalletAuth, async (req, res) => {
  try {
    const summary = await transactionHistoryService.getTransactionSummary(req.walletAddress);

    res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error fetching transaction summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transaction summary'
    });
  }
});

/**
 * GET /api/transactions/stats
 * Get detailed transaction statistics
 */
router.get('/stats', verifyWalletAuth, async (req, res) => {
  try {
    const stats = await transactionHistoryService.getUserTransactionStats(req.walletAddress);

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching transaction stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transaction stats'
    });
  }
});

/**
 * GET /api/transactions/pending
 * Get pending transactions
 */
router.get('/pending', verifyWalletAuth, async (req, res) => {
  try {
    const transactions = await transactionHistoryService.getPendingTransactions(req.walletAddress);

    res.status(200).json({
      success: true,
      data: transactions,
      count: transactions.length
    });
  } catch (error) {
    console.error('Error fetching pending transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending transactions'
    });
  }
});

/**
 * GET /api/transactions/by-type/:type
 * Get transactions filtered by type
 */
router.get('/by-type/:type', verifyWalletAuth, validatePaginationParams, async (req, res) => {
  try {
    const { skip, limit } = req.validatedPagination;
    const { type } = req.params;

    // Validate type
    const validTypes = [
      'purchase',
      'subscription',
      'refund',
      'payout',
      'transfer',
      'deposit',
      'withdrawal',
      'renewal',
      'upgrade',
      'downgrade',
      'fee',
      'tip',
      'reward'
    ];

    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid transaction type'
      });
    }

    const result = await transactionHistoryService.getTransactionsByType(req.walletAddress, type, {
      skip,
      limit
    });

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: {
        skip,
        limit,
        total: result.total
      }
    });
  } catch (error) {
    console.error('Error fetching transactions by type:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions'
    });
  }
});

/**
 * GET /api/transactions/by-category/:category
 * Get transactions filtered by category
 */
router.get('/by-category/:category', verifyWalletAuth, validatePaginationParams, async (req, res) => {
  try {
    const { skip, limit } = req.validatedPagination;
    const { category } = req.params;

    // Validate category
    const validCategories = ['income', 'expense', 'internal_transfer', 'fee', 'reward'];

    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category'
      });
    }

    const result = await transactionHistoryService.getTransactionsByCategory(
      req.walletAddress,
      category,
      { skip, limit }
    );

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: {
        skip,
        limit,
        total: result.total
      }
    });
  } catch (error) {
    console.error('Error fetching transactions by category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions'
    });
  }
});

/**
 * GET /api/transactions/date-range
 * Get transactions within a date range
 */
router.get('/date-range', verifyWalletAuth, validateDateRangeParams, validatePaginationParams, async (req, res) => {
  try {
    const { startDate, endDate } = req.validatedDateRange;
    const { skip, limit } = req.validatedPagination;

    const result = await transactionHistoryService.getTransactionsByDateRange(
      req.walletAddress,
      startDate,
      endDate,
      { skip, limit }
    );

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: {
        skip,
        limit,
        total: result.total
      },
      dateRange: {
        startDate: result.startDate,
        endDate: result.endDate
      }
    });
  } catch (error) {
    console.error('Error fetching transactions by date range:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions'
    });
  }
});

/**
 * GET /api/transactions/monthly/:year/:month
 * Get monthly transaction summary
 */
router.get('/monthly/:year/:month', verifyWalletAuth, validateMonth, async (req, res) => {
  try {
    const { year, month } = req.params;

    const result = await transactionHistoryService.getMonthlyTransactionSummary(
      req.walletAddress,
      parseInt(year),
      parseInt(month)
    );

    res.status(200).json({
      success: true,
      data: result.data,
      month: parseInt(month),
      year: parseInt(year),
      total: result.total
    });
  } catch (error) {
    console.error('Error fetching monthly summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch monthly summary'
    });
  }
});

/**
 * GET /api/transactions/balance-over-time
 * Get balance history over time
 */
router.get('/balance-over-time', verifyWalletAuth, validateDaysParam, async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const balanceHistory = await transactionHistoryService.getBalanceOverTime(
      req.walletAddress,
      parseInt(days)
    );

    res.status(200).json({
      success: true,
      data: balanceHistory,
      days: parseInt(days)
    });
  } catch (error) {
    console.error('Error fetching balance history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch balance history'
    });
  }
});

/**
 * GET /api/transactions/:txId
 * Get single transaction by ID
 */
router.get('/:txId', verifyWalletAuth, validateTransactionId, async (req, res) => {
  try {
    const { txId } = req.params;

    const transaction = await transactionHistoryService.getTransactionById(txId, req.walletAddress);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    res.status(200).json({
      success: true,
      data: transaction
    });
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transaction'
    });
  }
});

/**
 * GET /api/transactions/hash/:txHash
 * Get transaction by hash
 */
router.get('/hash/:txHash', verifyWalletAuth, validateTransactionHash, async (req, res) => {
  try {
    const { txHash } = req.params;

    const transaction = await transactionHistoryService.getTransactionByHash(txHash);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Verify the transaction belongs to the user
    if (transaction.userAddress !== req.walletAddress) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    res.status(200).json({
      success: true,
      data: transaction
    });
  } catch (error) {
    console.error('Error fetching transaction by hash:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transaction'
    });
  }
});

/**
 * POST /api/transactions
 * Record a new transaction
 */
router.post('/', verifyWalletAuth, validateTransactionData, async (req, res) => {
  try {
    const transaction = await transactionHistoryService.recordTransaction(req.walletAddress, req.body);

    res.status(201).json({
      success: true,
      message: 'Transaction recorded successfully',
      data: transaction
    });
  } catch (error) {
    console.error('Error recording transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record transaction'
    });
  }
});

/**
 * PUT /api/transactions/:txHash/status
 * Update transaction status
 */
router.put(
  '/:txHash/status',
  verifyWalletAuth,
  validateTransactionHash,
  validateTransactionStatusUpdate,
  async (req, res) => {
    try {
      const { txHash } = req.params;
      const { status, blockHeight, blockTime, confirmations } = req.body;

      const transaction = await transactionHistoryService.updateTransactionStatus(
        txHash,
        status,
        blockHeight,
        blockTime
      );

      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: 'Transaction not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Transaction status updated',
        data: transaction
      });
    } catch (error) {
      console.error('Error updating transaction status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update transaction status'
      });
    }
  }
);

/**
 * PUT /api/transactions/:txHash/confirmations
 * Update transaction confirmations
 */
router.put('/:txHash/confirmations', verifyWalletAuth, validateTransactionHash, async (req, res) => {
  try {
    const { txHash } = req.params;
    const { confirmations } = req.body;

    if (typeof confirmations !== 'number' || confirmations < 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid confirmations value'
      });
    }

    const transaction = await transactionHistoryService.updateConfirmations(txHash, confirmations);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Transaction confirmations updated',
      data: transaction
    });
  } catch (error) {
    console.error('Error updating confirmations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update confirmations'
    });
  }
});

/**
 * GET /api/transactions/export/tax/:year
 * Export transactions for tax reporting
 */
router.get('/export/tax/:year', verifyWalletAuth, validateExportYear, async (req, res) => {
  try {
    const { year } = req.params;

    const taxData = await transactionHistoryService.exportForTaxReporting(req.walletAddress, parseInt(year));

    res.status(200).json({
      success: true,
      data: taxData
    });
  } catch (error) {
    console.error('Error exporting tax data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export tax data'
    });
  }
});

module.exports = router;
