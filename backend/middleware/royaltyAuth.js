const Collaborator = require('../models/Collaborator');
const Content = require('../models/Content');

/**
 * Middleware to verify that caller is the content creator
 */
async function verifyContentCreator(req, res, next) {
  try {
    const { contentId } = req.params;
    const creatorAddress = req.headers['x-creator-address'] || req.body.creator;

    if (!creatorAddress) {
      return res.status(401).json({ message: 'Creator address required' });
    }

    const content = await Content.findOne({ contentId: parseInt(contentId) });
    if (!content) {
      return res.status(404).json({ message: 'Content not found' });
    }

    if (content.creator !== creatorAddress) {
      return res.status(403).json({ message: 'Only the content creator can manage collaborators' });
    }

    req.contentCreator = creatorAddress;
    req.content = content;
    next();
  } catch (err) {
    res.status(500).json({ message: 'Failed to verify creator', error: err.message });
  }
}

/**
 * Middleware to validate royalty percentage
 */
async function validateRoyaltyAllocation(req, res, next) {
  try {
    const { royaltyPercentage } = req.body;

    if (typeof royaltyPercentage !== 'number' || royaltyPercentage < 0 || royaltyPercentage > 100) {
      return res.status(400).json({ message: 'Royalty percentage must be a number between 0 and 100' });
    }

    next();
  } catch (err) {
    res.status(400).json({ message: 'Invalid royalty data', error: err.message });
  }
}

/**
 * Middleware to validate collaborator address format
 */
function validateAddress(req, res, next) {
  const { address } = req.body;

  if (!address || typeof address !== 'string' || address.trim().length === 0) {
    return res.status(400).json({ message: 'Valid collaborator address is required' });
  }

  next();
}

module.exports = {
  verifyContentCreator,
  validateRoyaltyAllocation,
  validateAddress
};
