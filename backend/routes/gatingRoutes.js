const express = require('express');
const router = express.Router();
const GatingRule = require('../models/GatingRule');

// Get gating rule for specific content
router.get('/:contentId', async (req, res) => {
  try {
    const rule = await GatingRule.findOne({ contentId: req.params.contentId });
    if (!rule) return res.status(404).json({ message: 'Gating rule not found' });
    res.json(rule);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all gating rules
router.get('/', async (req, res) => {
  try {
    const rules = await GatingRule.find();
    res.json(rules);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
