'use strict';

/**
 * Preview Cleanup Service (#198)
 * Identifies ContentPreview records whose parent Content has been deleted and
 * unpins the orphaned preview CID from IPFS to avoid storage waste.
 */

const logger = require('../utils/logger');
const ContentPreview = require('../models/ContentPreview');
const Content = require('../models/Content');
const { unpinFile } = require('./ipfsService');

class PreviewCleanupService {
  /**
   * Find ContentPreview records with no matching Content document
   * and collect their preview CIDs.
   * @returns {Promise<Array<{contentId: number, previewCid: string}>>}
   */
  async findOrphanedPreviews() {
    const previews = await ContentPreview.find(
      { previewCid: { $exists: true, $ne: null } },
      'contentId previewCid'
    ).lean();

    const orphaned = [];
    for (const preview of previews) {
      const exists = await Content.exists({ contentId: preview.contentId });
      if (!exists) {
        orphaned.push({ contentId: preview.contentId, previewCid: preview.previewCid });
      }
    }
    return orphaned;
  }

  /**
   * Unpin a single preview CID from IPFS and delete the ContentPreview record.
   * @param {number} contentId
   * @param {string} previewCid  raw CID (no ipfs:// prefix)
   * @returns {Promise<void>}
   */
  async cleanupOrphan(contentId, previewCid) {
    try {
      await unpinFile(`ipfs://${previewCid}`);
      logger.info('Unpinned orphaned preview CID', { contentId, previewCid });
    } catch (unpinErr) {
      // Log but continue — the DB record should still be removed
      logger.warn('Failed to unpin orphaned preview CID', { contentId, previewCid, err: unpinErr });
    }
    await ContentPreview.deleteOne({ contentId });
    logger.info('Deleted orphaned ContentPreview record', { contentId });
  }

  /**
   * Run a full cleanup pass: find all orphans and remove them.
   * @returns {Promise<{cleaned: number, errors: number}>}
   */
  async runCleanup() {
    const orphans = await this.findOrphanedPreviews();
    let cleaned = 0;
    let errors = 0;

    for (const { contentId, previewCid } of orphans) {
      try {
        await this.cleanupOrphan(contentId, previewCid);
        cleaned++;
      } catch (err) {
        errors++;
        logger.error('Error cleaning orphaned preview', { contentId, err });
      }
    }

    logger.info('Preview cleanup complete', { total: orphans.length, cleaned, errors });
    return { cleaned, errors };
  }
}

module.exports = new PreviewCleanupService();
