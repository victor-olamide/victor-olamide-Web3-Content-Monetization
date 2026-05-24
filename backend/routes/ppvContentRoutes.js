/**
 * Pay-Per-View Content Management Routes
 * 
 * Routes for managing PPV content:
 * - Register content with pricing
 * - Update pricing
 * - Get content details
 * - Analytics and reporting
 * - Buyer information
 */

const express = require('express');
const router = express.Router();
const {
  getContentDetails,
  getContentSalesAnalytics,
  registerContent,
  updateContentPrice,
  getContentPurchases,
  getPPVContent,
  getContentBuyers,
} = require('../controllers/ppvContentController');

// ═══════════════════════════════════════════════════════════════════
// CONTENT MANAGEMENT ROUTES
// ═══════════════════════════════════════════════════════════════════

// Register new PPV content
// POST /ppv/content
router.post('/', registerContent);

// Get all PPV content (with optional creator filter)
// GET /ppv/content?creator=ST2F4...&limit=50&skip=0
router.get('/', getPPVContent);

// Get content details
// GET /ppv/content/:contentId
router.get('/:contentId', getContentDetails);

// Update content price
// PATCH /ppv/content/:contentId/price
router.patch('/:contentId/price', updateContentPrice);

// ═══════════════════════════════════════════════════════════════════
// ANALYTICS & REPORTING ROUTES
// ═══════════════════════════════════════════════════════════════════

// Get sales analytics for content
// GET /ppv/content/:contentId/analytics
router.get('/:contentId/analytics', getContentSalesAnalytics);

// Get purchase list for content
// GET /ppv/content/:contentId/purchases?limit=50&skip=0
router.get('/:contentId/purchases', getContentPurchases);

// Get buyer information for content
// GET /ppv/content/:contentId/buyers
router.get('/:contentId/buyers', getContentBuyers);

module.exports = router;
