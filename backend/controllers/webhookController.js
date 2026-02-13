const WebhookEvent = require('../models/WebhookEvent');
const webhookService = require('../services/webhookService');
const { verifySignatureIfConfigured } = require('../utils/verifySignature');

exports.receiveEvent = async (req, res) => {
  try {
    // Optionally verify signature - throws if invalid
    await verifySignatureIfConfigured(req);

    const payload = req.body || {};
    const eventId = payload.id || payload.eventId || `${Date.now()}-${Math.random()}`;
    const eventType = payload.type || payload.eventType || 'unknown';

    const existing = await WebhookEvent.findOne({ eventId });
    if (existing) {
      return res.status(200).json({ status: 'duplicate', eventId });
    }

    const saved = await WebhookEvent.create({
      eventId,
      eventType,
      source: req.headers['x-webhook-source'] || req.hostname,
      payload
    });

    // Process asynchronously
    webhookService.processEvent(saved).catch(err => console.error('Webhook process error', err));

    res.status(200).json({ status: 'received', eventId });
  } catch (err) {
    console.error('Webhook receive error', err);
    res.status(400).json({ error: err.message });
  }
};
