const logger = require('../utils/logger');
const express = require('express');
const router = express.Router();
const Content = require('../models/Content');
const ContentEncryption = require('../models/ContentEncryption');
const encryptionService = require('../services/encryptionService');
const { verifyContentAccess, rateLimitMiddleware } = require('../middleware/accessControl');
const { getContentFromStorage } = require('../services/storageService');

const getMasterKey = () => {
  const masterKeyHex = process.env.CONTENT_ENCRYPTION_MASTER_KEY;
  if (!masterKeyHex) {
    throw new Error('Master encryption key not configured');
  }
  const masterKey = Buffer.from(masterKeyHex, 'hex');
  if (masterKey.length !== encryptionService.ENCRYPTION_CONFIG.keyLength) {
    throw new Error('Master encryption key must be 32 bytes in hex format');
  }
  return masterKey;
};

/**
 * Serve gated content with access verification
 */
router.get('/:contentId/stream', verifyContentAccess, rateLimitMiddleware, async (req, res) => {
  try {
    const { contentId } = req.params;
    const content = await Content.findOne({ contentId: parseInt(contentId) });

    if (!content) {
      return res.status(404).json({ message: 'Content not found' });
    }

    let contentData;

    if (content.isEncrypted) {
      logger.info(`Decrypting premium content ${contentId} for authorized user`);
      const masterKey = getMasterKey();
      contentData = await encryptionService.decryptFileForAuthorizedUser(ContentEncryption, parseInt(contentId), masterKey);
    } else {
      contentData = await getContentFromStorage(content.url, content.storageType);
    }
    
    res.setHeader('Content-Type', getContentType(content.contentType));
    res.setHeader('X-Access-Method', req.accessInfo.method);
    res.send(contentData);
  } catch (err) {
    logger.error('Content delivery error', { err });
    res.status(500).json({ message: 'Failed to deliver content', error: err.message });
  }
});

/**
 * Get content metadata (public)
 */
router.get('/:contentId/metadata', async (req, res) => {
  try {
    const { contentId } = req.params;
    const content = await Content.findOne({ contentId: parseInt(contentId) })
      .select('-url');

    if (!content) {
      return res.status(404).json({ message: 'Content not found' });
    }

    res.json(content);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch metadata', error: err.message });
  }
});

/**
 * Generate temporary access token
 */
router.post('/:contentId/access-token', verifyContentAccess, async (req, res) => {
  try {
    const { contentId } = req.params;
    const token = generateAccessToken(req.userAddress, contentId);
    
    res.json({ 
      token,
      expiresIn: 3600,
      contentId: parseInt(contentId)
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to generate token', error: err.message });
  }
});

function getContentType(type) {
  const types = {
    video: 'video/mp4',
    audio: 'audio/mpeg',
    image: 'image/jpeg',
    article: 'text/html'
  };
  return types[type] || 'application/octet-stream';
}

function generateAccessToken(userAddress, contentId) {
  const crypto = require('crypto');
  const payload = `${userAddress}:${contentId}:${Date.now()}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

module.exports = router;
