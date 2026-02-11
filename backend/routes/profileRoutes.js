const express = require('express');
const router = express.Router();
const userProfileService = require('../services/userProfileService');
const { verifyWalletAuth } = require('../middleware/walletAuth');

/**
 * Get current user profile
 * GET /api/profile/me
 */
router.get('/me', verifyWalletAuth, async (req, res) => {
  try {
    const profile = await userProfileService.getProfile(req.walletAddress);
    res.json({ success: true, data: profile });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(404).json({ success: false, error: error.message });
  }
});

/**
 * Get user profile by address
 * GET /api/profile/:address
 */
router.get('/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const profile = await userProfileService.getProfile(address);

    // Hide sensitive information if viewing public profile
    if (req.walletAddress !== address.toLowerCase()) {
      const publicProfile = {
        address: profile.address,
        displayName: profile.displayName,
        avatar: profile.avatar,
        username: profile.username,
        bio: profile.bio,
        isVerified: profile.isVerified,
        socialLinks: profile.socialLinks,
        totalPurchases: profile.totalPurchases
      };
      return res.json({ success: true, data: publicProfile });
    }

    res.json({ success: true, data: profile });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(404).json({ success: false, error: error.message });
  }
});

/**
 * Update user profile
 * PUT /api/profile/me
 */
router.put('/me', verifyWalletAuth, async (req, res) => {
  try {
    const profile = await userProfileService.updateProfile(req.walletAddress, req.body);
    res.json({ success: true, data: profile, message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * Update user preferences
 * PUT /api/profile/preferences
 */
router.put('/preferences', verifyWalletAuth, async (req, res) => {
  try {
    const profile = await userProfileService.updatePreferences(req.walletAddress, req.body);
    res.json({ success: true, data: profile, message: 'Preferences updated successfully' });
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * Update user settings
 * PUT /api/profile/settings
 */
router.put('/settings', verifyWalletAuth, async (req, res) => {
  try {
    const profile = await userProfileService.updateSettings(req.walletAddress, req.body);
    res.json({ success: true, data: profile, message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * Update social links
 * PUT /api/profile/social-links
 */
router.put('/social-links', verifyWalletAuth, async (req, res) => {
  try {
    const profile = await userProfileService.updateSocialLinks(req.walletAddress, req.body);
    res.json({ success: true, data: profile, message: 'Social links updated successfully' });
  } catch (error) {
    console.error('Error updating social links:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * Get purchase history
 * GET /api/profile/purchases
 */
router.get('/purchases', verifyWalletAuth, async (req, res) => {
  try {
    const skip = parseInt(req.query.skip) || 0;
    const limit = parseInt(req.query.limit) || 20;
    const sortBy = req.query.sortBy || 'purchaseDate';

    const result = await userProfileService.getPurchaseHistory(req.walletAddress, {
      skip,
      limit,
      sortBy
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching purchase history:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get favorite content
 * GET /api/profile/favorites
 */
router.get('/favorites', verifyWalletAuth, async (req, res) => {
  try {
    const skip = parseInt(req.query.skip) || 0;
    const limit = parseInt(req.query.limit) || 20;

    const result = await userProfileService.getFavorites(req.walletAddress, { skip, limit });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching favorites:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Toggle favorite status
 * POST /api/profile/favorites/:purchaseId
 */
router.post('/favorites/:purchaseId', verifyWalletAuth, async (req, res) => {
  try {
    const { purchaseId } = req.params;
    const purchase = await userProfileService.toggleFavorite(req.walletAddress, purchaseId);
    res.json({ success: true, data: purchase });
  } catch (error) {
    console.error('Error toggling favorite:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * Get profile statistics
 * GET /api/profile/stats
 */
router.get('/stats', verifyWalletAuth, async (req, res) => {
  try {
    const stats = await userProfileService.getProfileStats(req.walletAddress);
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching profile stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Add rating and review
 * POST /api/profile/rating/:purchaseId
 */
router.post('/rating/:purchaseId', verifyWalletAuth, async (req, res) => {
  try {
    const { purchaseId } = req.params;
    const { rating, review } = req.body;

    if (rating === undefined || rating === null) {
      return res.status(400).json({ success: false, error: 'Rating is required' });
    }

    const purchase = await userProfileService.addRating(
      req.walletAddress,
      purchaseId,
      rating,
      review
    );

    res.json({ success: true, data: purchase, message: 'Rating added successfully' });
  } catch (error) {
    console.error('Error adding rating:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * Record content access
 * POST /api/profile/access/:purchaseId
 */
router.post('/access/:purchaseId', verifyWalletAuth, async (req, res) => {
  try {
    const { purchaseId } = req.params;
    const { accessType } = req.body;

    const purchase = await userProfileService.recordAccess(
      req.walletAddress,
      purchaseId,
      accessType || 'view'
    );

    res.json({ success: true, data: purchase });
  } catch (error) {
    console.error('Error recording access:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * Update completion percentage
 * PUT /api/profile/completion/:purchaseId
 */
router.put('/completion/:purchaseId', verifyWalletAuth, async (req, res) => {
  try {
    const { purchaseId } = req.params;
    const { percentage } = req.body;

    if (percentage === undefined || percentage === null) {
      return res.status(400).json({ success: false, error: 'Percentage is required' });
    }

    const purchase = await userProfileService.updateCompletionPercentage(
      req.walletAddress,
      purchaseId,
      percentage
    );

    res.json({ success: true, data: purchase });
  } catch (error) {
    console.error('Error updating completion:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * Block a user
 * POST /api/profile/block/:blockedAddress
 */
router.post('/block/:blockedAddress', verifyWalletAuth, async (req, res) => {
  try {
    const { blockedAddress } = req.params;
    const profile = await userProfileService.blockUser(req.walletAddress, blockedAddress);
    res.json({ success: true, data: profile, message: 'User blocked successfully' });
  } catch (error) {
    console.error('Error blocking user:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * Unblock a user
 * DELETE /api/profile/block/:blockedAddress
 */
router.delete('/block/:blockedAddress', verifyWalletAuth, async (req, res) => {
  try {
    const { blockedAddress } = req.params;
    const profile = await userProfileService.unblockUser(req.walletAddress, blockedAddress);
    res.json({ success: true, data: profile, message: 'User unblocked successfully' });
  } catch (error) {
    console.error('Error unblocking user:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

module.exports = router;
