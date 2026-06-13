'use strict';

/**
 * createPreviewIndexes.js (#198)
 * Ensures all MongoDB indexes needed by the content preview service are present.
 * Safe to call on every server start — createIndex is idempotent.
 */

const logger = require('../utils/logger');
const ContentPreview = require('../models/ContentPreview');

async function createPreviewIndexes() {
  try {
    const col = ContentPreview.collection;

    // Unique lookup by contentId (already declared in schema, but ensure it exists)
    await col.createIndex({ contentId: 1 }, { unique: true, background: true });

    // Sparse index for CID-based preview lookups (issue #198 public serve endpoint)
    await col.createIndex(
      { previewCid: 1 },
      { sparse: true, unique: true, background: true, name: 'previewCid_sparse_unique' }
    );

    // Index for creator dashboard queries
    await col.createIndex({ creator: 1, previewEnabled: 1 }, { background: true });

    // Index for content-type browsing with enabled filter
    await col.createIndex({ contentType: 1, previewEnabled: 1, totalViews: -1 }, { background: true });

    // Index for cleanup service: find previews that have a CID set
    await col.createIndex(
      { previewCid: 1, contentId: 1 },
      { sparse: true, background: true, name: 'previewCid_contentId' }
    );

    logger.info('Preview indexes created/verified');
  } catch (err) {
    logger.error('Failed to create preview indexes', { err });
    throw err;
  }
}

module.exports = { createPreviewIndexes };
