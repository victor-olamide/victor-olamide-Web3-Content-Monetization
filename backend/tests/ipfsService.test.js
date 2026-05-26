/**
 * Unit tests for ipfsService.js
 */

jest.mock('axios');
jest.mock('form-data');

const axios = require('axios');
const { extractCid, getGatewayUrl, uploadFileToIPFS, uploadMetadataToIPFS } = require('../services/ipfsService');

describe('ipfsService', () => {
  describe('extractCid', () => {
    it('strips ipfs:// prefix', () => {
      expect(extractCid('ipfs://QmTestHash123')).toBe('QmTestHash123');
    });

    it('strips ipfs/ prefix', () => {
      expect(extractCid('ipfs/QmTestHash123')).toBe('QmTestHash123');
    });

    it('returns raw CID unchanged', () => {
      expect(extractCid('QmTestHash123')).toBe('QmTestHash123');
    });

    it('returns empty string for falsy input', () => {
      expect(extractCid(null)).toBe('');
      expect(extractCid('')).toBe('');
    });

    it('handles CIDv1 with path', () => {
      expect(extractCid('ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/file.txt')).toBe('bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi');
    });
  });

  describe('getGatewayUrl', () => {
    it('converts ipfs:// URL to gateway URL', () => {
      const url = getGatewayUrl('ipfs://QmTestHash123');
      expect(url).toContain('/ipfs/QmTestHash123');
    });

    it('returns empty string for falsy input', () => {
      expect(getGatewayUrl('')).toBe('');
      expect(getGatewayUrl(null)).toBe('');
    });
  });

  describe('uploadFileToIPFS', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('returns ipfs:// URL on success', async () => {
      const mockFormData = {
        append: jest.fn(),
        getHeaders: jest.fn().mockReturnValue({ 'content-type': 'multipart/form-data' }),
        getBuffer: jest.fn((cb) => cb(null, Buffer.from('test')))
      };
      require('form-data').mockImplementation(() => mockFormData);

      axios.mockResolvedValueOnce({
        data: { IpfsHash: 'QmMockHash456' }
      });

      const result = await uploadFileToIPFS(Buffer.from('test'), 'test.txt');
      expect(result).toBe('ipfs://QmMockHash456');
    });

    it('throws after max retries on failure', async () => {
      const mockFormData = {
        append: jest.fn(),
        getHeaders: jest.fn().mockReturnValue({}),
        getBuffer: jest.fn((cb) => cb(null, Buffer.from('test')))
      };
      require('form-data').mockImplementation(() => mockFormData);

      axios.mockRejectedValue(new Error('Network error'));

      await expect(
        uploadFileToIPFS(Buffer.from('test'), 'test.txt', { maxRetries: 1 })
      ).rejects.toThrow('Failed to upload to IPFS');
    });
  });

  describe('uploadMetadataToIPFS', () => {
    it('returns ipfs:// URL for metadata JSON', async () => {
      const mockFormData = {
        append: jest.fn(),
        getHeaders: jest.fn().mockReturnValue({}),
        getBuffer: jest.fn((cb) => cb(null, Buffer.from('test')))
      };
      require('form-data').mockImplementation(() => mockFormData);

      axios.mockResolvedValueOnce({
        data: { IpfsHash: 'QmMetadataHash789' }
      });

      const result = await uploadMetadataToIPFS({ title: 'Test' }, 'metadata.json');
      expect(result).toBe('ipfs://QmMetadataHash789');
    });
  });
});
