const express = require('express');
const router = express.Router();
const Purchase = require('../models/Purchase');

// Get purchase history for a user
router.get('/user/:address', async (req, res) => {
  try {
    const purchases = await Purchase.find({ user: req.params.address });
    res.json(purchases);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Register a new purchase (usually called by indexer or frontend)
router.post('/', async (req, res) => {
  const { contentId, user, txId, amount } = req.body;
  
  if (!contentId || !user || !txId || !amount) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const purchase = new Purchase({
    contentId,
    user,
    txId,
    amount
  });

  try {
    const newPurchase = await purchase.save();
    res.status(201).json(newPurchase);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
