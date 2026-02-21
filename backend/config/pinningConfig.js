# IPFS Pinning Service Configuration
# Copy this file to .env and configure your pinning service credentials

# =============================================================================
# PRIMARY PINNING SERVICE - Pinata (Recommended for production)
# =============================================================================
# Get your API keys from: https://pinata.cloud/
PINATA_API_KEY=your_pinata_api_key_here
PINATA_SECRET_API_KEY=your_pinata_secret_api_key_here

# =============================================================================
# SECONDARY PINNING SERVICES - For redundancy
# =============================================================================

# Infura IPFS
# Get your credentials from: https://infura.io/
INFURA_PROJECT_ID=your_infura_project_id_here
INFURA_PROJECT_SECRET=your_infura_project_secret_here

# Web3.Storage
# Get your API key from: https://web3.storage/
WEB3_STORAGE_API_KEY=your_web3_storage_api_key_here

# NFT.Storage
# Get your API key from: https://nft.storage/
NFT_STORAGE_API_KEY=your_nft_storage_api_key_here

# =============================================================================
# PINNING SERVICE CONFIGURATION
# =============================================================================

# Redundancy level (how many providers to pin to)
# Recommended: 2-3 for production
IPFS_PINNING_REDUNDANCY=2

# Auto-repin content that becomes unpinned
IPFS_AUTO_REPIN=true

# Maximum file size for pinning (in bytes)
# Default: 100MB
IPFS_MAX_FILE_SIZE=104857600

# Pinning timeout (in milliseconds)
# Default: 5 minutes
IPFS_PINNING_TIMEOUT=300000

# Health check interval (in milliseconds)
# Default: 5 minutes
IPFS_HEALTH_CHECK_INTERVAL=300000

# =============================================================================
# BACKUP AND MONITORING
# =============================================================================

# Directory for pinning service backups
IPFS_BACKUP_DIR=/tmp/ipfs-pinning-backups

# Enable detailed logging
IPFS_DEBUG_LOGGING=false

# =============================================================================
# COST OPTIMIZATION
# =============================================================================

# Preferred provider order (comma-separated)
# Options: pinata, web3.storage, nft.storage, infura
IPFS_PREFERRED_PROVIDERS=pinata,web3.storage,nft.storage

# Maximum monthly cost per provider (in USD)
IPFS_MAX_COST_PER_PROVIDER=50

# =============================================================================
# LEGACY IPFS SERVICE COMPATIBILITY
# =============================================================================
# These are used by the existing ipfsService.js for backward compatibility
# PINATA_API_KEY and PINATA_SECRET_API_KEY are reused from above