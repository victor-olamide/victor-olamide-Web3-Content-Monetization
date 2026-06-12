const previewService = require('../services/previewService');
const ContentPreview = require('../models/ContentPreview');
const Content = require('../models/Content');
const Purchase = require('../models/Purchase');
const Subscription = require('../models/Subscription');

// Mock modules
jest.mock('../models/ContentPreview');
jest.mock('../models/Content');
jest.mock('../models/Purchase');
jest.mock('../models/Subscription');
jest.mock('../services/ipfsService', () => ({
  uploadFileToIPFS: jest.fn().mockResolvedValue('ipfs://QmPreviewCidTest123'),
}));

describe('Preview Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Generation methods (issue #198) ─────────────────────────────────────

  describe('generateVideoPreview', () => {
    it('should slice buffer and upload to IPFS', async () => {
      const buf = Buffer.alloc(1000, 0xAB);
      const result = await previewService.generateVideoPreview(buf, 1, 60);
      expect(result.previewCid).toBe('QmPreviewCidTest123');
      expect(result.durationSeconds).toBe(30);
      expect(result.previewUrl).toContain('ipfs://');
    });

    it('should handle zero totalSeconds (full buffer)', async () => {
      const buf = Buffer.alloc(500, 0x00);
      const result = await previewService.generateVideoPreview(buf, 2, 0);
      expect(result.previewCid).toBe('QmPreviewCidTest123');
    });
  });

  describe('generateDocumentPreview', () => {
    it('should truncate plain-text to first 50 lines', async () => {
      const lines = Array.from({ length: 100 }, (_, i) => `line ${i + 1}`).join('\n');
      const buf = Buffer.from(lines);
      const result = await previewService.generateDocumentPreview(buf, 'text/plain', 3);
      expect(result.previewCid).toBe('QmPreviewCidTest123');
      expect(result.pageCount).toBe(1);
    });

    it('should slice binary PDFs to 64 KB', async () => {
      const buf = Buffer.alloc(200 * 1024, 0xFF);
      const result = await previewService.generateDocumentPreview(buf, 'application/pdf', 4);
      expect(result.previewCid).toBe('QmPreviewCidTest123');
    });
  });

  describe('generateAudioPreview', () => {
    it('should upload first 30-s slice to IPFS', async () => {
      const buf = Buffer.alloc(2000, 0x11);
      const result = await previewService.generateAudioPreview(buf, 5, 120);
      expect(result.durationSeconds).toBe(30);
      expect(result.previewCid).toBe('QmPreviewCidTest123');
    });
  });

  describe('generateAndStorePreview', () => {
    it('should generate video preview and upsert ContentPreview', async () => {
      ContentPreview.findOneAndUpdate.mockResolvedValue({
        contentId: 1,
        previewCid: 'QmPreviewCidTest123',
        trailerUrl: 'ipfs://QmPreviewCidTest123',
        trailerDuration: 30,
      });

      const buf = Buffer.alloc(1000, 0x00);
      const result = await previewService.generateAndStorePreview(1, buf, 'video/mp4');
      expect(ContentPreview.findOneAndUpdate).toHaveBeenCalledWith(
        { contentId: 1 },
        expect.objectContaining({ previewCid: 'QmPreviewCidTest123' }),
        { upsert: true, new: true }
      );
      expect(result.previewCid).toBe('QmPreviewCidTest123');
    });

    it('should generate document preview for PDF', async () => {
      ContentPreview.findOneAndUpdate.mockResolvedValue({
        contentId: 10,
        previewCid: 'QmPreviewCidTest123',
        previewImageUrl: 'ipfs://QmPreviewCidTest123',
      });
      const buf = Buffer.alloc(50 * 1024, 0x25);
      const result = await previewService.generateAndStorePreview(10, buf, 'application/pdf');
      expect(result.previewCid).toBe('QmPreviewCidTest123');
    });
  });

  describe('createOrUpdatePreview', () => {
    it('should create a new preview', async () => {
      const contentId = 1;
      const previewData = {
        thumbnailUrl: 'ipfs://Qm123',
        trailerUrl: 'ipfs://Qm456'
      };

      Content.findOne.mockResolvedValue({
        contentId,
        title: 'Test Content',
        description: 'Test Description',
        contentType: 'video',
        price: 9.99,
        creator: 'creator.stx'
      });

      ContentPreview.findOneAndUpdate.mockResolvedValue({
        contentId,
        ...previewData,
        title: 'Test Content'
      });

      const result = await previewService.createOrUpdatePreview(contentId, previewData);

      expect(ContentPreview.findOneAndUpdate).toHaveBeenCalled();
      expect(result.contentId).toBe(contentId);
    });

    it('should throw error if content not found', async () => {
      Content.findOne.mockResolvedValue(null);

      await expect(previewService.createOrUpdatePreview(1, {}))
        .rejects.toThrow('Content not found');
    });
  });

  describe('getPreview', () => {
    it('should retrieve preview and increment views', async () => {
      const contentId = 1;
      const mockPreview = {
        contentId,
        title: 'Test Content',
        totalViews: 5,
        save: jest.fn().mockResolvedValue(true)
      };

      ContentPreview.findOne.mockResolvedValue(mockPreview);

      const result = await previewService.getPreview(contentId);

      expect(ContentPreview.findOne).toHaveBeenCalledWith({
        contentId,
        previewEnabled: true
      });
      expect(mockPreview.totalViews).toBe(6);
      expect(mockPreview.save).toHaveBeenCalled();
    });

    it('should throw error if preview not found', async () => {
      ContentPreview.findOne.mockResolvedValue(null);

      await expect(previewService.getPreview(1))
        .rejects.toThrow('Preview not available for this content');
    });
  });

  describe('getPreviews', () => {
    it('should retrieve multiple previews', async () => {
      const contentIds = [1, 2, 3];
      const mockPreviews = [
        { contentId: 1, title: 'Content 1' },
        { contentId: 2, title: 'Content 2' },
        { contentId: 3, title: 'Content 3' }
      ];

      ContentPreview.find.mockResolvedValue(mockPreviews);

      const result = await previewService.getPreviews(contentIds);

      expect(ContentPreview.find).toHaveBeenCalledWith({
        contentId: { $in: contentIds },
        previewEnabled: true
      });
      expect(result).toEqual(mockPreviews);
    });
  });

  describe('checkAccessStatus', () => {
    it('should return full access for purchased content', async () => {
      const contentId = 1;
      const userAddress = 'user.stx';

      Content.findOne.mockResolvedValue({
        contentId,
        creator: 'creator.stx'
      });

      Purchase.findOne.mockResolvedValue({
        contentId,
        buyerAddress: userAddress,
        status: 'completed',
        createdAt: new Date()
      });

      const result = await previewService.checkAccessStatus(contentId, userAddress);

      expect(result.hasAccess).toBe(true);
      expect(result.accessType).toBe('purchased');
    });

    it('should return subscription access for subscribed users', async () => {
      const contentId = 1;
      const userAddress = 'user.stx';

      Content.findOne.mockResolvedValue({
        contentId,
        creator: 'creator.stx'
      });

      Purchase.findOne.mockResolvedValue(null);
      
      Subscription.findOne.mockResolvedValue({
        subscriberAddress: userAddress,
        creatorAddress: 'creator.stx',
        status: 'active',
        createdAt: new Date()
      });

      const result = await previewService.checkAccessStatus(contentId, userAddress);

      expect(result.hasAccess).toBe(true);
      expect(result.accessType).toBe('subscription');
    });

    it('should return preview-only access for non-purchasers', async () => {
      const contentId = 1;
      const userAddress = 'user.stx';

      Content.findOne.mockResolvedValue({
        contentId,
        creator: 'creator.stx',
        tokenGating: { enabled: false }
      });

      Purchase.findOne.mockResolvedValue(null);
      Subscription.findOne.mockResolvedValue(null);

      const result = await previewService.checkAccessStatus(contentId, userAddress);

      expect(result.hasAccess).toBe(false);
      expect(result.accessType).toBe('preview_only');
    });
  });

  describe('getPreviewStats', () => {
    it('should retrieve creator preview statistics', async () => {
      const creatorAddress = 'creator.stx';
      const mockPreviews = [
        {
          contentId: 1,
          title: 'Content 1',
          totalViews: 100,
          totalPreviewDownloads: 10,
          thumbnailUrl: 'ipfs://Qm123',
          trailerUrl: 'ipfs://Qm456',
          previewText: 'Preview text'
        },
        {
          contentId: 2,
          title: 'Content 2',
          totalViews: 50,
          totalPreviewDownloads: 5,
          thumbnailUrl: null,
          trailerUrl: 'ipfs://Qm789',
          previewText: null
        }
      ];

      ContentPreview.find.mockResolvedValue(mockPreviews);

      const result = await previewService.getPreviewStats(creatorAddress);

      expect(result.totalPreviews).toBe(2);
      expect(result.totalPreviewViews).toBe(150);
      expect(result.totalPreviewDownloads).toBe(15);
      expect(result.previewBreakdown.withThumbnails).toBe(1);
      expect(result.previewBreakdown.withTrailers).toBe(2);
      expect(result.previewBreakdown.withPreviewText).toBe(1);
    });
  });

  describe('togglePreviewVisibility', () => {
    it('should toggle preview visibility', async () => {
      const contentId = 1;
      const enabled = false;

      ContentPreview.findOneAndUpdate.mockResolvedValue({
        contentId,
        previewEnabled: enabled
      });

      const result = await previewService.togglePreviewVisibility(contentId, enabled);

      expect(ContentPreview.findOneAndUpdate).toHaveBeenCalledWith(
        { contentId },
        {
          previewEnabled: enabled,
          updatedAt: expect.any(Date)
        },
        { new: true }
      );
      expect(result.previewEnabled).toBe(enabled);
    });
  });

  describe('deletePreview', () => {
    it('should delete a preview', async () => {
      const contentId = 1;

      ContentPreview.deleteOne.mockResolvedValue({ deletedCount: 1 });

      const result = await previewService.deletePreview(contentId);

      expect(ContentPreview.deleteOne).toHaveBeenCalledWith({ contentId });
      expect(result.success).toBe(true);
    });
  });

  describe('getPreviewsByType', () => {
    it('should retrieve previews by type with pagination', async () => {
      const contentType = 'video';
      const options = { skip: 0, limit: 10 };
      const mockPreviews = [
        { contentId: 1, contentType, title: 'Video 1', totalViews: 100 },
        { contentId: 2, contentType, title: 'Video 2', totalViews: 50 }
      ];

      ContentPreview.find.mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            sort: jest.fn().mockResolvedValue(mockPreviews)
          })
        })
      });

      ContentPreview.countDocuments.mockResolvedValue(2);

      const result = await previewService.getPreviewsByType(contentType, options);

      expect(result.data).toEqual(mockPreviews);
      expect(result.total).toBe(2);
      expect(result.skip).toBe(0);
      expect(result.limit).toBe(10);
    });
  });

  describe('recordPreviewDownload', () => {
    it('should increment preview downloads', async () => {
      const contentId = 1;

      ContentPreview.findOneAndUpdate.mockResolvedValue({
        contentId,
        totalPreviewDownloads: 11
      });

      const result = await previewService.recordPreviewDownload(contentId);

      expect(ContentPreview.findOneAndUpdate).toHaveBeenCalledWith(
        { contentId },
        {
          $inc: { totalPreviewDownloads: 1 },
          updatedAt: expect.any(Date)
        },
        { new: true }
      );
      expect(result.totalPreviewDownloads).toBe(11);
    });
  });

  describe('getTrendingPreviews', () => {
    it('should retrieve trending previews', async () => {
      const options = { limit: 10, days: 7 };
      const mockPreviews = [
        { contentId: 1, totalViews: 500 },
        { contentId: 2, totalViews: 400 }
      ];

      ContentPreview.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(mockPreviews)
        })
      });

      const result = await previewService.getTrendingPreviews(options);

      expect(ContentPreview.find).toHaveBeenCalled();
      expect(result).toEqual(mockPreviews);
    });
  });
});
