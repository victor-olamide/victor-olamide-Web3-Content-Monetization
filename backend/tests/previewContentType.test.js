'use strict';

const { getPreviewCategory, getPreviewExtension, isSupportedMimeType } = require('../services/previewContentTypeService');

jest.mock('../services/ipfsService', () => ({
  uploadFileToIPFS: jest.fn().mockResolvedValue('ipfs://QmImagePreviewCid123'),
  unpinFile: jest.fn().mockResolvedValue(),
}));

describe('previewContentTypeService', () => {
  describe('getPreviewCategory', () => {
    it('returns video for video/mp4', () => {
      expect(getPreviewCategory('video/mp4')).toBe('video');
    });

    it('returns audio for audio/mpeg', () => {
      expect(getPreviewCategory('audio/mpeg')).toBe('audio');
    });

    it('returns image for image/png', () => {
      expect(getPreviewCategory('image/png')).toBe('image');
    });

    it('returns document for application/pdf', () => {
      expect(getPreviewCategory('application/pdf')).toBe('document');
    });

    it('returns article for text/plain', () => {
      expect(getPreviewCategory('text/plain')).toBe('article');
    });

    it('falls back to document for unknown MIME', () => {
      expect(getPreviewCategory('application/octet-stream')).toBe('document');
    });

    it('returns document for null/undefined', () => {
      expect(getPreviewCategory(null)).toBe('document');
      expect(getPreviewCategory(undefined)).toBe('document');
    });

    it('handles MIME with charset parameter', () => {
      expect(getPreviewCategory('text/html; charset=utf-8')).toBe('article');
    });
  });

  describe('getPreviewExtension', () => {
    it('returns mp4 for video', () => expect(getPreviewExtension('video')).toBe('mp4'));
    it('returns mp3 for audio', () => expect(getPreviewExtension('audio')).toBe('mp3'));
    it('returns webp for image', () => expect(getPreviewExtension('image')).toBe('webp'));
    it('returns txt for article', () => expect(getPreviewExtension('article')).toBe('txt'));
    it('returns bin for unknown', () => expect(getPreviewExtension('unknown')).toBe('bin'));
  });

  describe('isSupportedMimeType', () => {
    it('returns true for video/mp4', () => expect(isSupportedMimeType('video/mp4')).toBe(true));
    it('returns true for audio/wav', () => expect(isSupportedMimeType('audio/wav')).toBe(true));
    it('returns true for image/webp', () => expect(isSupportedMimeType('image/webp')).toBe(true));
    it('returns true for text/markdown', () => expect(isSupportedMimeType('text/markdown')).toBe(true));
    it('returns false for null', () => expect(isSupportedMimeType(null)).toBe(false));
    it('returns false for empty string', () => expect(isSupportedMimeType('')).toBe(false));
  });
});

describe('previewImageService', () => {
  const { generateImagePreview } = require('../services/previewImageService');
  const { uploadFileToIPFS } = require('../services/ipfsService');

  beforeEach(() => jest.clearAllMocks());

  it('uploads image buffer and returns previewCid', async () => {
    const buf = Buffer.alloc(1024, 0xAB);
    const result = await generateImagePreview(buf, 'image/png', 42);
    expect(result.previewCid).toBe('QmImagePreviewCid123');
    expect(result.previewUrl).toContain('ipfs://');
    expect(result.sizeBytes).toBe(1024);
    expect(uploadFileToIPFS).toHaveBeenCalledWith(
      buf,
      'image-preview-42.png',
      expect.objectContaining({ metadata: expect.objectContaining({ type: 'image-preview' }) })
    );
  });

  it('truncates buffer that exceeds MAX_PREVIEW_SIZE_BYTES', async () => {
    const { PREVIEW_LIMITS } = require('../utils/previewUtils');
    const oversize = Buffer.alloc(PREVIEW_LIMITS.MAX_PREVIEW_SIZE_BYTES + 100, 0xFF);
    const result = await generateImagePreview(oversize, 'image/jpeg', 99);
    expect(result.sizeBytes).toBe(PREVIEW_LIMITS.MAX_PREVIEW_SIZE_BYTES);
  });
});
