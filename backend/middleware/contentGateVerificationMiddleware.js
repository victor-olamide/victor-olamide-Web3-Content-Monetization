/**
 * Content-Gate Verification Middleware
 * 
 * This middleware verifies that users have the required NFT or token balance
 * to access content before serving it. It enforces on-chain gating rules.
 * 
 * Used by routes to:
 * - Verify user has required token/NFT
 * - Check gating rules exist for content
 * - Log verification attempts
 * - Cache verification results
 */

const contentGateService = require('../services/contentGateService');
const accessService = require('../services/accessService');
const NodeCache = require('node-cache');

// Cache for gating verification (5 minute TTL)
const gatingVerificationCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

/**
 * Verify user has access based on gating rules
 * Used as middleware to check NFT/token gating before content delivery
 */
async function verifyGatingAccess(req, res, next) {
  try {
    const { contentId, userAddress } = req.query;
    
    if (!contentId) {
      return res.status(400).json({
        error: 'contentId required',
        success: false,
      });
    }

    if (!userAddress) {
      return res.status(400).json({
        error: 'userAddress required',
        success: false,
      });
    }

    // Check cache
    const cacheKey = `gating:${contentId}:${userAddress}`;
    const cachedResult = gatingVerificationCache.get(cacheKey);
    if (cachedResult) {
      req.gatingVerification = {
        ...cachedResult,
        cached: true,
      };
      return next();
    }

    // Get gating rule for content
    const rule = await contentGateService.getGatingRule(contentId);

    if (!rule) {
      // No gating rule configured, allow access
      req.gatingVerification = {
        verified: true,
        reason: 'no-gating-rule',
        contentId,
        userAddress,
        cached: false,
      };
      return next();
    }

    const verificationResult = {
      verified: false,
      reason: 'unverified',
      contentId,
      userAddress,
      gatingType: rule.gating_type === 0 ? 'FT' : 'NFT',
      tokenContract: rule.token_contract,
      cached: false,
    };

    // Verify based on gating type
    if (rule.gating_type === 0) {
      // FT (Fungible Token) verification
      const ftResult = await contentGateService.verifyFTAccess(
        contentId,
        userAddress,
        rule.token_contract
      );
      verificationResult.verified = ftResult.verified;
      verificationResult.reason = ftResult.reason;
      verificationResult.threshold = rule.threshold;
    } else if (rule.gating_type === 1) {
      // NFT verification
      const nftResult = await contentGateService.verifyNFTAccess(
        contentId,
        userAddress
      );
      verificationResult.verified = nftResult.verified;
      verificationResult.reason = nftResult.reason;
    }

    // Cache successful verifications
    if (verificationResult.verified) {
      gatingVerificationCache.set(cacheKey, verificationResult);
    }

    req.gatingVerification = verificationResult;
    next();
  } catch (error) {
    console.error('Error in verifyGatingAccess middleware:', error.message);
    req.gatingVerification = {
      verified: false,
      reason: 'verification-error',
      error: error.message,
    };
    next();
  }
}

/**
 * Middleware to check gating access before content delivery
 * Combines gating rules with other access methods
 */
async function verifyAccessBeforeDelivery(req, res, next) {
  try {
    const { contentId } = req.query;
    const userAddress = req.headers['x-user-address'] || req.query.userAddress;

    if (!contentId || !userAddress) {
      return res.status(400).json({
        error: 'contentId and userAddress required',
        success: false,
      });
    }

    // Use existing accessService which already handles:
    // - Creator access
    // - Purchase verification
    // - Subscription verification
    // - Token gating
    const accessResult = await accessService.verifyAccess(contentId, userAddress);

    if (!accessResult.allowed) {
      return res.status(403).json({
        error: 'Access denied',
        reason: accessResult.reason,
        method: accessResult.method,
        success: false,
      });
    }

    req.accessVerification = accessResult;
    next();
  } catch (error) {
    console.error('Error in verifyAccessBeforeDelivery middleware:', error.message);
    res.status(500).json({
      error: 'Verification failed',
      message: error.message,
      success: false,
    });
  }
}

/**
 * Endpoint to check gating status for content
 */
async function checkGatingStatus(req, res) {
  try {
    const { contentId, userAddress } = req.query;

    if (!contentId) {
      return res.status(400).json({
        error: 'contentId required',
        success: false,
      });
    }

    const rule = await contentGateService.getGatingRule(contentId);

    if (!rule) {
      return res.json({
        contentId,
        hasGating: false,
        gatingRule: null,
        userAccess: null,
        success: true,
      });
    }

    let userAccess = null;
    if (userAddress) {
      if (rule.gating_type === 0) {
        userAccess = await contentGateService.verifyFTAccess(
          contentId,
          userAddress,
          rule.token_contract
        );
      } else {
        userAccess = await contentGateService.verifyNFTAccess(
          contentId,
          userAddress
        );
      }
    }

    res.json({
      contentId,
      hasGating: true,
      gatingRule: {
        type: rule.gating_type === 0 ? 'FT' : 'NFT',
        tokenContract: rule.token_contract,
        threshold: rule.threshold,
      },
      userAccess,
      success: true,
    });
  } catch (error) {
    console.error('Error in checkGatingStatus:', error.message);
    res.status(500).json({
      error: 'Status check failed',
      message: error.message,
      success: false,
    });
  }
}

/**
 * Get gating metrics
 */
function getGatingMetrics() {
  return {
    cacheSize: gatingVerificationCache.getStats().ksize,
    cacheStats: gatingVerificationCache.getStats(),
    serviceMetrics: contentGateService.getMetrics(),
  };
}

/**
 * Invalidate verification cache for content
 */
function invalidateGatingCache(contentId) {
  // Clear all cache entries for this content ID
  const keys = Object.keys(gatingVerificationCache.keys());
  keys.forEach(key => {
    if (key.includes(`gating:${contentId}:`)) {
      gatingVerificationCache.del(key);
    }
  });
  
  // Also invalidate content-gate service cache
  contentGateService.invalidateGatingRuleCache(contentId);
}

module.exports = {
  verifyGatingAccess,
  verifyAccessBeforeDelivery,
  checkGatingStatus,
  getGatingMetrics,
  invalidateGatingCache,
};
