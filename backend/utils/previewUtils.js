'use strict';

/**
 * Preview utility helpers (#198)
 *
 * Pure, dependency-free helpers shared by the preview generation pipeline
 * in previewService.js. Covers video (30 s), document (1 page), audio (30 s).
 */

/** Preview durations / limits enforced by the issue spec. */
const PREVIEW_LIMITS = {
  VIDEO_SECONDS: parseInt(process.env.PREVIEW_VIDEO_SECONDS, 10) || 30,
  DOCUMENT_PAGES: parseInt(process.env.PREVIEW_DOCUMENT_PAGES, 10) || 1,
  AUDIO_SECONDS: parseInt(process.env.PREVIEW_AUDIO_SECONDS, 10) || 30,
  IMAGE_PREVIEW: true,
  MAX_PREVIEW_SIZE_BYTES: parseInt(process.env.PREVIEW_MAX_SIZE_BYTES, 10) || 50 * 1024 * 1024,
};

/**
 * Map content type → accepted MIME types.
 */
const CONTENT_TYPE_MIMES = {
  video:    ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo'],
  audio:    ['audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/wav', 'audio/aac', 'audio/flac'],
  image:    ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  document: ['application/pdf', 'text/plain', 'text/html', 'application/msword',
             'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  article:  ['text/plain', 'text/html', 'text/markdown'],
  music:    ['audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/wav'],
};

/**
 * Derive the content category ('video'|'audio'|'image'|'document'|'article')
 * from a MIME type string.
 * @param {string} mimeType
 * @returns {string}
 */
function mimeToContentCategory(mimeType) {
  if (!mimeType) return 'document';
  const mime = mimeType.toLowerCase();
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime.startsWith('image/')) return 'image';
  if (mime === 'application/pdf') return 'document';
  if (mime.startsWith('text/')) return 'article';
  return 'document';
}

/**
 * Extract the raw IPFS hash from an ipfs:// URL or bare CID.
 * Returns the hash string without the ipfs:// prefix.
 * @param {string} url
 * @returns {string}
 */
function extractCid(url) {
  if (!url) return '';
  return url.replace(/^ipfs:\/\//, '').replace(/^\/ipfs\//, '').trim();
}

/**
 * Build an ipfs:// URL from a bare CID or existing ipfs:// URL.
 * @param {string} cid
 * @returns {string}
 */
function toIpfsUrl(cid) {
  const bare = extractCid(cid);
  return bare ? `ipfs://${bare}` : '';
}

/**
 * Build a Pinata gateway HTTP URL from an ipfs:// URL or CID.
 * @param {string} ipfsUrl
 * @returns {string}
 */
function toGatewayUrl(ipfsUrl) {
  const gateway = process.env.IPFS_GATEWAY_URL || 'https://gateway.pinata.cloud';
  const cid = extractCid(ipfsUrl);
  return cid ? `${gateway}/ipfs/${cid}` : '';
}

/**
 * Determine whether a given buffer likely starts with an MP4 ftyp box
 * (a very lightweight check — not a full parser).
 * @param {Buffer} buf
 * @returns {boolean}
 */
function isLikelyMp4(buf) {
  if (!buf || buf.length < 8) return false;
  // ftyp box signature at offset 4
  return buf.slice(4, 8).toString('ascii') === 'ftyp';
}

/**
 * Estimate the byte offset for the first N seconds of a naive CBR MP4.
 * This is a rough approximation used when ffmpeg is unavailable.
 * @param {number} totalBytes
 * @param {number} totalSeconds
 * @param {number} targetSeconds
 * @returns {number}
 */
function estimateByteOffsetForSeconds(totalBytes, totalSeconds, targetSeconds) {
  if (!totalSeconds || totalSeconds <= 0) return totalBytes;
  const ratio = Math.min(targetSeconds / totalSeconds, 1);
  return Math.floor(totalBytes * ratio);
}

/**
 * Truncate a plain-text buffer to approximately the first N lines.
 * @param {Buffer} buf
 * @param {number} maxLines
 * @returns {Buffer}
 */
function truncateToFirstLines(buf, maxLines = 50) {
  const text = buf.toString('utf8');
  const lines = text.split('\n');
  return Buffer.from(lines.slice(0, maxLines).join('\n'), 'utf8');
}

module.exports = {
  PREVIEW_LIMITS,
  CONTENT_TYPE_MIMES,
  mimeToContentCategory,
  extractCid,
  toIpfsUrl,
  toGatewayUrl,
  isLikelyMp4,
  estimateByteOffsetForSeconds,
  truncateToFirstLines,
};
