const express = require('express');
const router = express.Router();
const Content = require('../models/Content');

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
