'use strict';

const logger = require('../utils/logger');
const ContentPreview = require('../models/ContentPreview');
const Content = require('../models/Content');
const Purchase = require('../models/Purchase');
const Subscription = require('../models/Subscription');
const { uploadFileToIPFS } = require('./ipfsService');
const {
  PREVIEW_LIMITS,
  mimeToContentCategory,
  extractCid,
  toIpfsUrl,
  estimateByteOffsetForSeconds,
  truncateToFirstLines,
  isLikelyMp4,
} = require('../utils/previewUtils');

/**
 * Content Preview Service (#198)
 * Generates free previews (first 30 s for video/audio, first page for docs),
 * stores each preview CID separately in IPFS, and serves them without an
 * access check so unauthenticated users can discover content.
 */

class PreviewService {
  constructor() {
    // In-memory cache for preview data
    this.previewCache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes cache expiry
  }

  // ─── Preview Generation ────────────────────────────────────────────────

  /**
   * Generate a free video preview (first PREVIEW_LIMITS.VIDEO_SECONDS seconds).
   * Slices the raw buffer by byte-ratio approximation when ffmpeg is absent,
   * uploads the slice to IPFS, and returns the dedicated preview CID.
   *
   * @param {Buffer} videoBuffer  Full video file buffer
   * @param {number} contentId
   * @param {number} [totalSeconds]  Known duration; defaults to 0 → ratio capped at 1
   * @returns {Promise<{previewCid: string, previewUrl: string, durationSeconds: number}>}
   */
  async generateVideoPreview(videoBuffer, contentId, totalSeconds = 0) {
    const targetSeconds = PREVIEW_LIMITS.VIDEO_SECONDS;
    const byteOffset = estimateByteOffsetForSeconds(
      videoBuffer.length,
      totalSeconds,
      targetSeconds
    );
    const slice = videoBuffer.slice(0, byteOffset);

    const ipfsUrl = await uploadFileToIPFS(
      slice,
      `video-preview-${contentId}.mp4`,
      { metadata: { contentId: String(contentId), type: 'video-preview' } }
    );

    const previewCid = extractCid(ipfsUrl);
    logger.info('Video preview generated', { contentId, previewCid, targetSeconds });
    return { previewCid, previewUrl: ipfsUrl, durationSeconds: targetSeconds };
  }

  /**
   * Generate a free document preview (first PREVIEW_LIMITS.DOCUMENT_PAGES page).
   * For plain text/HTML, truncates to the first 50 lines and uploads to IPFS.
   * For binary (PDF / DOCX), uploads the raw first 64 KB as a preview chunk.
   *
   * @param {Buffer} docBuffer   Full document file buffer
   * @param {string} mimeType
   * @param {number} contentId
   * @returns {Promise<{previewCid: string, previewUrl: string, pageCount: number}>}
   */
  async generateDocumentPreview(docBuffer, mimeType, contentId) {
    let previewBuffer;
    const isText = mimeType.startsWith('text/');

    if (isText) {
      previewBuffer = truncateToFirstLines(docBuffer, 50);
    } else {
      // First 64 KB is a reasonable "first page" proxy for binary docs
      previewBuffer = docBuffer.slice(0, Math.min(docBuffer.length, 64 * 1024));
    }

    const ext = isText ? 'txt' : 'bin';
    const ipfsUrl = await uploadFileToIPFS(
      previewBuffer,
      `doc-preview-${contentId}.${ext}`,
      { metadata: { contentId: String(contentId), type: 'document-preview', mimeType } }
    );

    const previewCid = extractCid(ipfsUrl);
    logger.info('Document preview generated', { contentId, previewCid, mimeType });
    return { previewCid, previewUrl: ipfsUrl, pageCount: PREVIEW_LIMITS.DOCUMENT_PAGES };
  }

