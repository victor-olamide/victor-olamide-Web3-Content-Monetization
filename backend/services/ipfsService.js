/**
 * IPFS Service with Pinata Integration
 * Handles file uploads to IPFS with progress tracking, retry logic, and error handling
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Configuration
const PINATA_API_URL = 'https://api.pinata.cloud';
const PINATA_GATEWAY = 'https://gateway.pinata.cloud';
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds
const CHUNK_SIZE = 1024 * 1024; // 1MB chunks for progress tracking

/**
 * Upload a file to IPFS via Pinata with progress tracking
 * @param {Buffer} fileBuffer - The file content as buffer
 * @param {string} fileName - Original file name
 * @param {Object} options - Upload options
 * @param {Function} onProgress - Progress callback (percentage)
 * @returns {Promise<string>} IPFS URL
 */
const uploadFileToIPFS = async (fileBuffer, fileName, options = {}, onProgress = null) => {
  const {
    maxRetries = MAX_RETRIES,
    metadata = {},
    tags = [],
    public: isPublic = true
  } = options;

  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[IPFS Upload] Attempt ${attempt}/${maxRetries} for ${fileName}`);
      
      const ipfsHash = await _uploadWithProgress(fileBuffer, fileName, metadata, tags, isPublic, onProgress);
      console.log(`[IPFS Upload] Successfully uploaded ${fileName} to IPFS: ${ipfsHash}`);
      
      return `ipfs://${ipfsHash}`;
    } catch (err) {
      lastError = err;
      console.error(`[IPFS Upload] Attempt ${attempt} failed:`, err.message);
      
      if (attempt < maxRetries) {
        const delay = RETRY_DELAY * Math.pow(2, attempt - 1); // Exponential backoff
        console.log(`[IPFS Upload] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(`Failed to upload to IPFS after ${maxRetries} attempts: ${lastError?.message}`);
};

/**
 * Internal function to handle file upload with progress tracking
 */
const _uploadWithProgress = async (fileBuffer, fileName, metadata = {}, tags = [], isPublic = true, onProgress = null) => {
  const formData = new FormData();
  
  // Add file to form data
  formData.append('file', fileBuffer, {
    filename: fileName
  });

  // Add Pinata metadata
  const pinataMetadata = {
    name: fileName,
    keyvalues: {
      ...metadata,
      uploadedAt: new Date().toISOString()
    }
  };
  formData.append('pinataMetadata', JSON.stringify(pinataMetadata));

  // Add Pinata options
  const pinataOptions = {
    cidVersion: 1,
    wrapWithDirectory: false
  };
  if (tags.length > 0) {
    pinataOptions.keyvalues = { tags: tags.join(',') };
  }
  formData.append('pinataOptions', JSON.stringify(pinataOptions));

  // Get form data headers and size for progress tracking
  const headers = formData.getHeaders();
  const formDataSize = Buffer.concat(await _getFormDataBuffers(formData)).length;

  // Setup axios instance with progress tracking
  const config = {
    method: 'post',
    url: `${PINATA_API_URL}/pinning/pinFileToIPFS`,
    data: formData,
    headers: {
      ...headers,
      'pinata_api_key': process.env.PINATA_API_KEY,
      'pinata_secret_api_key': process.env.PINATA_SECRET_API_KEY,
    },
    timeout: 300000, // 5 minutes
    maxContentLength: 100 * 1024 * 1024, // 100MB
    maxBodyLength: 100 * 1024 * 1024,
  };

  // Add progress tracking if callback provided
  if (onProgress && typeof onProgress === 'function') {
    let uploadedBytes = 0;
    
    config.onUploadProgress = (progressEvent) => {
      uploadedBytes = progressEvent.loaded;
      const percentComplete = (uploadedBytes / formDataSize) * 100;
      onProgress(Math.round(percentComplete));
    };
  }

  try {
    const response = await axios(config);
    
    if (!response.data || !response.data.IpfsHash) {
      throw new Error('Invalid response from Pinata: missing IpfsHash');
    }

    return response.data.IpfsHash;
  } catch (err) {
    if (err.response) {
      const errorMsg = err.response.data?.error || err.message;
      throw new Error(`Pinata API error: ${errorMsg}`);
    }
    throw err;
  }
};

/**
 * Get form data as buffers for size calculation
 */
const _getFormDataBuffers = async (formData) => {
  return new Promise((resolve, reject) => {
    formData.getBuffer((err, buffer) => {
      if (err) reject(err);
      else resolve([buffer]);
    });
  });
};

/**
 * Upload JSON metadata to IPFS
 * @param {Object} metadata - Metadata object
 * @param {string} fileName - File name for the metadata JSON
 * @returns {Promise<string>} IPFS URL to metadata
 */
const uploadMetadataToIPFS = async (metadata, fileName = 'metadata.json') => {
  try {
    const jsonBuffer = Buffer.from(JSON.stringify(metadata, null, 2));
    const ipfsHash = await _uploadWithProgress(jsonBuffer, fileName, {
      type: 'metadata',
      contentType: 'application/json'
    });
    
    return `ipfs://${ipfsHash}`;
  } catch (err) {
    throw new Error(`Failed to upload metadata: ${err.message}`);
  }
};

/**
 * Get gateway URL from IPFS hash
 * @param {string} ipfsUrl - IPFS URL (ipfs://QmXXX) or hash
 * @param {string} gateway - Gateway URL (default: Pinata)
 * @returns {string} Gateway URL
 */
const getGatewayUrl = (ipfsUrl, gateway = PINATA_GATEWAY) => {
  if (!ipfsUrl) return '';
  
  const hash = ipfsUrl.replace('ipfs://', '').replace('ipfs/', '');
  return `${gateway}/ipfs/${hash}`;
};

/**
 * List pinned files for the current user
 * @returns {Promise<Array>} Array of pinned files
 */
const listPinnedFiles = async () => {
  try {
    const response = await axios.get(`${PINATA_API_URL}/data/pinList`, {
      headers: {
        'pinata_api_key': process.env.PINATA_API_KEY,
        'pinata_secret_api_key': process.env.PINATA_SECRET_API_KEY,
      }
    });

    return response.data.rows || [];
  } catch (err) {
    console.error('Failed to list pinned files:', err.message);
    throw err;
  }
};

/**
 * Unpin a file from IPFS
 * @param {string} ipfsHash - IPFS hash to unpin
 * @returns {Promise<void>}
 */
const unpinFile = async (ipfsHash) => {
  try {
    const hash = ipfsHash.replace('ipfs://', '').replace('ipfs/', '');
    
    await axios.delete(`${PINATA_API_URL}/pinning/unpin/${hash}`, {
      headers: {
        'pinata_api_key': process.env.PINATA_API_KEY,
        'pinata_secret_api_key': process.env.PINATA_SECRET_API_KEY,
      }
    });

    console.log(`[IPFS] Successfully unpinned: ${hash}`);
  } catch (err) {
    console.error('Failed to unpin file:', err.message);
    throw err;
  }
};

/**
 * Verify Pinata API credentials
 * @returns {Promise<boolean>} True if valid
 */
const verifyCredentials = async () => {
  try {
    const response = await axios.get(`${PINATA_API_URL}/data/testAuthentication`, {
      headers: {
        'pinata_api_key': process.env.PINATA_API_KEY,
        'pinata_secret_api_key': process.env.PINATA_SECRET_API_KEY,
      }
    });

    return response.status === 200;
  } catch (err) {
    console.error('Pinata authentication failed:', err.message);
    return false;
  }
};

/**
 * Get storage usage information
 * @returns {Promise<Object>} Usage statistics
 */
const getStorageUsage = async () => {
  try {
    const response = await axios.get(`${PINATA_API_URL}/data/userPinnedDataTotal`, {
      headers: {
        'pinata_api_key': process.env.PINATA_API_KEY,
        'pinata_secret_api_key': process.env.PINATA_SECRET_API_KEY,
      }
    });

    return {
      bytesUsed: response.data.pin_count,
      percentUsed: (response.data.pin_count / (1024 * 1024 * 1024)) * 100 // Convert to GB
    };
  } catch (err) {
    console.error('Failed to get storage usage:', err.message);
    throw err;
  }
};

/**
 * Create a directory structure and upload files
 * @param {Array<{name: string, content: Buffer}>} files - Files to upload
 * @param {string} dirName - Directory name
 * @returns {Promise<string>} IPFS URL to directory
 */
const uploadDirectory = async (files, dirName = 'content') => {
  try {
    const formData = new FormData();

    // Add each file with directory structure
    files.forEach(file => {
      formData.append('file', file.content, {
        filename: path.join(dirName, file.name)
      });
    });

    // Configure to wrap with directory
    const pinataOptions = {
      cidVersion: 1,
      wrapWithDirectory: true
    };
    formData.append('pinataOptions', JSON.stringify(pinataOptions));

    const response = await axios.post(`${PINATA_API_URL}/pinning/pinFileToIPFS`, formData, {
      headers: {
        ...formData.getHeaders(),
        'pinata_api_key': process.env.PINATA_API_KEY,
        'pinata_secret_api_key': process.env.PINATA_SECRET_API_KEY,
      }
    });

    return `ipfs://${response.data.IpfsHash}`;
  } catch (err) {
    throw new Error(`Failed to upload directory: ${err.message}`);
  }
};

module.exports = {
  uploadFileToIPFS,
  uploadMetadataToIPFS,
  getGatewayUrl,
  listPinnedFiles,
  unpinFile,
  verifyCredentials,
  getStorageUsage,
  uploadDirectory,
  PINATA_GATEWAY
};
