#!/usr/bin/env node

/**
 * Concurrent User Load Test Processor
 * Handles authentication token generation and request transformation for load tests
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// Mock JWT secret for testing
const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-load-testing';

/**
 * Generate a mock JWT token for test users
 */
function generateMockToken(userId, role = 'user') {
  const payload = {
    id: userId,
    role: role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600
  };
  
  try {
    return jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256' });
  } catch (error) {
    console.error('Token generation error:', error);
    return 'mock-token-' + crypto.randomBytes(16).toString('hex');
  }
}

/**
 * Generate random string for request IDs
 */
function generateRandomString(length) {
  return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
}

/**
 * Process before request - add auth headers and generate tokens
 */
module.exports = {
  beforeRequest: function(requestParams, context, ee, next) {
    // Generate unique request ID
    requestParams.headers = requestParams.headers || {};
    requestParams.headers['X-Request-ID'] = generateRandomString(16);
    requestParams.headers['X-Client-ID'] = generateRandomString(8);
    
    // Add timestamp
    requestParams.headers['X-Timestamp'] = Date.now().toString();
    
    // Generate auth token if not already present
    if (!requestParams.headers['Authorization']) {
      const userId = generateRandomString(8);
      const role = Math.random() > 0.8 ? 'creator' : 'user';
      const token = generateMockToken(userId, role);
      requestParams.headers['Authorization'] = `Bearer ${token}`;
    }
    
    return next();
  },
  
  /**
   * Process after response - log metrics
   */
  afterResponse: function(requestParams, response, context, ee, next) {
    // Record response metrics
    const statusCode = response.statusCode;
    const contentLength = response.headers['content-length'] || 0;
    
    // Event for status code distribution
    if (statusCode < 300) {
      ee.emit('customStat', {
        stat: 'success_count',
        value: 1
      });
    } else if (statusCode >= 400 && statusCode < 500) {
      ee.emit('customStat', {
        stat: 'client_error_count',
        value: 1
      });
    } else if (statusCode >= 500) {
      ee.emit('customStat', {
        stat: 'server_error_count',
        value: 1
      });
    }
    
    // Record response size metrics
    ee.emit('customStat', {
      stat: 'response_size',
      value: parseInt(contentLength) || 0
    });
    
    return next();
  },
  
  /**
   * Generate test data for scenarios
   */
  generateTestData: function() {
    return {
      userId: generateRandomString(8),
      contentId: Math.floor(Math.random() * 100) + 1,
      email: `user_${generateRandomString(8)}@load-test.com`,
      creatorEmail: `creator_${generateRandomString(8)}@load-test.com`,
      subscriberEmail: `subscriber_${generateRandomString(8)}@load-test.com`,
      contentTitle: `Content_${generateRandomString(8)}`,
      searchTerm: Math.random() > 0.5 ? 'tutorial' : 'music'
    };
  }
};
