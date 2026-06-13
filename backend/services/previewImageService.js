'use strict';

/**
 * Image Preview Generator (#198)
 * Generates a free preview for image content by capping the buffer at the
 * configured max-preview-size and uploading to IPFS with a distinct CID.
 * Uses the same pattern as video/document preview generators in previewService.js.
 */

const logger = require('../utils/logger');
const { uploadFileToIPFS } = require('./ipfsService');
const { extractCid, PREVIEW_LIMITS } = require('../utils/previewUtils');

/**
 * Generate a free image preview.
 * For images the "preview" is the full image if it fits within MAX_PREVIEW_SIZE_BYTES,
 * otherwise a truncated leading slice (covers very large raw images/bitmaps).
 *
 * @param {Buffer} imageBuffer  Full image file buffer
 * @param {string} mimeType     e.g. 'image/jpeg'
 * @param {number} contentId
 * @returns {Promise<{previewCid: string, previewUrl: string, sizeBytes: number}>}
 */
async function generateImagePreview(imageBuffer, mimeType, contentId) {
  const maxBytes = PREVIEW_LIMITS.MAX_PREVIEW_SIZE_BYTES;
  const sliceBuffer = imageBuffer.length > maxBytes
    ? imageBuffer.slice(0, maxBytes)
    : imageBuffer;

  const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'img';
  const fileName = `image-preview-${contentId}.${ext}`;

  const ipfsUrl = await uploadFileToIPFS(
    sliceBuffer,
    fileName,
    { metadata: { contentId: String(contentId), type: 'image-preview', mimeType } }
  );

  const previewCid = extractCid(ipfsUrl);
  logger.info('Image preview generated', { contentId, previewCid, sizeBytes: sliceBuffer.length });

  return { previewCid, previewUrl: ipfsUrl, sizeBytes: sliceBuffer.length };
}

module.exports = { generateImagePreview };
