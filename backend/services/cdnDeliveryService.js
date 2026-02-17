const cdnService = require('./cdnService');
const { getContentFromStorage } = require('./storageService');
const { cdnConfig, getContentTypeConfig } = require('../config/cdnConfig');
const { CdnCacheEntry } = require('../models/CdnCache');

/**
 * CDN Delivery Service - Integrates CDN with content delivery
 * Provides CDN-enhanced content delivery with fallback to direct delivery
 */

class CdnDeliveryService {
  constructor() {
    this.cdnService = cdnService;
    this.config = cdnConfig;
  }

  /**
   * Deliver content with CDN optimization
   * @param {Object} content - Content object
   * @param {Object} options - Delivery options
   * @returns {Promise<Object>} Delivery result
   */
  async deliverContent(content, options = {}) {
    try {
      // Check if CDN is enabled and content should use CDN
      if (!this.config.enabled || !this.config.contentDelivery.enabled) {
        return await this.deliverDirect(content, options);
      }

      // Try to get CDN URL first
      const cdnUrl = await this.cdnService.getCdnUrl(content.contentId);

      if (cdnUrl && !options.forceDirect) {
        return await this.deliverViaCdn(cdnUrl, content, options);
      }

      // Fallback to direct delivery
      const directResult = await this.deliverDirect(content, options);

      // If direct delivery succeeded and CDN prefetch is enabled, add to CDN cache
      if (directResult.success && this.config.performance.prefetchEnabled && !options.skipCdnCache) {
        setImmediate(() => {
          this.cdnService.addToCache(content);
        });
      }

      return directResult;

    } catch (error) {
      console.error('CDN delivery failed, falling back to direct:', error);
      return await this.deliverDirect(content, options);
    }
  }

  /**
   * Deliver content via CDN
   * @param {string} cdnUrl - CDN URL
   * @param {Object} content - Content object
   * @param {Object} options - Delivery options
   * @returns {Promise<Object>} Delivery result
   */
  async deliverViaCdn(cdnUrl, content, options = {}) {
    try {
      const axios = require('axios');

      // Add CDN-specific headers
      const headers = {
        'User-Agent': options.userAgent || 'Web3-Platform/1.0',
        ...this.getCdnHeaders(content, options)
      };

      // Add access token if provided
      if (options.accessToken) {
        headers['X-Access-Token'] = options.accessToken;
      }

      const response = await axios.get(cdnUrl, {
        headers,
        timeout: this.config.performance.connectionTimeout,
        responseType: 'stream', // Use stream for better performance
        validateStatus: (status) => status < 500 // Accept client errors, retry server errors
      });

      // Update cache statistics
      if (response.status === 200) {
        const cacheEntry = await CdnCacheEntry.findOne({ cdnUrl });
        if (cacheEntry) {
          const bytesServed = parseInt(response.headers['content-length']) || 0;
          const region = options.region || 'unknown';

          await CdnCacheEntry.updateAccessStats(cacheEntry.cacheKey, bytesServed, region);
        }
      }

      return {
        success: true,
        method: 'cdn',
        cdnUrl,
        statusCode: response.status,
        headers: response.headers,
        stream: response.data,
        contentType: response.headers['content-type'],
        contentLength: response.headers['content-length'],
        cacheStatus: response.headers['cf-cache-status'] || response.headers['x-cache'] || 'unknown'
      };

    } catch (error) {
      console.warn(`CDN delivery failed for ${cdnUrl}:`, error.message);

      // If CDN fails, try direct delivery as fallback
      if (!options.skipFallback) {
        console.log('Falling back to direct delivery');
        return await this.deliverDirect(content, { ...options, skipCdnCache: true });
      }

      throw error;
    }
  }

  /**
   * Deliver content directly (fallback method)
   * @param {Object} content - Content object
   * @param {Object} options - Delivery options
   * @returns {Promise<Object>} Delivery result
   */
  async deliverDirect(content, options = {}) {
    try {
      const contentData = await getContentFromStorage(content.url, content.storageType);

      if (!contentData) {
        throw new Error('Content not found in storage');
      }

      return {
        success: true,
        method: 'direct',
        statusCode: 200,
        headers: {
          'Content-Type': this.getContentType(content.contentType),
          'Content-Length': contentData.length,
          'X-Delivery-Method': 'direct',
          'X-Storage-Type': content.storageType
        },
        data: contentData,
        contentType: this.getContentType(content.contentType),
        contentLength: contentData.length
      };

    } catch (error) {
      console.error('Direct content delivery failed:', error);
      return {
        success: false,
        method: 'direct',
        error: error.message,
        statusCode: 500
      };
    }
  }

  /**
   * Get CDN-specific headers for request
   * @param {Object} content - Content object
   * @param {Object} options - Request options
   * @returns {Object} Headers object
   */
  getCdnHeaders(content, options = {}) {
    const headers = {};
    const contentTypeConfig = getContentTypeConfig(content.contentType);

    // Cache control headers
    if (this.config.contentDelivery.cacheControl) {
      headers['Cache-Control'] = this.config.contentDelivery.cacheControl;
    }

    // CORS headers
    if (this.config.contentDelivery.corsEnabled) {
      headers['Access-Control-Allow-Origin'] = this.config.security.corsOrigins.join(', ');
      headers['Access-Control-Allow-Methods'] = 'GET, HEAD, OPTIONS';
      headers['Access-Control-Allow-Headers'] = 'X-Access-Token, Authorization';
    }

    // Security headers
    if (this.config.security.enableHttps) {
      headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
    }

    // Content type specific headers
    if (contentTypeConfig.streaming) {
      headers['Accept-Ranges'] = 'bytes';
      headers['Content-Type'] = this.getContentType(content.contentType);
    }

    // Geographic headers
    if (options.region) {
      headers['X-Client-Region'] = options.region;
    }

    return headers;
  }

