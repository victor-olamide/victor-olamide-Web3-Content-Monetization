const express = require('express');
const router = express.Router();
const Purchase = require('../models/Purchase');
const { getPlatformFee, calculatePlatformFee } = require('../services/contractService');
const { distributePurchaseRoyalties } = require('../services/royaltyService');
const { verifyTransaction } = require('../services/stacksApiService');
const { recordTransaction } = require('../services/transactionHistoryService');
const { getCurrentSTXPrice } = require('../services/stxPriceService');
const { txConfirmationGate } = require('../middleware/txConfirmationGate');
const {
  validatePurchaseBody,
  validateAmountParam,
  validateAddressParam,
} = require('../middleware/inputValidation');
const {
  verifyOnChainPurchase,
  verifyAccessBeforeDelivery,
  checkPurchaseStatus,
} = require('../middleware/ppvVerificationMiddleware');
const {
  checkContentAccess,
  verifyPurchase,
} = require('../services/payPerViewService');

// Get platform fee information
router.get('/platform-fee', async (req, res) => {
  try {
    const fee = await getPlatformFee();
    res.json({ platformFee: fee, feePercentage: (fee / 100).toFixed(2) + '%' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Calculate platform fee for a specific amount
router.get('/calculate-fee/:amount', validateAmountParam, async (req, res) => {
  try {
    const amount = req.parsedAmount;
    const fee = await calculatePlatformFee(amount);
    const creatorAmount = amount - fee;
    res.json({ 
      totalAmount: amount, 
      platformFee: fee, 
      creatorAmount: creatorAmount 
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get purchase history for a user
router.get('/user/:address', validateAddressParam, async (req, res) => {
  try {
    const purchases = await Purchase.find({ user: req.params.address }).sort({ timestamp: -1 });
    res.json(purchases);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Check if a user has purchased specific content
router.get('/check/:user/:contentId', async (req, res) => {
  try {
    const purchase = await Purchase.findOne({ 
      user: req.params.user, 
      contentId: req.params.contentId 
    });
    res.json({ hasAccess: !!purchase });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Register a new purchase (usually called by indexer or frontend)
router.post('/', validatePurchaseBody, txConfirmationGate, async (req, res) => {
  const { contentId, user, txId, amount, creator } = req.validatedBody;

  try {
    const existing = await Purchase.findOne({ txId });
    if (existing) {
      return res.status(409).json({ message: 'Purchase with this txId already exists' });
    }
  } catch (err) {
    return res.status(500).json({ message: 'Failed to check for duplicate transaction' });
  }

  const purchase = new Purchase({
    contentId,
    user,
    creator,
    txId,
    amount
  });

  try {
    const newPurchase = await purchase.save();

    // Trigger royalty distribution asynchronously
    try {
      const distributions = await distributePurchaseRoyalties(newPurchase);
      if (distributions.length > 0) {
        newPurchase.royaltiesDistributed = true;
        newPurchase.distributionCompletedAt = new Date();
        await newPurchase.save();
      }
    } catch (royaltyErr) {
      console.error('Failed to distribute royalties:', royaltyErr);
      // Don't fail the purchase if royalty distribution fails
      // It can be retried later
    }

    res.status(201).json(newPurchase);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Buy access to individual content (verifies payment and grants access)
router.post('/purchases', async (req, res) => {
  const { contentId, user, txId, amount, creator } = req.body;

  if (!contentId || !user || !txId || !amount || !creator) {
    return res.status(400).json({ message: 'Missing required fields: contentId, user, txId, amount, creator' });
  }

  try {
    // Check if purchase already exists
    const existingPurchase = await Purchase.findOne({ txId });
    if (existingPurchase) {
      return res.status(409).json({ message: 'Purchase with this transaction ID already exists' });
    }

    // Verify payment on blockchain
    const txVerification = await verifyTransaction(txId);
    if (!txVerification.success) {
      return res.status(400).json({ 
        message: 'Payment verification failed', 
        status: txVerification.status 
      });
    }

    // Calculate platform fee and creator amount
    const platformFee = await calculatePlatformFee(amount);
    const creatorAmount = amount - platformFee;

    // Create purchase record
    const purchase = new Purchase({
      contentId,
      user,
      creator,
      txId,
      amount,
      platformFee,
      creatorAmount
    });

    const savedPurchase = await purchase.save();

    // Record transaction in history
    const priceData = await getCurrentSTXPrice();
    const stxPrice = priceData.usd;
    await recordTransaction(user, {
      transactionType: 'purchase',
      amount: amount,
      amountUsd: amount * stxPrice,
      stxPrice: stxPrice,
      txHash: txId,
      blockHeight: txVerification.blockHeight,
      status: 'confirmed',
      relatedContentId: contentId.toString(),
      relatedAddress: creator,
      relatedAddressType: 'creator',
      description: `Purchase of content ${contentId}`,
      category: 'expense',
      metadata: {
        contentId: contentId,
        creator: creator
      }
    });

    // Trigger royalty distribution asynchronously
    try {
      const distributions = await distributePurchaseRoyalties(savedPurchase);
      if (distributions.length > 0) {
        savedPurchase.royaltiesDistributed = true;
        savedPurchase.distributionCompletedAt = new Date();
        await savedPurchase.save();
      }
    } catch (royaltyErr) {
      console.error('Failed to distribute royalties:', royaltyErr);
      // Don't fail the purchase if royalty distribution fails
    }

    res.status(201).json({
      purchase: savedPurchase,
      verification: txVerification
    });
  } catch (err) {
    console.error('Purchase processing error:', err);
    res.status(500).json({ message: 'Failed to process purchase', error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PAY-PER-VIEW CONTRACT INTEGRATION ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

// Verify on-chain purchase before granting access
// POST /purchases/verify-ppv
// Body: { contentId, userAddress, txId }
router.post('/verify-ppv', verifyOnChainPurchase, async (req, res) => {
  try {
    const { contentId, userAddress } = req.body;

    // Verification is already done by middleware
    const verificationResult = req.ppvVerification;

    // Create or update purchase record in DB
    const purchase = await Purchase.findOne({
      contentId,
      user: userAddress,
    });

    if (!purchase) {
      // Create new purchase record
      const newPurchase = new Purchase({
        contentId,
        user: userAddress,
        txId: verificationResult.txId,
        verified: true,
        verifiedAt: new Date(),
        blockHeight: verificationResult.blockHeight,
        confirmations: verificationResult.confirmations,
      });
      await newPurchase.save();
    }

    res.json({
      success: true,
      message: 'Purchase verified on-chain',
      verification: verificationResult,
    });
  } catch (err) {
    console.error('Error in PPV verification route:', err);
    res.status(500).json({ message: 'Failed to process verification', error: err.message });
  }
});

// Grant access after verification
// POST /purchases/grant-access
// Body: { contentId, userAddress }
router.post('/grant-access', verifyAccessBeforeDelivery, async (req, res) => {
  try {
    const { contentId, userAddress } = req.body;
    const accessVerified = req.accessVerified;

    if (!accessVerified.verified) {
      return res.status(403).json({
        error: 'Access verification failed',
      });
    }

    res.json({
      success: true,
      message: 'Access granted',
      contentId,
      userAddress,
      grantedAt: new Date(),
    });
  } catch (err) {
    console.error('Error granting access:', err);
    res.status(500).json({ message: 'Failed to grant access', error: err.message });
  }
});

// Check purchase status on-chain
// GET /purchases/status?contentId=X&userAddress=Y
router.get('/status', checkPurchaseStatus);

// Get PPV contract metrics
// GET /purchases/ppv-metrics
router.get('/ppv-metrics', async (req, res) => {
  try {
    const { getMetrics } = require('../services/payPerViewService');
    const metrics = getMetrics();

    res.json({
      metrics,
      timestamp: new Date(),
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch metrics', error: err.message });
  }
});

module.exports = router;
