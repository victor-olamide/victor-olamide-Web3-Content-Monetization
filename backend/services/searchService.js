const Content = require('../models/Content');

/**
 * Build a MongoDB query from provided filters
 */
const buildQuery = (params) => {
  const {
    q,
    contentType,
    creator,
    minPrice,
    maxPrice,
    isRemoved,
  } = params;

  const query = {};

  if (typeof isRemoved !== 'undefined') {
    query.isRemoved = isRemoved === 'true' || isRemoved === true;
  } else {
    query.isRemoved = false; // default: only active content
  }

  if (contentType) {
    query.contentType = contentType;
  }

  if (creator) {
    query.creator = creator;
  }

  if (typeof minPrice !== 'undefined' || typeof maxPrice !== 'undefined') {
    query.price = {};
    if (typeof minPrice !== 'undefined') query.price.$gte = parseFloat(minPrice);
    if (typeof maxPrice !== 'undefined') query.price.$lte = parseFloat(maxPrice);
  }

  if (q) {
    // Use text search if index exists
    query.$text = { $search: q };
  }

  return query;
};

/**
 * Perform search with pagination and simple facets
 */
const searchContent = async (params) => {
  const page = parseInt(params.page, 10) || 1;
  const limit = parseInt(params.limit, 10) || 20;
  const sortBy = params.sortBy || 'createdAt';
  const sortDir = params.sortDir === 'asc' ? 1 : -1;

  const skip = (page - 1) * limit;
  const query = buildQuery(params);

  // Projection: if text score available include it
  const projection = {};
  if (params.q) projection.score = { $meta: 'textScore' };

  const cursor = Content.find(query, projection)
    .sort(params.q ? { score: { $meta: 'textScore' } } : { [sortBy]: sortDir })
    .skip(skip)
    .limit(limit);

  const [results, total] = await Promise.all([
    cursor.exec(),
    Content.countDocuments(query)
  ]);

  // Simple facets: counts by contentType and refundable
  const facets = await Content.aggregate([
    { $match: query },
    { $group: { _id: '$contentType', count: { $sum: 1 } } }
  ]).exec();

  const formattedFacets = facets.reduce((acc, f) => {
    acc[f._id] = f.count; return acc;
  }, {});

  return {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
    results,
    facets: { contentType: formattedFacets }
  };
};

module.exports = {
  buildQuery,
  searchContent
};
