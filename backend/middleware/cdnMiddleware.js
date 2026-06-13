'use strict';

/**
 * CDN middleware (#197)
 *
 * Attaches to every content GET request.  Resolves the best delivery URL
 * (CDN cached → IPFS gateway fallback) and stores it in req.cdnResolution
 * so downstream handlers can use it without hitting the CDN service again.
 *
 * req.cdnResolution = { url: string, method: 'cdn'|'ipfs', cached: boolean }
 *
 * The middleware is non-blocking: if CDN resolution fails for any reason the
 * request continues to the normal handler.
 */

const cdnDeliveryService = require('../services/cdnDeliveryService');
const { cdnConfig } = require('../config/cdnConfig');
const logger = require('../utils/logger');

/**
 * Express middleware — attach CDN resolution result to req.cdnResolution.
 * content must have been loaded upstream (e.g. by a findOne) and placed on
 * req.content, or passed via the factory below.
 */
async function cdnResolutionMiddleware(req, res, next) {
  const content = req.content;

  if (!content) {
    return next(); // No content loaded yet, skip
  }

  if (!cdnConfig.enabled || !cdnConfig.contentDelivery.enabled) {
    req.cdnResolution = { url: null, method: 'ipfs', cached: false };
    return next();
  }

  try {
    const resolution = await cdnDeliveryService.resolveContentUrl(content);
    req.cdnResolution = {
      url: resolution.url,
      method: resolution.method,
      cached: resolution.method === 'cdn',
    };
  } catch (err) {
    logger.warn('CDN resolution failed, request will use direct delivery', {
      contentId: content.contentId,
      err,
    });
    req.cdnResolution = { url: null, method: 'ipfs', cached: false };
  }

  next();
}

/**
 * Factory — creates a middleware that loads content by contentId param,
 * runs CDN resolution, then continues.  Use on routes that do NOT already
 * load the Content document upstream.
 */
function withCdnResolution(Content) {
  return async function (req, res, next) {
    const contentId = parseInt(req.params.contentId, 10);
    if (isNaN(contentId)) return next();

    try {
      if (!req.content) {
        req.content = await Content.findOne({ contentId, isRemoved: false });
      }
    } catch (err) {
      logger.warn('CDN middleware: failed to load content', { contentId, err });
    }

    return cdnResolutionMiddleware(req, res, next);
  };
}

/**
 * Enrich a content API response with the resolved delivery URL.
 * Call inside route handlers after CDN resolution has run.
 *
 * @param {Object} contentDoc  Mongoose Content document (plain object or doc)
 * @param {Object} cdnResolution  req.cdnResolution
 * @returns {Object} enriched content response object
 */
function enrichContentResponse(contentDoc, cdnResolution) {
  const doc = contentDoc.toObject ? contentDoc.toObject() : { ...contentDoc };
  if (cdnResolution && cdnResolution.url) {
    doc.deliveryUrl  = cdnResolution.url;
    doc.deliveryMethod = cdnResolution.method;
  }
  return doc;
}

module.exports = { cdnResolutionMiddleware, withCdnResolution, enrichContentResponse };
