const express = require('express');
const router = express.Router();
const Subscription = require('../models/Subscription');

// Get all subscriptions for a user
router.get('/:user', async (req, res) => {
  try {
    const subscriptions = await Subscription.find({ user: req.params.user });
    res.json(subscriptions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;