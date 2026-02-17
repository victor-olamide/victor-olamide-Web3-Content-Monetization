const axios = require('axios');
const crypto = require('crypto');
const { cdnConfig, getProviderConfig, getContentTypeConfig, generateCdnUrl } = require('../config/cdnConfig');
const { CdnCacheEntry, CdnPurgeRequest, CdnAnalytics, CdnHealthCheck } = require('../models/CdnCache');

/**
 * CDN Service - Manages Content Delivery Network operations
 * Supports multiple CDN providers: Cloudflare, CloudFront, Fastly, Akamai
 */

class CdnService {
  constructor() {
    this.config = cdnConfig;
    this.providerConfig = getProviderConfig();
    this.httpClient = this.createHttpClient();
  }

  /**
   * Create HTTP client with CDN provider configuration
   * @returns {Object} Axios instance
   */
  createHttpClient() {
    const config = {
      timeout: this.config.performance.connectionTimeout,
      headers: {
        'User-Agent': 'Web3-Platform-CDN-Service/1.0'
      }
    };

    // Add provider-specific headers
    switch (this.config.provider) {
      case 'cloudflare':
        config.headers['Authorization'] = `Bearer ${this.providerConfig.apiToken}`;
        break;
      case 'cloudfront':
        // AWS SDK will handle authentication
        break;
      case 'fastly':
        config.headers['Fastly-Key'] = this.providerConfig.apiKey;
        break;
      case 'akamai':
        config.headers['Authorization'] = `Bearer ${this.providerConfig.accessToken}`;
        break;
    }

    return axios.create(config);
  }

  /**
   * Generate cache key for content
   * @param {number} contentId - Content ID
   * @param {string} contentType - Content type
   * @returns {string} Cache key
   */
  generateCacheKey(contentId, contentType) {
    const data = `${contentId}:${contentType}:${Date.now()}`;
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
  }

