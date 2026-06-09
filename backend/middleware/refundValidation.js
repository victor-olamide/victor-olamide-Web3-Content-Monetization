/**
 * Validation middleware for refund endpoints
 */

const VALID_REFUND_METHODS = ['blockchain', 'platform_credit', 'manual'];

/**
 * Validate POST /refunds request body
 */
function validateRefundRequest(req, res, next) {
  const { subscriptionId, refundMethod, cancellationDate } = req.body;

  if (!subscriptionId || typeof subscriptionId !== 'string' || !subscriptionId.trim()) {
    return res.status(400).json({ message: 'subscriptionId is required and must be a non-empty string' });
  }

  if (refundMethod && !VALID_REFUND_METHODS.includes(refundMethod)) {
    return res.status(400).json({
      message: `refundMethod must be one of: ${VALID_REFUND_METHODS.join(', ')}`
    });
  }

  if (cancellationDate && isNaN(new Date(cancellationDate).getTime())) {
    return res.status(400).json({ message: 'cancellationDate must be a valid date string' });
  }

  next();
}

/**
 * Validate POST /refunds/:id/trigger-onchain request body
 */
function validateOnChainTrigger(req, res, next) {
  const { subscriberPrincipal, creatorPrincipal, tierId } = req.body;

  if (!subscriberPrincipal || typeof subscriberPrincipal !== 'string') {
    return res.status(400).json({ message: 'subscriberPrincipal is required' });
  }

  if (!creatorPrincipal || typeof creatorPrincipal !== 'string') {
    return res.status(400).json({ message: 'creatorPrincipal is required' });
  }

  if (tierId === undefined || tierId === null || isNaN(Number(tierId))) {
    return res.status(400).json({ message: 'tierId is required and must be a number' });
  }

  next();
}

module.exports = { validateRefundRequest, validateOnChainTrigger };
