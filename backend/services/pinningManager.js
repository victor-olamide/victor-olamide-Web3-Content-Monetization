/**
 * IPFS Pinning Manager
 * Manages content lifecycle pinning operations and monitoring
 */

const { pinningService, PROVIDERS } = require('./pinningService');
const Content = require('../models/Content');
const ContentPreview = require('../models/ContentPreview');

class PinningManager {
  constructor() {
    this.pinningService = pinningService;
    this.monitoringInterval = 30 * 60 * 1000; // 30 minutes
    this.redundancyLevel = parseInt(process.env.IPFS_PINNING_REDUNDANCY) || 2;
    this.autoRepinEnabled = process.env.IPFS_AUTO_REPIN !== 'false';

    // Start monitoring
    this.startMonitoring();
  }

  /**
   * Pin content when it's created or updated
   * @param {Object} content - Content document
   * @param {Buffer} fileBuffer - File buffer (optional)
   * @param {string} fileName - File name (optional)
   * @returns {Promise<Object>} Pinning result
   */
  async pinContent(content, fileBuffer = null, fileName = null) {
    try {
      console.log(`[PinningManager] Starting to pin content: ${content.contentId}`);

      let pinningResult;

      if (fileBuffer && fileName) {
        // Upload and pin new file
        pinningResult = await this.pinningService.uploadFile(
          fileBuffer,
          fileName,
          {
            redundancy: this.redundancyLevel,
            metadata: {
              contentId: content.contentId,
              contentType: content.contentType,
              creator: content.creator,
              title: content.title
            },
            tags: ['content', content.contentType, content.creator]
          }
        );
      } else if (content.url && content.url.startsWith('ipfs://')) {
        // Pin existing IPFS hash
        const ipfsHash = content.url;
        pinningResult = await this.pinningService.pinExistingHash(ipfsHash, {
          redundancy: this.redundancyLevel
        });
      } else {
        throw new Error('No IPFS content to pin');
      }

      // Update content with pinning information
      await this.updateContentPinningInfo(content._id, pinningResult);

      console.log(`[PinningManager] ✅ Successfully pinned content ${content.contentId}`);
      return pinningResult;

    } catch (error) {
      console.error(`[PinningManager] ❌ Failed to pin content ${content.contentId}:`, error.message);
      throw error;
    }
  }

  /**
   * Pin content preview
   * @param {Object} preview - ContentPreview document
   * @param {Buffer} thumbnailBuffer - Thumbnail buffer
   * @param {string} thumbnailName - Thumbnail filename
   * @param {Buffer} trailerBuffer - Trailer buffer (optional)
   * @param {string} trailerName - Trailer filename (optional)
   * @returns {Promise<Object>} Pinning result
   */
  async pinContentPreview(preview, thumbnailBuffer, thumbnailName, trailerBuffer = null, trailerName = null) {
    try {
      console.log(`[PinningManager] Starting to pin preview: ${preview._id}`);

      const pinningResults = {};

      // Pin thumbnail
      if (thumbnailBuffer && thumbnailName) {
        pinningResults.thumbnail = await this.pinningService.uploadFile(
          thumbnailBuffer,
          thumbnailName,
          {
            redundancy: this.redundancyLevel,
            metadata: {
              previewId: preview._id,
              contentType: 'thumbnail',
              originalName: thumbnailName
            },
            tags: ['preview', 'thumbnail']
          }
        );
      }

      // Pin trailer
      if (trailerBuffer && trailerName) {
        pinningResults.trailer = await this.pinningService.uploadFile(
          trailerBuffer,
          trailerName,
          {
            redundancy: this.redundancyLevel,
            metadata: {
              previewId: preview._id,
              contentType: 'trailer',
              originalName: trailerName
            },
            tags: ['preview', 'trailer']
          }
        );
      }

      // Update preview with pinning information
      await this.updatePreviewPinningInfo(preview._id, pinningResults);

      console.log(`[PinningManager] ✅ Successfully pinned preview ${preview._id}`);
      return pinningResults;

    } catch (error) {
      console.error(`[PinningManager] ❌ Failed to pin preview ${preview._id}:`, error.message);
      throw error;
    }
  }

