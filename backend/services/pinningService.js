/**
 * IPFS Pinning Service
 * Comprehensive pinning service with multi-provider support, redundancy, and lifecycle management
 */

const axios = require('axios');
const FormData = require('form-data');

// Pinning service providers
const PROVIDERS = {
  PINATA: 'pinata',
  INFURA: 'infura',
  WEB3_STORAGE: 'web3.storage',
  NFT_STORAGE: 'nft.storage',
  FILECOIN: 'filecoin'
};

// Provider configurations
const PROVIDER_CONFIGS = {
  [PROVIDERS.PINATA]: {
    apiUrl: 'https://api.pinata.cloud',
    gateway: 'https://gateway.pinata.cloud',
    authHeaders: (apiKey, secretKey) => ({
      'pinata_api_key': apiKey,
      'pinata_secret_api_key': secretKey
    }),
    uploadEndpoint: '/pinning/pinFileToIPFS',
    listEndpoint: '/data/pinList',
    unpinEndpoint: (hash) => `/pinning/unpin/${hash}`,
    usageEndpoint: '/data/userPinnedDataTotal'
  },
  [PROVIDERS.INFURA]: {
    apiUrl: 'https://ipfs.infura.io:5001',
    gateway: 'https://ipfs.infura.io',
    authHeaders: (projectId, projectSecret) => ({
      'Authorization': `Basic ${Buffer.from(`${projectId}:${projectSecret}`).toString('base64')}`
    }),
    uploadEndpoint: '/api/v0/add',
    listEndpoint: '/api/v0/pin/ls',
    unpinEndpoint: (hash) => `/api/v0/pin/rm?arg=${hash}`,
    usageEndpoint: '/api/v0/repo/stat'
  },
  [PROVIDERS.WEB3_STORAGE]: {
    apiUrl: 'https://api.web3.storage',
    gateway: 'https://w3s.link',
    authHeaders: (apiKey) => ({
      'Authorization': `Bearer ${apiKey}`,
      'X-API-KEY': apiKey
    }),
    uploadEndpoint: '/upload',
    listEndpoint: '/pins',
    unpinEndpoint: (hash) => `/pins/${hash}`,
    usageEndpoint: '/user/account'
  },
  [PROVIDERS.NFT_STORAGE]: {
    apiUrl: 'https://api.nft.storage',
    gateway: 'https://nftstorage.link',
    authHeaders: (apiKey) => ({
      'Authorization': `Bearer ${apiKey}`
    }),
    uploadEndpoint: '/upload',
    listEndpoint: '/pins',
    unpinEndpoint: (hash) => `/pins/${hash}`,
    usageEndpoint: '/user/account'
  }
};

// Pinning priorities and costs (lower number = higher priority)
const PROVIDER_PRIORITIES = {
  [PROVIDERS.PINATA]: 1, // Primary - reliable, good pricing
  [PROVIDERS.WEB3_STORAGE]: 2, // Secondary - good for large files
  [PROVIDERS.NFT_STORAGE]: 3, // Tertiary - good for NFTs
  [PROVIDERS.INFURA]: 4 // Fallback - basic functionality
};

// Configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;
const PINNING_TIMEOUT = 300000; // 5 minutes
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const HEALTH_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

class PinningService {
  constructor() {
    this.providers = this._loadProviderConfigs();
    this.healthStatus = new Map();
    this.lastHealthCheck = new Map();

    // Start health monitoring
    this._startHealthMonitoring();
  }

  /**
   * Load provider configurations from environment variables
   */
  _loadProviderConfigs() {
    const providers = {};

    // Pinata
    if (process.env.PINATA_API_KEY && process.env.PINATA_SECRET_API_KEY) {
      providers[PROVIDERS.PINATA] = {
        apiKey: process.env.PINATA_API_KEY,
        secretKey: process.env.PINATA_SECRET_API_KEY,
        enabled: true
      };
    }

    // Infura
    if (process.env.INFURA_PROJECT_ID && process.env.INFURA_PROJECT_SECRET) {
      providers[PROVIDERS.INFURA] = {
        projectId: process.env.INFURA_PROJECT_ID,
        projectSecret: process.env.INFURA_PROJECT_SECRET,
        enabled: true
      };
    }

    // Web3.Storage
    if (process.env.WEB3_STORAGE_API_KEY) {
      providers[PROVIDERS.WEB3_STORAGE] = {
        apiKey: process.env.WEB3_STORAGE_API_KEY,
        enabled: true
      };
    }

    // NFT.Storage
    if (process.env.NFT_STORAGE_API_KEY) {
      providers[PROVIDERS.NFT_STORAGE] = {
        apiKey: process.env.NFT_STORAGE_API_KEY,
        enabled: true
      };
    }

    return providers;
  }

