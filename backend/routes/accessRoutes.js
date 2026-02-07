const express = require('express');
const router = express.Router();
const Content = require('../models/Content');
const { verifyAccess } = require('../services/accessService');

// Verify access to specific content
router.get('/verify/:user/:contentId', async (req, res) => {
  try {
    const { user, contentId } = req.params;
    const result = await verifyAccess(parseInt(contentId), user);
    
    res.json({ 
      hasAccess: result.allowed,
      reason: result.reason,
      method: result.method
    });
  } catch (err) {
    console.error('Verification error:', err);
    res.status(500).json({ 
      message: 'Failed to verify access', 
      error: err.message,
      hasAccess: false 
    });
  }
});

// Batch verify access for multiple content items
router.post('/verify-batch', async (req, res) => {
  try {
    const { user, contentIds } = req.body;
    
    if (!user || !Array.isArray(contentIds)) {
      return res.status(400).json({ message: 'Invalid request' });
    }

    const results = await Promise.all(
      contentIds.map(async (contentId) => {
        const result = await verifyAccess(contentId, user);
        return { contentId, ...result };
      })
    );

    res.json({ results });
  } catch (err) {
    console.error('Batch verification error:', err);
    res.status(500).json({ message: 'Failed to verify access', error: err.message });
  }
});

module.exports = router;
