/**
 * Purchase validation middleware
 * Validates purchase requests before processing
 */

const { isValidStxAddress, isPositiveNumber } = require('./inputValidation');

/**
 * Validate purchase request body
 */
const validatePayPerViewPurchaseRequest = (req, res, next) => {
  const { contentId, amount, txId } = req.body;

  // Validate contentId
  if (!contentId || !Number.isInteger(contentId) || contentId <= 0) {
    return res.status(400).json({
      message: 'Valid contentId (positive integer) is required'
    });
  }

  // Validate amount
  if (!amount || !isPositiveNumber(amount)) {
    return res.status(400).json({
      message: 'Valid amount (positive number) is required'
    });
  }

  if (amount > 1000000) {
    return res.status(400).json({
      message: 'Amount exceeds maximum allowed value'
    });
  }

  // Validate transaction ID
  if (!txId || typeof txId !== 'string' || txId.trim().length === 0) {
    return res.status(400).json({
      message: 'Valid transaction ID is required'
    });
  }

  const txIdTrimmed = txId.trim();
  // Validate Stacks transaction ID format (64 hex chars, optionally prefixed with 0x)
  const stxTxIdRegex = /^(0x)?[0-9a-fA-F]{64}$/;
  if (!stxTxIdRegex.test(txIdTrimmed)) {
    return res.status(400).json({
      message: 'Transaction ID must be a 64-character hex string'
    });
  }

  next();
};

/**
 * Validate access check request
 */
const validateAccessCheckRequest = (req, res, next) => {
  const { contentId, userAddress } = req.body || {};

  if (!contentId || !Number.isInteger(contentId) || contentId <= 0) {
    return res.status(400).json({
      message: 'Valid contentId (positive integer) is required'
    });
  }

  if (!userAddress || !isValidStxAddress(userAddress)) {
    return res.status(400).json({
      message: 'Valid userAddress (Stacks address) is required'
    });
  }

  next();
};

/**
 * Validate content ID parameter
 */
const validateContentIdParam = (req, res, next) => {
  const contentId = parseInt(req.params.contentId);

  if (!Number.isInteger(contentId) || contentId <= 0) {
    return res.status(400).json({
      message: 'Valid contentId (positive integer) is required'
    });
  }

  req.parsedContentId = contentId;
  next();
};

/**
 * Validate user address parameter
 */
const validateUserAddressParam = (req, res, next) => {
  const userAddress = req.params.userAddress;

  if (!isValidStxAddress(userAddress)) {
    return res.status(400).json({
      message: 'Valid user address (Stacks address) is required'
    });
  }

  next();
};

/**
 * Validate pagination parameters
 */
const validatePaginationParams = (req, res, next) => {
  let skip = 0;
  let limit = 50;

  if (req.query.skip) {
    skip = parseInt(req.query.skip);
    if (!Number.isInteger(skip) || skip < 0) {
      return res.status(400).json({
        message: 'skip must be a non-negative integer'
      });
    }
  }

  if (req.query.limit) {
    limit = parseInt(req.query.limit);
    if (!Number.isInteger(limit) || limit <= 0 || limit > 500) {
      return res.status(400).json({
        message: 'limit must be a positive integer between 1 and 500'
      });
    }
  }

  req.pagination = { skip, limit };
  next();
};

module.exports = {
  validatePayPerViewPurchaseRequest,
  validateAccessCheckRequest,
  validateContentIdParam,
  validateUserAddressParam,
  validatePaginationParams
};
