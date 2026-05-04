const mongoose = require('mongoose');
const ContentPreview = require('../models/ContentPreview');

/**
 * Content Filtering Service
 * Provides advanced filtering, searching, and sorting capabilities for content
 */

// Cache for available categories and price ranges
let filterCacheData = {
  categories: null,
  priceRanges: null,
  lastUpdated: null,
  cacheTTL: 3600000 // 1 hour in milliseconds
};

/**
 * Get all available categories from content
 * Returns cached data if available and fresh
 */
async function getAvailableCategories() {
  try {
    // Check if cache is valid
    if (filterCacheData.categories && filterCacheData.lastUpdated) {
      const cacheAge = Date.now() - filterCacheData.lastUpdated;
      if (cacheAge < filterCacheData.cacheTTL) {
        return filterCacheData.categories;
      }
    }

    // Fetch distinct content types from database
    const categories = await ContentPreview.distinct('contentType');
    
    // Enhance with metadata
    const categoriesWithMetadata = categories.map(cat => ({
      id: cat,
      name: capitalizeWord(cat),
      count: 0
    }));

    // Get count for each category
    for (let cat of categoriesWithMetadata) {
      const count = await ContentPreview.countDocuments({ contentType: cat.id });
      cat.count = count;
    }

    // Update cache
    filterCacheData.categories = categoriesWithMetadata;
    filterCacheData.lastUpdated = Date.now();

    return categoriesWithMetadata;
  } catch (error) {
    throw new Error(`Failed to get available categories: ${error.message}`);
  }
}

/**
 * Get price range information
 * Returns min, max, and distribution
 */
async function getPriceRangeInfo() {
  try {
    // Check if cache is valid
    if (filterCacheData.priceRanges && filterCacheData.lastUpdated) {
      const cacheAge = Date.now() - filterCacheData.lastUpdated;
      if (cacheAge < filterCacheData.cacheTTL) {
        return filterCacheData.priceRanges;
      }
    }

    const priceStats = await ContentPreview.aggregate([
      {
        $group: {
          _id: null,
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' },
          avgPrice: { $avg: '$price' },
          count: { $sum: 1 }
        }
      }
    ]);

    if (!priceStats || priceStats.length === 0) {
      return {
        minPrice: 0,
        maxPrice: 0,
        avgPrice: 0,
        count: 0,
        ranges: []
      };
    }

    const stats = priceStats[0];
    const ranges = createPriceRanges(stats.minPrice, stats.maxPrice);

    // Get count for each range
    const rangesWithCounts = await Promise.all(
      ranges.map(async (range) => {
        const count = await ContentPreview.countDocuments({
          price: { $gte: range.min, $lte: range.max }
        });
        return {
          ...range,
          count
        };
      })
    );

    const priceRangeInfo = {
      minPrice: stats.minPrice,
      maxPrice: stats.maxPrice,
      avgPrice: Math.round(stats.avgPrice * 100) / 100,
      count: stats.count,
      ranges: rangesWithCounts
    };

    // Update cache
    filterCacheData.priceRanges = priceRangeInfo;
    filterCacheData.lastUpdated = Date.now();

    return priceRangeInfo;
  } catch (error) {
    throw new Error(`Failed to get price range info: ${error.message}`);
  }
}

/**
 * Filter and search content with multiple criteria
 * Supports: categories, price range, search term, sorting, pagination
 */
