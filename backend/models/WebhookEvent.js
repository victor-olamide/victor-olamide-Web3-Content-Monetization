const mongoose = require('mongoose');

const webhookEventSchema = new mongoose.Schema({
  eventId: { type: String, required: true, unique: true },
  eventType: { type: String, required: true },
  source: { type: String },
  payload: { type: Object },
  processed: { type: Boolean, default: false },
  receivedAt: { type: Date, default: Date.now },
  processedAt: { type: Date }
});

webhookEventSchema.index({ eventId: 1 });
webhookEventSchema.index({ processed: 1 });

module.exports = mongoose.model('WebhookEvent', webhookEventSchema);
