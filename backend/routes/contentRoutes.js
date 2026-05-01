const express = require('express');
const router = express.Router();
const multer = require('multer');
const Content = require('../models/Content');
const { uploadToIPFS } = require('../services/storageService');
const { addContentToContract } = require('../services/contractService');

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
    url: req.body.url
  });

  try {
    const newContent = await content.save();
    res.status(201).json(newContent);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
