/**
 * Encryption Service
 * Handles content URL encryption/decryption and key management
 * Uses AES-256-GCM for authenticated encryption
 */

const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * Encryption Configuration
 */
const ENCRYPTION_CONFIG = {
  algorithm: 'aes-256-gcm',
  keyLength: 32, // 256 bits
  ivLength: 12, // 96 bits for GCM
  tagLength: 16, // 128 bits for GCM
  encoding: 'hex'
};

/**
 * Generate a random encryption key
 */
function generateEncryptionKey() {
  try {
    return crypto.randomBytes(ENCRYPTION_CONFIG.keyLength);
  } catch (error) {
    logger.error('Error generating encryption key:', error);
    throw error;
  }
}

/**
 * Generate a random IV (Initialization Vector)
 */
function generateIv() {
  try {
    return crypto.randomBytes(ENCRYPTION_CONFIG.ivLength);
  } catch (error) {
    logger.error('Error generating IV:', error);
    throw error;
  }
}

/**
 * Encrypt content URL with AES-256-GCM
 * Returns: { encryptedData, iv, authTag } all in hex format
 */
function encryptContentUrl(contentUrl, encryptionKey) {
  try {
    if (!contentUrl || typeof contentUrl !== 'string') {
      throw new Error('Invalid content URL');
    }

    if (!encryptionKey || encryptionKey.length !== ENCRYPTION_CONFIG.keyLength) {
      throw new Error('Invalid encryption key');
    }

    const iv = generateIv();
    const cipher = crypto.createCipheriv(ENCRYPTION_CONFIG.algorithm, encryptionKey, iv);

    let encrypted = cipher.update(contentUrl, 'utf8', ENCRYPTION_CONFIG.encoding);
    encrypted += cipher.final(ENCRYPTION_CONFIG.encoding);

    const authTag = cipher.getAuthTag();

    return {
      encryptedData: encrypted,
      iv: iv.toString(ENCRYPTION_CONFIG.encoding),
      authTag: authTag.toString(ENCRYPTION_CONFIG.encoding)
    };
  } catch (error) {
    logger.error('Error encrypting content URL:', error);
    throw error;
  }
}

/**
 * Decrypt content URL using stored encryption metadata
 */
