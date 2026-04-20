/**
 * Moderation Authentication Middleware
 * Verifies moderator/admin permissions for moderation endpoints
 */

const ModerationQueue = require('../models/ModerationQueue');
const logger = require('../utils/logger');

/**
 * Parse a comma-separated list of Stacks addresses from an env var.
 * Trims whitespace from each entry and removes empty strings.
 */
function parseAddressList(envValue) {
  if (!envValue) return [];
  return envValue
    .split(',')
    .map(addr => addr.trim())
    .filter(addr => addr.length > 0)
    .filter(addr => {
      const valid = /^S[PT][A-Z0-9]{33,}$/.test(addr);
      if (!valid) logger.warn('parseAddressList: ignoring invalid Stacks address format', { addr });
      return valid;
    });
}

/**
 * Verify user is a moderator
 * Checks if user address is in authorized moderators list
 */
async function verifyModerator(req, res, next) {
  try {
    const moderatorAddress = req.user?.address || req.walletAddress;

    if (!moderatorAddress) {
      return res.status(401).json({
        success: false,
        error: 'Authorization required - no wallet address found'
      });
    }

    const authorizedModerators = parseAddressList(process.env.AUTHORIZED_MODERATORS);
    if (authorizedModerators.length === 0) {
      logger.warn('AUTHORIZED_MODERATORS is not configured — all moderator access will be denied');
    }
    const isAuthorized = authorizedModerators.some(
      addr => addr.toLowerCase() === moderatorAddress.toLowerCase()
    );

    if (!isAuthorized) {
      logger.warn('Unauthorized moderator access attempt', { address: moderatorAddress.toLowerCase() });
      return res.status(403).json({
        success: false,
        error: 'You do not have moderator permissions'
      });
    }

    req.moderator = {
      address: moderatorAddress.toLowerCase(),
      isAuthorized: true
    };

    logger.info('Moderator access granted', { address: moderatorAddress.toLowerCase() });
    next();
  } catch (error) {
    logger.error('Moderator verification error', { err: error });
    res.status(500).json({
      success: false,
      error: 'Authorization verification failed'
    });
  }
}

/**
 * Verify user is an admin
 * Higher permission level than moderator
 */
async function verifyAdmin(req, res, next) {
  try {
    const adminAddress = req.user?.address || req.walletAddress;

    if (!adminAddress) {
      return res.status(401).json({
        success: false,
        error: 'Authorization required - no wallet address found'
      });
    }

    const authorizedAdmins = parseAddressList(process.env.AUTHORIZED_ADMINS);
    if (authorizedAdmins.length === 0) {
      logger.warn('AUTHORIZED_ADMINS is not configured — all admin access will be denied');
    }
    const isAuthorized = authorizedAdmins.some(
      addr => addr.toLowerCase() === adminAddress.toLowerCase()
    );

    if (!isAuthorized) {
      logger.warn('Unauthorized admin access attempt', { address: adminAddress.toLowerCase() });
      return res.status(403).json({
        success: false,
        error: 'You do not have admin permissions'
      });
    }

    req.admin = {
      address: adminAddress.toLowerCase(),
      isAuthorized: true
    };

    logger.info('Admin access granted', { address: adminAddress.toLowerCase() });
    next();
  } catch (error) {
    logger.error('Admin verification error', { err: error });
    res.status(500).json({
      success: false,
      error: 'Authorization verification failed'
    });
  }
}

/**
 * Verify moderator can access specific queue entry
 */
async function verifyQueueAccess(req, res, next) {
  try {
    const { queueId } = req.params;
    const moderatorAddress = req.moderator?.address;

    if (!queueId) {
      return res.status(400).json({
        success: false,
        error: 'Queue ID is required'
      });
    }

    const queue = await ModerationQueue.findOne({ queueId: parseInt(queueId) });

    if (!queue) {
      return res.status(404).json({
        success: false,
        error: 'Queue entry not found'
      });
    }

    // Allow access if assigned to this moderator or user is admin
    const hasAccess = req.admin?.isAuthorized ||
      queue.assignedModerator === moderatorAddress ||
      queue.status === 'pending';

    if (!hasAccess) {
      logger.warn('Queue access denied', { queueId, moderatorAddress: moderatorAddress || 'unknown' });
      return res.status(403).json({
        success: false,
        error: 'You do not have access to this queue entry'
      });
    }

    req.queue = queue;
    logger.info('Queue access granted', { queueId, moderatorAddress: moderatorAddress || 'admin' });
    next();
  } catch (error) {
    logger.error('Queue access verification error', { err: error });
    res.status(500).json({
      success: false,
      error: 'Access verification failed'
    });
  }
}

/**
 * Verify user is content creator (for appeals)
 */
async function verifyContentCreator(req, res, next) {
  try {
    const { contentId } = req.params;
    const userAddress = req.user?.address || req.walletAddress;

    if (!contentId || !userAddress) {
      return res.status(400).json({
        success: false,
        error: 'Content ID and user address required'
      });
    }

    const Content = require('../models/Content');
    const content = await Content.findOne({ contentId: parseInt(contentId) });

    if (!content) {
      return res.status(404).json({
        success: false,
        error: 'Content not found'
      });
    }

    if (content.creator.toLowerCase() !== userAddress.toLowerCase()) {
      return res.status(403).json({
        success: false,
        error: 'Only the content creator can perform this action'
      });
    }

    req.content = content;
    next();
  } catch (error) {
    logger.error('Content creator verification error', { err: error });
    res.status(500).json({
      success: false,
      error: 'Creator verification failed'
    });
  }
}

module.exports = {
  verifyModerator,
  verifyAdmin,
  verifyQueueAccess,
  verifyContentCreator,
  parseAddressList,
};
