const Purchase = require('../models/Purchase');
const TransactionHistory = require('../models/TransactionHistory');
const { recordTransaction } = require('./transactionHistoryService');
const { refundPurchase } = require('./refundService');

/**
 * Purchase Payment Service
 * Handles payment processing and verification
 */
class PurchasePaymentService {
  /**
   * Verify payment with retry logic
   */
  async verifyPaymentWithRetry(txId, maxRetries = 3) {
    const { verifyTransaction } = require('./stacksApiService');

    for (let i = 0; i < maxRetries; i++) {
      try {
        const result = await verifyTransaction(txId);
        if (result.success) {
          return result;
        }

        // Retry for not found status (transaction may take time to appear)
        if (result.status === 'not_found' && i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 5000));
          continue;
        }

        throw new Error(`Payment verification failed: ${result.status}`);
      } catch (error) {
        if (i === maxRetries - 1) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  /**
   * Calculate payment splits
   */
  async calculatePaymentSplit(amount) {
    const { calculatePlatformFee } = require('./contractService');

    try {
      const platformFee = await calculatePlatformFee(amount);
      const creatorAmount = amount - platformFee;

      return {
        totalAmount: amount,
        platformFee: platformFee,
        creatorAmount: creatorAmount,
        feePercentage: ((platformFee / amount) * 100).toFixed(2)
      };
    } catch (error) {
      console.error('Error calculating payment split:', error);
      throw error;
    }
  }

  /**
   * Process payment completion
   */
  async processPaymentCompletion(purchaseData, txVerification) {
    try {
      const { contentId, user, creator, txId, amount, stxPrice } = purchaseData;

      // Create purchase record
      const paymentSplit = await this.calculatePaymentSplit(amount);
      const purchase = new Purchase({
        contentId,
        user,
        creator,
        txId,
        amount,
        platformFee: paymentSplit.platformFee,
        creatorAmount: paymentSplit.creatorAmount
      });

      const savedPurchase = await purchase.save();

      // Record in transaction history
      const transactionHistoryService = require('./transactionHistoryService');
      await transactionHistoryService.recordTransaction(user, {
        transactionType: 'purchase',
        amount: amount,
        amountUsd: amount * stxPrice,
        stxPrice: stxPrice,
        txHash: txId,
        blockHeight: txVerification.blockHeight,
        blockTime: txVerification.blockTime,
        status: 'confirmed',
        confirmations: txVerification.confirmations || 1,
        relatedContentId: contentId.toString(),
        relatedAddress: creator,
        relatedAddressType: 'creator',
        description: `Purchase of content ${contentId}`,
        category: 'expense',
        metadata: {
          contentId: contentId,
          creator: creator,
          platformFee: paymentSplit.platformFee,
          creatorAmount: paymentSplit.creatorAmount
        }
      });

      return {
        purchase: savedPurchase,
        paymentSplit,
        verification: txVerification
      };
    } catch (error) {
      console.error('Error processing payment completion:', error);
      throw error;
    }
  }

  /**
   * Handle payment disputes
   */
  async handlePaymentDispute(txId, reason, evidence) {
    try {
      const purchase = await Purchase.findOne({ txId });
      if (!purchase) {
        return { success: false, reason: 'Purchase not found' };
      }

      // Record dispute
      const disputeRecord = {
        txId,
        purchaseId: purchase._id,
        reason,
        evidence,
        reportedAt: new Date(),
        status: 'under_review'
      };

      // Mark purchase as disputed
      purchase.refundStatus = 'pending';
      await purchase.save();

      console.log('Payment dispute recorded:', disputeRecord);

      return {
        success: true,
        disputeId: txId,
        message: 'Dispute has been recorded and is under review'
      };
    } catch (error) {
      console.error('Error handling payment dispute:', error);
      throw error;
    }
  }

  /**
   * Get payment history for transaction ID
   */
  async getPaymentHistory(txId) {
    try {
      const purchase = await Purchase.findOne({ txId }).lean().exec();

      if (!purchase) {
        return null;
      }

      const transaction = await TransactionHistory.findOne({
        txHash: txId,
        transactionType: 'purchase'
      })
        .lean()
        .exec();

      return {
        purchase,
        transaction
      };
    } catch (error) {
      console.error('Error getting payment history:', error);
      throw error;
    }
  }

  /**
   * Validate payment eligibility
   */
  async validatePaymentEligibility(userAddress, contentId, amount) {
    try {
      const errors = [];

      // Check if user already has access
      const existingPurchase = await Purchase.findOne({
        user: userAddress.toLowerCase(),
        contentId,
        accessRevoked: { $ne: true }
      });

      if (existingPurchase) {
        errors.push('User already has access to this content');
      }

      // Check for pending purchases
      const pendingPurchase = await Purchase.findOne({
        user: userAddress.toLowerCase(),
        contentId,
        refundStatus: 'pending'
      });

      if (pendingPurchase) {
        errors.push('User has a pending refund for this content');
      }

      return {
        eligible: errors.length === 0,
        errors
      };
    } catch (error) {
      console.error('Error validating payment eligibility:', error);
      throw error;
    }
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(txId) {
    try {
      const purchase = await Purchase.findOne({ txId });

      if (!purchase) {
        return {
          found: false,
          message: 'No purchase found for this transaction'
        };
      }

      const transaction = await TransactionHistory.findOne({
        txHash: txId,
        transactionType: 'purchase'
      });

      return {
        found: true,
        purchase: {
          id: purchase._id,
          contentId: purchase.contentId,
          amount: purchase.amount,
          creatorAmount: purchase.platformFee,
          user: purchase.user,
          creator: purchase.creator,
          timestamp: purchase.timestamp,
          refundStatus: purchase.refundStatus
        },
        transaction: transaction ? {
          status: transaction.status,
          blockHeight: transaction.blockHeight,
          confirmations: transaction.confirmations
        } : null
      };
    } catch (error) {
      console.error('Error getting payment status:', error);
      throw error;
    }
  }

  /**
   * Get payment analytics
   */
  async getPaymentAnalytics(options = {}) {
    try {
      const { days = 30, creatorAddress = null } = options;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      let query = { timestamp: { $gte: startDate } };
      if (creatorAddress) {
        query.creator = creatorAddress.toLowerCase();
      }

      const purchases = await Purchase.find(query).lean().exec();

      const totalAmount = purchases.reduce((sum, p) => sum + p.amount, 0);
      const totalCreatorAmount = purchases.reduce((sum, p) => sum + p.creatorAmount, 0);
      const totalPlatformFees = purchases.reduce((sum, p) => sum + p.platformFee, 0);

      // Group by day
      const byDate = {};
      purchases.forEach(p => {
        const date = new Date(p.timestamp).toISOString().split('T')[0];
        if (!byDate[date]) {
          byDate[date] = {
            purchases: 0,
            amount: 0,
            creatorAmount: 0,
            fees: 0
          };
        }
        byDate[date].purchases += 1;
        byDate[date].amount += p.amount;
        byDate[date].creatorAmount += p.creatorAmount;
        byDate[date].fees += p.platformFee;
      });

      return {
        period: `Last ${days} days`,
        startDate,
        endDate: new Date(),
        summary: {
          totalPurchases: purchases.length,
          totalAmount,
          totalCreatorAmount,
          totalPlatformFees,
          avgPurchaseAmount: purchases.length > 0 ? totalAmount / purchases.length : 0,
          platformFeePercentage: totalAmount > 0 ? ((totalPlatformFees / totalAmount) * 100).toFixed(2) : 0
        },
        byDate,
        query: { creatorAddress: creatorAddress || 'all' }
      };
    } catch (error) {
      console.error('Error getting payment analytics:', error);
      throw error;
    }
  }
}

module.exports = new PurchasePaymentService();
