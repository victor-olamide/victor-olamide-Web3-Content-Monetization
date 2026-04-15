'use strict';

/**
 * User Profile Service
 * Manages user profiles, settings, preferences, and purchase history.
 */

const UserProfile = require('../models/UserProfile');
const Purchase = require('../models/Purchase');
const PurchaseHistory = require('../models/PurchaseHistory');
const Content = require('../models/Content');
const logger = require('../utils/logger');

// Fields callers are allowed to set via updateProfile / updateProfileById
const UPDATABLE_FIELDS = ['displayName', 'avatar', 'username', 'bio', 'preferences', 'settings', 'socialLinks'];

// Fields exposed on a public (unauthenticated) profile view
const PUBLIC_FIELDS = 'address displayName avatar username bio isVerified socialLinks totalPurchases';

class UserProfileService {

  // ── Core CRUD ──────────────────────────────────────────────────────────────

  /**
   * Get or create a profile by wallet address.
   */
  async getOrCreateProfile(address) {
    try {
      const addr = address.toLowerCase();
      let profile = await UserProfile.findOne({ address: addr });
      if (!profile) {
        profile = await UserProfile.create({ address: addr });
      }
      return profile;
    } catch (err) {
      logger.error('getOrCreateProfile failed', { err, address });
      throw err;
    }
  }

  /**
   * GET /profile/:id — fetch profile by wallet address (the :id param).
   * Returns the full document; callers decide what to expose.
   * Throws with status 404 if not found.
   */
  async getProfileById(id) {
    try {
      const profile = await UserProfile.findOne({ address: id.toLowerCase() });
      if (!profile) {
        const err = new Error('Profile not found');
        err.statusCode = 404;
        throw err;
      }
      return profile;
    } catch (err) {
      logger.error('getProfileById failed', { err, id });
      throw err;
    }
  }

  /**
   * PUT /profile/:id — update displayName, bio, avatar (and optionally other
   * allowed fields) for the profile identified by wallet address :id.
   * Only fields present in UPDATABLE_FIELDS are written.
   * Throws 404 if the profile does not exist.
   */
  async updateProfileById(id, data) {
    try {
      const updateData = {};
      for (const field of UPDATABLE_FIELDS) {
        if (field in data) updateData[field] = data[field];
      }
      if (Object.keys(updateData).length === 0) {
        const err = new Error('No updatable fields provided');
        err.statusCode = 400;
        throw err;
      }
      updateData.lastProfileUpdate = new Date();

      const profile = await UserProfile.findOneAndUpdate(
        { address: id.toLowerCase() },
        { $set: updateData },
        { new: true, runValidators: true }
      );
      if (!profile) {
        const err = new Error('Profile not found');
        err.statusCode = 404;
        throw err;
      }
      return profile;
    } catch (err) {
      logger.error('updateProfileById failed', { err, id });
      throw err;
    }
  }

  /**
   * Legacy: get profile by address (alias for getProfileById).
   */
  async getProfile(address) {
    return this.getProfileById(address);
  }

  /**
   * Legacy: update profile by address (alias for updateProfileById).
   */
  async updateProfile(address, data) {
    return this.updateProfileById(address, data);
  }

  // ── Sub-resource updates ───────────────────────────────────────────────────

  async updatePreferences(address, preferences) {
    try {
      const profile = await UserProfile.findOneAndUpdate(
        { address: address.toLowerCase() },
        { $set: { preferences } },
        { new: true }
      );
      if (!profile) { const e = new Error('Profile not found'); e.statusCode = 404; throw e; }
      return profile;
    } catch (err) {
      logger.error('updatePreferences failed', { err, address });
      throw err;
    }
  }

  async updateSettings(address, settings) {
    try {
      const profile = await UserProfile.findOneAndUpdate(
        { address: address.toLowerCase() },
        { $set: { settings } },
        { new: true }
      );
      if (!profile) { const e = new Error('Profile not found'); e.statusCode = 404; throw e; }
      return profile;
    } catch (err) {
      logger.error('updateSettings failed', { err, address });
      throw err;
    }
  }

