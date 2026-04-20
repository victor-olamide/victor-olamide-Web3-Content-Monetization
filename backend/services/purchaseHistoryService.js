const TransactionHistory = require('../models/TransactionHistory');
const Purchase = require('../models/Purchase');
const { getCurrentSTXPrice } = require('./stxPriceService');

class PurchaseHistoryService {
  /**
   * Record purchase in transaction history
   */
  async recordPurchaseTransaction(userAddress, purchaseData) {
    try {
      const priceData = await getCurrentSTXPrice();
      const stxPrice = priceData.usd;

      const transaction = new TransactionHistory({
        userAddress: userAddress.toLowerCase(),
        transactionType: 'purchase',
        amount: purchaseData.amount,
        amountUsd: purchaseData.amount * stxPrice,
        stxPrice: stxPrice,
        txHash: purchaseData.txId,
        blockHeight: purchaseData.blockHeight || null,
        blockTime: purchaseData.blockTime || new Date(),
        status: purchaseData.status || 'confirmed',
        confirmations: purchaseData.confirmations || 1,
        relatedContentId: purchaseData.contentId.toString(),
        relatedAddress: purchaseData.creator.toLowerCase(),
        relatedAddressType: 'creator',
        relatedAddressName: purchaseData.creatorName || null,
        description: `Purchased content: ${purchaseData.contentTitle || purchaseData.contentId}`,
        metadata: {
          contentId: purchaseData.contentId,
          creator: purchaseData.creator,
          platformFee: purchaseData.platformFee,
          creatorAmount: purchaseData.creatorAmount,
          purchaseId: purchaseData.purchaseId || null
        },
        category: 'expense',
        taxRelevant: true
      });

      await transaction.save();
      return transaction;
    } catch (error) {
      console.error('Error recording purchase transaction:', error);
      throw error;
    }
  }

  /**
   * Get purchase transactions for user
   */
  async getPurchaseTransactions(userAddress, options = {}) {
    try {
      const { skip = 0, limit = 50, sortBy = 'date-desc' } = options;

      let sortOption = { createdAt: -1 };
      if (sortBy === 'date-asc') {
        sortOption = { createdAt: 1 };
      } else if (sortBy === 'amount-desc') {
        sortOption = { amount: -1 };
      } else if (sortBy === 'amount-asc') {
        sortOption = { amount: 1 };
      }

      const transactions = await TransactionHistory.find({
        userAddress: userAddress.toLowerCase(),
        transactionType: 'purchase'
      })
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .lean()
        .exec();

      const total = await TransactionHistory.countDocuments({
        userAddress: userAddress.toLowerCase(),
        transactionType: 'purchase'
      });

      return {
        data: transactions,
        total,
        skip,
        limit,
        pages: Math.ceil(total / limit)
      };
    } catch (error) {
      console.error('Error fetching purchase transactions:', error);
      throw error;
    }
  }

  /**
   * Get purchase summary statistics
   */
  async getPurchaseSummary(userAddress) {
    try {
      const purchases = await TransactionHistory.find({
        userAddress: userAddress.toLowerCase(),
        transactionType: 'purchase'
      })
        .lean()
        .exec();

      const totalSpent = purchases.reduce((sum, p) => sum + p.amount, 0);
      const totalSpentUsd = purchases.reduce((sum, p) => sum + (p.amountUsd || 0), 0);
      const purchaseCount = purchases.length;

      // Group by creator
      const byCreator = {};
      purchases.forEach(p => {
        if (!byCreator[p.relatedAddress]) {
          byCreator[p.relatedAddress] = {
            purchases: 0,
            totalAmount: 0,
            totalUsd: 0
          };
        }
        byCreator[p.relatedAddress].purchases += 1;
        byCreator[p.relatedAddress].totalAmount += p.amount;
        byCreator[p.relatedAddress].totalUsd += p.amountUsd || 0;
      });

      return {
        userAddress,
        totalSpent,
        totalSpentUsd,
        purchaseCount,
        avgPurchaseValue: purchaseCount > 0 ? totalSpent / purchaseCount : 0,
        byCreator,
        lastPurchase: purchases.length > 0 ? purchases[0].createdAt : null
      };
    } catch (error) {
      console.error('Error getting purchase summary:', error);
      throw error;
    }
  }

