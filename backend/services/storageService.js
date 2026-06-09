const logger = require('../utils/logger');
const axios = require('axios');
const { uploadAndPin, extractCid, getGatewayUrl: ipfsGetGatewayUrl } = require('./ipfsService');

/**
 * Upload a file to IPFS via ipfsService (Pinata + pinningService).
 * Returns the ipfs:// URL. CID is embedded in the URL.
 * @param {Buffer} fileBuffer
 * @param {string} fileName
 * @param {Object} metadata - Optional metadata to attach
 * @returns {Promise<string>} ipfs:// URL
 */
const uploadToIPFS = async (fileBuffer, fileName, metadata = {}) => {
  try {
    const { ipfsUrl } = await uploadAndPin(fileBuffer, fileName, { metadata });
    return ipfsUrl;
  } catch (error) {
    logger.error('IPFS upload failed', { fileName, error: error.message });
    throw new Error(`Failed to upload ${fileName} to IPFS: ${error.message}`);
  }
};

const uploadToIPFSWithCid = async (fileBuffer, fileName, metadata = {}) => {
  try {
    return await uploadAndPin(fileBuffer, fileName, { metadata });
  } catch (error) {
    logger.error('IPFS upload with CID failed', { fileName, error: error.message });
    throw new Error(`Failed to upload ${fileName} to IPFS with CID: ${error.message}`);
  }
};

const getGatewayUrl = (ipfsUrl) => {
  try {
    return ipfsGetGatewayUrl(ipfsUrl);
  } catch (error) {
    logger.error('Failed to resolve IPFS gateway URL', { ipfsUrl, error: error.message });
    throw new Error(`Failed to resolve gateway URL for ${ipfsUrl}: ${error.message}`);
  }
};

const getContentFromStorage = async (url, storageType) => {
  try {
    if (storageType === 'ipfs') {
      const gatewayUrl = getGatewayUrl(url);
      const response = await axios.get(gatewayUrl, { responseType: 'arraybuffer' });
      return response.data;
    } else if (storageType === 'gaia') {
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      return response.data;
    }
    throw new Error('Unsupported storage type');
  } catch (err) {
    logger.error('Storage retrieval error:', err);
    throw err;
  }
};

const checkStorageHealth = async () => {
  try {
    const { verifyCredentials } = require('./ipfsService');
    return await verifyCredentials();
  } catch (err) {
    return false;
  }
};

const uploadToGaia = async (fileBuffer, fileName) => {
  try {
    logger.info('Uploading file to Gaia storage', { fileName });
    return `gaia://${process.env.GAIA_HUB_URL || 'hub.blockstack.org'}/${fileName}`;
  } catch (error) {
    logger.error('Gaia upload failed', { fileName, error: error.message });
    throw new Error(`Failed to upload ${fileName} to Gaia: ${error.message}`);
  }
};

module.exports = {
  uploadToIPFS,
  uploadToIPFSWithCid,
  uploadToGaia,
  getGatewayUrl,
  getContentFromStorage,
  checkStorageHealth,
};
