/**
 * IPFS CID validation middleware
 * Validates that a CID parameter or body field is a plausible IPFS CID (v0 or v1).
 */

// CIDv0: Qm... (46 chars, base58)
// CIDv1: bafy... or b... (base32/base58btc, typically 59+ chars)
const CID_REGEX = /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[a-z2-7]{58,})$/;

/**
 * Validate :cid route parameter
 */
const validateCidParam = (req, res, next) => {
  const { cid } = req.params;
  if (!cid || !CID_REGEX.test(cid)) {
    return res.status(400).json({ message: 'Invalid IPFS CID format' });
  }
  next();
};

/**
 * Validate cid field in request body (non-fatal — only warns if present but invalid)
 */
const validateCidBody = (req, res, next) => {
  const { cid } = req.body;
  if (cid && !CID_REGEX.test(cid)) {
    return res.status(400).json({ message: 'Invalid IPFS CID format in request body' });
  }
  next();
};

module.exports = { validateCidParam, validateCidBody, CID_REGEX };
