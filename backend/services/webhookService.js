const WebhookEvent = require('../models/WebhookEvent');
const ContentPreview = require('../models/ContentPreview');

async function handleContentUpdate(payload) {
  // Minimal handler: update previewEnabled or totalViews if present
  if (!payload || !payload.contentId) return;
  const update = {};
  if (typeof payload.previewEnabled === 'boolean') update.previewEnabled = payload.previewEnabled;
  if (typeof payload.totalViews === 'number') update.totalViews = payload.totalViews;

  if (Object.keys(update).length === 0) return;
  await ContentPreview.updateOne({ contentId: payload.contentId }, { $set: update });
}

exports.processEvent = async (event) => {
  if (!event || !event.payload) return;
  const { payload } = event;
  try {
    switch (payload.type || event.eventType) {
      case 'content.updated':
      case 'content.preview_updated':
        await handleContentUpdate(payload);
        break;
      default:
        // Unknown event: store for manual inspection
        break;
    }

    event.processed = true;
    event.processedAt = new Date();
    await event.save();
  } catch (err) {
    console.error('Error processing webhook event', err);
    throw err;
  }
};
