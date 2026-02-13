# Webhooks

This document describes the webhook endpoint used to receive blockchain events.

Endpoint: `POST /api/webhooks/events`

Headers:
- `Content-Type: application/json`
- Optional `x-webhook-signature`: HMAC-SHA256 of the request body when `WEBHOOK_SECRET` is configured.

Payload:
- Arbitrary JSON payload. `payload.id` or `payload.eventId` will be used as the event id when present.

Processing:
- Events are persisted to `WebhookEvent` and processed asynchronously by `webhookService`.
