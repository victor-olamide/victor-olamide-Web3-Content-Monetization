const express = require('express');
const router = express.Router();
const multer = require('multer');
const Content = require('../models/Content');
const Purchase = require('../models/Purchase');
const { uploadToIPFS } = require('../services/storageService');
const { uploadFileToIPFS, uploadMetadataToIPFS, getGatewayUrl } = require('../services/ipfsService');
const { addContentToContract, removeContentFromContract } = require('../services/contractService');
const { verifyCreatorOwnership, checkContentNotRemoved } = require('../middleware/creatorAuth');
const { initiateRefund, getPendingRefundsForCreator } = require('../services/refundService');

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
      console.error('[IPFS Upload] Error:', err);
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

    const { contentId, price, title, description, contentType, creator } = req.body;
    
    if (!contentId || !price || !title || !creator) {
      return res.status(400).json({ message: 'Missing required fields: contentId, price, title, creator' });
    }

    try {
      // 1. Upload to IPFS
      const ipfsUrl = await uploadToIPFS(req.file.buffer, req.file.originalname);
      
      // 2. Register on Smart Contract
      const { contentId, price } = req.body;
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
        storageType: 'ipfs'
      });
      const newContent = await content.save();

      res.status(201).json({
        message: 'Content uploaded and registered successfully',
        content: newContent,
        transactionId: txResult.txid
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

// Get all content metadata
router.get('/', async (req, res) => {
  try {
    const content = await Content.find();
    res.json(content);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create new content metadata
router.post('/', async (req, res) => {
  const content = new Content({
    contentId: req.body.contentId,
    title: req.body.title,
    description: req.body.description,
    contentType: req.body.contentType,
    price: req.body.price,
    creator: req.body.creator,
    url: req.body.url,
    tokenGating: req.body.tokenGating || { enabled: false }
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
      console.error('Contract removal error:', contractErr);
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

    // 3. Find all purchases for this content
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
    console.error('Content removal error:', err);
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
        console.error('Failed to update price on-chain:', err);
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
    console.error('Content update error:', err);
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
