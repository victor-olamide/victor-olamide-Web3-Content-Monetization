const express = require('express');
const router = express.Router();
const Content = require('../models/Content');
const { hasAccess } = require('../services/accessService');

// Verify access to specific content
router.get('/verify/:user/:contentId', async (req, res) => {
  try {
    const { user, contentId } = req.params;
    const content = await Content.findOne({ contentId });
    
    if (!content) {
      return res.status(404).json({ message: 'Content not found' });
    }
    
    const allowed = await hasAccess(content, user);
    res.json({ 
      hasAccess: allowed,
      method: allowed ? 'verified' : 'denied',
      gating: content.tokenGating
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

module.exports = router;
