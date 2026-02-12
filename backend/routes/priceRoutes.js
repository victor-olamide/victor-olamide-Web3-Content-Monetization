/**
 * STX Price Routes
 * API endpoints for real-time STX price data and conversions
 */

const express = require('express');
const router = express.Router();
const stxPriceService = require('../services/stxPriceService');

/**
 * GET /api/prices/stx
 * Get current STX/USD price with market data
 * 
 * Response: {
 *   "success": true,
 *   "data": {
 *     "current": 2.45,
 *     "volume_24h": 150000000,
 *     "change_24h": 0.15,
 *     "change_24h_percent": "6.52",
 *     "last_updated": "2024-01-20T14:30:00Z",
 *     "cache_age_ms": 5000
 *   }
 * }
 */
router.get('/stx', async (req, res) => {
  try {
    const priceData = await stxPriceService.getPriceData();
    
    res.json({
      success: true,
      data: priceData
    });
  } catch (error) {
    console.error('Error fetching STX price:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch STX price'
    });
  }
});

/**
 * GET /api/prices/stx/formatted
 * Get current STX price in formatted string format
 * Useful for display purposes
 * 
 * Response: {
 *   "success": true,
 *   "data": {
 *     "usd": "$2.45",
 *     "change_24h": "0.1500",
 *     "change_percent": "6.52%"
 *   }
 * }
 */
router.get('/stx/formatted', async (req, res) => {
  try {
    const formattedPrice = await stxPriceService.getFormattedPrice();
    
    res.json({
      success: true,
      data: formattedPrice
    });
  } catch (error) {
    console.error('Error formatting STX price:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to format STX price'
    });
  }
});

/**
 * GET /api/prices/stx/raw
 * Get raw current STX price (just the USD number)
 * Fastest endpoint for simple price lookup
 * 
 * Response: {
 *   "success": true,
 *   "data": {
 *     "usd": 2.45
 *   }
 * }
 */
router.get('/stx/raw', async (req, res) => {
  try {
    const priceData = await stxPriceService.getCurrentSTXPrice();
    
    res.json({
      success: true,
      data: {
        usd: priceData.usd
      }
    });
  } catch (error) {
    console.error('Error fetching raw STX price:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch STX price'
    });
  }
});

/**
 * POST /api/prices/convert/stx-to-usd
 * Convert STX amount to USD
 * 
 * Request Body: {
 *   "amount": 10.5
 * }
 * 
 * Response: {
 *   "success": true,
 *   "data": {
 *     "stx": 10.5,
 *     "usd": 25.725,
 *     "rate": 2.45,
 *     "timestamp": 1705766400000
 *   }
 * }
 */
router.post('/convert/stx-to-usd', async (req, res) => {
  try {
    const { amount } = req.body;

    // Validate input
    if (amount === undefined || amount === null) {
      return res.status(400).json({
        success: false,
        message: 'Amount is required'
      });
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be a valid non-negative number'
      });
    }

    const result = await stxPriceService.convertSTXtoUSD(numAmount);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error converting STX to USD:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to convert STX to USD'
    });
  }
});

/**
 * POST /api/prices/convert/usd-to-stx
 * Convert USD amount to STX
 * 
 * Request Body: {
 *   "amount": 25.725
 * }
 * 
 * Response: {
 *   "success": true,
 *   "data": {
 *     "usd": 25.725,
 *     "stx": 10.5,
 *     "rate": 2.45,
 *     "timestamp": 1705766400000
 *   }
 * }
 */
router.post('/convert/usd-to-stx', async (req, res) => {
  try {
    const { amount } = req.body;

    // Validate input
    if (amount === undefined || amount === null) {
      return res.status(400).json({
        success: false,
        message: 'Amount is required'
      });
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be a valid non-negative number'
      });
    }

    const result = await stxPriceService.convertUSDtoSTX(numAmount);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error converting USD to STX:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to convert USD to STX'
    });
  }
});

/**
 * POST /api/prices/convert/batch
 * Batch convert multiple STX amounts to USD
 * More efficient than individual requests
 * 
 * Request Body: {
 *   "amounts": [10.5, 25.0, 5.25]
 * }
 * 
 * Response: {
 *   "success": true,
 *   "data": [
 *     { "stx": 10.5, "usd": 25.725, "rate": 2.45 },
 *     { "stx": 25.0, "usd": 61.25, "rate": 2.45 },
 *     { "stx": 5.25, "usd": 12.8625, "rate": 2.45 }
 *   ]
 * }
 */
router.post('/convert/batch', async (req, res) => {
  try {
    const { amounts } = req.body;

    // Validate input
    if (!Array.isArray(amounts)) {
      return res.status(400).json({
        success: false,
        message: 'Amounts must be an array'
      });
    }

    if (amounts.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Amounts array cannot be empty'
      });
    }

    if (amounts.length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 1000 amounts per request'
      });
    }

    // Validate all amounts are numbers
    const validAmounts = amounts.map((amt) => {
      const num = parseFloat(amt);
      if (isNaN(num) || num < 0) {
        throw new Error(`Invalid amount: ${amt}`);
      }
      return num;
    });

    const results = await stxPriceService.convertMultipleSTXtoUSD(validAmounts);

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Error in batch conversion:', error.message);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to batch convert amounts'
    });
  }
});

/**
 * GET /api/prices/cache-status
 * Get information about price cache status
 * Useful for debugging and monitoring
 * 
 * Response: {
 *   "success": true,
 *   "data": {
 *     "isCached": true,
 *     "age_ms": 5000,
 *     "valid": true,
 *     "ttl_ms": 60000
 *   }
 * }
 */
router.get('/cache-status', (req, res) => {
  try {
    const status = stxPriceService.getCacheStatus();
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get cache status'
    });
  }
});

/**
 * POST /api/prices/cache-clear
 * Clear the price cache (admin only in production)
 * Forces fresh fetch on next request
 * 
 * Response: {
 *   "success": true,
 *   "message": "Cache cleared successfully"
 * }
 */
router.post('/cache-clear', (req, res) => {
  try {
    stxPriceService.clearCache();
    
    res.json({
      success: true,
      message: 'Cache cleared successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to clear cache'
    });
  }
});

module.exports = router;
