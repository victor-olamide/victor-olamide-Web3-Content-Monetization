/**
 * IPFS Pinning Service Configuration
 * Centralises all pinning-related env vars with sensible defaults.
 */

module.exports = {
  // Pinata credentials (API key pair or JWT)
  pinata: {
    jwt: process.env.PINATA_JWT || null,
    apiKey: process.env.PINATA_API_KEY || null,
    secretApiKey: process.env.PINATA_SECRET_API_KEY || null,
    gateway: process.env.IPFS_GATEWAY_URL || 'https://gateway.pinata.cloud'
  },

  // Web3.Storage
  web3Storage: {
    token: process.env.WEB3_STORAGE_TOKEN || process.env.WEB3_STORAGE_API_KEY || null
  },

  // NFT.Storage
  nftStorage: {
    apiKey: process.env.NFT_STORAGE_API_KEY || null
  },

  // Infura IPFS
  infura: {
    projectId: process.env.INFURA_PROJECT_ID || null,
    projectSecret: process.env.INFURA_PROJECT_SECRET || null
  },

  // General pinning settings
  redundancy: parseInt(process.env.IPFS_PINNING_REDUNDANCY, 10) || 2,
  autoRepin: process.env.IPFS_AUTO_REPIN !== 'false',
  maxFileSize: parseInt(process.env.IPFS_MAX_FILE_SIZE, 10) || 100 * 1024 * 1024, // 100 MB
  timeout: parseInt(process.env.IPFS_PINNING_TIMEOUT, 10) || 300000, // 5 minutes
  healthCheckInterval: parseInt(process.env.IPFS_HEALTH_CHECK_INTERVAL, 10) || 300000 // 5 minutes
};
