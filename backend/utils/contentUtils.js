/**
 * Content Utilities
 * Helper functions for content management
 */

/**
 * Check if content is premium (requires payment)
 */
function isPremiumContent(price) {
  return price && price > 0;
}

/**
 * Check if content should be encrypted
 */
function shouldEncryptContent(price, explicitEncrypt = false) {
  return explicitEncrypt || isPremiumContent(price);
}

module.exports = {
  isPremiumContent,
  shouldEncryptContent
};