  /**
   * Start health monitoring for all providers
   */
  _startHealthMonitoring() {
    setInterval(() => {
      this._checkProviderHealth();
    }, HEALTH_CHECK_INTERVAL);

    // Initial health check
    this._checkProviderHealth();
  }

  /**
   * Check health of all providers
   */
  async _checkProviderHealth() {
    const providers = Object.keys(this.providers);

    for (const provider of providers) {
      try {
        const isHealthy = await this._testProviderConnection(provider);
        this.healthStatus.set(provider, isHealthy);
        this.lastHealthCheck.set(provider, new Date());

        console.log(`[PinningService] ${provider} health: ${isHealthy ? '✅' : '❌'}`);
      } catch (error) {
        console.error(`[PinningService] Health check failed for ${provider}:`, error.message);
        this.healthStatus.set(provider, false);
      }
    }
  }

  /**
   * Test connection to a provider
   */
  async _testProviderConnection(provider) {
    try {
      const config = PROVIDER_CONFIGS[provider];
      const providerConfig = this.providers[provider];

      if (!providerConfig?.enabled) return false;

      const headers = this._getAuthHeaders(provider);
      const testUrl = `${config.apiUrl}${config.usageEndpoint}`;

      const response = await axios.get(testUrl, {
        headers,
        timeout: 10000
      });

      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get authentication headers for a provider
   */
  _getAuthHeaders(provider) {
    const config = PROVIDER_CONFIGS[provider];
    const providerConfig = this.providers[provider];

    switch (provider) {
      case PROVIDERS.PINATA:
        return config.authHeaders(providerConfig.apiKey, providerConfig.secretKey);
      case PROVIDERS.INFURA:
        return config.authHeaders(providerConfig.projectId, providerConfig.projectSecret);
      case PROVIDERS.WEB3_STORAGE:
      case PROVIDERS.NFT_STORAGE:
        return config.authHeaders(providerConfig.apiKey);
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  /**
   * Get healthy providers sorted by priority
   */
  _getHealthyProviders() {
    const healthyProviders = [];

    for (const [provider, isHealthy] of this.healthStatus) {
      if (isHealthy && this.providers[provider]?.enabled) {
        healthyProviders.push({
          name: provider,
          priority: PROVIDER_PRIORITIES[provider] || 999
        });
      }
    }

    return healthyProviders.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Upload file to IPFS with multi-provider redundancy
   * @param {Buffer} fileBuffer - File content
   * @param {string} fileName - File name
   * @param {Object} options - Upload options
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<Object>} Upload result with hash and provider info
   */
  async uploadFile(fileBuffer, fileName, options = {}, onProgress = null) {
    const {
      redundancy = 2, // Number of providers to pin to
      preferredProvider = null,
      metadata = {},
      tags = []
    } = options;

    if (fileBuffer.length > MAX_FILE_SIZE) {
      throw new Error(`File size ${fileBuffer.length} exceeds maximum ${MAX_FILE_SIZE}`);
    }

    const healthyProviders = this._getHealthyProviders();

    if (healthyProviders.length === 0) {
      throw new Error('No healthy pinning providers available');
    }

    const providersToUse = preferredProvider && healthyProviders.find(p => p.name === preferredProvider)
      ? [preferredProvider, ...healthyProviders.slice(0, redundancy - 1).map(p => p.name)]
      : healthyProviders.slice(0, redundancy).map(p => p.name);

    const results = [];
    const errors = [];

    for (const provider of providersToUse) {
      try {
        console.log(`[PinningService] Uploading to ${provider}...`);

        const result = await this._uploadToProvider(provider, fileBuffer, fileName, metadata, tags, onProgress);
        results.push({
          provider,
          hash: result.hash,
          url: result.url,
          timestamp: new Date(),
          size: fileBuffer.length
        });

        console.log(`[PinningService] ✅ Successfully pinned to ${provider}: ${result.hash}`);
      } catch (error) {
        console.error(`[PinningService] ❌ Failed to pin to ${provider}:`, error.message);
        errors.push({ provider, error: error.message });
      }
    }

    if (results.length === 0) {
      throw new Error(`Failed to pin file to any provider. Errors: ${JSON.stringify(errors)}`);
    }

    return {
      primaryHash: results[0].hash,
      primaryUrl: results[0].url,
      replicas: results,
      errors,
      redundancy: results.length
    };
  }

  /**
   * Upload to a specific provider
   */
  async _uploadToProvider(provider, fileBuffer, fileName, metadata, tags, onProgress) {
    const config = PROVIDER_CONFIGS[provider];
    const headers = this._getAuthHeaders(provider);

    let lastError = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const formData = new FormData();

        // Prepare form data based on provider
        switch (provider) {
          case PROVIDERS.PINATA:
            formData.append('file', fileBuffer, { filename: fileName });

            if (Object.keys(metadata).length > 0) {
              formData.append('pinataMetadata', JSON.stringify({
                name: fileName,
                keyvalues: { ...metadata, uploadedAt: new Date().toISOString() }
              }));
            }

            if (tags.length > 0) {
              formData.append('pinataOptions', JSON.stringify({
                cidVersion: 1,
                wrapWithDirectory: false
              }));
            }
            break;

          case PROVIDERS.WEB3_STORAGE:
          case PROVIDERS.NFT_STORAGE:
            formData.append('file', fileBuffer, { filename: fileName });
            break;

          case PROVIDERS.INFURA:
            // Infura uses multipart/form-data with different structure
            formData.append('file', fileBuffer, { filename: fileName });
            break;

          default:
            throw new Error(`Unsupported provider: ${provider}`);
        }

        const uploadConfig = {
          method: 'post',
          url: `${config.apiUrl}${config.uploadEndpoint}`,
          data: formData,
          headers: {
            ...headers,
            ...formData.getHeaders()
          },
          timeout: PINNING_TIMEOUT,
          maxContentLength: MAX_FILE_SIZE,
          maxBodyLength: MAX_FILE_SIZE
        };

        // Add progress tracking
        if (onProgress && typeof onProgress === 'function') {
          let uploadedBytes = 0;
          const totalBytes = fileBuffer.length;

          uploadConfig.onUploadProgress = (progressEvent) => {
            uploadedBytes = progressEvent.loaded;
            const percentComplete = Math.round((uploadedBytes / totalBytes) * 100);
            onProgress(percentComplete);
          };
        }

        const response = await axios(uploadConfig);

        // Extract hash based on provider response format
        let hash;
        switch (provider) {
          case PROVIDERS.PINATA:
            hash = response.data.IpfsHash;
            break;
          case PROVIDERS.WEB3_STORAGE:
          case PROVIDERS.NFT_STORAGE:
            hash = response.data.cid;
            break;
          case PROVIDERS.INFURA:
            hash = response.data.Hash;
            break;
          default:
            throw new Error(`Unknown response format for provider: ${provider}`);
        }

        if (!hash) {
          throw new Error(`Invalid response from ${provider}: missing hash`);
        }

        return {
          hash,
          url: `ipfs://${hash}`,
          gatewayUrl: `${config.gateway}/ipfs/${hash}`
        };

      } catch (error) {
        lastError = error;

        if (attempt < MAX_RETRIES) {
          const delay = RETRY_DELAY * Math.pow(2, attempt - 1);
          console.log(`[PinningService] Retrying ${provider} in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(`Failed to upload to ${provider} after ${MAX_RETRIES} attempts: ${lastError?.message}`);
  }

  /**
   * Pin an existing IPFS hash to multiple providers
   * @param {string} ipfsHash - IPFS hash to pin
   * @param {Object} options - Pinning options
   * @returns {Promise<Object>} Pinning result
   */
  async pinExistingHash(ipfsHash, options = {}) {
    const {
      redundancy = 2,
      providers = null
    } = options;

    const hash = ipfsHash.replace('ipfs://', '');
    const healthyProviders = this._getHealthyProviders();
    const providersToUse = providers || healthyProviders.slice(0, redundancy).map(p => p.name);

    const results = [];
    const errors = [];

    for (const provider of providersToUse) {
      try {
        console.log(`[PinningService] Pinning ${hash} to ${provider}...`);

        await this._pinToProvider(provider, hash);
        results.push({
          provider,
          hash,
          timestamp: new Date()
        });

        console.log(`[PinningService] ✅ Successfully pinned ${hash} to ${provider}`);
      } catch (error) {
        console.error(`[PinningService] ❌ Failed to pin ${hash} to ${provider}:`, error.message);
        errors.push({ provider, error: error.message });
      }
    }

    return {
      hash,
      pinned: results,
      errors,
      success: results.length > 0
    };
  }

  /**
   * Pin to a specific provider
   */
  async _pinToProvider(provider, hash) {
    const config = PROVIDER_CONFIGS[provider];
    const headers = this._getAuthHeaders(provider);

    // Different providers have different pinning APIs
    switch (provider) {
      case PROVIDERS.PINATA:
        await axios.post(`${config.apiUrl}/pinning/pinByHash`, {
          hashToPin: hash
        }, { headers });
        break;

      case PROVIDERS.INFURA:
        await axios.post(`${config.apiUrl}/api/v0/pin/add?arg=${hash}`, null, { headers });
        break;

      case PROVIDERS.WEB3_STORAGE:
      case PROVIDERS.NFT_STORAGE:
        // These services automatically pin on upload, so we just verify
        const response = await axios.get(`${config.apiUrl}/pins/${hash}`, { headers });
        if (response.status !== 200) {
          throw new Error(`Hash not found on ${provider}`);
        }
        break;

      default:
        throw new Error(`Pinning not supported for provider: ${provider}`);
    }
  }

  /**
   * Unpin from providers
   * @param {string} ipfsHash - IPFS hash to unpin
   * @param {Array} providers - Specific providers to unpin from (optional)
   * @returns {Promise<Object>} Unpinning result
   */
  async unpinHash(ipfsHash, providers = null) {
    const hash = ipfsHash.replace('ipfs://', '');
    const providersToCheck = providers || Object.keys(this.providers);

    const results = [];
    const errors = [];

    for (const provider of providersToCheck) {
      if (!this.providers[provider]?.enabled) continue;

      try {
        console.log(`[PinningService] Unpinning ${hash} from ${provider}...`);

        await this._unpinFromProvider(provider, hash);
        results.push({
          provider,
          hash,
          timestamp: new Date()
        });

        console.log(`[PinningService] ✅ Successfully unpinned ${hash} from ${provider}`);
      } catch (error) {
        console.error(`[PinningService] ❌ Failed to unpin ${hash} from ${provider}:`, error.message);
        errors.push({ provider, error: error.message });
      }
    }

    return {
      hash,
      unpinned: results,
      errors,
      success: results.length > 0
    };
  }

  /**
   * Unpin from a specific provider
   */
  async _unpinFromProvider(provider, hash) {
    const config = PROVIDER_CONFIGS[provider];
    const headers = this._getAuthHeaders(provider);

    try {
      const unpinUrl = typeof config.unpinEndpoint === 'function'
        ? config.unpinEndpoint(hash)
        : config.unpinEndpoint;

      await axios.delete(`${config.apiUrl}${unpinUrl}`, { headers });
    } catch (error) {
      // Some providers return 404 if already unpinned, which is OK
      if (error.response?.status !== 404) {
        throw error;
      }
    }
  }

  /**
   * Check pinning status across providers
   * @param {string} ipfsHash - IPFS hash to check
   * @returns {Promise<Object>} Pinning status
   */
  async checkPinningStatus(ipfsHash) {
    const hash = ipfsHash.replace('ipfs://', '');
    const providers = Object.keys(this.providers);
    const status = {};

    for (const provider of providers) {
      if (!this.providers[provider]?.enabled) continue;

      try {
        const isPinned = await this._checkProviderPinning(provider, hash);
        status[provider] = {
          pinned: isPinned,
          healthy: this.healthStatus.get(provider) || false,
          lastChecked: new Date()
        };
      } catch (error) {
        status[provider] = {
          pinned: false,
          healthy: false,
          error: error.message,
          lastChecked: new Date()
        };
      }
    }

    const pinnedCount = Object.values(status).filter(s => s.pinned).length;
    const healthyCount = Object.values(status).filter(s => s.healthy).length;

    return {
      hash,
      status,
      summary: {
        totalProviders: providers.length,
        pinnedCount,
        healthyCount,
        redundancyLevel: pinnedCount,
        isWellPinned: pinnedCount >= 2 // At least 2 providers
      }
    };
  }

  /**
   * Check if hash is pinned on a specific provider
   */
  async _checkProviderPinning(provider, hash) {
    const config = PROVIDER_CONFIGS[provider];
    const headers = this._getAuthHeaders(provider);

    try {
      let response;

      switch (provider) {
        case PROVIDERS.PINATA:
          response = await axios.get(`${config.apiUrl}${config.listEndpoint}`, {
            headers,
            params: { hashContains: hash }
          });
          return response.data.rows && response.data.rows.length > 0;

        case PROVIDERS.INFURA:
          response = await axios.post(`${config.apiUrl}/api/v0/pin/ls?arg=${hash}`, null, { headers });
          return response.data.Pins && response.data.Pins.length > 0;

        case PROVIDERS.WEB3_STORAGE:
        case PROVIDERS.NFT_STORAGE:
          response = await axios.get(`${config.apiUrl}/pins/${hash}`, { headers });
          return response.status === 200;

        default:
          return false;
      }
    } catch (error) {
      if (error.response?.status === 404) {
        return false; // Not pinned
      }
      throw error;
    }
  }

  /**
   * Get storage usage across providers
   * @returns {Promise<Object>} Usage statistics
   */
  async getStorageUsage() {
    const providers = Object.keys(this.providers);
    const usage = {};

    for (const provider of providers) {
      if (!this.providers[provider]?.enabled) continue;

      try {
        const providerUsage = await this._getProviderUsage(provider);
        usage[provider] = {
          ...providerUsage,
          lastChecked: new Date()
        };
      } catch (error) {
        usage[provider] = {
          error: error.message,
          lastChecked: new Date()
        };
      }
    }

    return {
      providers: usage,
      summary: this._calculateUsageSummary(usage)
    };
  }

  /**
   * Get usage for a specific provider
   */
  async _getProviderUsage(provider) {
    const config = PROVIDER_CONFIGS[provider];
    const headers = this._getAuthHeaders(provider);

    const response = await axios.get(`${config.apiUrl}${config.usageEndpoint}`, { headers });

    switch (provider) {
      case PROVIDERS.PINATA:
        return {
          bytesUsed: response.data.pin_count || 0,
          filesCount: response.data.pin_count || 0
        };

      case PROVIDERS.WEB3_STORAGE:
      case PROVIDERS.NFT_STORAGE:
        return {
          bytesUsed: response.data.usedStorage?.bytes || 0,
          filesCount: response.data.usedStorage?.files || 0
        };

      case PROVIDERS.INFURA:
        return {
          bytesUsed: response.data.RepoSize || 0,
          filesCount: response.data.NumObjects || 0
        };

      default:
        return { bytesUsed: 0, filesCount: 0 };
    }
  }

  /**
   * Calculate usage summary
   */
  _calculateUsageSummary(usage) {
    const totalBytes = Object.values(usage)
      .filter(u => !u.error)
      .reduce((sum, u) => sum + (u.bytesUsed || 0), 0);

    const totalFiles = Object.values(usage)
      .filter(u => !u.error)
      .reduce((sum, u) => sum + (u.filesCount || 0), 0);

    return {
      totalBytes,
      totalFiles,
      totalGB: Math.round(totalBytes / (1024 * 1024 * 1024) * 100) / 100
    };
  }

  /**
   * Get service health status
   * @returns {Object} Health status
   */
  getHealthStatus() {
    const providers = Object.keys(this.providers);
    const status = {};

    for (const provider of providers) {
      status[provider] = {
        enabled: this.providers[provider]?.enabled || false,
        healthy: this.healthStatus.get(provider) || false,
        lastHealthCheck: this.lastHealthCheck.get(provider) || null,
        priority: PROVIDER_PRIORITIES[provider] || 999
      };
    }

    const healthyCount = Object.values(status).filter(s => s.healthy).length;
    const enabledCount = Object.values(status).filter(s => s.enabled).length;

    return {
      providers: status,
      summary: {
        totalProviders: providers.length,
        enabledProviders: enabledCount,
        healthyProviders: healthyCount,
        serviceHealthy: healthyCount > 0
      }
    };
  }
}

// Export singleton instance
const pinningService = new PinningService();

module.exports = {
  PinningService,
  pinningService,
  PROVIDERS
};