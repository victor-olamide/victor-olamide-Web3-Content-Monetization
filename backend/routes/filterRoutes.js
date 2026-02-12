const express = require('express');
const router = express.Router();
const filterService = require('../services/contentFilterService');

/**
 * Content Filter API Routes
 * Endpoints for advanced filtering, searching, and browsing content
 */

/**
 * @route   GET /api/filters/categories
 * @desc    Get all available content categories with counts
 * @access  Public
 */
router.get('/categories', async (req, res) => {
  try {
    const categories = await filterService.getAvailableCategories();
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /api/filters/price-range
 * @desc    Get price range information (min, max, distribution)
 * @access  Public
 */
router.get('/price-range', async (req, res) => {
  try {
    const priceRange = await filterService.getPriceRangeInfo();
    res.json({
      success: true,
      data: priceRange
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   POST /api/filters/search
 * @desc    Advanced search and filter with multiple criteria
 * @access  Public
 * @query   {Array} categories - Content types to filter by
 * @query   {Number} minPrice - Minimum price
 * @query   {Number} maxPrice - Maximum price
 * @query   {String} searchTerm - Search keywords
 * @query   {String} sortBy - Sort field (price, createdAt, totalViews, title)
 * @query   {String} sortOrder - asc or desc
 * @query   {Number} page - Page number (default 1)
 * @query   {Number} limit - Results per page (default 20, max 100)
 */
router.post('/search', async (req, res) => {
  try {
    const {
      categories = [],
      minPrice,
      maxPrice,
      searchTerm = '',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 20
    } = req.body;

    // Validate inputs
    if (minPrice !== undefined && isNaN(minPrice)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid minPrice value'
      });
    }

    if (maxPrice !== undefined && isNaN(maxPrice)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid maxPrice value'
      });
    }

    if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
      return res.status(400).json({
        success: false,
        message: 'minPrice cannot be greater than maxPrice'
      });
    }

    const result = await filterService.filterContent({
      categories,
      minPrice: minPrice !== undefined ? minPrice : null,
      maxPrice: maxPrice !== undefined ? maxPrice : null,
      searchTerm,
      sortBy,
      sortOrder,
      page,
      limit
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /api/filters/category/:category
 * @desc    Get content by specific category
 * @access  Public
 * @param   {String} category - Content type (video, article, image, music)
 * @query   {Number} limit - Results per page (default 20)
 * @query   {Number} skip - Results to skip (default 0)
 */
router.get('/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const { limit = 20, skip = 0 } = req.query;

    const validCategories = ['video', 'article', 'image', 'music'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: `Invalid category. Must be one of: ${validCategories.join(', ')}`
      });
    }

    const result = await filterService.getContentByCategory(
      category,
      parseInt(limit),
      parseInt(skip)
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   POST /api/filters/price-range
 * @desc    Get content within specific price range
 * @access  Public
 * @body    {Number} minPrice - Minimum price (required)
 * @body    {Number} maxPrice - Maximum price (required)
 * @query   {Number} limit - Results per page (default 20)
 * @query   {Number} skip - Results to skip (default 0)
 */
router.post('/price-range', async (req, res) => {
  try {
    const { minPrice, maxPrice } = req.body;
    const { limit = 20, skip = 0 } = req.query;

    // Validate required fields
    if (minPrice === undefined || maxPrice === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Both minPrice and maxPrice are required'
      });
    }

    // Validate numeric values
    if (isNaN(minPrice) || isNaN(maxPrice)) {
      return res.status(400).json({
        success: false,
        message: 'minPrice and maxPrice must be numeric'
      });
    }

    const result = await filterService.getContentByPriceRange(
      minPrice,
      maxPrice,
      parseInt(limit),
      parseInt(skip)
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /api/filters/search-term
 * @desc    Search content by keyword
 * @access  Public
 * @query   {String} q - Search term (required)
 * @query   {Number} limit - Results per page (default 20)
 * @query   {Number} skip - Results to skip (default 0)
 */
router.get('/search-term', async (req, res) => {
  try {
    const { q, limit = 20, skip = 0 } = req.query;

    if (!q || !q.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Search term (q) is required'
      });
    }

    const result = await filterService.searchContent(
      q,
      parseInt(limit),
      parseInt(skip)
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /api/filters/trending
 * @desc    Get trending/popular content
 * @access  Public
 * @query   {Number} limit - Number of results (default 10, max 100)
 */
router.get('/trending', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const validatedLimit = Math.min(parseInt(limit) || 10, 100);

    const results = await filterService.getTrendingContent(validatedLimit);

    res.json({
      success: true,
      data: results,
      count: results.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   POST /api/filters/recommendations
 * @desc    Get recommended content based on filters
 * @access  Public
 * @body    {Array} categories - Content categories for recommendations
 * @body    {Number} maxPrice - Maximum price for recommendations
 * @query   {Number} limit - Number of results (default 10, max 100)
 */
router.post('/recommendations', async (req, res) => {
  try {
    const { categories = [], maxPrice } = req.body;
    const { limit = 10 } = req.query;
    const validatedLimit = Math.min(parseInt(limit) || 10, 100);

    const filters = {
      categories: Array.isArray(categories) ? categories : [],
      maxPrice: maxPrice !== undefined ? parseFloat(maxPrice) : undefined
    };

    const results = await filterService.getRecommendedContent(
      filters,
      validatedLimit
    );

    res.json({
      success: true,
      data: results,
      count: results.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /api/filters/cache-status
 * @desc    Get filter cache status (for debugging)
 * @access  Public
 */
router.get('/cache-status', (req, res) => {
  try {
    const status = filterService.getFilterCacheStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   POST /api/filters/cache-clear
 * @desc    Clear filter cache (force refresh)
 * @access  Public
 */
router.post('/cache-clear', (req, res) => {
  try {
    filterService.clearFilterCache();
    res.json({
      success: true,
      message: 'Filter cache cleared successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
