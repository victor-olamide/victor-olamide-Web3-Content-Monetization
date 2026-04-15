/**
 * Reusable input validation middleware.
 *
 * All validators follow the Express middleware signature:
 *   (req, res, next) => void
 *
 * They call next() on success or return a 400 JSON response on failure.
 */

'use strict';

// ─── Constants ────────────────────────────────────────────────────────────────

/** STX mainnet address starts with SP, testnet with ST.  Both are 40-41 chars. */
const STX_ADDRESS_RE = /^(SP|ST)[0-9A-Z]{38,39}$/;

/** Stacks transaction ID is a 64-char hex string, optionally prefixed with 0x. */
const STX_TX_ID_RE = /^(0x)?[0-9a-fA-F]{64}$/;

const ALLOWED_CONTENT_TYPES = ['video', 'article', 'image', 'music'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns true if s is a non-empty string after trimming.
 */
const isNonEmptyString = (s) => typeof s === 'string' && s.trim().length > 0;

/**
 * Returns true if n is a finite positive number (> 0).
 */
const isPositiveNumber = (n) => typeof n === 'number' && isFinite(n) && n > 0;

/**
 * Returns true if n is a finite non-negative number (>= 0).
 */
const isNonNegativeNumber = (n) => typeof n === 'number' && isFinite(n) && n >= 0;

/**
 * Returns true if the string looks like a valid Stacks wallet address.
 */
const isValidStxAddress = (addr) =>
  typeof addr === 'string' && STX_ADDRESS_RE.test(addr.trim());

/**
 * Returns true if the string looks like a valid Stacks transaction ID.
 */
const isValidTxId = (txId) =>
  typeof txId === 'string' && STX_TX_ID_RE.test(txId.trim());

/**
 * Coerce a value to a positive integer, or return NaN if not possible.
 */
const toPositiveInt = (v) => {
  const n = parseInt(v, 10);
  return Number.isInteger(n) && n > 0 ? n : NaN;
};

// ─── Middleware Factories ─────────────────────────────────────────────────────

/**
 * Validates the body fields required for creating a purchase record.
 */
const validatePurchaseBody = (req, res, next) => {
  const { contentId, user, txId, amount, creator } = req.body;

  // Presence check
  const missing = [];
  if (contentId === undefined) missing.push('contentId');
  if (!isNonEmptyString(user)) missing.push('user');
  if (!isNonEmptyString(txId)) missing.push('txId');
  if (amount === undefined) missing.push('amount');
  if (!isNonEmptyString(creator)) missing.push('creator');

  if (missing.length > 0) {
    return res.status(400).json({
      message: 'Missing required fields',
      fields: missing,
    });
  }

  // Type / format checks
  const parsedContentId = toPositiveInt(contentId);
  if (isNaN(parsedContentId)) {
    return res.status(400).json({ message: 'contentId must be a positive integer' });
  }

  if (!isValidStxAddress(user)) {
    return res.status(400).json({
      message: 'user must be a valid Stacks wallet address (SP… or ST…)',
    });
  }

  if (!isValidStxAddress(creator)) {
    return res.status(400).json({
      message: 'creator must be a valid Stacks wallet address (SP… or ST…)',
    });
  }

  if (!isValidTxId(txId)) {
    return res.status(400).json({
      message: 'txId must be a 64-character hex string (with or without 0x prefix)',
    });
  }

  const parsedAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (!isPositiveNumber(parsedAmount)) {
    return res.status(400).json({ message: 'amount must be a positive number' });
  }

  // Normalise and attach sanitised values so route handlers use clean data.
  req.validatedBody = {
    contentId: parsedContentId,
    user: user.trim(),
    txId: txId.trim(),
    amount: parsedAmount,
    creator: creator.trim(),
  };

  next();
};

/**
 * Validates the body fields required for creating content metadata.
 */
const validateContentBody = (req, res, next) => {
  const { contentId, title, description, contentType, price, creator, url } = req.body;

  const missing = [];
  if (contentId === undefined) missing.push('contentId');
  if (!isNonEmptyString(title)) missing.push('title');
  if (!isNonEmptyString(contentType)) missing.push('contentType');
  if (price === undefined) missing.push('price');
  if (!isNonEmptyString(creator)) missing.push('creator');

  if (missing.length > 0) {
    return res.status(400).json({ message: 'Missing required fields', fields: missing });
  }

  const parsedContentId = toPositiveInt(contentId);
  if (isNaN(parsedContentId)) {
    return res.status(400).json({ message: 'contentId must be a positive integer' });
  }

  if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
    return res.status(400).json({
      message: `contentType must be one of: ${ALLOWED_CONTENT_TYPES.join(', ')}`,
    });
  }

  const parsedPrice = typeof price === 'string' ? parseFloat(price) : price;
  if (!isNonNegativeNumber(parsedPrice)) {
    return res.status(400).json({ message: 'price must be a non-negative number' });
  }

  if (!isValidStxAddress(creator)) {
    return res.status(400).json({
      message: 'creator must be a valid Stacks wallet address (SP… or ST…)',
    });
  }

  if (title.trim().length > 200) {
    return res.status(400).json({ message: 'title must be 200 characters or fewer' });
  }

  if (description && typeof description === 'string' && description.length > 2000) {
    return res.status(400).json({ message: 'description must be 2000 characters or fewer' });
  }

  req.validatedBody = {
    contentId: parsedContentId,
    title: title.trim(),
    description: description ? String(description).trim() : '',
    contentType,
    price: parsedPrice,
    creator: creator.trim(),
    url: url ? String(url).trim() : undefined,
    tokenGating: req.body.tokenGating,
  };

  next();
};

/**
 * Validates that an :amount route param is a positive integer.
 */
const validateAmountParam = (req, res, next) => {
  const amount = toPositiveInt(req.params.amount);
  if (isNaN(amount)) {
    return res.status(400).json({ message: 'amount parameter must be a positive integer' });
  }
  req.parsedAmount = amount;
  next();
};

/**
 * Validates that a :address route param looks like a Stacks wallet address.
 */
const validateAddressParam = (req, res, next) => {
  const address = req.params.address || req.params.user;
  if (!isValidStxAddress(address)) {
    return res.status(400).json({
      message: 'address parameter must be a valid Stacks wallet address (SP… or ST…)',
    });
  }
  next();
};

module.exports = {
  validatePurchaseBody,
  validateContentBody,
  validateAmountParam,
  validateAddressParam,
  // Export helpers so other middleware/routes can reuse them.
  isValidStxAddress,
  isValidTxId,
  isPositiveNumber,
  isNonEmptyString,
};
