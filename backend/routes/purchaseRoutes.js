const express = require('express');
const router = express.Router();
const Purchase = require('../models/Purchase');
const { getPlatformFee, calculatePlatformFee } = require('../services/contractService');
const { distributePurchaseRoyalties } = require('../services/royaltyService');

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
router.get('/calculate-fee/:amount', async (req, res) => {
  try {
    const amount = parseInt(req.params.amount);
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
router.get('/user/:address', async (req, res) => {
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
router.post('/', async (req, res) => {
  const { contentId, user, txId, amount, creator } = req.body;
  
  if (!contentId || !user || !txId || !amount || !creator) {
    return res.status(400).json({ message: 'Missing required fields' });
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

module.exports = router;