async function filterContent({
  categories = [],
  minPrice = null,
  maxPrice = null,
  searchTerm = '',
  sortBy = 'createdAt',
  sortOrder = 'desc',
  page = 1,
  limit = 20,
  contentTypes = []
} = {}) {
  try {
    // Validate inputs
    const validatedLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
    const validatedPage = Math.max(parseInt(page) || 1, 1);
    const skip = (validatedPage - 1) * validatedLimit;

    // Build query
    const query = {};

    // Category filter (backwards compatible with contentTypes)
    const typesToFilter = categories.length > 0 ? categories : contentTypes;
    if (typesToFilter.length > 0) {
      query.contentType = { $in: typesToFilter };
    }

    // Price range filter
    const priceQuery = {};
    if (minPrice !== null && minPrice !== undefined) {
      priceQuery.$gte = parseFloat(minPrice);
    }
    if (maxPrice !== null && maxPrice !== undefined) {
      priceQuery.$lte = parseFloat(maxPrice);
    }
    if (Object.keys(priceQuery).length > 0) {
      query.price = priceQuery;
    }

    // Search term filter
    if (searchTerm && searchTerm.trim()) {
      const searchRegex = { $regex: searchTerm.trim(), $options: 'i' };
      query.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { previewText: searchRegex },
        { creator: searchRegex }
      ];
    }

    // Ensure preview is enabled
    query.previewEnabled = true;

    // Validate sort field
    const validSortFields = ['price', 'createdAt', 'updatedAt', 'totalViews', 'title'];
    const finalSortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const finalSortOrder = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const [results, total] = await Promise.all([
      ContentPreview.find(query)
        .sort({ [finalSortField]: finalSortOrder })
        .skip(skip)
        .limit(validatedLimit)
        .lean(),
      ContentPreview.countDocuments(query)
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(total / validatedLimit);

    return {
      results,
      pagination: {
        page: validatedPage,
        limit: validatedLimit,
        total,
        totalPages,
        hasNextPage: validatedPage < totalPages,
        hasPrevPage: validatedPage > 1
      },
      filters: {
        categories: typesToFilter,
        minPrice,
        maxPrice,
        searchTerm,
        sortBy: finalSortField,
        sortOrder: finalSortOrder === 1 ? 'asc' : 'desc'
      }
    };
  } catch (error) {
    throw new Error(`Failed to filter content: ${error.message}`);
  }
}

/**
 * Get filtered content by specific category
 */
async function getContentByCategory(category, limit = 20, skip = 0) {
  try {
    if (!category) {
      throw new Error('Category is required');
    }

    const [results, total] = await Promise.all([
      ContentPreview.find({
        contentType: category,
        previewEnabled: true
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ContentPreview.countDocuments({
        contentType: category,
        previewEnabled: true
      })
    ]);

    return {
      results,
      total,
      category,
      hasMore: skip + limit < total
    };
  } catch (error) {
    throw new Error(`Failed to get content by category: ${error.message}`);
  }
}

/**
 * Get content within price range
 */
async function getContentByPriceRange(minPrice, maxPrice, limit = 20, skip = 0) {
  try {
    if (minPrice === null || maxPrice === null) {
      throw new Error('Both minPrice and maxPrice are required');
    }

    const min = parseFloat(minPrice);
    const max = parseFloat(maxPrice);

    if (min > max) {
      throw new Error('minPrice cannot be greater than maxPrice');
    }

    const [results, total] = await Promise.all([
      ContentPreview.find({
        price: { $gte: min, $lte: max },
        previewEnabled: true
      })
        .sort({ price: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ContentPreview.countDocuments({
        price: { $gte: min, $lte: max },
        previewEnabled: true
      })
    ]);

    return {
      results,
      total,
      priceRange: { min, max },
      hasMore: skip + limit < total
    };
  } catch (error) {
    throw new Error(`Failed to get content by price range: ${error.message}`);
  }
}

/**
 * Search content by term
 */
async function searchContent(searchTerm, limit = 20, skip = 0) {
  try {
    if (!searchTerm || !searchTerm.trim()) {
      throw new Error('Search term is required');
    }

    const searchRegex = { $regex: searchTerm.trim(), $options: 'i' };

    const [results, total] = await Promise.all([
      ContentPreview.find({
        $or: [
          { title: searchRegex },
          { description: searchRegex },
          { previewText: searchRegex },
          { creator: searchRegex }
        ],
        previewEnabled: true
      })
        .sort({ totalViews: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ContentPreview.countDocuments({
        $or: [
          { title: searchRegex },
          { description: searchRegex },
          { previewText: searchRegex },
          { creator: searchRegex }
        ],
        previewEnabled: true
      })
    ]);

    return {
      results,
      total,
      searchTerm,
      hasMore: skip + limit < total
    };
  } catch (error) {
    throw new Error(`Failed to search content: ${error.message}`);
  }
}

/**
 * Get trending/popular content
 */
async function getTrendingContent(limit = 10) {
  try {
    const results = await ContentPreview.find({ previewEnabled: true })
      .sort({ totalViews: -1 })
      .limit(limit)
      .lean();

    return results;
  } catch (error) {
    throw new Error(`Failed to get trending content: ${error.message}`);
  }
}

/**
 * Get content recommendations based on filters
 */
async function getRecommendedContent(filters = {}, limit = 10) {
  try {
    const query = {
      previewEnabled: true
    };

    if (filters.categories && filters.categories.length > 0) {
      query.contentType = { $in: filters.categories };
    }

    if (filters.maxPrice) {
      query.price = { $lte: parseFloat(filters.maxPrice) };
    }

    const results = await ContentPreview.find(query)
      .sort({ totalViews: -1, createdAt: -1 })
      .limit(limit)
      .lean();

    return results;
  } catch (error) {
    throw new Error(`Failed to get recommended content: ${error.message}`);
  }
}

/**
 * Clear filter cache (for manual refresh)
 */
function clearFilterCache() {
  filterCacheData = {
    categories: null,
    priceRanges: null,
    lastUpdated: null,
    cacheTTL: 3600000
  };
}

/**
 * Get filter cache status
 */
function getFilterCacheStatus() {
  const cacheAge = filterCacheData.lastUpdated
    ? Date.now() - filterCacheData.lastUpdated
    : null;

  return {
    isCached: !!filterCacheData.categories,
    cacheAge: cacheAge,
    cacheTTL: filterCacheData.cacheTTL,
    cacheValid: cacheAge !== null && cacheAge < filterCacheData.cacheTTL,
    lastUpdated: filterCacheData.lastUpdated
  };
}

/**
 * Helper: Create price ranges based on min and max
 */
function createPriceRanges(min, max) {
  const ranges = [];
  
  if (max <= 10) {
    // For low prices, use $1 increments
    for (let i = 0; i < max; i += 1) {
      ranges.push({
        min: i,
        max: i + 1,
        label: `$${i}-$${i + 1}`
      });
    }
  } else if (max <= 100) {
    // For medium prices, use $10 increments
    for (let i = 0; i < max; i += 10) {
      ranges.push({
        min: i,
        max: Math.min(i + 10, max),
        label: `$${i}-$${Math.min(i + 10, max)}`
      });
    }
  } else {
    // For high prices, use $50 increments
    for (let i = 0; i < max; i += 50) {
      ranges.push({
        min: i,
        max: Math.min(i + 50, max),
        label: `$${i}-$${Math.min(i + 50, max)}`
      });
    }
  }

  return ranges;
}

/**
 * Helper: Capitalize word
 */
function capitalizeWord(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

module.exports = {
  getAvailableCategories,
  getPriceRangeInfo,
  filterContent,
  getContentByCategory,
  getContentByPriceRange,
  searchContent,
  getTrendingContent,
  getRecommendedContent,
  clearFilterCache,
  getFilterCacheStatus
};
