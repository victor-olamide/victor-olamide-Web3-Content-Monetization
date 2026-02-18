# Email Notifications

This document describes the email notification system.

## Overview

The platform sends email notifications for important events such as purchases and subscription activations. Email sending is optional and can be configured via environment variables.

## Configuration

Environment variables:

- `EMAIL_ENABLED` (true|false) - Enable email sending
- `EMAIL_PROVIDER` - Currently `smtp` supported
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`
- `EMAIL_DEFAULT_FROM` - Default From address

Example:

```
EMAIL_ENABLED=true
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=587
SMTP_USER=abc
SMTP_PASS=def
EMAIL_DEFAULT_FROM=no-reply@yourdomain.com
```

## Usage

- In-app notifications are created regardless of email availability.
- Email notifications are sent only if `EMAIL_ENABLED=true` and a recipient email is available.
- The system attempts to resolve recipient email from the provided payload (`purchaseData.email`, `subscriptionData.email`) or from the user's profile (`UserProfile.email` or `UserProfile.contactEmail`) when present.
- Users can opt-out of email notifications via `UserProfile.preferences.emailNotifications`.

## Developer Notes

- Email templates live in `config/emailConfig.js` and can be customized.
- The low-level email sender is `services/emailService.js` (nodemailer based).
- Notification orchestration remains in `services/notificationService.js` which now attempts to send emails for purchases and subscriptions.

## Testing

See `backend/tests/emailNotification.test.js` for integration tests that cover basic flows.
