# Subscription Purchase and Management API

This document describes the new subscription purchase and active subscription management endpoints.

## POST /api/subscriptions
Purchase a new subscription and create a subscription record.

Request body:
- `user` (string, required): user identifier
- `creator` (string, required): creator identifier
- `tierId` (number, required): numeric representation of the subscription tier
- `subscriptionTierId` (string, optional): tier document ObjectId
- `tierName` (string, optional): snapshot tier name
- `tierPrice` (number, optional): snapshot tier price
- `tierBenefits` (array, optional): snapshot benefits list
- `amount` (number, required): purchase amount
- `expiry` (ISO date string, optional): explicit expiry date; defaults to 30 days from purchase
- `transactionId` (string, required): unique transaction identifier
- `autoRenewal` (boolean, optional): whether auto-renewal is enabled
- `gracePeriodDays` (number, optional): grace period length in days
- `currency` (string, optional): subscription currency
- `email` (string, optional): user email address for notifications

Response:
- `success`: true
- `message`: confirmation string
- `subscription`: created subscription document

## GET /api/subscriptions/:userId
Get active subscriptions for a user.

Query options:
- `includeInactive=true` (optional): return all subscriptions for the user instead of only active subscriptions

Response:
- array of subscription records
- each record includes a `renewalState` object with current expiry and grace period status

## Notes
- New subscriptions are saved in the `Subscription` model.
- Active subscriptions are those that are not cancelled and have not expired, or are still within their grace period.
- The renewal scheduler uses `expiry` and `nextRenewalDate` fields to determine when subscriptions should be processed for renewal.
