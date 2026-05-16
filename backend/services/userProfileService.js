/**
 * User Profile Service
 * Manages user profiles, settings, and preferences
 */

const UserProfile = require('../models/UserProfile');
const logger = require('../utils/logger');
const Purchase = require('../models/Purchase');
const PurchaseHistory = require('../models/PurchaseHistory');
const Content = require('../models/Content');

class UserProfileService {
  /**
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
      let profile = await UserProfile.findOne({ address: address.toLowerCase() });

      if (!profile) {
        profile = new UserProfile({
          address: address.toLowerCase()
        });
        await profile.save();
        logger.info('Created new user profile', { address: address.toLowerCase() });
      }

      return profile;
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
      const profile = await UserProfile.findOne({ address: address.toLowerCase() });

      if (!profile) {
        logger.warn('Profile not found', { address: address.toLowerCase() });
        throw new Error('Profile not found');
      }

      return profile;
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
      const allowedFields = [
        'displayName',
        'avatar',
        'username',
        'bio',
        'preferences',
        'settings',
        'socialLinks',
        'tier'
      ];

      const updateData = {};
      for (const field of allowedFields) {
        if (field in profileData) {
          updateData[field] = profileData[field];
        }
      }

      updateData.lastProfileUpdate = new Date();

      const profile = await UserProfile.findOneAndUpdate(
        { address: address.toLowerCase() },
        updateData,
        { new: true, runValidators: true }
      );

      if (!profile) {
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
        { preferences },
        { new: true }
      );

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
        { settings },
        { new: true }
      );

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
        { socialLinks },
        { new: true }
      );

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
        { tier },
        { new: true }
      );

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
      if (!content) {
        logger.warn('Content not found for purchase recording', { contentId });
        throw new Error('Content not found');
      }

      const purchaseHistory = new PurchaseHistory({
        buyerAddress: buyerAddress.toLowerCase(),
        contentId,
        contentTitle: content.title,
        contentType: content.contentType,
        creatorAddress: content.creator.toLowerCase(),
        creatorName: content.creatorName || content.creator,
        purchasePrice: purchaseData.price,
        purchaseCurrency: purchaseData.currency || 'USD',
        transactionHash: purchaseData.transactionHash,
        transactionStatus: purchaseData.status || 'completed'
      });

      await purchaseHistory.save();

      // Update user profile purchase stats
      const profile = await UserProfile.findOne({ address: buyerAddress.toLowerCase() });
      if (profile) {
        profile.totalPurchases = (profile.totalPurchases || 0) + 1;
        profile.totalSpent = (profile.totalSpent || 0) + purchaseData.price;
        await profile.save();
      }

      logger.info('Purchase recorded successfully', { 
        buyerAddress: buyerAddress.toLowerCase(),
        contentId,
        price: purchaseData.price
      });
      return purchaseHistory;
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
   */
  async getFavorites(address, options = {}) {
    try {
      const { skip = 0, limit = 20 } = options;

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

      return {
        data: favorites,
        total,
        skip,
        limit
      };
    } catch (error) {
      logger.error('Error fetching favorites:', { err: error });
      throw error;
    }
  }

  /**
   * Toggle favorite status
   */
  async toggleFavorite(address, purchaseId) {
    try {
      const purchase = await PurchaseHistory.findOne({
        _id: purchaseId,
        buyerAddress: address.toLowerCase()
      });

      if (!purchase) {
        throw new Error('Purchase not found');
      }

      purchase.isFavorite = !purchase.isFavorite;
      purchase.favoriteDate = purchase.isFavorite ? new Date() : null;
      await purchase.save();

      return purchase;
    } catch (error) {
      logger.error('Error toggling favorite:', { err: error });
      throw error;
    }
  }

  /**
   * Get profile statistics
   */
  async getProfileStats(address) {
    try {
      const address_lower = address.toLowerCase();

      const purchaseCount = await PurchaseHistory.countDocuments({
        buyerAddress: address_lower
      });

      const totalSpent = await PurchaseHistory.aggregate([
        { $match: { buyerAddress: address_lower } },
        { $group: { _id: null, total: { $sum: '$purchasePrice' } } }
      ]);

      const favoriteCount = await PurchaseHistory.countDocuments({
        buyerAddress: address_lower,
        isFavorite: true
      });

      const ratedCount = await PurchaseHistory.countDocuments({
        buyerAddress: address_lower,
        'rating.score': { $ne: null }
      });

      return {
        totalPurchases: purchaseCount,
        totalSpent: totalSpent.length > 0 ? totalSpent[0].total : 0,
        favoriteCount,
        ratedCount
      };
    } catch (error) {
      logger.error('Error getting profile stats:', { err: error });
      throw error;
    }
  }

  /**
   * Add rating and review
   */
  async addRating(address, purchaseId, rating, review) {
    try {
      const purchase = await PurchaseHistory.findOne({
        _id: purchaseId,
        buyerAddress: address.toLowerCase()
      });

      if (!purchase) {
        throw new Error('Purchase not found');
      }

      purchase.rating = {
        score: Math.min(Math.max(rating, 0), 5),
        review,
        reviewDate: new Date()
      };

      await purchase.save();
      return purchase;
    } catch (error) {
      logger.error('Error adding rating:', { err: error });
      throw error;
    }
  }

  /**
   * Record content access/download
   */
  async recordAccess(address, purchaseId, accessType = 'view') {
    try {
      const purchase = await PurchaseHistory.findOne({
        _id: purchaseId,
        buyerAddress: address.toLowerCase()
      });

      if (!purchase) {
        throw new Error('Purchase not found');
      }

      if (accessType === 'download') {
        purchase.downloads.total = (purchase.downloads.total || 0) + 1;
        purchase.downloads.lastDownloadDate = new Date();
      }

      purchase.engagement.lastAccessedAt = new Date();
      purchase.engagement.viewCount = (purchase.engagement.viewCount || 0) + 1;

      await purchase.save();
      return purchase;
    } catch (error) {
      logger.error('Error recording access:', { err: error });
      throw error;
    }
  }

  /**
   * Update completion percentage
   */
  async updateCompletionPercentage(address, purchaseId, percentage) {
    try {
      const purchase = await PurchaseHistory.findOne({
        _id: purchaseId,
        buyerAddress: address.toLowerCase()
      });

      if (!purchase) {
        throw new Error('Purchase not found');
      }

      purchase.engagement.completionPercentage = Math.min(Math.max(percentage, 0), 100);
      await purchase.save();

      return purchase;
    } catch (error) {
      logger.error('Error updating completion:', { err: error });
      throw error;
    }
  }

  /**
   * Block a user
   */
  async blockUser(address, blockedAddress) {
    try {
      const profile = await UserProfile.findOne({ address: address.toLowerCase() });

      if (!profile) {
        throw new Error('Profile not found');
      }

      if (!profile.blockedUsers.includes(blockedAddress.toLowerCase())) {
        profile.blockedUsers.push(blockedAddress.toLowerCase());
        await profile.save();
      }

      return profile;
    } catch (error) {
      logger.error('Error blocking user:', { err: error });
      throw error;
    }
  }

  /**
   * Unblock a user
   */
  async unblockUser(address, blockedAddress) {
    try {
      const profile = await UserProfile.findOne({ address: address.toLowerCase() });

      if (!profile) {
        throw new Error('Profile not found');
      }

      profile.blockedUsers = profile.blockedUsers.filter(
        (addr) => addr !== blockedAddress.toLowerCase()
      );
      await profile.save();

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
