/**
 * Test Data Factories
 * Factory functions for generating realistic test data
 */

/**
 * Generate test user data
 * @param {Object} overrides - Fields to override
 * @returns {Object} User data
 */
function generateUser(overrides = {}) {
  const timestamp = Date.now();
  return {
    email: `user${timestamp}@test.com`,
    password: 'Password123!',
    firstName: 'Test',
    lastName: 'User',
    role: 'user',
    birthDate: '1990-01-01',
    acceptTerms: true,
    ...overrides
  };
}

/**
 * Generate test creator user data
 * @param {Object} overrides - Fields to override
 * @returns {Object} Creator user data
 */
function generateCreator(overrides = {}) {
  return generateUser({
    role: 'creator',
    firstName: 'Creator',
    lastName: 'Test',
    bio: 'Test creator bio',
    profileImage: 'https://via.placeholder.com/150',
    ...overrides
  });
}

/**
 * Generate test admin user data
 * @param {Object} overrides - Fields to override
 * @returns {Object} Admin user data
 */
function generateAdmin(overrides = {}) {
  return generateUser({
    role: 'admin',
    firstName: 'Admin',
    lastName: 'Test',
    ...overrides
  });
}

/**
 * Generate test content data
 * @param {string} creatorId - Creator ID
 * @param {Object} overrides - Fields to override
 * @returns {Object} Content data
 */
function generateContent(creatorId, overrides = {}) {
  const timestamp = Date.now();
  return {
    title: `Test Content ${timestamp}`,
    description: 'This is a test content description for E2E testing purposes',
    content: 'This is test content',
    type: 'video',
    mimeType: 'video/mp4',
    duration: 3600,
    thumbnailUrl: 'https://via.placeholder.com/300x200',
    creator: creatorId,
    accessType: 'free',
    price: null,
    currency: 'USD',
    tags: ['test', 'e2e', 'automation'],
    category: 'Education',
    isPublished: false,
    views: 0,
    likes: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  };
}

/**
 * Generate test paid content data
 * @param {string} creatorId - Creator ID
 * @param {Object} overrides - Fields to override
 * @returns {Object} Paid content data
 */
function generatePaidContent(creatorId, overrides = {}) {
  return generateContent(creatorId, {
    accessType: 'paid',
    price: 9.99,
    ...overrides
  });
}

/**
 * Generate test subscription data
 * @param {string} creatorId - Creator ID
 * @param {Object} overrides - Fields to override
 * @returns {Object} Subscription data
 */
function generateSubscription(creatorId, overrides = {}) {
  return {
    creatorId,
    name: 'Monthly Subscription',
    description: 'Access to all premium content',
    price: 4.99,
    billingCycle: 'monthly',
    tier: 'basic',
    features: ['premium-content', 'early-access', 'ad-free'],
    maxSubscribers: null,
    isActive: true,
    createdAt: new Date(),
    ...overrides
  };
}

/**
 * Generate test purchase data
 * @param {string} userId - User ID
 * @param {string} contentId - Content ID
 * @param {Object} overrides - Fields to override
 * @returns {Object} Purchase data
 */
