/**
 * User Profile Service
 * Manages user profiles, settings, and preferences
 */

const UserProfile = require('../models/UserProfile');
const Purchase = require('../models/Purchase');
const PurchaseHistory = require('../models/PurchaseHistory');
const Content = require('../models/Content');

class UserProfileService {
  /**
   * Get or create user profile
   */
  async getOrCreateProfile(address) {
    try {
      let profile = await UserProfile.findOne({ address: address.toLowerCase() });

      if (!profile) {
        profile = new UserProfile({
          address: address.toLowerCase()
        });
        await profile.save();
      }

      return profile;
    } catch (error) {
      console.error('Error getting/creating profile:', error);
      throw error;
    }
  }

  /**
   * Get user profile
   */
  async getProfile(address) {
    try {
      const profile = await UserProfile.findOne({ address: address.toLowerCase() });

      if (!profile) {
        throw new Error('Profile not found');
      }

      return profile;
    } catch (error) {
      console.error('Error fetching profile:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(address, profileData) {
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
        throw new Error('Profile not found');
      }

      return profile;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }

  /**
   * Update user preferences
   */
  async updatePreferences(address, preferences) {
    try {
      const profile = await UserProfile.findOneAndUpdate(
        { address: address.toLowerCase() },
        { preferences },
        { new: true }
      );

      if (!profile) {
        throw new Error('Profile not found');
      }

      return profile;
    } catch (error) {
      console.error('Error updating preferences:', error);
      throw error;
    }
  }

  /**
   * Update user settings
   */
  async updateSettings(address, settings) {
    try {
      const profile = await UserProfile.findOneAndUpdate(
        { address: address.toLowerCase() },
        { settings },
        { new: true }
      );

      if (!profile) {
        throw new Error('Profile not found');
      }

      return profile;
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  }

  /**
   * Update social links
   */
  async updateSocialLinks(address, socialLinks) {
    try {
      const profile = await UserProfile.findOneAndUpdate(
        { address: address.toLowerCase() },
        { socialLinks },
        { new: true }
      );

      if (!profile) {
        throw new Error('Profile not found');
      }

      return profile;
    } catch (error) {
      console.error('Error updating social links:', error);
      throw error;
    }
  }

  /**
   * Update user tier
   */
  async updateTier(address, tier) {
    try {
      const allowedTiers = ['free', 'basic', 'premium', 'enterprise', 'admin'];
      if (!allowedTiers.includes(tier)) {
        throw new Error('Invalid tier');
      }

      const profile = await UserProfile.findOneAndUpdate(
        { address: address.toLowerCase() },
        { tier },
        { new: true }
      );

      if (!profile) {
        throw new Error('Profile not found');
      }

      return profile;
    } catch (error) {
      console.error('Error updating tier:', error);
      throw error;
    }
  }

  /**
   * Record purchase history
   */
  async recordPurchase(buyerAddress, contentId, purchaseData) {
    try {
      const content = await Content.findOne({ contentId });
      if (!content) {
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

      return purchaseHistory;
    } catch (error) {
      console.error('Error recording purchase:', error);
      throw error;
    }
  }

  /**
   * Get purchase history for user
   */
  async getPurchaseHistory(address, options = {}) {
    try {
      const { skip = 0, limit = 20, sortBy = 'purchaseDate' } = options;

      const purchases = await PurchaseHistory.find({
        buyerAddress: address.toLowerCase()
      })
        .sort({ [sortBy]: -1 })
        .skip(skip)
        .limit(limit);

      const total = await PurchaseHistory.countDocuments({
        buyerAddress: address.toLowerCase()
      });

      return {
        data: purchases,
        total,
        skip,
        limit
      };
    } catch (error) {
      console.error('Error fetching purchase history:', error);
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
      console.error('Error fetching favorites:', error);
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
      console.error('Error toggling favorite:', error);
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
      console.error('Error getting profile stats:', error);
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
      console.error('Error adding rating:', error);
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
      console.error('Error recording access:', error);
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
      console.error('Error updating completion:', error);
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
      console.error('Error blocking user:', error);
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
      console.error('Error unblocking user:', error);
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
      console.error('Error updating last login:', error);
      throw error;
    }
  }
}

module.exports = new UserProfileService();
