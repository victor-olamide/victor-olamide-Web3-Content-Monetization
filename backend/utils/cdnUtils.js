'use strict';

/**
 * CDN utility helpers (#197)
 *
 * Pure functions for URL resolution and cache-key generation, shared
 * between cdnService, cdnDeliveryService, and cdnMiddleware.
 */

const crypto = require('crypto');

/**
 * Generate a stable, deterministic cache key for a given contentId + contentType.
 * Uses a hash of the composite key (no timestamp) so the same content always
 * maps to the same cache entry.
 *
 * @param {number|string} contentId
 * @param {string} contentType
 * @returns {string} 16-char hex string
 */
function buildCacheKey(contentId, contentType) {
  return crypto
    .createHash('sha256')
    .update(`${contentId}:${contentType}`)
    .digest('hex')
    .substring(0, 16);
}

/**
 * Build a full CDN URL from a content path and the active CDN config.
 *
 * @param {string} contentPath   - e.g. 'content/42/abc123def456'
 * @param {Object} cdnCfg        - cdnConfig object
 * @param {Object} [opts]
 * @param {string} [opts.customDomain]
 * @returns {string|null}  null when CDN is disabled
 */
function buildCdnUrl(contentPath, cdnCfg, opts = {}) {
  if (!cdnCfg.enabled || !cdnCfg.contentDelivery.enabled) return null;

  const protocol = cdnCfg.urls.protocol;
  const domain   = opts.customDomain || cdnCfg.urls.primaryDomain;
  const port     = cdnCfg.urls.port !== '443' ? `:${cdnCfg.urls.port}` : '';
  const path     = contentPath.startsWith('/') ? contentPath.slice(1) : contentPath;

  return `${protocol}://${domain}${port}/${path}`;
}

/**
 * Compute TTL (in seconds) from a CdnCacheEntry document.
 * Returns 0 if the entry is expired or not active.
 *
 * @param {Object} entry  - CdnCacheEntry Mongoose document
 * @returns {number}
 */
function remainingTtl(entry) {
  if (!entry || entry.status !== 'cached' || !entry.expiresAt) return 0;
  const remaining = Math.floor((new Date(entry.expiresAt) - Date.now()) / 1000);
  return remaining > 0 ? remaining : 0;
}

/**
 * Returns true when a CdnCacheEntry is valid and not expired.
 * @param {Object} entry
 * @returns {boolean}
 */
function isCacheEntryValid(entry) {
  return !!(entry && entry.status === 'cached' && remainingTtl(entry) > 0);
}

/**
 * Map a Content contentType to the MIME type used in response headers.
 * @param {string} contentType
 * @returns {string}
 */
function contentTypeMime(contentType) {
  const map = {
    video:    'video/mp4',
    audio:    'audio/mpeg',
    image:    'image/jpeg',
    document: 'application/octet-stream',
    article:  'text/html',
    music:    'audio/mpeg',
  };
  return map[contentType] || 'application/octet-stream';
}

module.exports = { buildCacheKey, buildCdnUrl, remainingTtl, isCacheEntryValid, contentTypeMime };
