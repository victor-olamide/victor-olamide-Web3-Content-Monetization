const logger = require('../utils/logger');
const express = require('express');
const router = express.Router();
const multer = require('multer');
const Content = require('../models/Content');
const Purchase = require('../models/Purchase');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const encryptionService = require('../services/encryptionService');
const ContentEncryption = require('../models/ContentEncryption');
const { uploadToIPFS } = require('../services/storageService');
const { uploadFileToIPFS, uploadMetadataToIPFS, getGatewayUrl } = require('../services/ipfsService');
const { pinningManager } = require('../services/pinningManager');
const { addContentToContract, removeContentFromContract } = require('../services/contractService');
const { verifyCreatorOwnership, checkContentNotRemoved } = require('../middleware/creatorAuth');
const { initiateRefund, getPendingRefundsForCreator } = require('../services/refundService');
const searchService = require('../services/searchService');
const { validateContentBody } = require('../middleware/inputValidation');
const { shouldEncryptContent } = require('../utils/contentUtils');

const getTokenFromRequest = (req) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    return req.headers.authorization.split(' ')[1];
  }
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }
  return null;
};

const authenticateUser = async (req) => {
  const token = getTokenFromRequest(req);
  if (!token) {
    throw new Error('Authentication required');
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
  const user = await User.findById(decoded.id);
  if (!user) {
    throw new Error('Authentication required');
  }

  req.user = user;
  return user;
};

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'video/mp4', 'audio/mpeg', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed types: JPEG, PNG, MP4, MP3, PDF'));
    }
  }
});

// Upload content to IPFS
router.post('/upload', (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: 'Multer error', error: err.message });
    } else if (err) {
      return res.status(400).json({ message: 'Upload error', error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    try {
      const ipfsUrl = await uploadToIPFS(req.file.buffer, req.file.originalname);
      res.json({ url: ipfsUrl });
    } catch (err) {
      res.status(500).json({ message: 'Failed to upload to IPFS', error: err.message });
    }
  });
});

// Search endpoint for content discovery
router.get('/search', async (req, res) => {
  try {
    const results = await searchService.searchContent(req.query);
    res.json(results);
  } catch (err) {
    logger.error('Content search error', { err });
    res.status(500).json({ message: 'Failed to perform search', error: err.message });
  }
});

// Enhanced IPFS upload with progress tracking and retry logic
router.post('/upload-ipfs', (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: 'Multer error', error: err.message });
    } else if (err) {
      return res.status(400).json({ message: 'Upload error', error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    try {
      const { metadata, tags } = req.body;
      const parsedMetadata = metadata ? JSON.parse(metadata) : {};
      const parsedTags = tags ? tags.split(',').map(t => t.trim()) : [];

      console.log(`[IPFS Upload] Starting upload for ${req.file.originalname}`);

      // Upload file to IPFS with retry logic
      let ipfsHash;
      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts) {
        try {
          // Mock progress reporting (in production, use streaming)
          res.write(`data: {"status":"uploading","progress":${Math.min(attempts * 30, 90)}} \n\n`);
          
          ipfsHash = await uploadFileToIPFS(
            req.file.buffer,
            req.file.originalname,
            {
              metadata: parsedMetadata,
              tags: parsedTags,
              public: true
            },
            (percent) => {
              // Progress callback - could be streamed to client in production
              console.log(`[IPFS Upload] Progress: ${percent}%`);
            }
          );
          break;
        } catch (err) {
          attempts++;
          console.error(`[IPFS Upload] Attempt ${attempts} failed:`, err.message);
          if (attempts >= maxAttempts) {
            throw err;
          }
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempts - 1)));
        }
      }

      const ipfsUrl = `ipfs://${ipfsHash}`;
      const gatewayUrl = getGatewayUrl(ipfsUrl);

      console.log(`[IPFS Upload] Successfully uploaded: ${ipfsUrl}`);

      res.json({
        success: true,
        ipfsHash,
        ipfsUrl,
        gatewayUrl,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        contentType: req.file.mimetype
      });
    } catch (err) {
      logger.error('[IPFS Upload] Error', { err });
      res.status(500).json({
        success: false,
        message: 'Failed to upload to IPFS',
        error: err.message
      });
    }
  });
});