  /**
   * Unpin content when it's deleted or removed
   * @param {Object} content - Content document
   * @returns {Promise<Object>} Unpinning result
   */
  async unpinContent(content) {
    try {
      console.log(`[PinningManager] Starting to unpin content: ${content.contentId}`);

      if (!content.pinningInfo || !content.pinningInfo.replicas) {
        console.log(`[PinningManager] No pinning info found for content ${content.contentId}`);
        return { success: true, message: 'No pinning info found' };
      }

      const unpinningResults = [];

      // Unpin from all providers where it was pinned
      for (const replica of content.pinningInfo.replicas) {
        try {
          const result = await this.pinningService.unpinHash(replica.hash, [replica.provider]);
          unpinningResults.push(result);
        } catch (error) {
          console.error(`[PinningManager] Failed to unpin from ${replica.provider}:`, error.message);
        }
      }

      // Update content to mark as unpinned
      await Content.findByIdAndUpdate(content._id, {
        'pinningInfo.unpinnedAt': new Date(),
        'pinningInfo.unpinningResults': unpinningResults
      });

      console.log(`[PinningManager] ✅ Successfully unpinned content ${content.contentId}`);
      return {
        success: true,
        unpinned: unpinningResults.length,
        results: unpinningResults
      };

    } catch (error) {
      console.error(`[PinningManager] ❌ Failed to unpin content ${content.contentId}:`, error.message);
      throw error;
    }
  }

  /**
   * Check and repair pinning for content
   * @param {Object} content - Content document
   * @returns {Promise<Object>} Repair result
   */
  async repairContentPinning(content) {
    try {
      console.log(`[PinningManager] Checking pinning status for content: ${content.contentId}`);

      if (!content.url || !content.url.startsWith('ipfs://')) {
        return { success: true, message: 'Not an IPFS content' };
      }

      const status = await this.pinningService.checkPinningStatus(content.url);

      if (status.summary.isWellPinned) {
        console.log(`[PinningManager] ✅ Content ${content.contentId} is well pinned`);
        return { success: true, status, repaired: false };
      }

      console.log(`[PinningManager] 🔧 Content ${content.contentId} needs repinning`);

      // Repin to reach desired redundancy
      const repinResult = await this.pinningService.pinExistingHash(content.url, {
        redundancy: this.redundancyLevel
      });

      // Update content with new pinning info
      await this.updateContentPinningInfo(content._id, repinResult, true);

      console.log(`[PinningManager] ✅ Successfully repaired pinning for content ${content.contentId}`);
      return {
        success: true,
        status,
        repaired: true,
        repinResult
      };

    } catch (error) {
      console.error(`[PinningManager] ❌ Failed to repair pinning for content ${content.contentId}:`, error.message);
      throw error;
    }
  }

  /**
   * Update content document with pinning information
   * @param {string} contentId - Content ID
   * @param {Object} pinningResult - Pinning result
   * @param {boolean} isRepair - Whether this is a repair operation
   */
  async updateContentPinningInfo(contentId, pinningResult, isRepair = false) {
    const updateData = {
      pinningInfo: {
        ...pinningResult,
        pinnedAt: new Date(),
        redundancyLevel: pinningResult.redundancy,
        isRepair
      }
    };

    await Content.findByIdAndUpdate(contentId, updateData);
  }

  /**
   * Update preview document with pinning information
   * @param {string} previewId - Preview ID
   * @param {Object} pinningResults - Pinning results for thumbnail/trailer
   */
  async updatePreviewPinningInfo(previewId, pinningResults) {
    const updateData = {
      pinningInfo: {
        ...pinningResults,
        pinnedAt: new Date()
      }
    };

    await ContentPreview.findByIdAndUpdate(previewId, updateData);
  }

  /**
   * Start monitoring for pinning health
   */
  startMonitoring() {
    console.log(`[PinningManager] Starting pinning monitoring (interval: ${this.monitoringInterval}ms)`);

    setInterval(async () => {
      await this.performHealthCheck();
    }, this.monitoringInterval);

    // Initial health check
    setTimeout(() => {
      this.performHealthCheck();
    }, 5000);
  }

