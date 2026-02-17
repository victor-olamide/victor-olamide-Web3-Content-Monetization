/**
 * CDN (Content Delivery Network) configuration
 * Supports multiple CDN providers for global content delivery
 */

const cdnConfig = {
  // General CDN settings
  enabled: process.env.CDN_ENABLED === 'true' || false,
  provider: process.env.CDN_PROVIDER || 'cloudflare', // 'cloudflare', 'cloudfront', 'fastly', 'akamai'

  // Content delivery settings
  contentDelivery: {
    enabled: process.env.CDN_CONTENT_DELIVERY_ENABLED === 'true' || false,
    cacheTtl: parseInt(process.env.CDN_CACHE_TTL) || 86400, // 24 hours default
    staleWhileRevalidate: parseInt(process.env.CDN_STALE_WHILE_REVALIDATE) || 3600, // 1 hour
    cacheControl: process.env.CDN_CACHE_CONTROL || 'public, max-age=86400, s-maxage=86400',
    corsEnabled: process.env.CDN_CORS_ENABLED !== 'false', // Enabled by default
    compressionEnabled: process.env.CDN_COMPRESSION_ENABLED !== 'false', // Enabled by default
  },

  // CDN providers configuration
  providers: {
    cloudflare: {
      apiToken: process.env.CLOUDFLARE_API_TOKEN,
      zoneId: process.env.CLOUDFLARE_ZONE_ID,
      accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
      baseUrl: 'https://api.cloudflare.com/client/v4',
      purgeBatchSize: parseInt(process.env.CLOUDFLARE_PURGE_BATCH_SIZE) || 30,
      rateLimitDelay: parseInt(process.env.CLOUDFLARE_RATE_LIMIT_DELAY) || 1000, // 1 second
    },

    cloudfront: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      distributionId: process.env.CLOUDFRONT_DISTRIBUTION_ID,
      region: process.env.AWS_REGION || 'us-east-1',
      baseUrl: 'https://cloudfront.amazonaws.com/2020-05-31',
      purgeBatchSize: parseInt(process.env.CLOUDFRONT_PURGE_BATCH_SIZE) || 1000,
      priceClass: process.env.CLOUDFRONT_PRICE_CLASS || 'PriceClass_100', // Use only US, Canada, Europe
    },

    fastly: {
      apiKey: process.env.FASTLY_API_KEY,
      serviceId: process.env.FASTLY_SERVICE_ID,
      baseUrl: 'https://api.fastly.com',
      purgeBatchSize: parseInt(process.env.FASTLY_PURGE_BATCH_SIZE) || 100,
    },

    akamai: {
      clientToken: process.env.AKAMAI_CLIENT_TOKEN,
      clientSecret: process.env.AKAMAI_CLIENT_SECRET,
      accessToken: process.env.AKAMAI_ACCESS_TOKEN,
      host: process.env.AKAMAI_HOST,
      baseUrl: 'https://akab-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX.luna.akamaiapis.net',
      purgeBatchSize: parseInt(process.env.AKAMAI_PURGE_BATCH_SIZE) || 100,
    }
  },

  // CDN URLs and domains
  urls: {
    primaryDomain: process.env.CDN_PRIMARY_DOMAIN || 'cdn.yourplatform.com',
    fallbackDomain: process.env.CDN_FALLBACK_DOMAIN,
    customDomains: (process.env.CDN_CUSTOM_DOMAINS || '').split(',').filter(Boolean),
    protocol: process.env.CDN_PROTOCOL || 'https',
    port: process.env.CDN_PORT || '443',
  },

  // Security settings
  security: {
    enableHttps: process.env.CDN_HTTPS_ENABLED !== 'false',
    hstsEnabled: process.env.CDN_HSTS_ENABLED === 'true' || false,
    corsOrigins: (process.env.CDN_CORS_ORIGINS || '*').split(',').map(origin => origin.trim()),
    rateLimitEnabled: process.env.CDN_RATE_LIMIT_ENABLED === 'true' || false,
    rateLimitRequests: parseInt(process.env.CDN_RATE_LIMIT_REQUESTS) || 1000,
    rateLimitWindow: parseInt(process.env.CDN_RATE_LIMIT_WINDOW) || 60, // seconds
  },

  // Analytics and monitoring
  analytics: {
    enabled: process.env.CDN_ANALYTICS_ENABLED === 'true' || false,
    logRequests: process.env.CDN_LOG_REQUESTS === 'true' || false,
    metricsInterval: parseInt(process.env.CDN_METRICS_INTERVAL) || 300, // 5 minutes
    retentionDays: parseInt(process.env.CDN_ANALYTICS_RETENTION_DAYS) || 30,
  },

  // Performance settings
  performance: {
    prefetchEnabled: process.env.CDN_PREFETCH_ENABLED === 'true' || false,
    prefetchBatchSize: parseInt(process.env.CDN_PREFETCH_BATCH_SIZE) || 10,
    connectionTimeout: parseInt(process.env.CDN_CONNECTION_TIMEOUT) || 10000, // 10 seconds
    retryAttempts: parseInt(process.env.CDN_RETRY_ATTEMPTS) || 3,
    retryDelay: parseInt(process.env.CDN_RETRY_DELAY) || 1000, // 1 second
  },

  // Content types and caching rules
  contentTypes: {
    video: {
      cacheTtl: parseInt(process.env.CDN_VIDEO_CACHE_TTL) || 604800, // 7 days
      compression: true,
      streaming: true,
    },
    audio: {
      cacheTtl: parseInt(process.env.CDN_AUDIO_CACHE_TTL) || 604800, // 7 days
      compression: true,
      streaming: true,
    },
    image: {
      cacheTtl: parseInt(process.env.CDN_IMAGE_CACHE_TTL) || 2592000, // 30 days
      compression: true,
      streaming: false,
    },
    document: {
      cacheTtl: parseInt(process.env.CDN_DOCUMENT_CACHE_TTL) || 86400, // 24 hours
      compression: true,
      streaming: false,
    },
  },

  // Geographic settings
  geo: {
    regions: (process.env.CDN_REGIONS || 'us-east-1,eu-west-1,ap-southeast-1').split(','),
    defaultRegion: process.env.CDN_DEFAULT_REGION || 'us-east-1',
    geoBlocking: {
      enabled: process.env.CDN_GEO_BLOCKING_ENABLED === 'true' || false,
      allowedCountries: (process.env.CDN_ALLOWED_COUNTRIES || '').split(',').filter(Boolean),
      blockedCountries: (process.env.CDN_BLOCKED_COUNTRIES || '').split(',').filter(Boolean),
    },
  },
};

