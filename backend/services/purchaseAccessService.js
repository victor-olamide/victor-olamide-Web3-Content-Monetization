const express = require('express');
const router = express.Router();
const Purchase = require('../models/Purchase');
const Content = require('../models/Content');
const { accessService } = require('../services/accessService');
const TransactionHistory = require('../models/TransactionHistory');

/**
 * Grant access to user for purchased content
 * Called after successful purchase verification
 */
async function grantAccessToContent(contentId, userAddress, purchaseRecord) {
  try {
    // Update purchase status
    purchaseRecord.accessGranted = true;
    purchaseRecord.accessGrantedAt = new Date();
    await purchaseRecord.save();

    // Log access event
    console.log(`Access granted to user ${userAddress} for content ${contentId}`);

    return {
      contentId,
      userAddress,
      accessGranted: true,
      grantedAt: purchaseRecord.accessGrantedAt
    };
  } catch (error) {
    console.error('Error granting access:', error);
    throw error;
  }
}

/**
 * Revoke access from user for content
 */
async function revokeAccessToContent(contentId, userAddress) {
  try {
    const purchase = await Purchase.findOne({
      contentId,
      user: userAddress
    });

    if (!purchase) {
      return { success: false, reason: 'Purchase not found' };
    }

    purchase.accessRevoked = true;
    purchase.accessRevokedAt = new Date();
    await purchase.save();

    console.log(`Access revoked for user ${userAddress} to content ${contentId}`);

    return {
      success: true,
      contentId,
      userAddress,
      revokedAt: purchase.accessRevokedAt
    };
  } catch (error) {
    console.error('Error revoking access:', error);
    throw error;
  }
}

/**
 * Get access info for user and content
 */
async function getAccessInfo(contentId, userAddress) {
  try {
    const purchase = await Purchase.findOne({
      contentId,
      user: userAddress
    });

    if (!purchase) {
      return {
        contentId,
        userAddress,
        hasAccess: false,
        reason: 'No purchase found'
      };
    }

    const hasAccess = !purchase.accessRevoked;

    return {
      contentId,
      userAddress,
      hasAccess,
      purchaseId: purchase._id,
      purchaseDate: purchase.timestamp,
      amount: purchase.amount,
      creatorAddress: purchase.creator,
      accessRevoked: purchase.accessRevoked,
      accessRevokedAt: purchase.accessRevokedAt || null
    };
  } catch (error) {
    console.error('Error getting access info:', error);
    throw error;
  }
}

/**
 * Check if user has access to content
 */
async function hasAccessToContent(contentId, userAddress) {
  try {
    const purchase = await Purchase.findOne({
      contentId,
      user: userAddress
    });

    if (!purchase) {
      return false;
    }

    // Check if access is revoked
    if (purchase.accessRevoked) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error checking access:', error);
    return false;
  }
}

/**
 * Get all content accessible by user
 */
async function getAccessibleContent(userAddress, options = {}) {
  try {
    const { skip = 0, limit = 50 } = options;

    const purchases = await Purchase.find({
      user: userAddress,
      accessRevoked: { $ne: true }
    })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec();

    const contentIds = purchases.map(p => p.contentId);

    // Fetch content metadata
    const contentMetadata = await Content.find({
      contentId: { $in: contentIds }
    })
      .lean()
      .exec();

    const contentMap = new Map(contentMetadata.map(c => [c.contentId, c]));

    const accessibleContent = purchases.map(purchase => ({
      ...purchase,
      contentMetadata: contentMap.get(purchase.contentId)
    }));

    const total = await Purchase.countDocuments({
      user: userAddress,
      accessRevoked: { $ne: true }
    });

    return {
      data: accessibleContent,
      total,
      skip,
      limit
    };
  } catch (error) {
    console.error('Error getting accessible content:', error);
    throw error;
  }
}

/**
 * Transfer access (admin only - for refunds/corrections)
 */
async function transferAccess(fromAddress, toAddress, contentId) {
  try {
    // Find existing purchase
    const existingPurchase = await Purchase.findOne({
      contentId,
      user: fromAddress
    });

    if (!existingPurchase) {
      return {
        success: false,
        reason: 'Original purchase not found'
      };
    }

    // Check if recipient already has access
    const recipientPurchase = await Purchase.findOne({
      contentId,
      user: toAddress
    });

    if (recipientPurchase && !recipientPurchase.accessRevoked) {
      return {
        success: false,
        reason: 'Recipient already has access'
      };
    }

    if (recipientPurchase) {
      // Update existing purchase
      recipientPurchase.accessRevoked = false;
      recipientPurchase.accessRevokedAt = null;
      recipientPurchase.timestamp = new Date();
      await recipientPurchase.save();
    } else {
      // Create new purchase record for recipient
      const newPurchase = new Purchase({
        contentId,
        user: toAddress,
        creator: existingPurchase.creator,
        txId: existingPurchase.txId + '-transfer',
        amount: 0, // Transferred access has no payment
        platformFee: 0,
        creatorAmount: 0
      });
      await newPurchase.save();
    }

    // Revoke original access
    existingPurchase.accessRevoked = true;
    existingPurchase.accessRevokedAt = new Date();
    await existingPurchase.save();

    return {
      success: true,
      fromAddress,
      toAddress,
      contentId,
      transferredAt: new Date()
    };
  } catch (error) {
    console.error('Error transferring access:', error);
    throw error;
  }
}

/**
 * Get purchase statistics for content
 */
async function getPurchaseStats(contentId) {
  try {
    const purchases = await Purchase.find({ contentId });

    const totalPurchases = purchases.length;
    const totalRevenue = purchases.reduce((sum, p) => sum + p.creatorAmount, 0);
    const totalPlatformFees = purchases.reduce((sum, p) => sum + p.platformFee, 0);
    const activeAccess = purchases.filter(p => !p.accessRevoked).length;

    return {
      contentId,
      totalPurchases,
      totalRevenue,
      totalPlatformFees,
      activeAccess,
      revokedAccess: totalPurchases - activeAccess
    };
  } catch (error) {
    console.error('Error getting purchase stats:', error);
    throw error;
  }
}

module.exports = {
  grantAccessToContent,
  revokeAccessToContent,
  getAccessInfo,
  hasAccessToContent,
  getAccessibleContent,
  transferAccess,
  getPurchaseStats
};
