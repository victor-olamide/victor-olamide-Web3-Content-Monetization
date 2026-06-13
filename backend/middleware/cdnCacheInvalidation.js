'use strict';

/**
 * CDN cache invalidation middleware (#197)
 *
 * Registers a response hook that fires the CDN purge for a content item
 * after a mutating request (PUT / PATCH / DELETE) completes successfully.
 *
 * Usage (apply AFTER auth/ownership middleware, BEFORE the route handler):
 *   router.put('/:contentId', protect, requireCreator, invalidateCdnOnMutation, handler);
 */

const cdnDeliveryService = require('../services/cdnDeliveryService');
const { cdnConfig } = require('../config/cdnConfig');
const logger = require('../utils/logger');

/**
 * Express middleware — purges the CDN cache entry for req.params.contentId
 * after the response finishes with a success status (2xx).
 */
function invalidateCdnOnMutation(req, res, next) {
  if (!cdnConfig.enabled) return next();

  const contentId = parseInt(req.params.contentId, 10);
  if (isNaN(contentId)) return next();

  res.on('finish', () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      setImmediate(() => {
        cdnDeliveryService.handleContentUpdate([contentId]).catch((err) => {
          logger.warn('CDN invalidation failed post-mutation', { contentId, err });
        });
      });
    }
  });

  next();
}

module.exports = { invalidateCdnOnMutation };