  /**
   * Generate a free audio preview (first PREVIEW_LIMITS.AUDIO_SECONDS seconds).
   * Uses the same byte-ratio approximation as video.
   *
   * @param {Buffer} audioBuffer  Full audio file buffer
   * @param {number} contentId
   * @param {number} [totalSeconds]
   * @returns {Promise<{previewCid: string, previewUrl: string, durationSeconds: number}>}
   */
  async generateAudioPreview(audioBuffer, contentId, totalSeconds = 0) {
    const targetSeconds = PREVIEW_LIMITS.AUDIO_SECONDS;
    const byteOffset = estimateByteOffsetForSeconds(
      audioBuffer.length,
      totalSeconds,
      targetSeconds
    );
    const slice = audioBuffer.slice(0, byteOffset);

    const ipfsUrl = await uploadFileToIPFS(
      slice,
      `audio-preview-${contentId}.mp3`,
      { metadata: { contentId: String(contentId), type: 'audio-preview' } }
    );

    const previewCid = extractCid(ipfsUrl);
    logger.info('Audio preview generated', { contentId, previewCid, targetSeconds });
    return { previewCid, previewUrl: ipfsUrl, durationSeconds: targetSeconds };
  }

  /**
   * High-level dispatcher: detect content type from MIME, generate the
   * appropriate preview, upload to IPFS, persist the preview CID in
   * ContentPreview, and return the preview record.
   *
   * @param {number} contentId
   * @param {Buffer} fileBuffer
   * @param {string} mimeType
   * @param {Object} [opts]
   * @param {number} [opts.totalSeconds]  Known video/audio duration
   * @returns {Promise<Object>}  Saved ContentPreview document
   */
  async generateAndStorePreview(contentId, fileBuffer, mimeType, opts = {}) {
    const category = mimeToContentCategory(mimeType);
    let result;

    if (category === 'video') {
      result = await this.generateVideoPreview(fileBuffer, contentId, opts.totalSeconds || 0);
    } else if (category === 'audio' || category === 'music') {
      result = await this.generateAudioPreview(fileBuffer, contentId, opts.totalSeconds || 0);
    } else {
      // document / article / image — all handled by document preview
      result = await this.generateDocumentPreview(fileBuffer, mimeType, contentId);
    }

    // Persist the dedicated preview CID on the ContentPreview record
    const updateFields = {
      previewCid: result.previewCid,
      previewEnabled: true,
      updatedAt: new Date(),
    };

    if (result.durationSeconds !== undefined) {
      updateFields.trailerDuration = result.durationSeconds;
      updateFields.trailerUrl = result.previewUrl;
    } else {
      updateFields.previewImageUrl = result.previewUrl;
    }

    const preview = await ContentPreview.findOneAndUpdate(
      { contentId },
      updateFields,
      { upsert: true, new: true }
    );

    this.invalidatePreviewCache(contentId);
    return preview;
  }

  // ─── Cache ──────────────────────────────────────────────────────────────

  /**
   * Get preview from cache or database
   * @param {Number} contentId - Content ID
   * @returns {Promise<Object>} Cached or fetched preview
   */
  async getPreviewFromCache(contentId) {
    const cacheKey = `preview_${contentId}`;
    const cached = this.previewCache.get(cacheKey);
    
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }
    
