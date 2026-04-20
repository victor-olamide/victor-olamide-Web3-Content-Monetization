const WebhookEvent = require('../models/WebhookEvent');
const webhookService = require('./webhookService');
const logger = require('../utils/logger');

async function replayUnprocessed(limit = 100) {
  const events = await WebhookEvent.find({ processed: false }).limit(limit);
  for (const e of events) {
    try {
      await webhookService.processEvent(e);
    } catch (err) {
      logger.error('Replay failed for event', { eventId: e.eventId, err: err.message });
    }
  }
}

module.exports = { replayUnprocessed };