  async updateSocialLinks(address, socialLinks) {
    try {
      const profile = await UserProfile.findOneAndUpdate(
        { address: address.toLowerCase() },
        { $set: { socialLinks } },
        { new: true }
      );
      if (!profile) { const e = new Error('Profile not found'); e.statusCode = 404; throw e; }
      return profile;
    } catch (err) {
      logger.error('updateSocialLinks failed', { err, address });
      throw err;
    }
  }

  async updateTier(address, tier) {
    const ALLOWED = ['free', 'basic', 'premium', 'enterprise', 'admin'];
    if (!ALLOWED.includes(tier)) {
      const e = new Error('Invalid tier'); e.statusCode = 400; throw e;
    }
    try {
      const profile = await UserProfile.findOneAndUpdate(
        { address: address.toLowerCase() },
        { $set: { tier } },
        { new: true }
      );
      if (!profile) { const e = new Error('Profile not found'); e.statusCode = 404; throw e; }
      return profile;
    } catch (err) {
      logger.error('updateTier failed', { err, address });
      throw err;
    }
  }

  async updateLastLogin(address) {
    try {
      return await UserProfile.findOneAndUpdate(
        { address: address.toLowerCase() },
        { $set: { lastLogin: new Date() } },
        { new: true }
      );
    } catch (err) {
      logger.error('updateLastLogin failed', { err, address });
      throw err;
    }
  }

  // ── Purchase history ───────────────────────────────────────────────────────

  async recordPurchase(buyerAddress, contentId, purchaseData) {
    try {
      const content = await Content.findOne({ contentId });
      if (!content) { const e = new Error('Content not found'); e.statusCode = 404; throw e; }

      const purchaseHistory = await PurchaseHistory.create({
        buyerAddress: buyerAddress.toLowerCase(),
        contentId,
        contentTitle: content.title,
        contentType: content.contentType,
        creatorAddress: content.creator.toLowerCase(),
        creatorName: content.creatorName || content.creator,
        purchasePrice: purchaseData.price,
        purchaseCurrency: purchaseData.currency || 'USD',
        transactionHash: purchaseData.transactionHash,
        transactionStatus: purchaseData.status || 'completed',
      });

      await UserProfile.findOneAndUpdate(
        { address: buyerAddress.toLowerCase() },
        { $inc: { totalPurchases: 1, totalSpent: purchaseData.price } }
      );

      return purchaseHistory;
    } catch (err) {
      logger.error('recordPurchase failed', { err, buyerAddress, contentId });
      throw err;
    }
  }

  async getPurchaseHistory(address, options = {}) {
    try {
      const { skip = 0, limit = 20, sortBy = 'purchaseDate' } = options;
      const query = { buyerAddress: address.toLowerCase() };
      const [data, total] = await Promise.all([
        PurchaseHistory.find(query).sort({ [sortBy]: -1 }).skip(skip).limit(limit),
        PurchaseHistory.countDocuments(query),
      ]);
      return { data, total, skip, limit };
    } catch (err) {
      logger.error('getPurchaseHistory failed', { err, address });
      throw err;
    }
  }

  async getFavorites(address, options = {}) {
    try {
      const { skip = 0, limit = 20 } = options;
      const query = { buyerAddress: address.toLowerCase(), isFavorite: true };
      const [data, total] = await Promise.all([
        PurchaseHistory.find(query).sort({ favoriteDate: -1 }).skip(skip).limit(limit),
        PurchaseHistory.countDocuments(query),
      ]);
      return { data, total, skip, limit };
    } catch (err) {
      logger.error('getFavorites failed', { err, address });
      throw err;
    }
  }

  async toggleFavorite(address, purchaseId) {
    try {
      const purchase = await PurchaseHistory.findOne({ _id: purchaseId, buyerAddress: address.toLowerCase() });
      if (!purchase) { const e = new Error('Purchase not found'); e.statusCode = 404; throw e; }
      purchase.isFavorite = !purchase.isFavorite;
      purchase.favoriteDate = purchase.isFavorite ? new Date() : null;
      await purchase.save();
      return purchase;
    } catch (err) {
      logger.error('toggleFavorite failed', { err, address, purchaseId });
      throw err;
    }
  }

