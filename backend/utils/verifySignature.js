const crypto = require('crypto');

function computeHmac(secret, payload) {
  const h = crypto.createHmac('sha256', secret);
  const body = typeof payload === 'string' ? payload : JSON.stringify(payload || {});
  h.update(body);
  return h.digest('hex');
}

async function verifySignatureIfConfigured(req) {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) return true;

  const signature = req.headers['x-webhook-signature'] || req.headers['x-signature'];
  if (!signature) throw new Error('Missing webhook signature');

  const expected = computeHmac(secret, req.body);
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) {
    throw new Error('Invalid webhook signature');
  }
  return true;
}

module.exports = { computeHmac, verifySignatureIfConfigured };