function generatePurchase(userId, contentId, overrides = {}) {
  return {
    userId,
    contentId,
    amount: 9.99,
    currency: 'USD',
    paymentMethod: 'stx',
    transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`,
    status: 'completed',
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    ...overrides
  };
}

/**
 * Generate test wallet data
 * @param {Object} overrides - Fields to override
 * @returns {Object} Wallet data
 */
function generateWallet(overrides = {}) {
  return {
    address: `SP${Math.random().toString(36).substr(2, 18).toUpperCase()}`,
    type: 'hiro',
    provider: 'stacks',
    isConnected: true,
    balance: 1000,
    nfts: [],
    ...overrides
  };
}

/**
 * Generate test transaction data
 * @param {Object} overrides - Fields to override
 * @returns {Object} Transaction data
 */
function generateTransaction(overrides = {}) {
  return {
    hash: `0x${Math.random().toString(16).substr(2, 64)}`,
    from: 'SP1234567890ABCDEF',
    to: 'SP0987654321FEDCBA',
    amount: 100,
    fee: 0.5,
    type: 'transfer',
    status: 'confirmed',
    timestamp: new Date(),
    blockNumber: Math.floor(Math.random() * 1000000),
    gasUsed: 21000,
    ...overrides
  };
}

/**
 * Generate test report data
 * @param {Object} overrides - Fields to override
 * @returns {Object} Report data
 */
function generateReport(overrides = {}) {
  const reportTypes = ['inappropriate', 'copyright', 'spam', 'harassment'];
  return {
    reportType: reportTypes[Math.floor(Math.random() * reportTypes.length)],
    description: 'This content violates community guidelines',
    reportedContentId: `content-${Math.random().toString(36).substr(2, 9)}`,
    reportedUserId: `user-${Math.random().toString(36).substr(2, 9)}`,
    reporterId: `user-${Math.random().toString(36).substr(2, 9)}`,
    status: 'pending',
    createdAt: new Date(),
    resolvedAt: null,
    moderatorNotes: '',
    action: null,
    ...overrides
  };
}

/**
 * Generate test review/rating data
 * @param {Object} overrides - Fields to override
 * @returns {Object} Review data
 */
function generateReview(overrides = {}) {
  return {
    rating: Math.floor(Math.random() * 5) + 1,
    title: 'Great content!',
    comment: 'This is a helpful and informative piece of content.',
    contentId: `content-${Math.random().toString(36).substr(2, 9)}`,
    userId: `user-${Math.random().toString(36).substr(2, 9)}`,
    verified: true,
    helpful: 0,
    unhelpful: 0,
    createdAt: new Date(),
    ...overrides
  };
}

/**
 * Generate test search query
 * @returns {string} Search query
 */
function generateSearchQuery() {
  const queries = [
    'tutorial',
    'music',
    'fitness',
    'cooking',
    'technology',
    'art',
    'design',
    'business',
    'personal development',
    'travel'
  ];
  return queries[Math.floor(Math.random() * queries.length)];
}

/**
 * Generate multiple test users
 * @param {number} count - Number of users to generate
 * @param {Object} baseOverrides - Base overrides for all users
 * @returns {Array} Array of user data
 */
function generateUsers(count = 5, baseOverrides = {}) {
  return Array.from({ length: count }, () => generateUser(baseOverrides));
}

/**
 * Generate multiple test contents
 * @param {string} creatorId - Creator ID
 * @param {number} count - Number of contents to generate
 * @param {Object} baseOverrides - Base overrides for all contents
 * @returns {Array} Array of content data
 */
function generateContents(creatorId, count = 5, baseOverrides = {}) {
  return Array.from({ length: count }, () => generateContent(creatorId, baseOverrides));
}

/**
 * Generate filter parameters
 * @returns {Object} Filter parameters
 */
function generateFilterParams() {
  return {
    type: ['video', 'audio', 'article'][Math.floor(Math.random() * 3)],
    category: ['Education', 'Entertainment', 'Music', 'Art'][Math.floor(Math.random() * 4)],
    priceMin: 0,
    priceMax: 100,
    sortBy: ['newest', 'trending', 'price-low', 'price-high'][Math.floor(Math.random() * 4)],
    page: 1,
    limit: 20
  };
}

/**
 * Generate pagination parameters
 * @returns {Object} Pagination parameters
 */
function generatePaginationParams() {
  return {
    page: Math.floor(Math.random() * 10) + 1,
    limit: [10, 20, 50][Math.floor(Math.random() * 3)],
    sort: 'createdAt',
    order: ['asc', 'desc'][Math.floor(Math.random() * 2)]
  };
}

/**
 * Generate mock API response
 * @param {string} endpoint - API endpoint
 * @param {Object} overrides - Response overrides
 * @returns {Object} Mock response
 */
function generateMockApiResponse(endpoint, overrides = {}) {
  const baseResponses = {
    '/api/auth/register': {
      success: true,
      user: generateUser(),
      token: 'mock-jwt-token'
    },
    '/api/auth/login': {
      success: true,
      user: generateUser(),
      token: 'mock-jwt-token'
    },
    '/api/content/browse': {
      success: true,
      data: generateContents('creator-1', 10),
      pagination: generatePaginationParams()
    },
    '/api/content/:id': {
      success: true,
      data: generateContent('creator-1')
    },
    '/api/wallet/connect': {
      success: true,
      wallet: generateWallet(),
      address: 'SP1234567890ABCDEF'
    }
  };

  return {
    ...baseResponses[endpoint],
    ...overrides
  };
}

module.exports = {
  generateUser,
  generateCreator,
  generateAdmin,
  generateContent,
  generatePaidContent,
  generateSubscription,
  generatePurchase,
  generateWallet,
  generateTransaction,
  generateReport,
  generateReview,
  generateSearchQuery,
  generateUsers,
  generateContents,
  generateFilterParams,
  generatePaginationParams,
  generateMockApiResponse
};