// Upload and register to Clarity contract
router.post('/upload-and-register', (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err) return res.status(400).json({ message: 'Upload error', error: err.message });
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const { contentId, price, title, description, contentType, creator, encrypt } = req.body;
    const shouldEncrypt = shouldEncryptContent(parseFloat(price), String(encrypt || req.body.isEncrypted || '').toLowerCase() === 'true');

    if (!contentId || !price || !title || !creator) {
      return res.status(400).json({ message: 'Missing required fields: contentId, price, title, creator' });
    }

    try {
      let ipfsUrl;
      let isEncrypted = false;
      let uploadBuffer = req.file.buffer;

      if (shouldEncrypt) {
        let user;
        try {
          user = await authenticateUser(req);
        } catch (authErr) {
          return res.status(401).json({ message: 'Authentication required for encrypted uploads', error: authErr.message });
        }

        const masterKeyHex = process.env.CONTENT_ENCRYPTION_MASTER_KEY;
        if (!masterKeyHex) {
          return res.status(500).json({ message: 'Content encryption master key is not configured' });
        }

        const masterKey = Buffer.from(masterKeyHex, 'hex');
        const contentKey = encryptionService.generateEncryptionKey();
        const fileEncryption = encryptionService.encryptBuffer(req.file.buffer, contentKey);
        const wrappedKey = encryptionService.wrapContentKey(contentKey, masterKey);

        uploadBuffer = fileEncryption.encryptedData;
        ipfsUrl = await uploadToIPFS(uploadBuffer, req.file.originalname);
        isEncrypted = true;

        const contentEncryptionRecord = new ContentEncryption({
          contentId: parseInt(contentId),
          userId: user._id,
          contentType: contentType || 'file',
          encryptedUrl: wrappedKey.encryptedKey,
          encryptionIv: wrappedKey.iv,
          encryptionTag: wrappedKey.authTag,
          encryptedFileKey: wrappedKey.encryptedKey,
          encryptionKeyIv: wrappedKey.iv,
          encryptionKeyTag: wrappedKey.authTag,
          fileEncryptionIv: fileEncryption.iv,
          fileEncryptionTag: fileEncryption.authTag,
          encryptedFileUrl: ipfsUrl,
          isEncryptedContent: true,
          accessAttempts: 0,
          lastAccessedAt: null,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          isActive: true,
          purchaseTransactionId: null,
          metadata: {
            uploadedBy: user._id.toString(),
            originalFileName: req.file.originalname
          }
        });

        await contentEncryptionRecord.save();
      } else {
        ipfsUrl = await uploadToIPFS(uploadBuffer, req.file.originalname);
      }

      // 2. Register on Smart Contract
      const txResult = await addContentToContract(
        parseInt(contentId), 
        parseInt(price), 
        ipfsUrl,
        process.env.CREATOR_PRIVATE_KEY
      );

      // 3. Save metadata to DB
      const content = new Content({
        contentId,
        title: req.body.title,
        description: req.body.description,
        contentType: req.body.contentType,
        price,
        creator: req.body.creator,
        url: ipfsUrl,
        storageType: 'ipfs',
        isEncrypted,
        encryptionAlgorithm: shouldEncrypt ? encryptionService.ENCRYPTION_CONFIG.algorithm : undefined
      });
      const newContent = await content.save();

      // 4. Pin content for reliability
      try {
        console.log(`[Content Creation] Starting to pin content ${contentId}`);
        await pinningManager.pinContent(newContent, uploadBuffer, req.file.originalname);
        console.log(`[Content Creation] Successfully pinned content ${contentId}`);
      } catch (pinningError) {
        console.error(`[Content Creation] Failed to pin content ${contentId}:`, pinningError.message);
        // Don't fail the entire operation if pinning fails, but log it
      }

      res.status(201).json({
        message: 'Content uploaded and registered successfully',
        content: newContent,
        transactionId: txResult.txid,
        encrypted: isEncrypted
      });
    } catch (err) {
      res.status(500).json({ message: 'Integration failed', error: err.message });
    }
  });
});

