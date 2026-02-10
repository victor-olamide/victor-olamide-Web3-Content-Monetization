const ContentPreview = require('../models/ContentPreview');
const Content = require('../models/Content');
const Purchase = require('../models/Purchase');
const Subscription = require('../models/Subscription');

/**
 * Content Preview Service
 * Manages preview functionality for unpurchased content
 */

class PreviewService {
  /**
   * Create or update a preview for content
   * @param {Number} contentId - Content ID
   * @param {Object} previewData - Preview data
   * @returns {Promise<Object>} Created/updated preview
   */
  async createOrUpdatePreview(contentId, previewData) {
    try {
      // Get content details
      const content = await Content.findOne({ contentId });
      if (!content) {
        throw new Error('Content not found');
      }

      const previewDoc = await ContentPreview.findOneAndUpdate(
        { contentId },
        {
          contentId,
          title: content.title,
          description: content.description,
          contentType: content.contentType,
          price: content.price,
          creator: content.creator,
          ...previewData,
          updatedAt: new Date()
        },
        { upsert: true, new: true }
      );

      return previewDoc;
    } catch (error) {
      console.error('Error creating/updating preview:', error);
      throw error;
    }
  }

  /**
   * Get preview for content (public endpoint)
   * @param {Number} contentId - Content ID
   * @returns {Promise<Object>} Preview data
   */
  async getPreview(contentId) {
    try {
      const preview = await ContentPreview.findOne({ contentId, previewEnabled: true });
      
      if (!preview) {
        throw new Error('Preview not available for this content');
      }

      // Increment view count
      preview.totalViews = (preview.totalViews || 0) + 1;
      await preview.save();

      // Return preview data without sensitive information
      return {
        contentId: preview.contentId,
        title: preview.title,
        description: preview.description,
        contentType: preview.contentType,
        price: preview.price,
        creator: preview.creator,
        thumbnailUrl: preview.thumbnailUrl,
        thumbnailQuality: preview.thumbnailQuality,
        trailerUrl: preview.trailerUrl,
        trailerDuration: preview.trailerDuration,
        trailerQuality: preview.trailerQuality,
        previewText: preview.previewText,
        previewImageUrl: preview.previewImageUrl,
        contentAccessType: preview.contentAccessType,
        totalViews: preview.totalViews
      };
    } catch (error) {
      console.error('Error fetching preview:', error);
      throw error;
    }
  }

  /**
   * Get previews for multiple content items
   * @param {Array<Number>} contentIds - Array of content IDs
   * @returns {Promise<Array>} Array of previews
   */
  async getPreviews(contentIds) {
    try {
      const previews = await ContentPreview.find({
        contentId: { $in: contentIds },
        previewEnabled: true
      });
      return previews;
    } catch (error) {
      console.error('Error fetching previews:', error);
      throw error;
    }
  }

  /**
   * Check if user has access to full content
   * @param {Number} contentId - Content ID
   * @param {String} userAddress - User wallet address
   * @returns {Promise<Object>} Access information
   */
  async checkAccessStatus(contentId, userAddress) {
    try {
      const content = await Content.findOne({ contentId });
      if (!content) {
        throw new Error('Content not found');
      }

      // Check if user has purchased the content
      const purchase = await Purchase.findOne({
        contentId,
        buyerAddress: userAddress,
        status: 'completed'
      });

      if (purchase) {
        return {
          contentId,
          hasAccess: true,
          accessType: 'purchased',
          purchaseDate: purchase.createdAt
        };
      }

      // Check if user has active subscription
      const subscription = await Subscription.findOne({
        subscriberAddress: userAddress,
        creatorAddress: content.creator,
        status: 'active'
      });

      if (subscription) {
        return {
          contentId,
          hasAccess: true,
          accessType: 'subscription',
          subscriptionDate: subscription.createdAt
        };
      }

      // Check for token gating
      if (content.tokenGating && content.tokenGating.enabled) {
        return {
          contentId,
          hasAccess: false,
          accessType: 'preview_only',
          requiresTokenGating: true,
          requiredToken: content.tokenGating.tokenContract,
          minBalance: content.tokenGating.minBalance
        };
      }

      // User only has access to preview
      return {
        contentId,
        hasAccess: false,
        accessType: 'preview_only'
      };
    } catch (error) {
      console.error('Error checking access status:', error);
      throw error;
    }
  }

