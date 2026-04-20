/**
 * Purchase Error Handling Service
 * Handles error scenarios, refunds, and recovery
 */

const Purchase = require('../models/Purchase');
const TransactionHistory = require('../models/TransactionHistory');
const { refundPurchase } = require('./refundService');

class PurchaseErrorService {
  /**
   * Handle payment verification failure
   */
  async handlePaymentVerificationFailure(txId, reason) {
    try {
      console.error(`Payment verification failed for transaction ${txId}: ${reason}`);

      // Log the error
      const errorRecord = {
        txId,
        reason,
        timestamp: new Date(),
        status: 'payment_verification_failed'
      };

      // Check if purchase exists and update status
      const purchase = await Purchase.findOne({ txId });
      if (purchase) {
        purchase.refundStatus = 'pending';
        await purchase.save();
      }

      return errorRecord;
    } catch (error) {
      console.error('Error handling payment verification failure:', error);
      throw error;
    }
  }

  /**
   * Handle failed transaction
   */
  async handleFailedTransaction(txId, errorDetails) {
    try {
      console.error(`Transaction failed: ${txId}`, errorDetails);

      const purchase = await Purchase.findOne({ txId });
      if (!purchase) {
        return { success: false, reason: 'Purchase not found' };
      }

      // Mark for refund
      purchase.refundStatus = 'pending';
      await purchase.save();

      // Record error in transaction history
      await TransactionHistory.create({
        userAddress: purchase.user.toLowerCase(),
        transactionType: 'purchase',
        amount: purchase.amount,
        status: 'failed',
        txHash: txId,
        description: `Failed purchase: ${errorDetails}`,
        metadata: {
          contentId: purchase.contentId,
          creator: purchase.creator,
          errorDetails: errorDetails
        },
        category: 'expense'
      });

      return {
        success: true,
        purchase: purchase._id,
        refundInitiated: true
      };
    } catch (error) {
      console.error('Error handling failed transaction:', error);
      throw error;
    }
  }

  /**
   * Retry failed purchase
   */
  async retryFailedPurchase(purchaseId) {
    try {
      const purchase = await Purchase.findById(purchaseId);
      if (!purchase) {
        return { success: false, reason: 'Purchase not found' };
      }

      if (purchase.refundStatus !== 'pending') {
        return { success: false, reason: 'Purchase is not in pending refund status' };
      }

      // Reset refund status to attempt recovery
      purchase.refundStatus = 'none';
      await purchase.save();

      return {
        success: true,
        message: 'Retry initiated for failed purchase',
        purchaseId: purchase._id
      };
    } catch (error) {
      console.error('Error retrying failed purchase:', error);
      throw error;
    }
  }

  /**
   * Handle duplicate transaction detection
   */
  async handleDuplicateTransaction(txId) {
    try {
      const existingPurchase = await Purchase.findOne({ txId });

      if (!existingPurchase) {
        return {
          isDuplicate: false,
          message: 'No existing purchase with this transaction ID'
        };
      }

      console.warn(`Duplicate transaction detected: ${txId}`);

      return {
        isDuplicate: true,
        existingPurchase: {
          id: existingPurchase._id,
          contentId: existingPurchase.contentId,
          user: existingPurchase.user,
          amount: existingPurchase.amount,
          timestamp: existingPurchase.timestamp
        },
        action: 'Purchase already recorded'
      };
    } catch (error) {
      console.error('Error handling duplicate transaction:', error);
      throw error;
    }
  }

  /**
   * Handle insufficient balance scenario
   */
  async handleInsufficientBalance(userAddress, requiredAmount) {
    try {
      console.error(
        `Insufficient balance for user ${userAddress}. Required: ${requiredAmount}`
      );

      return {
        error: 'insufficient_balance',
        userAddress,
        requiredAmount,
        message: 'User has insufficient balance for this purchase',
        suggestedActions: [
          'Top up wallet',
          'Choose lower-priced content',
          'Check available balance'
        ]
      };
    } catch (error) {
      console.error('Error handling insufficient balance:', error);
      throw error;
    }
  }

  /**
   * Handle content not found
   */
  async handleContentNotFound(contentId) {
    try {
      console.error(`Content not found: ${contentId}`);

      return {
        error: 'content_not_found',
        contentId,
        message: 'The requested content does not exist',
        suggestedActions: [
          'Verify content ID',
          'Check if content has been removed',
          'Browse available content'
        ]
      };
    } catch (error) {
      console.error('Error handling content not found:', error);
      throw error;
    }
  }

  /**
   * Handle access revocation edge cases
   */
  async handleAccessRevocationIssues(contentId, userAddress) {
    try {
      const purchase = await Purchase.findOne({
        contentId,
        user: userAddress
      });

      if (!purchase) {
        return {
          issue: 'no_purchase',
          message: 'No purchase found for this user and content'
        };
      }

      if (purchase.accessRevoked) {
        return {
          issue: 'access_already_revoked',
          revokedAt: purchase.accessRevokedAt,
          message: 'Access has already been revoked'
        };
      }

      if (purchase.refundStatus === 'completed') {
        return {
          issue: 'already_refunded',
          refundedAt: purchase.refundedAt,
          message: 'This purchase has already been refunded'
        };
      }

      return {
        issue: 'none',
        message: 'No access revocation issues detected'
      };
    } catch (error) {
      console.error('Error checking access revocation issues:', error);
      throw error;
    }
  }

  /**
   * Get error metrics for debugging
   */
  async getErrorMetrics() {
    try {
      const failedTransactions = await TransactionHistory.countDocuments({
        transactionType: 'purchase',
        status: 'failed'
      });

      const pendingRefunds = await Purchase.countDocuments({
        refundStatus: 'pending'
      });

      const revokedAccess = await Purchase.countDocuments({
        accessRevoked: true
      });

      return {
        failedTransactions,
        pendingRefunds,
        revokedAccess,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Error getting error metrics:', error);
      throw error;
    }
  }

  /**
   * Audit trail for troubleshooting
   */
  async getAuditTrail(txId, contentId, userAddress) {
    try {
      let query = {};

      if (txId) query.txId = txId;
      if (contentId) query.contentId = contentId;
      if (userAddress) query.user = userAddress.toLowerCase();

      const purchases = await Purchase.find(query).lean().exec();
      const transactions = await TransactionHistory.find({
        ...query,
        transactionType: 'purchase'
      })
        .sort({ createdAt: -1 })
        .lean()
        .exec();

      return {
        purchases,
        transactions,
        auditTimestamp: new Date()
      };
    } catch (error) {
      console.error('Error generating audit trail:', error);
      throw error;
    }
  }
}

module.exports = new PurchaseErrorService();
