/**
 * Backup system configuration
 * Defines settings for automated database and content backups
 */

const path = require('path');

const backupConfig = {
  // Database backup settings
  database: {
    enabled: process.env.BACKUP_DATABASE_ENABLED === 'true' || true,
    intervalHours: parseInt(process.env.BACKUP_DATABASE_INTERVAL_HOURS) || 24, // Daily backups
    retentionDays: parseInt(process.env.BACKUP_DATABASE_RETENTION_DAYS) || 30, // Keep 30 days
    compression: process.env.BACKUP_DATABASE_COMPRESSION !== 'false', // Enable compression by default
    encryption: process.env.BACKUP_DATABASE_ENCRYPTION === 'true' || false, // Disabled by default
    encryptionKey: process.env.BACKUP_ENCRYPTION_KEY || null,
    backupDir: process.env.BACKUP_DATABASE_DIR || path.join(process.cwd(), 'backups', 'database'),
    mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/web3platform',
    collections: [
      'contents',
      'users',
      'purchases',
      'subscriptions',
      'refunds',
      'royaltydistributions',
      'moderationqueues',
      'moderationflags',
      'moderationauditlogs'
    ]
  },

  // Content backup settings
  content: {
    enabled: process.env.BACKUP_CONTENT_ENABLED === 'true' || true,
    intervalHours: parseInt(process.env.BACKUP_CONTENT_INTERVAL_HOURS) || 24, // Daily backups
    retentionDays: parseInt(process.env.BACKUP_CONTENT_RETENTION_DAYS) || 30, // Keep 30 days
    compression: process.env.BACKUP_CONTENT_COMPRESSION !== 'false', // Enable compression by default
    encryption: process.env.BACKUP_CONTENT_ENCRYPTION === 'true' || false, // Disabled by default
    backupDir: process.env.BACKUP_CONTENT_DIR || path.join(process.cwd(), 'backups', 'content'),
    maxFileSize: parseInt(process.env.BACKUP_MAX_FILE_SIZE) || 100 * 1024 * 1024, // 100MB max per file
    concurrency: parseInt(process.env.BACKUP_CONTENT_CONCURRENCY) || 3, // Concurrent downloads
    timeoutMs: parseInt(process.env.BACKUP_CONTENT_TIMEOUT_MS) || 30000, // 30 second timeout
    retryAttempts: parseInt(process.env.BACKUP_CONTENT_RETRY_ATTEMPTS) || 3,
    storageTypes: ['ipfs', 'gaia'] // Supported storage types
  },

  // General backup settings
  general: {
    enabled: process.env.BACKUP_SYSTEM_ENABLED === 'true' || true,
    timezone: process.env.BACKUP_TIMEZONE || 'UTC',
    notificationEnabled: process.env.BACKUP_NOTIFICATION_ENABLED === 'true' || false,
    notificationEmail: process.env.BACKUP_NOTIFICATION_EMAIL || null,
    logLevel: process.env.BACKUP_LOG_LEVEL || 'info',
    tempDir: process.env.BACKUP_TEMP_DIR || path.join(process.cwd(), 'backups', 'temp'),
    maxConcurrentBackups: parseInt(process.env.BACKUP_MAX_CONCURRENT) || 2
  },

  // Cloud storage settings (optional)
  cloud: {
    provider: process.env.BACKUP_CLOUD_PROVIDER || null, // 'aws', 'gcp', 'azure'
    bucket: process.env.BACKUP_CLOUD_BUCKET || null,
    region: process.env.BACKUP_CLOUD_REGION || null,
    accessKey: process.env.BACKUP_CLOUD_ACCESS_KEY || null,
    secretKey: process.env.BACKUP_CLOUD_SECRET_KEY || null,
    enabled: process.env.BACKUP_CLOUD_ENABLED === 'true' || false
  }
};

/**
 * Validate backup configuration
 * @returns {Object} Validation result with success and errors
 */
function validateConfig() {
  const errors = [];

  // Validate database settings
  if (backupConfig.database.enabled) {
    if (!backupConfig.database.mongoUri) {
      errors.push('Database backup enabled but MONGODB_URI not configured');
    }
    if (backupConfig.database.encryption && !backupConfig.database.encryptionKey) {
      errors.push('Database encryption enabled but BACKUP_ENCRYPTION_KEY not configured');
    }
  }

  // Validate content settings
  if (backupConfig.content.enabled) {
    if (backupConfig.content.maxFileSize <= 0) {
      errors.push('Invalid BACKUP_MAX_FILE_SIZE: must be positive');
    }
    if (backupConfig.content.concurrency <= 0) {
      errors.push('Invalid BACKUP_CONTENT_CONCURRENCY: must be positive');
    }
  }

  // Validate cloud settings
  if (backupConfig.cloud.enabled) {
    if (!backupConfig.cloud.provider) {
      errors.push('Cloud backup enabled but BACKUP_CLOUD_PROVIDER not configured');
    }
    if (!backupConfig.cloud.bucket) {
      errors.push('Cloud backup enabled but BACKUP_CLOUD_BUCKET not configured');
    }
  }

  return {
    success: errors.length === 0,
    errors
  };
}

module.exports = {
  backupConfig,
  validateConfig
};