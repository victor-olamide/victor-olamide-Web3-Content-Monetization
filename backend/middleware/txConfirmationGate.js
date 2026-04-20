const { verifyTransactionStatus } = require('../services/blockchainVerification');

/**
 * Middleware that verifies a transaction is confirmed before allowing the request through.
 * Expects txId in req.body, req.query, or req.params.
 * Optionally reads minConfirmations from req.query.minConfirmations (default 1).
 */
async function txConfirmationGate(req, res, next) {
  const txId = req.body?.txId || req.query?.txId || req.params?.txId;
  const minConfirmations = parseInt(req.query?.minConfirmations || '1', 10);

  if (!txId) {
    return res.status(400).json({ success: false, message: 'txId is required for transaction confirmation gate' });
  }

  try {
    const result = await verifyTransactionStatus(txId, minConfirmations);

    if (!result.verified) {
      return res.status(402).json({
        success: false,
        message: 'Transaction not yet confirmed on-chain',
        status: result.status,
        confirmations: result.confirmations
      });
    }

    req.txVerification = result;
    next();
  } catch (err) {
    console.error('txConfirmationGate error:', err);
    res.status(500).json({ success: false, message: 'Failed to verify transaction confirmation' });
  }
}

module.exports = { txConfirmationGate };
