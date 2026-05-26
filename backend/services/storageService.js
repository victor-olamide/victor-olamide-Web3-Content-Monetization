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
  const { ipfsUrl } = await uploadAndPin(fileBuffer, fileName, { metadata });
  return ipfsUrl;
};

/**
 * Upload a file to IPFS and return both the URL and the raw CID.
 * Use this when you need to save the CID to the Content model.
 * @param {Buffer} fileBuffer
 * @param {string} fileName
 * @param {Object} metadata
 * @returns {Promise<{ipfsUrl: string, cid: string, gatewayUrl: string}>}
 */
const uploadToIPFSWithCid = async (fileBuffer, fileName, metadata = {}) => {
  return uploadAndPin(fileBuffer, fileName, { metadata });
};

const getGatewayUrl = (ipfsUrl) => {
  return ipfsGetGatewayUrl(ipfsUrl);
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
  console.log(`Uploading ${fileName} to Gaia (Mock)`);
  return `gaia://${process.env.GAIA_HUB_URL || 'hub.blockstack.org'}/${fileName}`;
};

module.exports = {
  uploadToIPFS,
  uploadToIPFSWithCid,
  uploadToGaia,
  getGatewayUrl,
  getContentFromStorage,
  checkStorageHealth,
};