    // Cache miss or expired
    this.previewCache.delete(cacheKey);
    return null;
  }

  /**
   * Set preview in cache
   * @param {Number} contentId - Content ID
   * @param {Object} data - Preview data
   */
  setPreviewInCache(contentId, data) {
    const cacheKey = `preview_${contentId}`;
    this.previewCache.set(cacheKey, {
      data,
      expiry: Date.now() + this.cacheExpiry
    });
  }

  /**
   * Invalidate preview cache
   * @param {Number} contentId - Content ID
   */
  invalidatePreviewCache(contentId) {
    const cacheKey = `preview_${contentId}`;
    this.previewCache.delete(cacheKey);
  }

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

      // Invalidate cache when preview is updated
      this.invalidatePreviewCache(contentId);

      return previewDoc;
    } catch (error) {
      logger.error('Error creating/updating preview', { err: error });
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
      // Check cache first
      const cachedPreview = await this.getPreviewFromCache(contentId);
      if (cachedPreview) {
        return cachedPreview;
      }

      const preview = await ContentPreview.findOne({ contentId, previewEnabled: true });
      
      if (!preview) {
        throw new Error('Preview not available for this content');
      }

      // Increment view count
      preview.totalViews = (preview.totalViews || 0) + 1;
      await preview.save();

      // Return preview data without sensitive information
      const previewData = {
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
        previewCid: preview.previewCid || null,
        contentAccessType: preview.contentAccessType,
        totalViews: preview.totalViews
      };

      // Cache the preview
      this.setPreviewInCache(contentId, previewData);

      return previewData;
    } catch (error) {
      logger.error('Error fetching preview', { err: error });
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
      logger.error('Error fetching previews', { err: error });
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
      logger.error('Error checking access status', { err: error });
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
      logger.error('Error getting preview stats', { err: error });
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
      logger.error('Error toggling preview visibility', { err: error });
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
      logger.error('Error deleting preview', { err: error });
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
      logger.error('Error getting previews by type', { err: error });
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
      logger.error('Error recording preview download', { err: error });
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
      logger.error('Error getting trending previews', { err: error });
      throw error;
    }
  }

  /**
   * Track daily analytics for preview
   * @param {Number} contentId - Content ID
   * @param {String} eventType - Type of event ('view' or 'download')
   * @returns {Promise<void>}
   */
  async trackDailyAnalytics(contentId, eventType = 'view') {
    try {
      const today = new Date().toISOString().split('T')[0];
      const preview = await ContentPreview.findOne({ contentId });
      
      if (!preview) {
        throw new Error('Preview not found');
      }

      if (!preview.previewAnalytics) {
        preview.previewAnalytics = {
          dailyViews: new Map(),
          dailyDownloads: new Map()
        };
      }

      if (eventType === 'view') {
        const currentViews = preview.previewAnalytics.dailyViews.get(today) || 0;
        preview.previewAnalytics.dailyViews.set(today, currentViews + 1);
      } else if (eventType === 'download') {
        const currentDownloads = preview.previewAnalytics.dailyDownloads.get(today) || 0;
        preview.previewAnalytics.dailyDownloads.set(today, currentDownloads + 1);
      }

      preview.previewAnalytics.lastAnalyticsUpdate = new Date();
      await preview.save();
    } catch (error) {
      logger.error('Error tracking daily analytics', { err: error });
      // Don't throw - analytics tracking should not break preview functionality
    }
  }

  /**
   * Get preview analytics
   * @param {Number} contentId - Content ID
   * @returns {Promise<Object>} Analytics data
   */
  async getPreviewAnalytics(contentId) {
    try {
      const preview = await ContentPreview.findOne({ contentId });
      
      if (!preview) {
        throw new Error('Preview not found');
      }

      return {
        contentId: preview.contentId,
        totalViews: preview.totalViews,
        totalDownloads: preview.totalPreviewDownloads,
        analytics: preview.previewAnalytics || {},
        lastUpdated: preview.updatedAt
      };
    } catch (error) {
      logger.error('Error getting preview analytics', { err: error });
      throw error;
    }
  }

  /**
   * Bulk get previews with analytics
   * @param {Array<Number>} contentIds - Array of content IDs
   * @returns {Promise<Array>} Previews with analytics
   */
  async getPreviewsWithAnalytics(contentIds) {
    try {
      const previews = await ContentPreview.find({
        contentId: { $in: contentIds },
        previewEnabled: true
      });

      return previews.map(preview => ({
        contentId: preview.contentId,
        title: preview.title,
        totalViews: preview.totalViews,
        totalDownloads: preview.totalPreviewDownloads,
        conversionRate: preview.previewAnalytics?.conversionRate || 0,
        averageWatchTime: preview.previewAnalytics?.averageWatchTime || 0
      }));
    } catch (error) {
      logger.error('Error getting previews with analytics', { err: error });
      throw error;
    }
  }
}

module.exports = new PreviewService();