  /**
   * Get creator's preview statistics
   * @param {String} creatorAddress - Creator wallet address
   * @returns {Promise<Object>} Preview statistics
   */
  async getPreviewStats(creatorAddress) {
    try {
      const previews = await ContentPreview.find({ creator: creatorAddress });

      const stats = {
        totalPreviews: previews.length,
        totalPreviewViews: 0,
        totalPreviewDownloads: 0,
        contentWithPreviews: [],
        previewBreakdown: {
          withThumbnails: 0,
          withTrailers: 0,
          withPreviewText: 0
        }
      };

      previews.forEach(preview => {
        stats.totalPreviewViews += preview.totalViews || 0;
        stats.totalPreviewDownloads += preview.totalPreviewDownloads || 0;

        if (preview.thumbnailUrl) stats.previewBreakdown.withThumbnails++;
        if (preview.trailerUrl) stats.previewBreakdown.withTrailers++;
        if (preview.previewText) stats.previewBreakdown.withPreviewText++;

        stats.contentWithPreviews.push({
          contentId: preview.contentId,
          title: preview.title,
          views: preview.totalViews,
          downloads: preview.totalPreviewDownloads
        });
      });

      return stats;
    } catch (error) {
      console.error('Error getting preview stats:', error);
      throw error;
    }
  }

  /**
   * Update preview visibility
   * @param {Number} contentId - Content ID
   * @param {Boolean} enabled - Enable/disable preview
   * @returns {Promise<Object>} Updated preview
   */
  async togglePreviewVisibility(contentId, enabled) {
    try {
      const preview = await ContentPreview.findOneAndUpdate(
        { contentId },
        {
          previewEnabled: enabled,
          updatedAt: new Date()
        },
        { new: true }
      );

      return preview;
    } catch (error) {
      console.error('Error toggling preview visibility:', error);
      throw error;
    }
  }

  /**
   * Delete preview
   * @param {Number} contentId - Content ID
   * @returns {Promise<Object>} Result
   */
  async deletePreview(contentId) {
    try {
      await ContentPreview.deleteOne({ contentId });
      return { success: true, message: 'Preview deleted' };
    } catch (error) {
      console.error('Error deleting preview:', error);
      throw error;
    }
  }

  /**
   * Get previews by content type
   * @param {String} contentType - Type of content
   * @param {Object} options - Pagination options
   * @returns {Promise<Array>} Previews
   */
  async getPreviewsByType(contentType, options = {}) {
    try {
      const skip = options.skip || 0;
      const limit = options.limit || 10;

      const previews = await ContentPreview.find({
        contentType,
        previewEnabled: true
      })
        .skip(skip)
        .limit(limit)
        .sort({ totalViews: -1 });

      const total = await ContentPreview.countDocuments({
        contentType,
        previewEnabled: true
      });

      return {
        data: previews,
        total,
        skip,
        limit
      };
    } catch (error) {
      console.error('Error getting previews by type:', error);
      throw error;
    }
  }

  /**
   * Record preview download
   * @param {Number} contentId - Content ID
   * @returns {Promise<Object>} Updated preview
   */
  async recordPreviewDownload(contentId) {
    try {
      const preview = await ContentPreview.findOneAndUpdate(
        { contentId },
        {
          $inc: { totalPreviewDownloads: 1 },
          updatedAt: new Date()
        },
        { new: true }
      );

      return preview;
    } catch (error) {
      console.error('Error recording preview download:', error);
      throw error;
    }
  }

  /**
   * Get trending previews
   * @param {Object} options - Options
   * @returns {Promise<Array>} Trending previews
   */
  async getTrendingPreviews(options = {}) {
    try {
      const limit = options.limit || 10;
      const days = options.days || 7;

      const dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - days);

      const previews = await ContentPreview.find({
        previewEnabled: true,
        updatedAt: { $gte: dateThreshold }
      })
        .sort({ totalViews: -1 })
        .limit(limit);

      return previews;
    } catch (error) {
      console.error('Error getting trending previews:', error);
      throw error;
    }
  }
}

module.exports = new PreviewService();
