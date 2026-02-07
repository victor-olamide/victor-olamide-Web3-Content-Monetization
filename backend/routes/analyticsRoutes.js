const express = require('express');
const router = express.Router();
const { getUserAccessLogs, getContentAccessLogs, getAccessStats } = require('../services/accessLogger');

/**
 * Get user access history
 */
router.get('/user/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const { limit = 50 } = req.query;
    
    const logs = await getUserAccessLogs(address, parseInt(limit));
    res.json({ logs, count: logs.length });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch logs', error: err.message });
  }
});

/**
 * Get content access history
 */
router.get('/content/:contentId', async (req, res) => {
  try {
    const { contentId } = req.params;
    const { limit = 50 } = req.query;
    
    const logs = await getContentAccessLogs(parseInt(contentId), parseInt(limit));
    res.json({ logs, count: logs.length });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch logs', error: err.message });
  }
});

/**
 * Get content access statistics
 */
router.get('/stats/:contentId', async (req, res) => {
  try {
    const { contentId } = req.params;
    const stats = await getAccessStats(parseInt(contentId));
    
    res.json({ contentId: parseInt(contentId), stats });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch stats', error: err.message });
  }
});

module.exports = router;
