const express = require('express');
const router = express.Router();
const multer = require('multer');
const Content = require('../models/Content');
const { uploadToIPFS } = require('../services/storageService');

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
router.post('/upload', upload.single('file'), async (req, res) => {
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
