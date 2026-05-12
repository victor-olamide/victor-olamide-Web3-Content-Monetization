/**
 * Pay-Per-View Content Management Controller
 * 
 * Handles operations related to pay-per-view content:
 * - Register content with pricing
 * - Update content pricing
 * - Remove content
 * - Query content information
 */

const axios = require('axios');
const logger = require('../utils/logger');
const { getContentPricing, invalidateContentCache } = require('../services/payPerViewService');
const Content = require('../models/Content');
const Purchase = require('../models/Purchase');

/**
 * Get content details with pricing
 */
async function getContentDetails(req, res) {
  const { contentId } = req.params;

  if (!contentId) {
    return res.status(400).json({ error: 'Content ID required' });
  }

  try {
    // Get from local database
    const content = await Content.findById(contentId);

    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    // Get pricing from on-chain contract
    let onChainPricing = null;
    try {
      onChainPricing = await getContentPricing(contentId);
    } catch (error) {
      logger.warn('Failed to fetch on-chain pricing', {
        contentId,
        error: error.message,
      });
    }

    const response = {
      contentId,
      ...content.toObject(),
      pricing: {
        local: content.price,
        onChain: onChainPricing,
      },
    };

    res.json(response);
  } catch (error) {
    logger.error('Error getting content details', {
      error: error.message,
      contentId,
    });
    res.status(500).json({ error: 'Failed to fetch content details' });
  }
}

/**
 * Get content sales analytics
 */
async function getContentSalesAnalytics(req, res) {
  const { contentId } = req.params;

  if (!contentId) {
    return res.status(400).json({ error: 'Content ID required' });
  }

  try {
    // Count purchases
    const purchases = await Purchase.find({ contentId });
    
    // Calculate totals
    const totalRevenue = purchases.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalPlatformFee = purchases.reduce((sum, p) => sum + (p.platformFee || 0), 0);
    const totalCreatorRevenue = totalRevenue - totalPlatformFee;

    // Calculate unique buyers
    const uniqueBuyers = new Set(purchases.map(p => p.user)).size;

    const analytics = {
      contentId,
      totalPurchases: purchases.length,
      uniqueBuyers,
      totalRevenue,
      totalPlatformFee,
      totalCreatorRevenue,
      averagePurchasePrice: purchases.length > 0 ? totalRevenue / purchases.length : 0,
      latestPurchases: purchases.slice(-10).map(p => ({
        user: p.user,
        amount: p.amount,
        timestamp: p.timestamp,
        txId: p.txId,
      })),
    };

    res.json(analytics);
  } catch (error) {
    logger.error('Error calculating sales analytics', {
      error: error.message,
      contentId,
    });
    res.status(500).json({ error: 'Failed to calculate analytics' });
  }
}

/**
 * Register content with pricing (PPV-enabled)
 */
async function registerContent(req, res) {
  const { contentId, title, description, price, creator, uri } = req.body;

  // Validate required fields
  if (!contentId || !title || !price || !creator) {
    return res.status(400).json({
      error: 'Missing required fields: contentId, title, price, creator',
    });
  }

  try {
    // Create content record
    const content = new Content({
      contentId,
      title,
      description,
      price,
      creator,
      uri: uri || '',
      ppvEnabled: true,
      registeredAt: new Date(),
    });

    const saved = await content.save();

    logger.info('Content registered with PPV', {
      contentId,
      creator,
      price,
    });

    res.status(201).json({
      success: true,
      message: 'Content registered successfully',
      content: saved,
    });
  } catch (error) {
    logger.error('Error registering content', {
      error: error.message,
      contentId,
    });
    res.status(500).json({ error: 'Failed to register content' });
  }
}

/**
 * Update content pricing
 */
async function updateContentPrice(req, res) {
  const { contentId } = req.params;
  const { newPrice } = req.body;

  if (!contentId || !newPrice) {
    return res.status(400).json({
      error: 'Missing required fields: newPrice',
    });
  }

  try {
    // Update in database
    const content = await Content.findByIdAndUpdate(
      contentId,
      { price: newPrice, updatedAt: new Date() },
      { new: true }
    );

    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    // Invalidate cache
    invalidateContentCache(contentId);

    logger.info('Content price updated', {
      contentId,
      newPrice,
    });

    res.json({
      success: true,
      message: 'Price updated successfully',
      content,
    });
  } catch (error) {
    logger.error('Error updating content price', {
      error: error.message,
      contentId,
    });
    res.status(500).json({ error: 'Failed to update price' });
  }
}

/**
 * List purchases for content
 */
async function getContentPurchases(req, res) {
  const { contentId } = req.params;
  const { limit = 50, skip = 0 } = req.query;

  if (!contentId) {
    return res.status(400).json({ error: 'Content ID required' });
  }

  try {
    const purchases = await Purchase.find({ contentId })
      .select('user amount timestamp txId status')
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await Purchase.countDocuments({ contentId });

    res.json({
      contentId,
      purchases,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
      },
    });
  } catch (error) {
    logger.error('Error fetching content purchases', {
      error: error.message,
      contentId,
    });
    res.status(500).json({ error: 'Failed to fetch purchases' });
  }
}

/**
 * Get PPV-enabled content
 */
async function getPPVContent(req, res) {
  const { creator } = req.query;
  const { limit = 50, skip = 0 } = req.query;

  try {
    let query = { ppvEnabled: true };

    if (creator) {
      query.creator = creator;
    }

    const content = await Content.find(query)
      .select('contentId title description price creator registeredAt')
      .sort({ registeredAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await Content.countDocuments(query);

    res.json({
      content,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
      },
    });
  } catch (error) {
    logger.error('Error fetching PPV content', {
      error: error.message,
    });
    res.status(500).json({ error: 'Failed to fetch content' });
  }
}

/**
 * Get buyer information for content
 */
async function getContentBuyers(req, res) {
  const { contentId } = req.params;

  if (!contentId) {
    return res.status(400).json({ error: 'Content ID required' });
  }

  try {
    const purchases = await Purchase.find({ contentId })
      .select('user timestamp txId amount')
      .sort({ timestamp: -1 });

    // Group by user
    const buyersMap = new Map();

    purchases.forEach(purchase => {
      if (!buyersMap.has(purchase.user)) {
        buyersMap.set(purchase.user, {
          address: purchase.user,
          purchaseCount: 0,
          totalSpent: 0,
          firstPurchase: null,
          lastPurchase: null,
        });
      }

      const buyer = buyersMap.get(purchase.user);
      buyer.purchaseCount++;
      buyer.totalSpent += purchase.amount || 0;
      
      if (!buyer.firstPurchase) {
        buyer.firstPurchase = purchase.timestamp;
      }
      buyer.lastPurchase = purchase.timestamp;
    });

    const buyers = Array.from(buyersMap.values())
      .sort((a, b) => b.lastPurchase - a.lastPurchase);

    res.json({
      contentId,
      totalBuyers: buyers.length,
      buyers,
    });
  } catch (error) {
    logger.error('Error fetching content buyers', {
      error: error.message,
      contentId,
    });
    res.status(500).json({ error: 'Failed to fetch buyers' });
  }
}

module.exports = {
  getContentDetails,
  getContentSalesAnalytics,
  registerContent,
  updateContentPrice,
  getContentPurchases,
  getPPVContent,
  getContentBuyers,
};