// Get single content metadata by contentId
router.get('/:contentId', async (req, res) => {
  try {
    const content = await Content.findOne({ contentId: req.params.contentId });
    if (!content) return res.status(404).json({ message: 'Content not found' });
    res.json(content);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all content metadata with pagination, filtering by category/creator, and keyword search
router.get('/', async (req, res) => {
  try {
    const results = await searchService.searchContent(req.query);
    res.json(results);
  } catch (err) {
    console.error('Content listing error:', err);
    res.status(500).json({ message: 'Failed to retrieve content', error: err.message });
  }
});

// Create new content metadata
router.post('/', validateContentBody, async (req, res) => {
  const { contentId, title, description, contentType, price, creator, url, tokenGating } = req.validatedBody;
  const content = new Content({
    contentId,
    title,
    description,
    contentType,
    price,
    creator,
    url,
    tokenGating: tokenGating || { enabled: false }
  });

  try {
    const newContent = await content.save();
    res.status(201).json(newContent);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Remove content and initiate refunds
router.post('/:contentId/remove', verifyCreatorOwnership, async (req, res) => {
  try {
    const { contentId } = req.params;
    const { reason = 'Creator requested removal' } = req.body;
    const creatorKey = process.env.CREATOR_PRIVATE_KEY;

    if (!creatorKey) {
      return res.status(500).json({ message: 'Creator private key not configured' });
    }

    const content = req.content;

    // 1. Remove from smart contract
    let txId = null;
    try {
      const txResult = await removeContentFromContract(parseInt(contentId), creatorKey);
      txId = txResult.txid;
    } catch (contractErr) {
      logger.error('Contract removal error:', contractErr);
      return res.status(500).json({ 
        message: 'Failed to remove content from blockchain', 
        error: contractErr.message 
      });
    }

    // 2. Mark content as removed in database
    content.isRemoved = true;
    content.removedAt = new Date();
    content.removalReason = reason;
    await content.save();

    // 3. Unpin content from IPFS providers
    try {
      console.log(`[Content Removal] Starting to unpin content ${contentId}`);
      await pinningManager.unpinContent(content);
      console.log(`[Content Removal] Successfully unpinned content ${contentId}`);
    } catch (unpinningError) {
      console.error(`[Content Removal] Failed to unpin content ${contentId}:`, unpinningError.message);
      // Don't fail the entire operation if unpinning fails, but log it
    }

    // 4. Find all purchases for this content
    const purchases = await Purchase.find({ contentId: parseInt(contentId) });

    // 4. Initiate refunds for eligible purchases
    const refundResults = [];
    for (const purchase of purchases) {
      const refundResult = await initiateRefund(purchase._id, 'content-removed');
      refundResults.push({
        purchaseId: purchase._id,
        user: purchase.user,
        success: refundResult.success,
        message: refundResult.message
      });
    }

    res.json({
      message: 'Content removed successfully',
      content: {
        contentId,
        isRemoved: true,
        removedAt: content.removedAt,
        removalReason: reason
      },
      transactionId: txId,
      refunds: {
        totalPurchases: purchases.length,
        refundsInitiated: refundResults.filter(r => r.success).length,
        results: refundResults
      }
    });
  } catch (err) {
    logger.error('Content removal error', { err });
    res.status(500).json({ message: 'Failed to remove content', error: err.message });
  }
});

// Update content metadata and price (creators only)
router.patch('/:contentId', verifyCreatorOwnership, async (req, res) => {
  try {
    const { contentId } = req.params;
    const content = req.content; // set by verifyCreatorOwnership
    const updates = {};

    // Allowed updatable fields
    const updatable = ['title', 'description', 'contentType', 'price', 'url', 'tokenGating', 'refundable', 'refundWindowDays'];

    updatable.forEach(field => {
      if (typeof req.body[field] !== 'undefined') updates[field] = req.body[field];
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    // If price is being updated, validate and update on-chain as well
    let txResult = null;
    if (typeof updates.price !== 'undefined') {
      const newPrice = parseInt(updates.price);
      if (isNaN(newPrice) || newPrice < 0) {
        return res.status(400).json({ message: 'Invalid price value' });
      }

      // update on-chain using creator's private key
      const creatorKey = process.env.CREATOR_PRIVATE_KEY;
      if (!creatorKey) {
        return res.status(500).json({ message: 'Creator private key not configured for on-chain update' });
      }

      try {
        const { updateContentPrice } = require('../services/contractService');
        txResult = await updateContentPrice(parseInt(contentId), newPrice, creatorKey);
      } catch (err) {
        logger.error('Failed to update price on-chain', { err });
        return res.status(500).json({ message: 'Failed to update price on-chain', error: err.message });
      }
    }

    // Apply updates to DB
    Object.keys(updates).forEach(k => {
      content[k] = updates[k];
    });

    await content.save();

    res.json({
      message: 'Content updated successfully',
      content,
      transactionId: txResult ? txResult.txid : null
    });
  } catch (err) {
    logger.error('Content update error', { err });
    res.status(500).json({ message: 'Failed to update content', error: err.message });
  }
});

// Get refund status for a content
router.get('/:contentId/refunds', verifyCreatorOwnership, async (req, res) => {
  try {
    const { contentId } = req.params;
    const creatorAddress = req.creatorAddress;

    const refunds = await getPendingRefundsForCreator(creatorAddress);
    const contentRefunds = refunds.filter(r => r.contentId === parseInt(contentId));

    res.json({
      contentId,
      totalRefunds: contentRefunds.length,
      refunds: contentRefunds
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch refund status', error: err.message });
  }
});

module.exports = router;
