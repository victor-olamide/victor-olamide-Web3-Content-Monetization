'use strict';

/**
 * Preview Content-Type Detection Service (#198)
 * Centralises content-type detection logic used during preview generation.
 */

const MIME_CATEGORY_MAP = {
  // video
  'video/mp4': 'video',
  'video/webm': 'video',
  'video/ogg': 'video',
  'video/quicktime': 'video',
  'video/x-msvideo': 'video',
  // audio
  'audio/mpeg': 'audio',
  'audio/mp3': 'audio',
  'audio/ogg': 'audio',
  'audio/wav': 'audio',
  'audio/aac': 'audio',
  'audio/flac': 'audio',
  // image
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/gif': 'image',
  'image/webp': 'image',
  'image/svg+xml': 'image',
  // document / article
  'application/pdf': 'document',
  'application/msword': 'document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document',
  'text/plain': 'article',
  'text/html': 'article',
  'text/markdown': 'article',
};

/**
 * Determine preview category from a MIME type string.
 * Falls back to 'document' for unknown types.
 * @param {string} mimeType
 * @returns {'video'|'audio'|'image'|'document'|'article'}
 */
function getPreviewCategory(mimeType) {
  if (!mimeType) return 'document';
  const mime = mimeType.toLowerCase().split(';')[0].trim();
  if (MIME_CATEGORY_MAP[mime]) return MIME_CATEGORY_MAP[mime];
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('text/')) return 'article';
  return 'document';
}

/**
 * Return the default file extension for a preview category.
 * @param {string} category
 * @returns {string}
 */
function getPreviewExtension(category) {
  const extensions = {
    video: 'mp4',
    audio: 'mp3',
    image: 'webp',
    document: 'bin',
    article: 'txt',
  };
  return extensions[category] || 'bin';
}

/**
 * Check whether the MIME type is supported for preview generation.
 * @param {string} mimeType
 * @returns {boolean}
 */
function isSupportedMimeType(mimeType) {
  if (!mimeType) return false;
  const mime = mimeType.toLowerCase().split(';')[0].trim();
  return Boolean(
    MIME_CATEGORY_MAP[mime] ||
    mime.startsWith('video/') ||
    mime.startsWith('audio/') ||
    mime.startsWith('image/') ||
    mime.startsWith('text/')
  );
}

module.exports = { getPreviewCategory, getPreviewExtension, isSupportedMimeType, MIME_CATEGORY_MAP };
