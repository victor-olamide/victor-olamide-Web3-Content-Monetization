## Webhooks feature (Issue #71)

- Add `WebhookEvent` model to persist incoming webhook events.
- Add `POST /api/webhooks/events` endpoint with optional HMAC verification.
- Add basic processing service to update `ContentPreview` on content updates.
- Add admin replay endpoint `POST /api/webhooks/admin/replay`.
- Add simple in-memory rate limiter and docs.
