const express = require('express');
const router = express.Router();
const { replayUnprocessed } = require('../services/webhookReplay');

// Admin endpoint to trigger replay of unprocessed events
router.post('/replay', async (req, res) => {
  try {
    const limit = parseInt(req.body.limit) || 100;
    await replayUnprocessed(limit);
    res.json({ status: 'replay_started', limit });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
