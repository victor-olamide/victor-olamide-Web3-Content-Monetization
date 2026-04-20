const CloudinaryService = require('./cloudinaryService');
const path = require('path');

class ContentPreviewService {
  /**
   * Generate preview for content with moderation overlay
   */
  async generateModerationPreview(contentId, contentType, sourceUrl, flags = []) {
    try {
      const previewUrl = await this._getPreviewUrl(sourceUrl, contentType);
      
      return {
        contentId,
        contentType,
        previewUrl,
        hasFlaggedSegments: flags.length > 0,
        flags: this._formatFlagsForPreview(flags),
        generatedAt: new Date()
      };
    } catch (error) {
      throw new Error(`Failed to generate preview: ${error.message}`);
    }
  }

  /**
   * Get preview URL appropriate for content type
   */
  async _getPreviewUrl(sourceUrl, contentType) {
    if (contentType === 'image') {
      return await this._generateImagePreview(sourceUrl);
    } else if (contentType === 'video') {
      return await this._generateVideoPreview(sourceUrl);
    } else if (contentType === 'text') {
      return await this._generateTextPreview(sourceUrl);
    } else if (contentType === 'audio') {
      return await this._generateAudioPreview(sourceUrl);
    }
    return sourceUrl;
  }

  /**
   * Generate image preview with cloudinary transformations
   */
  async _generateImagePreview(imageUrl) {
    try {
      // Add quality/compression for moderation review
      const transformedUrl = CloudinaryService.url(imageUrl, {
        width: 640,
        height: 480,
        crop: 'fill',
        quality: 'auto',
        fetch_format: 'auto'
      });
      return transformedUrl;
    } catch (error) {
      return imageUrl;
    }
  }

  /**
   * Generate video preview with thumbnail
   */
  async _generateVideoPreview(videoUrl) {
    try {
      // Extract first frame as thumbnail for moderation
      const thumbnailUrl = CloudinaryService.url(videoUrl, {
        resource_type: 'video',
        transformation: [
          {
            offset: '5%',
            quality: 'auto'
          }
        ]
      });
      return thumbnailUrl;
    } catch (error) {
      return videoUrl;
    }
  }

  /**
   * Generate text content preview (truncated)
   */
  async _generateTextPreview(textContent) {
    try {
      // Create preview object for text
      let preview = textContent;
      if (typeof textContent === 'string' && textContent.length > 500) {
        preview = textContent.substring(0, 500) + '...';
      }
      return {
        preview,
        isComplete: typeof textContent === 'string' && textContent.length <= 500,
        fullLength: typeof textContent === 'string' ? textContent.length : 0
      };
    } catch (error) {
      return textContent;
    }
  }

  /**
   * Generate audio preview with metadata
   */
  async _generateAudioPreview(audioUrl) {
    try {
      return {
        url: audioUrl,
        previewLength: '30s',
        type: 'audio/mpeg'
      };
    } catch (error) {
      return audioUrl;
    }
  }

  /**
   * Format flags for preview display
   */
  _formatFlagsForPreview(flags) {
    return flags.map(flag => ({
      id: flag._id,
      category: flag.category || 'general',
      severity: flag.severity,
      reason: flag.reason,
      description: flag.description,
      timestamp: flag.createdAt,
      flagCount: flag.flagCount
    }));
  }

  /**
   * Create side-by-side comparison preview for two versions
   */
  async generateComparisonPreview(originalContentId, editedContentId, originalUrl, editedUrl, contentType) {
    try {
      const originalPreview = await this._getPreviewUrl(originalUrl, contentType);
      const editedPreview = await this._getPreviewUrl(editedUrl, contentType);

      return {
        comparison: {
          original: {
            contentId: originalContentId,
            preview: originalPreview
          },
          edited: {
            contentId: editedContentId,
            preview: editedPreview
          }
        },
        contentType,
        createdAt: new Date()
      };
    } catch (error) {
      throw new Error(`Failed to generate comparison: ${error.message}`);
    }
  }

  /**
   * Generate annotated preview highlighting potential issues
   */
  async generateAnnotatedPreview(contentUrl, contentType, potentialIssues = []) {
    try {
      const basePreview = await this._getPreviewUrl(contentUrl, contentType);

      return {
        basePreview,
        annotations: potentialIssues.map(issue => ({
          type: issue.type,
          severity: issue.severity,
          area: issue.area || 'full_content',
          message: issue.message
        })),
        hasAnnotations: potentialIssues.length > 0,
        generatedAt: new Date()
      };
    } catch (error) {
      throw new Error(`Failed to generate annotated preview: ${error.message}`);
    }
  }

  /**
   * Get cached preview if available
   */
  async getCachedPreview(contentId) {
    try {
      // Check if preview exists in cache
      const cacheKey = `preview_${contentId}`;
      // Implement cache logic based on your cache system
      return null; // Placeholder
    } catch (error) {
      return null;
    }
  }

  /**
   * Clear cached preview
   */
  async clearCachedPreview(contentId) {
    try {
      const cacheKey = `preview_${contentId}`;
      // Implement cache clearing logic
      return { success: true };
    } catch (error) {
      throw new Error(`Failed to clear cached preview: ${error.message}`);
    }
  }

  /**
   * Generate bulk previews for multiple content items
   */
  async generateBulkPreviews(contentItems) {
    try {
      const previews = [];
      
      for (const item of contentItems) {
        try {
          const preview = await this.generateModerationPreview(
            item.contentId,
            item.contentType,
            item.sourceUrl,
            item.flags
          );
          previews.push({ success: true, data: preview });
        } catch (error) {
          previews.push({ 
            success: false, 
            contentId: item.contentId, 
            error: error.message 
          });
        }
      }

      return {
        total: contentItems.length,
        successful: previews.filter(p => p.success).length,
        failed: previews.filter(p => !p.success).length,
        previews
      };
    } catch (error) {
      throw new Error(`Failed to generate bulk previews: ${error.message}`);
    }
  }

  /**
   * Get preview statistics and metadata
   */
  async getPreviewStats(previewId) {
    try {
      return {
        previewId,
        viewCount: 0, // Implement based on your tracking
        averageReviewTime: 0, // Implement based on your metrics
        lastViewed: null,
        metadata: {}
      };
    } catch (error) {
      throw new Error(`Failed to get preview stats: ${error.message}`);
    }
  }

  /**
   * Optimize preview for performance
   */
  async optimizePreview(previewUrl, options = {}) {
    try {
      const {
        maxWidth = 800,
        maxHeight = 600,
        quality = 'auto',
        format = 'auto'
      } = options;

      return CloudinaryService.url(previewUrl, {
        width: maxWidth,
        height: maxHeight,
        crop: 'fit',
        quality,
        fetch_format: format
      });
    } catch (error) {
      return previewUrl;
    }
  }
}

module.exports = new ContentPreviewService();