  /**
   * Get purchases by content
   */
  async getPurchasesByContent(contentId, options = {}) {
    try {
      const { skip = 0, limit = 50 } = options;

      const purchases = await Purchase.find({ contentId })
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec();

      const total = await Purchase.countDocuments({ contentId });

      return {
        data: purchases,
        total,
        skip,
        limit,
        pages: Math.ceil(total / limit)
      };
    } catch (error) {
      console.error('Error fetching purchases by content:', error);
      throw error;
    }
  }

  /**
   * Get purchases by creator (revenue perspective)
   */
  async getPurchasesByCreator(creatorAddress, options = {}) {
    try {
      const { skip = 0, limit = 50 } = options;

      const purchases = await Purchase.find({ creator: creatorAddress.toLowerCase() })
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec();

      const total = await Purchase.countDocuments({ creator: creatorAddress.toLowerCase() });

      // Calculate revenue
      const totalRevenue = purchases.reduce((sum, p) => sum + p.creatorAmount, 0);
      const totalPlatformFees = purchases.reduce((sum, p) => sum + p.platformFee, 0);

      return {
        data: purchases,
        total,
        skip,
        limit,
        pages: Math.ceil(total / limit),
        revenue: {
          totalRevenue,
          totalPlatformFees,
          avgPerPurchase: total > 0 ? totalRevenue / total : 0
        }
      };
    } catch (error) {
      console.error('Error fetching creator purchases:', error);
      throw error;
    }
  }

  /**
   * Get profit/revenue report for creator
   */
  async getCreatorRevenueReport(creatorAddress, options = {}) {
    try {
      const { days = 30 } = options;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const purchases = await Purchase.find({
        creator: creatorAddress.toLowerCase(),
        timestamp: { $gte: startDate }
      })
        .lean()
        .exec();

      const totalRevenue = purchases.reduce((sum, p) => sum + p.creatorAmount, 0);
      const totalFees = purchases.reduce((sum, p) => sum + p.platformFee, 0);
      const totalGross = purchases.reduce((sum, p) => sum + p.amount, 0);

      // Group by date
      const byDate = {};
      purchases.forEach(p => {
        const date = new Date(p.timestamp).toISOString().split('T')[0];
        if (!byDate[date]) {
          byDate[date] = { purchases: 0, revenue: 0, fees: 0, gross: 0 };
        }
        byDate[date].purchases += 1;
        byDate[date].revenue += p.creatorAmount;
        byDate[date].fees += p.platformFee;
        byDate[date].gross += p.amount;
      });

      return {
        creatorAddress,
        period: `Last ${days} days`,
        startDate,
        endDate: new Date(),
        summary: {
          totalPurchases: purchases.length,
          totalRevenue,
          totalFees,
          totalGross,
          avgPerPurchase: purchases.length > 0 ? totalRevenue / purchases.length : 0,
          netMargin: totalGross > 0 ? ((totalRevenue / totalGross) * 100).toFixed(2) + '%' : '0%'
        },
        byDate
      };
    } catch (error) {
      console.error('Error getting creator revenue report:', error);
      throw error;
    }
  }

  /**
   * Get purchase trends for content
   */
  async getContentPurchaseTrends(contentId, days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const purchases = await Purchase.find({
        contentId,
        timestamp: { $gte: startDate }
      })
        .lean()
        .exec();

      // Group by date
      const byDate = {};
      purchases.forEach(p => {
        const date = new Date(p.timestamp).toISOString().split('T')[0];
        if (!byDate[date]) {
          byDate[date] = {
            purchases: 0,
            amount: 0,
            creatorAmount: 0,
            platformFee: 0
          };
        }
        byDate[date].purchases += 1;
        byDate[date].amount += p.amount;
        byDate[date].creatorAmount += p.creatorAmount;
        byDate[date].platformFee += p.platformFee;
      });

      return {
        contentId,
        period: `Last ${days} days`,
        startDate,
        endDate: new Date(),
        totalPurchases: purchases.length,
        totalAmount: purchases.reduce((sum, p) => sum + p.amount, 0),
        trends: byDate
      };
    } catch (error) {
      console.error('Error getting purchase trends:', error);
      throw error;
    }
  }
}

module.exports = new PurchaseHistoryService();