  /**
   * Add content to CDN cache
   * @param {Object} content - Content object
   * @returns {Promise<Object>} Cache entry result
   */
  async addToCache(content) {
    try {
      if (!this.config.enabled || !this.config.contentDelivery.enabled) {
        return { success: false, reason: 'CDN disabled' };
      }

      const cacheKey = this.generateCacheKey(content.contentId, content.contentType);
      const cdnUrl = generateCdnUrl(`content/${content.contentId}/${cacheKey}`);

      if (!cdnUrl) {
        return { success: false, reason: 'CDN URL generation failed' };
      }

      // Create cache entry
      const cacheEntry = new CdnCacheEntry({
        contentId: content.contentId,
        contentType: content.contentType,
        storageType: content.storageType,
        originalUrl: content.url,
        cdnUrl,
        cacheKey,
        provider: this.config.provider,
        status: 'pending',
        regions: this.config.geo.regions
      });

      await cacheEntry.save();

      // Prefetch content to CDN if enabled
      if (this.config.performance.prefetchEnabled) {
        setImmediate(() => this.prefetchContent(cacheEntry));
      }

      return {
        success: true,
        cacheKey,
        cdnUrl,
        cacheEntry
      };

    } catch (error) {
      console.error('Failed to add content to CDN cache:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Prefetch content to CDN
   * @param {Object} cacheEntry - Cache entry
   */
  async prefetchContent(cacheEntry) {
    try {
      // This would implement provider-specific prefetch logic
      // For now, we'll mark as cached (assuming CDN will fetch on first request)
      cacheEntry.status = 'cached';
      cacheEntry.cachedAt = new Date();

      const contentTypeConfig = getContentTypeConfig(cacheEntry.contentType);
      cacheEntry.expiresAt = new Date(Date.now() + (contentTypeConfig.cacheTtl * 1000));

      await cacheEntry.save();

      console.log(`Content ${cacheEntry.contentId} prefetched to CDN cache`);
    } catch (error) {
      console.error(`Failed to prefetch content ${cacheEntry.contentId}:`, error);
      cacheEntry.status = 'failed';
      await cacheEntry.save();
    }
  }

  /**
   * Get CDN URL for content
   * @param {number} contentId - Content ID
   * @returns {Promise<string|null>} CDN URL or null if not cached
   */
  async getCdnUrl(contentId) {
    if (!this.config.enabled || !this.config.contentDelivery.enabled) {
      return null;
    }

    try {
      const cacheEntry = await CdnCacheEntry.findByContentId(contentId);

      if (cacheEntry && cacheEntry.status === 'cached' && cacheEntry.expiresAt > new Date()) {
        return cacheEntry.cdnUrl;
      }

      return null;
    } catch (error) {
      console.error('Failed to get CDN URL:', error);
      return null;
    }
  }

  /**
   * Purge content from CDN cache
   * @param {Array<number>} contentIds - Content IDs to purge
   * @param {string} reason - Purge reason
   * @returns {Promise<Object>} Purge result
   */
  async purgeContent(contentIds, reason = 'manual') {
    try {
      const purgeId = `purge_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

      // Find cache entries for content IDs
      const cacheEntries = await CdnCacheEntry.find({
        contentId: { $in: contentIds },
        status: 'cached'
      });

      if (cacheEntries.length === 0) {
        return { success: true, message: 'No cached content found to purge' };
      }

      // Create purge request
      const purgeRequest = new CdnPurgeRequest({
        purgeId,
        type: contentIds.length === 1 ? 'single' : 'batch',
        urls: cacheEntries.map(entry => entry.cdnUrl),
        cacheKeys: cacheEntries.map(entry => entry.cacheKey),
        reason,
        contentIds,
        provider: this.config.provider,
        status: 'processing',
        startedAt: new Date()
      });

      await purgeRequest.save();

      // Execute purge based on provider
      const result = await this.executePurge(purgeRequest);

      // Update purge request
      purgeRequest.status = result.success ? 'completed' : 'failed';
      purgeRequest.completedAt = new Date();
      purgeRequest.duration = purgeRequest.completedAt - purgeRequest.startedAt;
      purgeRequest.successCount = result.successCount || 0;
      purgeRequest.failureCount = result.failureCount || 0;
      purgeRequest.errors = result.errors || [];
      purgeRequest.providerResponse = result.providerResponse;

      await purgeRequest.save();

      // Update cache entries
      if (result.success) {
        await CdnCacheEntry.updateMany(
          { contentId: { $in: contentIds } },
          { status: 'purged', updatedAt: new Date() }
        );
      }

      return {
        success: result.success,
        purgeId,
        purgedCount: result.successCount || 0,
        message: result.message
      };

    } catch (error) {
      console.error('Failed to purge CDN content:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Execute purge operation for specific provider
   * @param {Object} purgeRequest - Purge request
   * @returns {Promise<Object>} Purge execution result
   */
  async executePurge(purgeRequest) {
    switch (this.config.provider) {
      case 'cloudflare':
        return await this.purgeCloudflare(purgeRequest);
      case 'cloudfront':
        return await this.purgeCloudFront(purgeRequest);
      case 'fastly':
        return await this.purgeFastly(purgeRequest);
      case 'akamai':
        return await this.purgeAkamai(purgeRequest);
      default:
        return { success: false, error: `Unsupported provider: ${this.config.provider}` };
    }
  }

  /**
   * Purge content from Cloudflare CDN
   * @param {Object} purgeRequest - Purge request
   * @returns {Promise<Object>} Purge result
   */
  async purgeCloudflare(purgeRequest) {
    try {
      const batches = this.chunkArray(purgeRequest.urls, this.providerConfig.purgeBatchSize);
      let successCount = 0;
      let failureCount = 0;
      const errors = [];

      for (const batch of batches) {
        try {
          const response = await this.httpClient.post(
            `${this.providerConfig.baseUrl}/zones/${this.providerConfig.zoneId}/purge_cache`,
            {
              files: batch
            }
          );

          if (response.data.success) {
            successCount += batch.length;
          } else {
            failureCount += batch.length;
            errors.push(`Batch purge failed: ${response.data.errors.join(', ')}`);
          }

          // Rate limiting delay
          await this.delay(this.providerConfig.rateLimitDelay);

        } catch (error) {
          failureCount += batch.length;
          errors.push(`Batch purge error: ${error.message}`);
        }
      }

      return {
        success: successCount > 0,
        successCount,
        failureCount,
        errors,
        providerResponse: { successCount, failureCount }
      };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Purge content from AWS CloudFront
   * @param {Object} purgeRequest - Purge request
   * @returns {Promise<Object>} Purge result
   */
  async purgeCloudFront(purgeRequest) {
    try {
      const AWS = require('aws-sdk');
      const cloudfront = new AWS.CloudFront({
        accessKeyId: this.providerConfig.accessKeyId,
        secretAccessKey: this.providerConfig.secretAccessKey,
        region: this.providerConfig.region
      });

      const params = {
        DistributionId: this.providerConfig.distributionId,
        InvalidationBatch: {
          CallerReference: purgeRequest.purgeId,
          Paths: {
            Quantity: purgeRequest.urls.length,
            Items: purgeRequest.urls.map(url => {
              // Convert full URL to path
              const urlObj = new URL(url);
              return urlObj.pathname;
            })
          }
        }
      };

      const result = await cloudfront.createInvalidation(params).promise();

      return {
        success: true,
        successCount: purgeRequest.urls.length,
        failureCount: 0,
        providerResponse: result
      };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Purge content from Fastly CDN
   * @param {Object} purgeRequest - Purge request
   * @returns {Promise<Object>} Purge result
   */
  async purgeFastly(purgeRequest) {
    try {
      let successCount = 0;
      let failureCount = 0;
      const errors = [];

      for (const url of purgeRequest.urls) {
        try {
          const response = await this.httpClient.post(
            `${this.providerConfig.baseUrl}/service/${this.providerConfig.serviceId}/purge`,
            { url }
          );

          if (response.status === 200) {
            successCount++;
          } else {
            failureCount++;
            errors.push(`Failed to purge ${url}: ${response.statusText}`);
          }

        } catch (error) {
          failureCount++;
          errors.push(`Error purging ${url}: ${error.message}`);
        }
      }

      return {
        success: successCount > 0,
        successCount,
        failureCount,
        errors,
        providerResponse: { successCount, failureCount }
      };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Purge content from Akamai CDN
   * @param {Object} purgeRequest - Purge request
   * @returns {Promise<Object>} Purge result
   */
  async purgeAkamai(purgeRequest) {
    try {
      const response = await this.httpClient.post(
        `${this.providerConfig.baseUrl}/ccu/v3/invalidate/url`,
        {
          objects: purgeRequest.urls
        }
      );

      const successCount = response.data.httpStatus === 201 ? purgeRequest.urls.length : 0;
      const failureCount = purgeRequest.urls.length - successCount;

      return {
        success: successCount > 0,
        successCount,
        failureCount,
        providerResponse: response.data
      };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get CDN analytics data
   * @param {string} period - Time period ('hourly', 'daily', 'weekly', 'monthly')
   * @param {Date} startTime - Start time
   * @param {Date} endTime - End time
   * @returns {Promise<Object>} Analytics data
   */
  async getAnalytics(period = 'daily', startTime, endTime) {
    try {
      const analyticsId = `analytics_${this.config.provider}_${period}_${Date.now()}`;

      // This would implement provider-specific analytics fetching
      // For now, return mock data structure
      const analytics = new CdnAnalytics({
        analyticsId,
        provider: this.config.provider,
        period,
        startTime: startTime || new Date(Date.now() - 24 * 60 * 60 * 1000),
        endTime: endTime || new Date(),
        requests: 0,
        bytesServed: 0,
        cacheHits: 0,
        cacheMisses: 0
      });

      await analytics.save();

      return {
        success: true,
        analyticsId,
        data: analytics
      };

    } catch (error) {
      console.error('Failed to get CDN analytics:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Perform CDN health check
   * @returns {Promise<Object>} Health check result
   */
  async performHealthCheck() {
    try {
      const checkId = `health_${this.config.provider}_${Date.now()}`;
      const endpoint = `https://${this.config.urls.primaryDomain}`;

      const startTime = Date.now();
      let responseTime;
      let statusCode;
      let error;

      try {
        const response = await axios.get(endpoint, {
          timeout: 10000,
          validateStatus: () => true // Accept any status code
        });

        responseTime = Date.now() - startTime;
        statusCode = response.status;

      } catch (err) {
        responseTime = Date.now() - startTime;
        error = err.message;
        statusCode = 0;
      }

      // Determine health status
      let status = 'unknown';
      if (statusCode >= 200 && statusCode < 400 && responseTime < 5000) {
        status = 'healthy';
      } else if (statusCode >= 400 && statusCode < 600) {
        status = 'degraded';
      } else {
        status = 'unhealthy';
      }

      const healthCheck = new CdnHealthCheck({
        checkId,
        provider: this.config.provider,
        endpoint,
        status,
        responseTime,
        statusCode,
        error,
        checkedAt: new Date()
      });

      await healthCheck.save();

      return {
        success: true,
        checkId,
        status,
        responseTime,
        statusCode,
        error
      };

    } catch (error) {
      console.error('Failed to perform CDN health check:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Utility function to chunk arrays
   * @param {Array} array - Array to chunk
   * @param {number} size - Chunk size
   * @returns {Array} Chunked arrays
   */
  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Utility function for delays
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise} Delay promise
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new CdnService();