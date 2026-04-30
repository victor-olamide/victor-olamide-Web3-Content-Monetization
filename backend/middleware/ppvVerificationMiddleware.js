/**
 * Pay-Per-View Purchase Verification Middleware
 * 
 * This middleware handles verification of on-chain pay-per-view purchases
 * before granting content access. It verifies that:
 * - The transaction has been confirmed on-chain
 * - The user has made a valid purchase
 * - The content access is recorded on the contract
 */

const { verifyPurchase, checkContentAccess } = require('../services/payPerViewService');
const { verifyTransaction } = require('../services/stacksApiService');
const Purchase = require('../models/Purchase');
const logger = require('../utils/logger');

/**
 * Verify on-chain purchase before granting access
 * Middleware that validates pay-per-view purchases on the Stacks blockchain
 * 
 * @param {Object} req - Express request
 * @param {string} req.body.contentId - Content ID
 * @param {string} req.body.userAddress - User STX address
 * @param {string} req.body.txId - Transaction ID to verify
 * @returns {Object} Verification result
 */
async function verifyOnChainPurchase(req, res, next) {
  const { contentId, userAddress, txId } = req.body;

  if (!contentId || !userAddress || !txId) {
    return res.status(400).json({
      error: 'Missing required fields: contentId, userAddress, txId',
    });
  }

  try {
    logger.info('Verifying on-chain purchase', {
      contentId,
      userAddress,
      txId,
    });

    // Verify the transaction on Stacks API
    const txVerification = await verifyTransaction(txId);

    if (!txVerification.success) {
      logger.warn('Transaction not confirmed', {
        contentId,
        userAddress,
        txId,
        status: txVerification.status,
      });

      return res.status(402).json({
        error: 'Payment not confirmed on-chain',
        txStatus: txVerification.status,
        details: 'Transaction must be confirmed before access is granted',
      });
    }

    // Check if user has access on the contract
    const hasAccess = await checkContentAccess(contentId, userAddress);

    if (!hasAccess) {
      logger.warn('User does not have on-chain access', {
        contentId,
        userAddress,
      });

      return res.status(403).json({
        error: 'Access not verified on-chain',
        details: 'Purchase not found in smart contract',
      });
    }

    logger.info('On-chain purchase verified', {
      contentId,
      userAddress,
      txId,
      confirmations: txVerification.confirmations,
    });

    // Attach verification results to request
    req.ppvVerification = {
      verified: true,
      txId,
      txStatus: txVerification.status,
      confirmations: txVerification.confirmations,
      hasAccess,
      blockHeight: txVerification.blockHeight,
    };

    next();
  } catch (error) {
    logger.error('Error verifying on-chain purchase', {
      error: error.message,
      contentId,
      userAddress,
      txId,
    });

    return res.status(500).json({
      error: 'Failed to verify purchase on-chain',
      message: error.message,
    });
  }
}

/**
 * Verify access before content delivery
 * Checks both local database and on-chain verification
 */
async function verifyAccessBeforeDelivery(req, res, next) {
  const { contentId, userAddress } = req.body;

  if (!contentId || !userAddress) {
    return res.status(400).json({
      error: 'Missing required fields: contentId, userAddress',
    });
  }

  try {
    // First check local database
    const localPurchase = await Purchase.findOne({
      contentId,
      user: userAddress,
    });

    if (!localPurchase) {
      return res.status(404).json({
        error: 'No purchase found for this content',
      });
    }

    // Then verify on-chain
    const hasAccess = await checkContentAccess(contentId, userAddress);

    if (!hasAccess) {
      logger.warn('On-chain access mismatch for purchase', {
        contentId,
        userAddress,
        localPurchase: localPurchase._id,
      });

      return res.status(403).json({
        error: 'Access not verified on-chain',
        details: 'Purchase recorded locally but not found on-chain',
      });
    }

    logger.info('Access verified for content delivery', {
      contentId,
      userAddress,
    });

    // Attach verification to request
    req.accessVerified = {
      verified: true,
      contentId,
      userAddress,
      hasAccess: true,
      purchaseId: localPurchase._id,
    };

    next();
  } catch (error) {
    logger.error('Error verifying access for delivery', {
      error: error.message,
      contentId,
      userAddress,
    });

    return res.status(500).json({
      error: 'Failed to verify access',
      message: error.message,
    });
  }
}

/**
 * Check purchase status on-chain
 * GET endpoint to check if user has access to content
 */
async function checkPurchaseStatus(req, res) {
  const { contentId, userAddress } = req.query;

  if (!contentId || !userAddress) {
    return res.status(400).json({
      error: 'Missing required query parameters: contentId, userAddress',
    });
  }

  try {
    // Check local database
    const purchase = await Purchase.findOne({
      contentId,
      user: userAddress,
    });

    // Check on-chain
    const hasOnChainAccess = await checkContentAccess(contentId, userAddress);

    const status = {
      contentId,
      userAddress,
      hasPurchase: !!purchase,
      hasOnChainAccess,
      status: hasOnChainAccess ? 'verified' : 'pending',
    };

    if (purchase) {
      status.purchaseDate = purchase.timestamp;
      status.transactionId = purchase.txId;
      status.amount = purchase.amount;
    }

    return res.json(status);
  } catch (error) {
    logger.error('Error checking purchase status', {
      error: error.message,
      contentId,
      userAddress,
    });

    return res.status(500).json({
      error: 'Failed to check purchase status',
      message: error.message,
    });
  }
}

module.exports = {
  verifyOnChainPurchase,
  verifyAccessBeforeDelivery,
  checkPurchaseStatus,
};
