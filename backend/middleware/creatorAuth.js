/**
 * Middleware to verify creator ownership of content
 */
const Content = require('../models/Content');

async function verifyCreatorOwnership(req, res, next) {
  try {
    const { contentId } = req.params;
    const creatorAddress = req.headers['x-creator-address'] || req.body.creator;

    if (!creatorAddress) {
      return res.status(401).json({
        message: 'Authentication required',
        error: 'No creator address provided'
      });
    }

    const content = await Content.findOne({ contentId: parseInt(contentId) });

    if (!content) {
      return res.status(404).json({
        message: 'Content not found',
        error: 'The specified content does not exist'
      });
    }

    if (content.creator !== creatorAddress) {
      return res.status(403).json({
        message: 'Access denied',
        error: 'Only the content creator can perform this action'
      });
    }

    req.content = content;
    req.creatorAddress = creatorAddress;
    next();
  } catch (err) {
    console.error('Creator verification middleware error:', err);
    res.status(500).json({
      message: 'Failed to verify creator ownership',
      error: err.message
    });
  }
}

/**
 * Middleware to check if content is already removed
 */
async function checkContentNotRemoved(req, res, next) {
  try {
    const { contentId } = req.params;
    const content = await Content.findOne({ contentId: parseInt(contentId) });

    if (!content) {
      return res.status(404).json({
        message: 'Content not found'
      });
    }

    if (content.isRemoved) {
      return res.status(410).json({
        message: 'Content has been removed',
        error: 'This content is no longer available',
        removedAt: content.removedAt,
        removalReason: content.removalReason
      });
    }

    req.content = content;
    next();
  } catch (err) {
    console.error('Content status check error:', err);
    res.status(500).json({
      message: 'Failed to check content status',
      error: err.message
    });
  }
}

module.exports = {
  verifyCreatorOwnership,
  checkContentNotRemoved
};
