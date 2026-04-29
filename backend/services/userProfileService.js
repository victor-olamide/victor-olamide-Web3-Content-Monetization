'use strict';

const UserProfile = require('../models/UserProfile');
const PurchaseHistory = require('../models/PurchaseHistory');
const Content = require('../models/Content');
const logger = require('../utils/logger');

const UPDATABLE_FIELDS = ['displayName', 'avatar', 'username', 'bio', 'preferences', 'settings', 'socialLinks'];

class UserProfileService {
  async getProfileById(id) {
    if (!id || typeof id !== 'string') {
      const error = new Error('Invalid address: expected non-empty string');
      error.statusCode = 400;
      throw error;
    }

    const address = id.toLowerCase();
    const profile = await UserProfile.findOne({ address });
    if (!profile) {
      const error = new Error('Profile not found');
      error.statusCode = 404;
      throw error;
    }
    return profile;
  }

  async updateProfileById(id, data) {
    if (!id || typeof id !== 'string') {
      const error = new Error('Invalid address: expected non-empty string');
      error.statusCode = 400;
      throw error;
    }
    if (!data || typeof data !== 'object') {
      const error = new Error('Invalid profile data: expected object');
      error.statusCode = 400;
      throw error;
    }

    const address = id.toLowerCase();
    const updateData = {};
    for (const field of UPDATABLE_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(data, field)) {
        updateData[field] = data[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      const error = new Error('No updatable fields provided');
      error.statusCode = 400;
      throw error;
    }

    try {
      const profile = await UserProfile.findOneAndUpdate(
        { address },
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!profile) {
        const error = new Error('Profile not found');
        error.statusCode = 404;
        throw error;
      }

      return profile;
    } catch (err) {
      logger.error('updateProfileById failed', { err, id });
      throw err;
    }
  }

  async updatePreferences(id, preferences) {
    if (!id || typeof id !== 'string') {
      const error = new Error('Invalid address: expected non-empty string');
      error.statusCode = 400;
      throw error;
    }
    if (!preferences || typeof preferences !== 'object') {
      const error = new Error('Invalid preferences: expected object');
      error.statusCode = 400;
      throw error;
    }

    try {
      const profile = await UserProfile.findOneAndUpdate(
        { address: id.toLowerCase() },
        { $set: { preferences } },
        { new: true }
      );

      if (!profile) {
        const error = new Error('Profile not found');
        error.statusCode = 404;
        throw error;
      }

      return profile;
    } catch (err) {
      logger.error('updatePreferences failed', { err, id });
      throw err;
    }
  }

  async updateSettings(id, settings) {
    if (!id || typeof id !== 'string') {
      const error = new Error('Invalid address: expected non-empty string');
      error.statusCode = 400;
      throw error;
    }
    if (!settings || typeof settings !== 'object') {
      const error = new Error('Invalid settings: expected object');
      error.statusCode = 400;
      throw error;
    }

    try {
      const profile = await UserProfile.findOneAndUpdate(
        { address: id.toLowerCase() },
        { $set: { settings } },
        { new: true }
      );

      if (!profile) {
        const error = new Error('Profile not found');
        error.statusCode = 404;
        throw error;
      }

      return profile;
    } catch (err) {
      logger.error('updateSettings failed', { err, id });
      throw err;
    }
  }

  async updateSocialLinks(id, socialLinks) {
    if (!id || typeof id !== 'string') {
      const error = new Error('Invalid address: expected non-empty string');
      error.statusCode = 400;
      throw error;
    }
    if (!socialLinks || typeof socialLinks !== 'object') {
      const error = new Error('Invalid socialLinks: expected object');
      error.statusCode = 400;
      throw error;
    }

    try {
      const profile = await UserProfile.findOneAndUpdate(
        { address: id.toLowerCase() },
        { $set: { socialLinks } },
        { new: true }
      );

      if (!profile) {
        const error = new Error('Profile not found');
        error.statusCode = 404;
        throw error;
      }

      return profile;
    } catch (err) {
      logger.error('updateSocialLinks failed', { err, id });
      throw err;
    }
  }

  async getPurchaseHistory(id, options = {}) {
    if (!id || typeof id !== 'string') {
      const error = new Error('Invalid address: expected non-empty string');
      error.statusCode = 400;
      throw error;
    }

    const { skip = 0, limit = 20, sortBy = 'purchaseDate' } = options;
    if (typeof skip !== 'number' || skip < 0) {
      const error = new Error('Invalid options.skip: expected non-negative number');
      error.statusCode = 400;
      throw error;
    }
    if (typeof limit !== 'number' || limit < 1 || limit > 100) {
      const error = new Error('Invalid options.limit: expected number between 1 and 100');
      error.statusCode = 400;
      throw error;
    }

    const address = id.toLowerCase();

    try {
      const [data, total] = await Promise.all([
        PurchaseHistory.find({ buyerAddress: address })
          .sort({ [sortBy]: -1 })
          .skip(skip)
          .limit(limit),
        PurchaseHistory.countDocuments({ buyerAddress: address }),
      ]);

      return { data, total, skip, limit };
    } catch (err) {
      logger.error('getPurchaseHistory failed', { err, id });
      throw err;
    }
  }

  async getFavorites(id, options = {}) {
    if (!id || typeof id !== 'string') {
      const error = new Error('Invalid address: expected non-empty string');
      error.statusCode = 400;
      throw error;
    }

    const { skip = 0, limit = 20 } = options;
    if (typeof skip !== 'number' || skip < 0) {
      const error = new Error('Invalid options.skip: expected non-negative number');
      error.statusCode = 400;
      throw error;
    }
    if (typeof limit !== 'number' || limit < 1 || limit > 100) {
      const error = new Error('Invalid options.limit: expected number between 1 and 100');
      error.statusCode = 400;
      throw error;
    }

    const address = id.toLowerCase();

    try {
      const [data, total] = await Promise.all([
        PurchaseHistory.find({ buyerAddress: address, isFavorite: true })
          .sort({ favoriteDate: -1 })
          .skip(skip)
          .limit(limit),
        PurchaseHistory.countDocuments({ buyerAddress: address, isFavorite: true }),
      ]);

      return { data, total, skip, limit };
    } catch (err) {
      logger.error('getFavorites failed', { err, id });
      throw err;
    }
  }

  async toggleFavorite(id, purchaseId) {
    if (!id || typeof id !== 'string') {
      const error = new Error('Invalid address: expected non-empty string');
      error.statusCode = 400;
      throw error;
    }
    if (!purchaseId || typeof purchaseId !== 'string') {
      const error = new Error('Invalid purchaseId: expected non-empty string');
      error.statusCode = 400;
      throw error;
    }

    const address = id.toLowerCase();

    try {
      const purchase = await PurchaseHistory.findOne({ _id: purchaseId, buyerAddress: address });
      if (!purchase) {
        const error = new Error('Purchase not found');
        error.statusCode = 404;
        throw error;
      }

      purchase.isFavorite = !purchase.isFavorite;
      purchase.favoriteDate = purchase.isFavorite ? new Date() : null;
      await purchase.save();

      return purchase;
    } catch (err) {
      logger.error('toggleFavorite failed', { err, id, purchaseId });
      throw err;
    }
  }

  async getProfileStats(id) {
    if (!id || typeof id !== 'string') {
      const error = new Error('Invalid address: expected non-empty string');
      error.statusCode = 400;
      throw error;
    }

    const address = id.toLowerCase();
    try {
      const [purchaseCount, totalSpentAgg, favoriteCount, ratedCount] = await Promise.all([
        PurchaseHistory.countDocuments({ buyerAddress: address }),
        PurchaseHistory.aggregate([
          { $match: { buyerAddress: address } },
          { $group: { _id: null, total: { $sum: '$purchasePrice' } } },
        ]),
        PurchaseHistory.countDocuments({ buyerAddress: address, isFavorite: true }),
        PurchaseHistory.countDocuments({ buyerAddress: address, 'rating.score': { $ne: null } }),
      ]);

      return {
        totalPurchases: purchaseCount,
        totalSpent: totalSpentAgg.length > 0 ? totalSpentAgg[0].total : 0,
        favoriteCount,
        ratedCount,
      };
    } catch (err) {
      logger.error('getProfileStats failed', { err, id });
      throw err;
    }
  }

  async addRating(id, purchaseId, rating, review) {
    if (!id || typeof id !== 'string') {
      const error = new Error('Invalid address: expected non-empty string');
      error.statusCode = 400;
      throw error;
    }
    if (!purchaseId || typeof purchaseId !== 'string') {
      const error = new Error('Invalid purchaseId: expected non-empty string');
      error.statusCode = 400;
      throw error;
    }
    if (typeof rating !== 'number' || rating < 0 || rating > 5) {
      const error = new Error('Invalid rating: expected number between 0 and 5');
      error.statusCode = 400;
      throw error;
    }
    if (review && typeof review !== 'string') {
      const error = new Error('Invalid review: expected string');
      error.statusCode = 400;
      throw error;
    }

    const address = id.toLowerCase();

    try {
      const purchase = await PurchaseHistory.findOne({ _id: purchaseId, buyerAddress: address });
      if (!purchase) {
        const error = new Error('Purchase not found');
        error.statusCode = 404;
        throw error;
      }

      purchase.rating = {
        score: Math.min(Math.max(rating, 0), 5),
        review: review || null,
        reviewDate: new Date(),
      };
      await purchase.save();

      return purchase;
    } catch (err) {
      logger.error('addRating failed', { err, id, purchaseId });
      throw err;
    }
  }

  async recordAccess(id, purchaseId, accessType = 'view') {
    if (!id || typeof id !== 'string') {
      const error = new Error('Invalid address: expected non-empty string');
      error.statusCode = 400;
      throw error;
    }
    if (!purchaseId || typeof purchaseId !== 'string') {
      const error = new Error('Invalid purchaseId: expected non-empty string');
      error.statusCode = 400;
      throw error;
    }

    const address = id.toLowerCase();

    try {
      const purchase = await PurchaseHistory.findOne({ _id: purchaseId, buyerAddress: address });
      if (!purchase) {
        const error = new Error('Purchase not found');
        error.statusCode = 404;
        throw error;
      }

      if (accessType === 'download') {
        purchase.downloads = purchase.downloads || {};
        purchase.downloads.total = (purchase.downloads.total || 0) + 1;
        purchase.downloads.lastDownloadDate = new Date();
      }

      purchase.engagement = purchase.engagement || {};
      purchase.engagement.lastAccessedAt = new Date();
      purchase.engagement.viewCount = (purchase.engagement.viewCount || 0) + 1;
      await purchase.save();

      return purchase;
    } catch (err) {
      logger.error('recordAccess failed', { err, id, purchaseId });
      throw err;
    }
  }

  async updateCompletionPercentage(id, purchaseId, percentage) {
    if (!id || typeof id !== 'string') {
      const error = new Error('Invalid address: expected non-empty string');
      error.statusCode = 400;
      throw error;
    }
    if (!purchaseId || typeof purchaseId !== 'string') {
      const error = new Error('Invalid purchaseId: expected non-empty string');
      error.statusCode = 400;
      throw error;
    }
    if (typeof percentage !== 'number' || percentage < 0 || percentage > 100) {
      const error = new Error('Invalid percentage: expected number between 0 and 100');
      error.statusCode = 400;
      throw error;
    }

    const address = id.toLowerCase();

    try {
      const purchase = await PurchaseHistory.findOne({ _id: purchaseId, buyerAddress: address });
      if (!purchase) {
        const error = new Error('Purchase not found');
        error.statusCode = 404;
        throw error;
      }

      purchase.engagement = purchase.engagement || {};
      purchase.engagement.completionPercentage = Math.min(Math.max(percentage, 0), 100);
      await purchase.save();

      return purchase;
    } catch (err) {
      logger.error('updateCompletionPercentage failed', { err, id, purchaseId });
      throw err;
    }
  }

  async blockUser(id, blockedAddress) {
    if (!id || typeof id !== 'string') {
      const error = new Error('Invalid address: expected non-empty string');
      error.statusCode = 400;
      throw error;
    }
    if (!blockedAddress || typeof blockedAddress !== 'string') {
      const error = new Error('Invalid blockedAddress: expected non-empty string');
      error.statusCode = 400;
      throw error;
    }

    const address = id.toLowerCase();
    const blocked = blockedAddress.toLowerCase();

    try {
      const profile = await UserProfile.findOne({ address });
      if (!profile) {
        const error = new Error('Profile not found');
        error.statusCode = 404;
        throw error;
      }

      profile.blockedUsers = profile.blockedUsers || [];
      if (!profile.blockedUsers.includes(blocked)) {
        profile.blockedUsers.push(blocked);
        await profile.save();
      }

      return profile;
    } catch (err) {
      logger.error('blockUser failed', { err, id, blockedAddress });
      throw err;
    }
  }

  async unblockUser(id, blockedAddress) {
    if (!id || typeof id !== 'string') {
      const error = new Error('Invalid address: expected non-empty string');
      error.statusCode = 400;
      throw error;
    }
    if (!blockedAddress || typeof blockedAddress !== 'string') {
      const error = new Error('Invalid blockedAddress: expected non-empty string');
      error.statusCode = 400;
      throw error;
    }

    const address = id.toLowerCase();
    const blocked = blockedAddress.toLowerCase();

    try {
      const profile = await UserProfile.findOne({ address });
      if (!profile) {
        const error = new Error('Profile not found');
        error.statusCode = 404;
        throw error;
      }

      profile.blockedUsers = (profile.blockedUsers || []).filter(u => u !== blocked);
      await profile.save();

      return profile;
    } catch (err) {
      logger.error('unblockUser failed', { err, id, blockedAddress });
      throw err;
    }
  }
}

module.exports = new UserProfileService();
