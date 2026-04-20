'use strict';

const express = require('express');
const router = express.Router();
const userProfileService = require('../services/userProfileService');
const { verifyWalletAuth } = require('../middleware/walletAuth');
const logger = require('../utils/logger');
const {
  validateProfileId,
  validateProfileUpdate,
  validateProfileData,
  validatePreferences,
  validateSettings,
  validateSocialLinks,
  validateRating,
  validateCompletion,
  validatePaginationParams,
} = require('../middleware/profileValidation');

// ── Helper: pick status code from service error ───────────────────────────────
function errStatus(err) {
  return err.statusCode || (err.message === 'Profile not found' ? 404 : 500);
}

// ── GET /profile/me ───────────────────────────────────────────────────────────
router.get('/me', verifyWalletAuth, async (req, res) => {
  try {
    const profile = await userProfileService.getProfileById(req.walletAddress);
    return res.json({ success: true, data: profile });
  } catch (err) {
    logger.error('GET /profile/me failed', { err });
    return res.status(errStatus(err)).json({ success: false, error: err.message });
  }
});

// ── PUT /profile/me ───────────────────────────────────────────────────────────
router.put('/me', verifyWalletAuth, validateProfileData, async (req, res) => {
  try {
    const profile = await userProfileService.updateProfileById(req.walletAddress, req.body);
    return res.json({ success: true, data: profile, message: 'Profile updated successfully' });
  } catch (err) {
    logger.error('PUT /profile/me failed', { err });
    return res.status(errStatus(err)).json({ success: false, error: err.message });
  }
});

// ── PUT /profile/preferences ──────────────────────────────────────────────────
router.put('/preferences', verifyWalletAuth, validatePreferences, async (req, res) => {
  try {
    const profile = await userProfileService.updatePreferences(req.walletAddress, req.body);
    return res.json({ success: true, data: profile, message: 'Preferences updated successfully' });
  } catch (err) {
    logger.error('PUT /profile/preferences failed', { err });
    return res.status(errStatus(err)).json({ success: false, error: err.message });
  }
});

// ── PUT /profile/settings ─────────────────────────────────────────────────────
router.put('/settings', verifyWalletAuth, validateSettings, async (req, res) => {
  try {
    const profile = await userProfileService.updateSettings(req.walletAddress, req.body);
    return res.json({ success: true, data: profile, message: 'Settings updated successfully' });
  } catch (err) {
    logger.error('PUT /profile/settings failed', { err });
    return res.status(errStatus(err)).json({ success: false, error: err.message });
  }
});

// ── PUT /profile/social-links ─────────────────────────────────────────────────
router.put('/social-links', verifyWalletAuth, validateSocialLinks, async (req, res) => {
  try {
    const profile = await userProfileService.updateSocialLinks(req.walletAddress, req.body);
    return res.json({ success: true, data: profile, message: 'Social links updated successfully' });
  } catch (err) {
    logger.error('PUT /profile/social-links failed', { err });
    return res.status(errStatus(err)).json({ success: false, error: err.message });
  }
});

// ── GET /profile/purchases ────────────────────────────────────────────────────
router.get('/purchases', verifyWalletAuth, validatePaginationParams, async (req, res) => {
  try {
    const result = await userProfileService.getPurchaseHistory(req.walletAddress, req.pagination);
    return res.json({ success: true, data: result });
  } catch (err) {
    logger.error('GET /profile/purchases failed', { err });
    return res.status(errStatus(err)).json({ success: false, error: err.message });
  }
});

// ── GET /profile/favorites ────────────────────────────────────────────────────
router.get('/favorites', verifyWalletAuth, validatePaginationParams, async (req, res) => {
  try {
    const result = await userProfileService.getFavorites(req.walletAddress, req.pagination);
    return res.json({ success: true, data: result });
  } catch (err) {
    logger.error('GET /profile/favorites failed', { err });
    return res.status(errStatus(err)).json({ success: false, error: err.message });
  }
});

// ── POST /profile/favorites/:purchaseId ──────────────────────────────────────
router.post('/favorites/:purchaseId', verifyWalletAuth, async (req, res) => {
  try {
    const purchase = await userProfileService.toggleFavorite(req.walletAddress, req.params.purchaseId);
    return res.json({ success: true, data: purchase });
  } catch (err) {
    logger.error('POST /profile/favorites/:purchaseId failed', { err });
    return res.status(errStatus(err)).json({ success: false, error: err.message });
  }
});

// ── GET /profile/stats ────────────────────────────────────────────────────────
router.get('/stats', verifyWalletAuth, async (req, res) => {
  try {
    const stats = await userProfileService.getProfileStats(req.walletAddress);
    return res.json({ success: true, data: stats });
  } catch (err) {
    logger.error('GET /profile/stats failed', { err });
    return res.status(errStatus(err)).json({ success: false, error: err.message });
  }
});

