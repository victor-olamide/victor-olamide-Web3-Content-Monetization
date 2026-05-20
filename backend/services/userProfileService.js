'use strict';

/**
 * User Profile Service
 * Manages user profiles, settings, preferences, and purchase history.
 */

const UserProfile = require('../models/UserProfile');
const logger = require('../utils/logger');
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
   * Get or create user profile
   * @param {string} address - Wallet address
   * @returns {Promise<Object>} User profile
   * @throws {Error} When address is invalid or database error occurs
   */
  async getOrCreateProfile(address) {
    // Input validation
    if (!address || typeof address !== 'string') {
      throw new Error('Invalid address: expected non-empty string');
    }
    try {
      const addr = address.toLowerCase();
      let profile = await UserProfile.findOne({ address: addr });
      if (!profile) {
        profile = await UserProfile.create({ address: addr });
        profile = new UserProfile({
          address: address.toLowerCase()
        });
        await profile.save();
        logger.info('Created new user profile', { address: address.toLowerCase() });
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
    } catch (error) {
      logger.error('Failed to get or create user profile', { 
        address: address.toLowerCase(),
        error: error.message,
        code: error.code || 'UNKNOWN'
      });
      throw new Error(`Failed to get or create profile: ${error.message}`);
    }
  }

  /**
   * Get user profile
   * @param {string} address - Wallet address
   * @returns {Promise<Object>} User profile
   * @throws {Error} When address is invalid or profile not found
   */
  async getProfile(address) {
    // Input validation
    if (!address || typeof address !== 'string') {
      throw new Error('Invalid address: expected non-empty string');
    }
    try {
      const profile = await UserProfile.findOne({ address: id.toLowerCase() });
      if (!profile) {
        const err = new Error('Profile not found');
        err.statusCode = 404;
        throw err;
        logger.warn('Profile not found', { address: address.toLowerCase() });
        throw new Error('Profile not found');
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
    } catch (error) {
      logger.error('Failed to fetch user profile', { 
        address: address.toLowerCase(),
        error: error.message,
        code: error.code || 'UNKNOWN'
      });
      throw error;
    }
  }

  /**
   * Update user profile
   * @param {string} address - Wallet address
   * @param {Object} profileData - Profile data to update
   * @returns {Promise<Object>} Updated profile
   * @throws {Error} When address is invalid or profile not found
   */
  async updateProfile(address, profileData) {
    // Input validation
    if (!address || typeof address !== 'string') {
      throw new Error('Invalid address: expected non-empty string');
    }
    if (!profileData || typeof profileData !== 'object') {
      throw new Error('Invalid profileData: expected object');
    }
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
        logger.warn('Profile not found for update', { address: address.toLowerCase() });
        throw new Error('Profile not found');
      }

      logger.info('Profile updated successfully', { address: address.toLowerCase(), fields: Object.keys(updateData) });
      return profile;
    } catch (error) {
      logger.error('Failed to update user profile', { 
        address: address.toLowerCase(),
        error: error.message,
        code: error.code || 'UNKNOWN'
      });
      throw error;
    }
  }

  /**
   * Update user preferences
   * @param {string} address - Wallet address
   * @param {Object} preferences - Preferences object
   * @returns {Promise<Object>} Updated profile
   * @throws {Error} When address is invalid or profile not found
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
    // Input validation
    if (!address || typeof address !== 'string') {
      throw new Error('Invalid address: expected non-empty string');
    }
    if (!preferences || typeof preferences !== 'object') {
      throw new Error('Invalid preferences: expected object');
    }
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


      if (!profile) {
        logger.warn('Profile not found for preferences update', { address: address.toLowerCase() });
        throw new Error('Profile not found');
      }

      logger.info('Preferences updated successfully', { address: address.toLowerCase() });
      return profile;
    } catch (error) {
      logger.error('Failed to update user preferences', { 
        address: address.toLowerCase(),
        error: error.message,
        code: error.code || 'UNKNOWN'
      });
      throw error;
    }
  }

  /**
   * Update user settings
   * @param {string} address - Wallet address
   * @param {Object} settings - Settings object
   * @returns {Promise<Object>} Updated profile
   * @throws {Error} When address is invalid or profile not found
   */
  async updateSettings(address, settings) {
    // Input validation
    if (!address || typeof address !== 'string') {
      throw new Error('Invalid address: expected non-empty string');
    }
    if (!settings || typeof settings !== 'object') {
      throw new Error('Invalid settings: expected object');
    }
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


      if (!profile) {
        logger.warn('Profile not found for settings update', { address: address.toLowerCase() });
        throw new Error('Profile not found');
      }

      logger.info('Settings updated successfully', { address: address.toLowerCase() });
      return profile;
    } catch (error) {
      logger.error('Failed to update user settings', { 
        address: address.toLowerCase(),
        error: error.message,
        code: error.code || 'UNKNOWN'
      });
      throw error;
    }
  }

  /**
   * Update social links
   * @param {string} address - Wallet address
   * @param {Object} socialLinks - Social links object
   * @returns {Promise<Object>} Updated profile
   * @throws {Error} When address is invalid or profile not found
   */
  async updateSocialLinks(address, socialLinks) {
    // Input validation
    if (!address || typeof address !== 'string') {
      throw new Error('Invalid address: expected non-empty string');
    }
    if (!socialLinks || typeof socialLinks !== 'object') {
      throw new Error('Invalid socialLinks: expected object');
    }
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

      if (!profile) {
        logger.warn('Profile not found for social links update', { address: address.toLowerCase() });
        throw new Error('Profile not found');
      }

      logger.info('Social links updated successfully', { address: address.toLowerCase() });
      return profile;
    } catch (error) {
      logger.error('Failed to update social links', { 
        address: address.toLowerCase(),
        error: error.message,
        code: error.code || 'UNKNOWN'
      });
      throw error;
    }
  }

  /**
   * Update user tier
   * @param {string} address - Wallet address
   * @param {string} tier - Tier to set ('free', 'basic', 'premium', 'enterprise', 'admin')
   * @returns {Promise<Object>} Updated profile
   * @throws {Error} When address or tier is invalid, or profile not found
   */
  async updateTier(address, tier) {
    // Input validation
    if (!address || typeof address !== 'string') {
      throw new Error('Invalid address: expected non-empty string');
    }
    if (!tier || typeof tier !== 'string') {
      throw new Error('Invalid tier: expected non-empty string');
    }
    try {
      const allowedTiers = ['free', 'basic', 'premium', 'enterprise', 'admin'];
      if (!allowedTiers.includes(tier)) {
        logger.warn('Invalid tier attempted', { address: address.toLowerCase(), tier, allowedTiers });
        throw new Error(`Invalid tier: must be one of ${allowedTiers.join(', ')}`);
      }

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


      if (!profile) {
        logger.warn('Profile not found for tier update', { address: address.toLowerCase() });
        throw new Error('Profile not found');
      }

      logger.info('User tier updated successfully', { address: address.toLowerCase(), tier });
      return profile;
    } catch (error) {
      logger.error('Failed to update user tier', { 
        address: address.toLowerCase(),
        tier,
        error: error.message,
        code: error.code || 'UNKNOWN'
      });
      throw error;
    }
  }

  /**
   * Record purchase history
   * @param {string} buyerAddress - Buyer wallet address
   * @param {string} contentId - Content ID
   * @param {Object} purchaseData - Purchase data
   * @param {number} purchaseData.price - Purchase price
   * @param {string} [purchaseData.currency] - Purchase currency
   * @param {string} [purchaseData.transactionHash] - Transaction hash
   * @param {string} [purchaseData.status] - Transaction status
   * @returns {Promise<Object>} Purchase history record
   * @throws {Error} When inputs are invalid or content not found
   */
  async recordPurchase(buyerAddress, contentId, purchaseData) {
    // Input validation
    if (!buyerAddress || typeof buyerAddress !== 'string') {
      throw new Error('Invalid buyerAddress: expected non-empty string');
    }
    if (!contentId || typeof contentId !== 'string') {
      throw new Error('Invalid contentId: expected non-empty string');
    }
    if (!purchaseData || typeof purchaseData !== 'object') {
      throw new Error('Invalid purchaseData: expected object');
    }
    if (typeof purchaseData.price !== 'number' || purchaseData.price < 0) {
      throw new Error('Invalid purchaseData.price: expected non-negative number');
    }
    try {
      const content = await Content.findOne({ contentId });
      if (!content) { const e = new Error('Content not found'); e.statusCode = 404; throw e; }
      if (!content) {
        logger.warn('Content not found for purchase recording', { contentId });
        throw new Error('Content not found');
      }

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

      logger.info('Purchase recorded successfully', { 
        buyerAddress: buyerAddress.toLowerCase(),
        contentId,
        price: purchaseData.price
      });
      return purchaseHistory;
    } catch (err) {
      logger.error('recordPurchase failed', { err, buyerAddress, contentId });
      throw err;
    }
  }

    } catch (error) {
      logger.error('Failed to record purchase', { 
        buyerAddress: buyerAddress.toLowerCase(),
        contentId,
        error: error.message,
        code: error.code || 'UNKNOWN'
      });
      throw error;
    }
  }

  /**
   * Get purchase history for user
   * @param {string} address - Wallet address
   * @param {Object} [options={}] - Query options
   * @param {number} [options.skip=0] - Number of records to skip
   * @param {number} [options.limit=20] - Number of records to return
   * @param {string} [options.sortBy='purchaseDate'] - Field to sort by
   * @returns {Promise<Object>} Purchase history with pagination
   * @throws {Error} When address is invalid or database error occurs
   */
  async getPurchaseHistory(address, options = {}) {
    // Input validation
    if (!address || typeof address !== 'string') {
      throw new Error('Invalid address: expected non-empty string');
    }
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


      // Validate pagination options
      if (typeof skip !== 'number' || skip < 0) {
        throw new Error('Invalid options.skip: expected non-negative number');
      }
      if (typeof limit !== 'number' || limit < 1 || limit > 100) {
        throw new Error('Invalid options.limit: expected number between 1 and 100');
      }

      const purchases = await PurchaseHistory.find({
        buyerAddress: address.toLowerCase()
      })
        .sort({ [sortBy]: -1 })
        .skip(skip)
        .limit(limit);

      const total = await PurchaseHistory.countDocuments({
        buyerAddress: address.toLowerCase()
      });

      logger.info('Purchase history retrieved', { 
        address: address.toLowerCase(),
        count: purchases.length,
        total
      });

      return {
        data: purchases,
        total,
        skip,
        limit
      };
    } catch (error) {
      logger.error('Failed to fetch purchase history', { 
        address: address.toLowerCase(),
        error: error.message,
        code: error.code || 'UNKNOWN'
      });
      throw error;
    }
  }

  /**
   * Get favorite content
   * @param {string} address - Wallet address
   * @param {Object} [options={}] - Query options
   * @param {number} [options.skip=0] - Number of records to skip
   * @param {number} [options.limit=20] - Number of records to return
   * @returns {Promise<Object>} Favorites with pagination
   * @throws {Error} When address is invalid or database error occurs
   */
  async getFavorites(address, options = {}) {
    // Input validation
    if (!address || typeof address !== 'string') {
      throw new Error('Invalid address: expected non-empty string');
    }
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


      // Validate pagination options
      if (typeof skip !== 'number' || skip < 0) {
        throw new Error('Invalid options.skip: expected non-negative number');
      }
      if (typeof limit !== 'number' || limit < 1 || limit > 100) {
        throw new Error('Invalid options.limit: expected number between 1 and 100');
      }

      const favorites = await PurchaseHistory.find({
        buyerAddress: address.toLowerCase(),
        isFavorite: true
      })
        .sort({ favoriteDate: -1 })
        .skip(skip)
        .limit(limit);

      const total = await PurchaseHistory.countDocuments({
        buyerAddress: address.toLowerCase(),
        isFavorite: true
      });

      logger.info('Favorites retrieved', { 
        address: address.toLowerCase(),
        count: favorites.length,
        total
      });

      return {
        data: favorites,
        total,
        skip,
        limit
      };
    } catch (error) {
      logger.error('Failed to fetch favorites', { 
        address: address.toLowerCase(),
        error: error.message,
        code: error.code || 'UNKNOWN'
      });
      throw error;
    }
  }

  /**
   * Toggle favorite status
   * @param {string} address - Wallet address
   * @param {string} purchaseId - Purchase record ID
   * @returns {Promise<Object>} Updated purchase record
   * @throws {Error} When inputs are invalid or purchase not found
   */
  async toggleFavorite(address, purchaseId) {
    // Input validation
    if (!address || typeof address !== 'string') {
      throw new Error('Invalid address: expected non-empty string');
    }
    if (!purchaseId || typeof purchaseId !== 'string') {
      throw new Error('Invalid purchaseId: expected non-empty string');
    }
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

      const purchase = await PurchaseHistory.findOne({
        _id: purchaseId,
        buyerAddress: address.toLowerCase()
      });

      if (!purchase) {
        logger.warn('Purchase not found for favorite toggle', { 
          address: address.toLowerCase(),
          purchaseId 
        });
        throw new Error('Purchase not found');
      }

      purchase.isFavorite = !purchase.isFavorite;
      purchase.favoriteDate = purchase.isFavorite ? new Date() : null;
      await purchase.save();

      logger.info('Favorite status toggled', { 
        address: address.toLowerCase(),
        purchaseId,
        isFavorite: purchase.isFavorite
      });

      return purchase;
    } catch (error) {
      logger.error('Failed to toggle favorite status', { 
        address: address.toLowerCase(),
        purchaseId,
        error: error.message,
        code: error.code || 'UNKNOWN'
      });
      throw error;
    }
  }

  /**
   * Get profile statistics
   * @param {string} address - Wallet address
   * @returns {Promise<Object>} Profile statistics
   * @throws {Error} When address is invalid or database error occurs
   */
  async getProfileStats(address) {
    // Input validation
    if (!address || typeof address !== 'string') {
      throw new Error('Invalid address: expected non-empty string');
    }
    try {
      const addr = address.toLowerCase();
      const [purchaseCount, totalSpentAgg, favoriteCount, ratedCount] = await Promise.all([
        PurchaseHistory.countDocuments({ buyerAddress: addr }),
        PurchaseHistory.aggregate([{ $match: { buyerAddress: addr } }, { $group: { _id: null, total: { $sum: '$purchasePrice' } } }]),
        PurchaseHistory.countDocuments({ buyerAddress: addr, isFavorite: true }),
        PurchaseHistory.countDocuments({ buyerAddress: addr, 'rating.score': { $ne: null } }),
      ]);

      const favoriteCount = await PurchaseHistory.countDocuments({
        buyerAddress: address_lower,
        isFavorite: true
      });

      const ratedCount = await PurchaseHistory.countDocuments({
        buyerAddress: address_lower,
        'rating.score': { $ne: null }
      });

      logger.info('Profile stats retrieved', { 
        address: address_lower,
        purchaseCount,
        favoriteCount,
        ratedCount
      });

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

    } catch (error) {
      logger.error('Failed to get profile stats', { 
        address: address.toLowerCase(),
        error: error.message,
        code: error.code || 'UNKNOWN'
      });
      throw error;
    }
  }

  /**
   * Add rating and review
   * @param {string} address - Wallet address
   * @param {string} purchaseId - Purchase record ID
   * @param {number} rating - Rating score (0-5)
   * @param {string} review - Review text
   * @returns {Promise<Object>} Updated purchase record
   * @throws {Error} When inputs are invalid, out of range, or purchase not found
   */
  async addRating(address, purchaseId, rating, review) {
    // Input validation
    if (!address || typeof address !== 'string') {
      throw new Error('Invalid address: expected non-empty string');
    }
    if (!purchaseId || typeof purchaseId !== 'string') {
      throw new Error('Invalid purchaseId: expected non-empty string');
    }
    if (typeof rating !== 'number' || rating < 0 || rating > 5) {
      throw new Error('Invalid rating: expected number between 0 and 5');
    }
    if (review && typeof review !== 'string') {
      throw new Error('Invalid review: expected string');
    }
    try {
      const purchase = await PurchaseHistory.findOne({ _id: purchaseId, buyerAddress: address.toLowerCase() });
      if (!purchase) { const e = new Error('Purchase not found'); e.statusCode = 404; throw e; }
      purchase.rating = { score: Math.min(Math.max(rating, 0), 5), review, reviewDate: new Date() };
      const purchase = await PurchaseHistory.findOne({
        _id: purchaseId,
        buyerAddress: address.toLowerCase()
      });

      if (!purchase) {
        logger.warn('Purchase not found for rating', { 
          address: address.toLowerCase(),
          purchaseId 
        });
        throw new Error('Purchase not found');
      }

      purchase.rating = {
        score: Math.min(Math.max(rating, 0), 5),
        review,
        reviewDate: new Date()
      };

      await purchase.save();

      logger.info('Rating added successfully', { 
        address: address.toLowerCase(),
        purchaseId,
        rating
      });

      return purchase;
    } catch (err) {
      logger.error('addRating failed', { err, address, purchaseId });
      throw err;
    } catch (error) {
      logger.error('Failed to add rating', { 
        address: address.toLowerCase(),
        purchaseId,
        rating,
        error: error.message,
        code: error.code || 'UNKNOWN'
      });
      throw error;
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
    } catch (error) {
      logger.error('Error recording access:', { err: error });
      throw error;
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
    } catch (error) {
      logger.error('Error updating completion:', { err: error });
      throw error;
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
    } catch (error) {
      logger.error('Error blocking user:', { err: error });
      throw error;
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

      return profile;
    } catch (error) {
      logger.error('Error unblocking user:', { err: error });
      throw error;
    }
  }

  /**
   * Update last login
   */
  async updateLastLogin(address) {
    try {
      const profile = await UserProfile.findOneAndUpdate(
        { address: address.toLowerCase() },
        { lastLogin: new Date() },
        { new: true }
      );

      return profile;
    } catch (error) {
      logger.error('Error updating last login:', { err: error });
      throw error;
    }
  }
}

module.exports = new UserProfileService();
