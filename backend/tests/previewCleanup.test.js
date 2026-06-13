'use strict';

const ContentPreview = require('../models/ContentPreview');
const Content = require('../models/Content');

jest.mock('../models/ContentPreview');
jest.mock('../models/Content');
jest.mock('../services/ipfsService', () => ({
  unpinFile: jest.fn().mockResolvedValue(),
}));

describe('previewCleanupService', () => {
  const previewCleanupService = require('../services/previewCleanupService');
  const { unpinFile } = require('../services/ipfsService');

  beforeEach(() => jest.clearAllMocks());

  describe('findOrphanedPreviews', () => {
    it('returns previews whose content no longer exists', async () => {
      ContentPreview.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          { contentId: 1, previewCid: 'Qm001' },
          { contentId: 2, previewCid: 'Qm002' },
        ]),
      });
      Content.exists
        .mockResolvedValueOnce(true)   // contentId 1 still exists
        .mockResolvedValueOnce(false); // contentId 2 is orphaned

      const orphans = await previewCleanupService.findOrphanedPreviews();
      expect(orphans).toHaveLength(1);
      expect(orphans[0].contentId).toBe(2);
    });

    it('returns empty array when all content exists', async () => {
      ContentPreview.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([{ contentId: 5, previewCid: 'Qm005' }]),
      });
      Content.exists.mockResolvedValue(true);

      const orphans = await previewCleanupService.findOrphanedPreviews();
      expect(orphans).toHaveLength(0);
    });
  });

  describe('cleanupOrphan', () => {
    it('unpins the CID and deletes the ContentPreview record', async () => {
      ContentPreview.deleteOne.mockResolvedValue({ deletedCount: 1 });
      await previewCleanupService.cleanupOrphan(2, 'Qm002');
      expect(unpinFile).toHaveBeenCalledWith('ipfs://Qm002');
      expect(ContentPreview.deleteOne).toHaveBeenCalledWith({ contentId: 2 });
    });

    it('still deletes the DB record even if unpin fails', async () => {
      unpinFile.mockRejectedValueOnce(new Error('IPFS error'));
      ContentPreview.deleteOne.mockResolvedValue({ deletedCount: 1 });
      await previewCleanupService.cleanupOrphan(3, 'Qm003');
      expect(ContentPreview.deleteOne).toHaveBeenCalledWith({ contentId: 3 });
    });
  });

  describe('runCleanup', () => {
    it('returns cleaned and error counts', async () => {
      ContentPreview.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          { contentId: 10, previewCid: 'Qm010' },
          { contentId: 11, previewCid: 'Qm011' },
        ]),
      });
      Content.exists.mockResolvedValue(false);
      ContentPreview.deleteOne.mockResolvedValue({ deletedCount: 1 });

      const result = await previewCleanupService.runCleanup();
      expect(result.cleaned).toBe(2);
      expect(result.errors).toBe(0);
    });
  });
});