function decryptContentUrl(encryptedData, iv, authTag, encryptionKey) {
  try {
    if (!encryptedData || !iv || !authTag) {
      throw new Error('Missing encryption metadata');
    }

    if (!encryptionKey || encryptionKey.length !== ENCRYPTION_CONFIG.keyLength) {
      throw new Error('Invalid encryption key');
    }

    const decipher = crypto.createDecipheriv(
      ENCRYPTION_CONFIG.algorithm,
      encryptionKey,
      Buffer.from(iv, ENCRYPTION_CONFIG.encoding)
    );

    decipher.setAuthTag(Buffer.from(authTag, ENCRYPTION_CONFIG.encoding));

    let decrypted = decipher.update(encryptedData, ENCRYPTION_CONFIG.encoding, 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    logger.error('Error decrypting content URL:', error);
    throw new Error('Failed to decrypt content. Unauthorized or corrupted data.');
  }
}

/**
 * Generate a content encryption key specific to user and content
 */
function generateContentKey(userId, contentId, masterKey) {
  try {
    const hmac = crypto.createHmac('sha256', masterKey);
    hmac.update(`${userId}:${contentId}`);
    return hmac.digest();
  } catch (error) {
    logger.error('Error generating content key:', error);
    throw error;
  }
}

/**
 * Create encrypted content record
 */
async function encryptContent(ContentEncryption, data) {
  try {
    const {
      contentId,
      userId,
      contentUrl,
      masterKey,
      contentType,
      expiresIn = 86400 * 30 // 30 days default
    } = data;

    // Generate content-specific key
    const contentKey = generateContentKey(userId, contentId, masterKey);

    // Encrypt the content URL
    const { encryptedData, iv, authTag } = encryptContentUrl(contentUrl, contentKey);

    // Calculate expiration time
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    // Create encrypted content record
    const encryptedContent = new ContentEncryption({
      contentId,
      userId,
      contentType,
      encryptedUrl: encryptedData,
      encryptionIv: iv,
      encryptionTag: authTag,
      accessAttempts: 0,
      lastAccessedAt: null,
      expiresAt,
      isActive: true
    });

    await encryptedContent.save();
    logger.info(`Content ${contentId} encrypted for user ${userId}`);

    return encryptedContent;
  } catch (error) {
    logger.error('Error encrypting content:', error);
    throw error;
  }
}

/**
 * Verify and decrypt content for user
 */
async function verifyAndDecryptContent(ContentEncryption, contentId, userId, masterKey) {
  try {
    // Find encrypted content record
    const encryptedContent = await ContentEncryption.findOne({
      contentId,
      userId,
      isActive: true
    });

    if (!encryptedContent) {
      throw new Error('Content not found or access denied');
    }

    // Check if access has expired
    if (encryptedContent.expiresAt && new Date() > encryptedContent.expiresAt) {
      encryptedContent.isActive = false;
      await encryptedContent.save();
      throw new Error('Content access has expired');
    }

    // Generate the same content key
    const contentKey = generateContentKey(userId, contentId, masterKey);

    // Decrypt the content URL
    const decryptedUrl = decryptContentUrl(
      encryptedContent.encryptedUrl,
      encryptedContent.encryptionIv,
      encryptedContent.encryptionTag,
      contentKey
    );

    // Update access metadata
    encryptedContent.accessAttempts = (encryptedContent.accessAttempts || 0) + 1;
    encryptedContent.lastAccessedAt = new Date();
    await encryptedContent.save();

    logger.info(`Content ${contentId} accessed by user ${userId} (attempt ${encryptedContent.accessAttempts})`);

    return {
      contentUrl: decryptedUrl,
      accessAttempts: encryptedContent.accessAttempts,
      expiresAt: encryptedContent.expiresAt
    };
  } catch (error) {
    logger.error('Error verifying and decrypting content:', error);
    throw error;
  }
}

/**
 * Revoke content access
 */
async function revokeContentAccess(ContentEncryption, contentId, userId) {
  try {
    const result = await ContentEncryption.updateOne(
      { contentId, userId },
      { isActive: false, revokedAt: new Date() }
    );

    logger.info(`Content ${contentId} access revoked for user ${userId}`);
    return result;
  } catch (error) {
    logger.error('Error revoking content access:', error);
    throw error;
  }
}

/**
 * Extend content access expiration
 */
async function extendContentAccess(ContentEncryption, contentId, userId, additionalSeconds) {
  try {
    const encryptedContent = await ContentEncryption.findOne({
      contentId,
      userId
    });

    if (!encryptedContent) {
      throw new Error('Content record not found');
    }

    const newExpiresAt = new Date(encryptedContent.expiresAt.getTime() + additionalSeconds * 1000);
    encryptedContent.expiresAt = newExpiresAt;
    await encryptedContent.save();

    logger.info(`Content ${contentId} access extended for user ${userId} until ${newExpiresAt}`);
    return encryptedContent;
  } catch (error) {
    logger.error('Error extending content access:', error);
    throw error;
  }
}

/**
 * Get content access status
 */
async function getContentAccessStatus(ContentEncryption, contentId, userId) {
  try {
    const encryptedContent = await ContentEncryption.findOne({
      contentId,
      userId
    });

    if (!encryptedContent) {
      return {
        hasAccess: false,
        isActive: false
      };
    }

    const isExpired = encryptedContent.expiresAt && new Date() > encryptedContent.expiresAt;

    return {
      hasAccess: encryptedContent.isActive && !isExpired,
      isActive: encryptedContent.isActive,
      isExpired,
      expiresAt: encryptedContent.expiresAt,
      accessAttempts: encryptedContent.accessAttempts,
      lastAccessedAt: encryptedContent.lastAccessedAt
    };
  } catch (error) {
    logger.error('Error getting content access status:', error);
    throw error;
  }
}

/**
 * Get user's decrypted content URLs (admin/user retrieval)
 */
async function getUserDecryptedContents(ContentEncryption, userId, masterKey, options = {}) {
  try {
    const {
      activeOnly = true,
      limit = 100,
      skip = 0
    } = options;

    let query = ContentEncryption.find({ userId });

    if (activeOnly) {
      query = query.where('isActive', true);
    }

    const contents = await query
      .sort('-createdAt')
      .skip(skip)
      .limit(limit)
      .lean();

    // Decrypt URLs for each content
    const decryptedContents = contents.map(content => {
      try {
        const contentKey = generateContentKey(userId, content.contentId, masterKey);
        const decryptedUrl = decryptContentUrl(
          content.encryptedUrl,
          content.encryptionIv,
          content.encryptionTag,
          contentKey
        );

        return {
          ...content,
          decryptedUrl,
          isExpired: content.expiresAt && new Date() > content.expiresAt
        };
      } catch (error) {
        logger.error(`Failed to decrypt content ${content.contentId}:`, error);
        return {
          ...content,
          decryptedUrl: null,
          decryptionError: error.message
        };
      }
    });

    return decryptedContents;
  } catch (error) {
    logger.error('Error getting user decrypted contents:', error);
    throw error;
  }
}

/**
 * Clean up expired content access records
 */
async function cleanupExpiredAccess(ContentEncryption) {
  try {
    const result = await ContentEncryption.updateMany(
      { expiresAt: { $lt: new Date() }, isActive: true },
      { isActive: false, expiredAt: new Date() }
    );

    logger.info(`Cleaned up ${result.modifiedCount} expired content access records`);
    return result;
  } catch (error) {
    logger.error('Error cleaning up expired access:', error);
    throw error;
  }
}

/**
 * Export for use
 */
module.exports = {
  // Key generation
  generateEncryptionKey,
  generateIv,
  generateContentKey,

  // Encryption/Decryption
  encryptContentUrl,
  decryptContentUrl,

  // Content management
  encryptContent,
  verifyAndDecryptContent,
  revokeContentAccess,
  extendContentAccess,
  getContentAccessStatus,
  getUserDecryptedContents,
  cleanupExpiredAccess,

  // Constants
  ENCRYPTION_CONFIG
};
