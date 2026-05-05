/**
 * Encryption Routes
 * REST API endpoints for content encryption and decryption
 */

const express = require('express');
const router = express.Router();
const encryptionService = require('../services/encryptionService');
const ContentEncryption = require('../models/ContentEncryption');
const { authMiddleware } = require('../middleware/auth');

// Middleware: Require authentication for all encryption routes
router.use(authMiddleware);

// Get master encryption key from environment or secure storage
const getMasterKey = () => {
  // In production, this should be stored in a secure vault (AWS KMS, HashiCorp Vault, etc.)
  const masterKey = process.env.CONTENT_ENCRYPTION_MASTER_KEY;
  if (!masterKey) {
    throw new Error('Master encryption key not configured');
  }
  return Buffer.from(masterKey, 'hex');
};

/**
 * POST /api/encryption/encrypt-content
 * Encrypt content URL for a purchased item
 */
router.post('/encrypt-content', async (req, res) => {
  try {
    const { contentId, contentUrl, contentType, expiresIn } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!contentId || !contentUrl || !contentType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: contentId, contentUrl, contentType'
      });
    }

    const masterKey = getMasterKey();

    // Encrypt and store content
    const encryptedContent = await encryptionService.encryptContent(
      ContentEncryption,
      {
        contentId,
        userId,
        contentUrl,
        masterKey,
        contentType,
        expiresIn: expiresIn || 86400 * 30 // Default 30 days
      }
    );

    res.json({
      success: true,
      data: {
        id: encryptedContent._id,
        contentId: encryptedContent.contentId,
        expiresAt: encryptedContent.expiresAt
      }
    });
  } catch (error) {
    console.error('Error encrypting content:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to encrypt content'
    });
  }
});

/**
 * POST /api/encryption/decrypt-content/:contentId
 * Decrypt and retrieve content URL for verified user
 */
router.post('/decrypt-content/:contentId', async (req, res) => {
  try {
    const { contentId } = req.params;
    const userId = req.user.id;

    if (!contentId) {
      return res.status(400).json({
        success: false,
        error: 'Content ID is required'
      });
    }

    const masterKey = getMasterKey();

    // Verify access and decrypt
    const decryptedContent = await encryptionService.verifyAndDecryptContent(
      ContentEncryption,
      contentId,
      userId,
      masterKey
    );

    res.json({
      success: true,
      data: {
        contentUrl: decryptedContent.contentUrl,
        accessAttempts: decryptedContent.accessAttempts,
        expiresAt: decryptedContent.expiresAt
      }
    });
  } catch (error) {
    console.error('Error decrypting content:', error);
    res.status(403).json({
      success: false,
      error: error.message || 'Failed to decrypt content'
    });
  }
});

/**
 * GET /api/encryption/content-status/:contentId
 * Get content access status for user
 */
router.get('/content-status/:contentId', async (req, res) => {
  try {
    const { contentId } = req.params;
    const userId = req.user.id;

    const status = await encryptionService.getContentAccessStatus(
      ContentEncryption,
      contentId,
      userId
    );

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Error getting content status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get content status'
    });
  }
});

/**
 * GET /api/encryption/my-contents
 * Get user's decrypted content list
 */
router.get('/my-contents', async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20, skip = 0, activeOnly = 'true' } = req.query;

    const masterKey = getMasterKey();

    const contents = await encryptionService.getUserDecryptedContents(
      ContentEncryption,
      userId,
      masterKey,
      {
        activeOnly: activeOnly === 'true',
        limit: parseInt(limit),
        skip: parseInt(skip)
      }
    );

    const total = await ContentEncryption.countDocuments({
      userId,
      isActive: activeOnly === 'true'
    });

    res.json({
      success: true,
      data: {
        contents,
        pagination: {
          total,
          limit: parseInt(limit),
          skip: parseInt(skip)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching user contents:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch contents'
    });
  }
});

/**
 * PUT /api/encryption/revoke-access/:contentId
 * Revoke content access
 */
router.put('/revoke-access/:contentId', async (req, res) => {
  try {
    const { contentId } = req.params;
    const userId = req.user.id;

    const result = await encryptionService.revokeContentAccess(
      ContentEncryption,
      contentId,
      userId
    );

    res.json({
      success: true,
      data: {
        revokedCount: result.modifiedCount
      }
    });
  } catch (error) {
    console.error('Error revoking access:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to revoke access'
    });
  }
});

/**
 * PUT /api/encryption/extend-access/:contentId
 * Extend content access expiration
 */
router.put('/extend-access/:contentId', async (req, res) => {
  try {
    const { contentId } = req.params;
    const { additionalSeconds } = req.body;
    const userId = req.user.id;

    if (!additionalSeconds || additionalSeconds <= 0) {
      return res.status(400).json({
        success: false,
        error: 'additionalSeconds must be greater than 0'
      });
    }

    const result = await encryptionService.extendContentAccess(
      ContentEncryption,
      contentId,
      userId,
      additionalSeconds
    );

    res.json({
      success: true,
      data: {
        contentId: result.contentId,
        newExpiresAt: result.expiresAt
      }
    });
  } catch (error) {
    console.error('Error extending access:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to extend access'
    });
  }
});

/**
 * GET /api/encryption/key-info
 * Get encryption key information (for security auditing)
 */
router.get('/key-info', async (req, res) => {
  try {
    // Only admin users should have access to this
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    res.json({
      success: true,
      data: {
        algorithm: encryptionService.ENCRYPTION_CONFIG.algorithm,
        keyLength: encryptionService.ENCRYPTION_CONFIG.keyLength,
        ivLength: encryptionService.ENCRYPTION_CONFIG.ivLength,
        tagLength: encryptionService.ENCRYPTION_CONFIG.tagLength
      }
    });
  } catch (error) {
    console.error('Error getting key info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get key information'
    });
  }
});

/**
 * POST /api/encryption/cleanup-expired
 * Clean up expired access records (admin only, cron job friendly)
 */
router.post('/cleanup-expired', async (req, res) => {
  try {
    // Only admin users should have access to this
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const result = await encryptionService.cleanupExpiredAccess(ContentEncryption);

    res.json({
      success: true,
      data: {
        cleanedUpCount: result.modifiedCount
      }
    });
  } catch (error) {
    console.error('Error cleaning up expired access:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup expired access'
    });
  }
});

/**
 * GET /api/encryption/stats
 * Get encryption statistics (admin only)
 */
router.get('/stats', async (req, res) => {
  try {
    // Only admin users should have access
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const totalEncrypted = await ContentEncryption.countDocuments({});
    const activeAccess = await ContentEncryption.countDocuments({
      isActive: true,
      expiresAt: { $gt: new Date() }
    });
    const expiredAccess = await ContentEncryption.countDocuments({
      isActive: false
    });
    const revokedAccess = await ContentEncryption.countDocuments({
      revokedAt: { $exists: true }
    });

    res.json({
      success: true,
      data: {
        totalEncrypted,
        activeAccess,
        expiredAccess,
        revokedAccess
      }
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get statistics'
    });
  }
});

module.exports = router;