  async getProfileStats(address) {
    try {
      const addr = address.toLowerCase();
      const [purchaseCount, totalSpentAgg, favoriteCount, ratedCount] = await Promise.all([
        PurchaseHistory.countDocuments({ buyerAddress: addr }),
        PurchaseHistory.aggregate([{ $match: { buyerAddress: addr } }, { $group: { _id: null, total: { $sum: '$purchasePrice' } } }]),
        PurchaseHistory.countDocuments({ buyerAddress: addr, isFavorite: true }),
        PurchaseHistory.countDocuments({ buyerAddress: addr, 'rating.score': { $ne: null } }),
      ]);
      return {
        totalPurchases: purchaseCount,
        totalSpent: totalSpentAgg.length > 0 ? totalSpentAgg[0].total : 0,
        favoriteCount,
        ratedCount,
      };
    } catch (err) {
      logger.error('getProfileStats failed', { err, address });
      throw err;
    }
  }

  async addRating(address, purchaseId, rating, review) {
    try {
      const purchase = await PurchaseHistory.findOne({ _id: purchaseId, buyerAddress: address.toLowerCase() });
      if (!purchase) { const e = new Error('Purchase not found'); e.statusCode = 404; throw e; }
      purchase.rating = { score: Math.min(Math.max(rating, 0), 5), review, reviewDate: new Date() };
      await purchase.save();
      return purchase;
    } catch (err) {
      logger.error('addRating failed', { err, address, purchaseId });
      throw err;
    }
  }

  async recordAccess(address, purchaseId, accessType = 'view') {
    try {
      const purchase = await PurchaseHistory.findOne({ _id: purchaseId, buyerAddress: address.toLowerCase() });
      if (!purchase) { const e = new Error('Purchase not found'); e.statusCode = 404; throw e; }
      if (accessType === 'download') {
        purchase.downloads.total = (purchase.downloads.total || 0) + 1;
        purchase.downloads.lastDownloadDate = new Date();
      }
      purchase.engagement.lastAccessedAt = new Date();
      purchase.engagement.viewCount = (purchase.engagement.viewCount || 0) + 1;
      await purchase.save();
      return purchase;
    } catch (err) {
      logger.error('recordAccess failed', { err, address, purchaseId });
      throw err;
    }
  }

  async updateCompletionPercentage(address, purchaseId, percentage) {
    try {
      const purchase = await PurchaseHistory.findOne({ _id: purchaseId, buyerAddress: address.toLowerCase() });
      if (!purchase) { const e = new Error('Purchase not found'); e.statusCode = 404; throw e; }
      purchase.engagement.completionPercentage = Math.min(Math.max(percentage, 0), 100);
      await purchase.save();
      return purchase;
    } catch (err) {
      logger.error('updateCompletionPercentage failed', { err, address, purchaseId });
      throw err;
    }
  }

  // ── Block / unblock ────────────────────────────────────────────────────────

  async blockUser(address, blockedAddress) {
    try {
      const profile = await UserProfile.findOne({ address: address.toLowerCase() });
      if (!profile) { const e = new Error('Profile not found'); e.statusCode = 404; throw e; }
      const blocked = blockedAddress.toLowerCase();
      if (!profile.blockedUsers.includes(blocked)) {
        profile.blockedUsers.push(blocked);
        await profile.save();
      }
      return profile;
    } catch (err) {
      logger.error('blockUser failed', { err, address, blockedAddress });
      throw err;
    }
  }

  async unblockUser(address, blockedAddress) {
    try {
      const profile = await UserProfile.findOne({ address: address.toLowerCase() });
      if (!profile) { const e = new Error('Profile not found'); e.statusCode = 404; throw e; }
      profile.blockedUsers = profile.blockedUsers.filter(a => a !== blockedAddress.toLowerCase());
      await profile.save();
      return profile;
    } catch (err) {
      logger.error('unblockUser failed', { err, address, blockedAddress });
      throw err;
    }
  }
}

module.exports = new UserProfileService();
