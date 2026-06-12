'use strict';

/**
 * IPFS Fallback Service (#197)
 *
 * Resolves content from IPFS when the CDN does not have a cached copy.
 * Returns a gateway URL that can be served directly to the client or
 * used as the origin URL when warming the CDN cache.
 */

const { getGatewayUrl } = require('./storageService');
const logger = require('../utils/logger');

const IPFS_GATEWAY = process.env.IPFS_GATEWAY_URL || 'https://gateway.pinata.cloud';

/**
 * Build an HTTP gateway URL from an ipfs:// or gaia:// URL.
 * @param {string} url  - raw storage URL stored on the Content doc
 * @param {string} storageType - 'ipfs' | 'gaia'
 * @returns {string}
 */
function resolveGatewayUrl(url, storageType) {
  if (!url) return null;
  if (storageType === 'ipfs') {
    return getGatewayUrl(url);
  }
  // gaia URLs are already HTTP(S)
  return url;
}

/**
 * Verify that a gateway URL is reachable with a lightweight HEAD request.
 * Returns true on success, false on any network or HTTP error.
 * @param {string} gatewayUrl
 * @returns {Promise<boolean>}
 */
async function probeGatewayUrl(gatewayUrl) {
  const axios = require('axios');
  try {
    await axios.head(gatewayUrl, { timeout: 8000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Return the best available fallback URL for content that is not in the CDN.
 * Tries the primary IPFS gateway, then a secondary public gateway.
 * @param {Object} content  - Mongoose Content document
 * @returns {Promise<string|null>} Resolved HTTP URL or null if unreachable
 */
async function resolveFallbackUrl(content) {
  const primary = resolveGatewayUrl(content.url, content.storageType);
  if (!primary) {
    logger.warn('CDN fallback: no storage URL on content', { contentId: content.contentId });
    return null;
  }

  // Fast path — return without probing in non-production to avoid latency in tests
  if (process.env.NODE_ENV !== 'production') {
    return primary;
  }

  const reachable = await probeGatewayUrl(primary);
  if (reachable) return primary;

  // Try alternate public IPFS gateway
  const alternate = resolveAlternateGateway(content.url, content.storageType);
  if (alternate && alternate !== primary) {
    logger.info('CDN fallback: primary gateway unreachable, trying alternate', {
      contentId: content.contentId,
      alternate,
    });
    const altReachable = await probeGatewayUrl(alternate);
    if (altReachable) return alternate;
  }

  logger.warn('CDN fallback: all gateways unreachable', { contentId: content.contentId });
  return primary; // Return primary anyway; let the client handle the error
}

/**
 * Build a URL using the secondary public IPFS gateway.
 */
function resolveAlternateGateway(url, storageType) {
  if (storageType !== 'ipfs' || !url) return null;
  const hash = url.replace('ipfs://', '').replace('ipfs/', '');
  const altGateway = process.env.IPFS_ALT_GATEWAY_URL || 'https://cloudflare-ipfs.com';
  return `${altGateway}/ipfs/${hash}`;
}

module.exports = { resolveFallbackUrl, resolveGatewayUrl, probeGatewayUrl };