  /**
   * Get content type MIME type
   * @param {string} contentType - Content type
   * @returns {string} MIME type
   */
  getContentType(contentType) {
    const types = {
      video: 'video/mp4',
      audio: 'audio/mpeg',
      image: 'image/jpeg',
      document: 'application/octet-stream'
    };
    return types[contentType] || 'application/octet-stream';
  }

  /**
   * Warm up CDN cache for content
   * @param {Array<Object>} contents - Content objects to warm up
   * @returns {Promise<Object>} Warmup result
   */
  async warmupCache(contents) {
    const results = {
      total: contents.length,
      successful: 0,
      failed: 0,
      errors: []
    };

    for (const content of contents) {
      try {
        const result = await this.cdnService.addToCache(content);
        if (result.success) {
          results.successful++;
        } else {
          results.failed++;
          results.errors.push(`Failed to cache ${content.contentId}: ${result.reason}`);
        }
      } catch (error) {
        results.failed++;
        results.errors.push(`Error caching ${content.contentId}: ${error.message}`);
      }
    }

    return results;
  }

  /**
   * Get delivery statistics
   * @param {Date} startDate - Start date for statistics
   * @param {Date} endDate - End date for statistics
   * @returns {Promise<Object>} Delivery statistics
   */
  async getDeliveryStats(startDate, endDate) {
    try {
      const stats = {
        totalRequests: 0,
        cdnRequests: 0,
        directRequests: 0,
        cacheHits: 0,
        cacheMisses: 0,
        bytesServed: 0,
        avgResponseTime: 0,
        errorRate: 0
      };

      // Get cache entries with access stats
      const cacheEntries = await CdnCacheEntry.find({
        lastAccessed: { $gte: startDate, $lte: endDate }
      });

      for (const entry of cacheEntries) {
        stats.cdnRequests += entry.hitCount;
        stats.bytesServed += entry.bytesServed;

        // Calculate cache hit ratio (simplified)
        if (entry.hitCount > 0) {
          stats.cacheHits += entry.hitCount;
        }
      }

      // This would be enhanced with actual request logging
      stats.totalRequests = stats.cdnRequests; // Simplified
      stats.cacheMisses = Math.floor(stats.cdnRequests * 0.1); // Estimate

      return {
        success: true,
        stats,
        period: {
          start: startDate,
          end: endDate
        }
      };

    } catch (error) {
      console.error('Failed to get delivery stats:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle CDN cache purge for content updates
   * @param {Array<number>} contentIds - Content IDs that were updated
   * @returns {Promise<Object>} Purge result
   */
  async handleContentUpdate(contentIds) {
    if (!this.config.enabled) {
      return { success: true, message: 'CDN disabled, no purge needed' };
    }

    console.log(`Handling content update for ${contentIds.length} items`);

    const result = await this.cdnService.purgeContent(contentIds, 'content_update');

    if (result.success) {
      console.log(`Successfully purged ${result.purgedCount} items from CDN cache`);
    } else {
      console.error('Failed to purge CDN cache:', result.error);
    }

    return result;
  }

  /**
   * Check CDN availability and performance
   * @returns {Promise<Object>} CDN health status
   */
  async checkCdnHealth() {
    if (!this.config.enabled) {
      return { status: 'disabled', message: 'CDN is disabled' };
    }

    try {
      const healthResult = await this.cdnService.performHealthCheck();

      return {
        status: healthResult.status,
        responseTime: healthResult.responseTime,
        statusCode: healthResult.statusCode,
        error: healthResult.error,
        lastChecked: new Date()
      };

    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        lastChecked: new Date()
      };
    }
  }

  /**
   * Get optimal delivery method for content
   * @param {Object} content - Content object
   * @param {Object} clientInfo - Client information (region, connection, etc.)
   * @returns {Promise<string>} Optimal delivery method ('cdn' or 'direct')
   */
  async getOptimalDeliveryMethod(content, clientInfo = {}) {
    if (!this.config.enabled || !this.config.contentDelivery.enabled) {
      return 'direct';
    }

    // Check if content is cached in CDN
    const cdnUrl = await this.cdnService.getCdnUrl(content.contentId);
    if (!cdnUrl) {
      return 'direct';
    }

    // Check geographic optimization
    if (clientInfo.region && this.config.geo.regions.includes(clientInfo.region)) {
      return 'cdn';
    }

    // Check connection quality (prefer CDN for slower connections)
    if (clientInfo.connectionType === 'slow' || clientInfo.bandwidth < 1000000) { // Less than 1Mbps
      return 'cdn';
    }

    // Default to CDN if available
    return 'cdn';
  }
}

module.exports = new CdnDeliveryService();