// ── POST /profile/rating/:purchaseId ─────────────────────────────────────────
router.post('/rating/:purchaseId', verifyWalletAuth, validateRating, async (req, res) => {
  try {
    const { rating, review } = req.body;
    const purchase = await userProfileService.addRating(req.walletAddress, req.params.purchaseId, rating, review);
    return res.json({ success: true, data: purchase, message: 'Rating added successfully' });
  } catch (err) {
    logger.error('POST /profile/rating/:purchaseId failed', { err });
    return res.status(errStatus(err)).json({ success: false, error: err.message });
  }
});

// ── POST /profile/access/:purchaseId ─────────────────────────────────────────
router.post('/access/:purchaseId', verifyWalletAuth, async (req, res) => {
  try {
    const purchase = await userProfileService.recordAccess(req.walletAddress, req.params.purchaseId, req.body.accessType || 'view');
    return res.json({ success: true, data: purchase });
  } catch (err) {
    logger.error('POST /profile/access/:purchaseId failed', { err });
    return res.status(errStatus(err)).json({ success: false, error: err.message });
  }
});

// ── PUT /profile/completion/:purchaseId ──────────────────────────────────────
router.put('/completion/:purchaseId', verifyWalletAuth, validateCompletion, async (req, res) => {
  try {
    const purchase = await userProfileService.updateCompletionPercentage(req.walletAddress, req.params.purchaseId, req.body.percentage);
    return res.json({ success: true, data: purchase });
  } catch (err) {
    logger.error('PUT /profile/completion/:purchaseId failed', { err });
    return res.status(errStatus(err)).json({ success: false, error: err.message });
  }
});

// ── POST /profile/block/:blockedAddress ──────────────────────────────────────
router.post('/block/:blockedAddress', verifyWalletAuth, async (req, res) => {
  try {
    const profile = await userProfileService.blockUser(req.walletAddress, req.params.blockedAddress);
    return res.json({ success: true, data: profile, message: 'User blocked successfully' });
  } catch (err) {
    logger.error('POST /profile/block/:blockedAddress failed', { err });
    return res.status(errStatus(err)).json({ success: false, error: err.message });
  }
});

// ── DELETE /profile/block/:blockedAddress ─────────────────────────────────────
router.delete('/block/:blockedAddress', verifyWalletAuth, async (req, res) => {
  try {
    const profile = await userProfileService.unblockUser(req.walletAddress, req.params.blockedAddress);
    return res.json({ success: true, data: profile, message: 'User unblocked successfully' });
  } catch (err) {
    logger.error('DELETE /profile/block/:blockedAddress failed', { err });
    return res.status(errStatus(err)).json({ success: false, error: err.message });
  }
});

// ── GET /profile/:id ──────────────────────────────────────────────────────────
/**
 * Fetch a user profile by wallet address (:id).
 * Public callers receive a restricted view; authenticated owners see full data.
 */
router.get('/:id', validateProfileId, async (req, res) => {
  try {
    const profile = await userProfileService.getProfileById(req.params.id);

    // If the requester is the owner (wallet auth present and matches), return full profile
    const isOwner = req.walletAddress && req.walletAddress.toLowerCase() === profile.address;
    if (isOwner) {
      return res.json({ success: true, data: profile });
    }

    // Public view — omit sensitive fields
    const publicData = {
      address: profile.address,
      displayName: profile.displayName,
      avatar: profile.avatar,
      username: profile.username,
      bio: profile.bio,
      isVerified: profile.isVerified,
      socialLinks: profile.socialLinks,
      totalPurchases: profile.totalPurchases,
      profileCompleteness: profile.profileCompleteness,
    };
    return res.json({ success: true, data: publicData });
  } catch (err) {
    logger.error('GET /profile/:id failed', { err, id: req.params.id });
    return res.status(errStatus(err)).json({ success: false, error: err.message });
  }
});

// ── PUT /profile/:id ──────────────────────────────────────────────────────────
/**
 * Update displayName, bio, and/or avatar for the profile identified by :id.
 * Requires wallet authentication; only the profile owner may update.
 */
router.put('/:id', verifyWalletAuth, validateProfileId, validateProfileUpdate, async (req, res) => {
  try {
    // Ownership check — authenticated wallet must match the :id param
    if (req.walletAddress.toLowerCase() !== req.params.id) {
      return res.status(403).json({ success: false, error: 'Forbidden: you can only update your own profile' });
    }

    const { displayName, bio, avatar } = req.body;
    const profile = await userProfileService.updateProfileById(req.params.id, { displayName, bio, avatar });
    return res.json({ success: true, data: profile, message: 'Profile updated successfully' });
  } catch (err) {
    logger.error('PUT /profile/:id failed', { err, id: req.params.id });
    return res.status(errStatus(err)).json({ success: false, error: err.message });
  }
});

module.exports = router;
