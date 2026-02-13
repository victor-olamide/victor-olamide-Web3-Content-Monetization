const WebhookEvent = require('../models/WebhookEvent');
const webhookService = require('./webhookService');

async function replayUnprocessed(limit = 100) {
  const events = await WebhookEvent.find({ processed: false }).limit(limit);
  for (const e of events) {
    try {
      await webhookService.processEvent(e);
    } catch (err) {
      console.error('Replay failed for event', e.eventId, err.message);
    }
  }
}

module.exports = { replayUnprocessed };