/**
 * Get current CDN provider configuration
 * @returns {Object} Provider configuration
 */
function getProviderConfig() {
  const provider = cdnConfig.provider;
  if (!cdnConfig.providers[provider]) {
    throw new Error(`Unsupported CDN provider: ${provider}`);
  }
  return cdnConfig.providers[provider];
}

/**
 * Get content type specific configuration
 * @param {string} contentType - Content type (video, audio, image, document)
 * @returns {Object} Content type configuration
 */
function getContentTypeConfig(contentType) {
  return cdnConfig.contentTypes[contentType] || cdnConfig.contentTypes.document;
}

/**
 * Generate CDN URL for content
 * @param {string} contentPath - Content path or identifier
 * @param {Object} options - URL generation options
 * @returns {string} CDN URL
 */
function generateCdnUrl(contentPath, options = {}) {
  if (!cdnConfig.enabled || !cdnConfig.contentDelivery.enabled) {
    return null; // Fallback to direct delivery
  }

  const protocol = cdnConfig.urls.protocol;
  const domain = options.customDomain || cdnConfig.urls.primaryDomain;
  const port = cdnConfig.urls.port !== '443' ? `:${cdnConfig.urls.port}` : '';

  // Remove leading slash if present
  const path = contentPath.startsWith('/') ? contentPath.slice(1) : contentPath;

  return `${protocol}://${domain}${port}/${path}`;
}

/**
 * Validate CDN configuration
 * @returns {Object} Validation result with success and errors
 */
function validateCdnConfig() {
  const errors = [];

  if (!cdnConfig.enabled) {
    return { success: true, errors: [] }; // CDN disabled, no validation needed
  }

  // Validate provider configuration
  const providerConfig = getProviderConfig();
  const requiredFields = {
    cloudflare: ['apiToken', 'zoneId'],
    cloudfront: ['accessKeyId', 'secretAccessKey', 'distributionId'],
    fastly: ['apiKey', 'serviceId'],
    akamai: ['clientToken', 'clientSecret', 'accessToken', 'host'],
  };

  const required = requiredFields[cdnConfig.provider] || [];
  for (const field of required) {
    if (!providerConfig[field]) {
      errors.push(`Missing required ${cdnConfig.provider} configuration: ${field}`);
    }
  }

  // Validate URLs
  if (!cdnConfig.urls.primaryDomain) {
    errors.push('CDN primary domain is required when CDN is enabled');
  }

  // Validate security settings
  if (cdnConfig.security.rateLimitEnabled) {
    if (cdnConfig.security.rateLimitRequests <= 0) {
      errors.push('Rate limit requests must be positive when rate limiting is enabled');
    }
    if (cdnConfig.security.rateLimitWindow <= 0) {
      errors.push('Rate limit window must be positive when rate limiting is enabled');
    }
  }

  return {
    success: errors.length === 0,
    errors
  };
}

module.exports = {
  cdnConfig,
  getProviderConfig,
  getContentTypeConfig,
  generateCdnUrl,
  validateCdnConfig
};