  /**
   * Perform health check on all pinned content
   */
  async performHealthCheck() {
    try {
      console.log(`[PinningManager] Performing pinning health check...`);

      // Get all content that should be pinned
      const contents = await Content.find({
        'pinningInfo.replicas': { $exists: true },
        isRemoved: { $ne: true }
      }).limit(100); // Limit to avoid overwhelming the system

      let checked = 0;
      let repaired = 0;
      let failed = 0;

      for (const content of contents) {
        try {
          const result = await this.repairContentPinning(content);
          checked++;

          if (result.repaired) {
            repaired++;
          }
        } catch (error) {
          console.error(`[PinningManager] Health check failed for content ${content.contentId}:`, error.message);
          failed++;
        }

        // Small delay to avoid overwhelming providers
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log(`[PinningManager] Health check completed: ${checked} checked, ${repaired} repaired, ${failed} failed`);

    } catch (error) {
      console.error(`[PinningManager] Health check error:`, error.message);
    }
  }

  /**
   * Get pinning statistics
   * @returns {Promise<Object>} Statistics
   */
  async getPinningStats() {
    try {
      const [
        totalContent,
        pinnedContent,
        removedContent,
        previewStats
      ] = await Promise.all([
        Content.countDocuments(),
        Content.countDocuments({ 'pinningInfo.replicas': { $exists: true } }),
        Content.countDocuments({ 'pinningInfo.unpinnedAt': { $exists: true } }),
        ContentPreview.countDocuments({ 'pinningInfo.thumbnail': { $exists: true } })
      ]);

      const storageUsage = await this.pinningService.getStorageUsage();
      const healthStatus = this.pinningService.getHealthStatus();

      return {
        content: {
          total: totalContent,
          pinned: pinnedContent,
          unpinned: removedContent,
          pinningRatio: totalContent > 0 ? (pinnedContent / totalContent) * 100 : 0
        },
        previews: {
          withPinning: previewStats
        },
        storage: storageUsage.summary,
        providers: healthStatus
      };

    } catch (error) {
      console.error(`[PinningManager] Failed to get stats:`, error.message);
      throw error;
    }
  }

  /**
   * Emergency unpin all content (use with caution)
   * @param {string} confirmText - Confirmation text
   * @returns {Promise<Object>} Result
   */
  async emergencyUnpinAll(confirmText) {
    if (confirmText !== 'CONFIRM_UNPIN_ALL') {
      throw new Error('Confirmation text required for emergency unpin');
    }

    try {
      console.log(`[PinningManager] 🚨 Starting emergency unpin of all content`);

      const contents = await Content.find({
        'pinningInfo.replicas': { $exists: true },
        'pinningInfo.unpinnedAt': { $exists: false }
      });

      let unpinned = 0;
      let failed = 0;

      for (const content of contents) {
        try {
          await this.unpinContent(content);
          unpinned++;
        } catch (error) {
          console.error(`[PinningManager] Failed to unpin content ${content.contentId}:`, error.message);
          failed++;
        }
      }

      console.log(`[PinningManager] 🚨 Emergency unpin completed: ${unpinned} unpinned, ${failed} failed`);

      return {
        success: true,
        unpinned,
        failed,
        totalProcessed: contents.length
      };

    } catch (error) {
      console.error(`[PinningManager] Emergency unpin failed:`, error.message);
      throw error;
    }
  }

  /**
   * Get service status
   * @returns {Object} Status
   */
  getStatus() {
    return {
      service: 'PinningManager',
      redundancyLevel: this.redundancyLevel,
      autoRepinEnabled: this.autoRepinEnabled,
      monitoringInterval: this.monitoringInterval,
      pinningService: this.pinningService.getHealthStatus()
    };
  }
}

// Export singleton instance
const pinningManager = new PinningManager();

/**
 * Initialize the pinning service
 * @returns {Promise<void>}
 */
async function initializePinningService() {
  try {
    // The PinningManager constructor already initializes the service
    // This function ensures the service is ready
    console.log('[PinningManager] Service initialized and ready');
  } catch (error) {
    console.error('[PinningManager] Initialization failed:', error);
    throw error;
  }
}

module.exports = {
  PinningManager,
  pinningManager,
  initializePinningService
};