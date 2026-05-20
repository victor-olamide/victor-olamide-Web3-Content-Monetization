'use strict';

/**
 * Profile Validation Middleware
 *
 * Validators used by profile CRUD endpoints:
 *   validateProfileId       — checks :id param is a non-empty string
 *   validateProfileUpdate   — validates displayName, bio, avatar for PUT /profile/:id
 *   validateProfileData     — full profile field validation (legacy / broader use)
 *   validatePreferences     — boolean preference flags
 *   validateSettings        — account settings fields
 *   validateSocialLinks     — social link URLs / handles
 *   validateRating          — purchase rating + review
 *   validateCompletion      — completion percentage
 *   validatePaginationParams — skip / limit query params
 */

const logger = require('../utils/logger');

// ── Helpers ──────────────────────────────────────────────────────────────────

const URL_REGEX = /^https?:\/\/([\w-]+\.)+[\w-]+(\/[\w\-./?%&=]*)?$/i;

function sendErrors(res, errors) {
  return res.status(400).json({ success: false, errors });
}

// ── :id param validator ───────────────────────────────────────────────────────

/**
 * Validates that req.params.id is present and non-empty.
 * Used on routes like GET /profile/:id and PUT /profile/:id.
 */
const validateProfileId = (req, res, next) => {
  const { id } = req.params;
  if (!id || typeof id !== 'string' || id.trim() === '') {
    return res.status(400).json({ success: false, error: 'Profile id param is required' });
  }
  req.params.id = id.trim().toLowerCase();
  next();
};

// ── PUT /profile/:id — core update fields ────────────────────────────────────

/**
 * Validates the body for PUT /profile/:id.
 * Accepted fields: displayName, bio, avatar.
 * At least one field must be present.
 */
const validateProfileUpdate = (req, res, next) => {
  const { displayName, bio, avatar } = req.body;
  const errors = [];

  const hasAtLeastOne = displayName !== undefined || bio !== undefined || avatar !== undefined;
  if (!hasAtLeastOne) {
    return res.status(400).json({
      success: false,
      error: 'Request body must include at least one of: displayName, bio, avatar',
    });
  }

  if (displayName !== undefined) {
    if (typeof displayName !== 'string') {
      errors.push('displayName must be a string');
    } else if (displayName.trim().length === 0) {
      errors.push('displayName cannot be empty');
    } else if (displayName.trim().length > 100) {
      errors.push('displayName must be 100 characters or fewer');
    }
  }

  if (bio !== undefined) {
    if (typeof bio !== 'string') {
      errors.push('bio must be a string');
    } else if (bio.length > 500) {
      errors.push('bio must be 500 characters or fewer');
    }
  }

  if (avatar !== undefined) {
    if (typeof avatar !== 'string') {
      errors.push('avatar must be a string');
    } else if (avatar !== '' && !URL_REGEX.test(avatar)) {
      errors.push('avatar must be a valid http/https URL');
    }
  }

  if (errors.length > 0) return sendErrors(res, errors);
  next();
};

// ── Full profile data validator ───────────────────────────────────────────────

const validateProfileData = (req, res, next) => {
  const { displayName, avatar, username, bio } = req.body;
  const errors = [];

  if (displayName !== undefined) {
    if (typeof displayName !== 'string') errors.push('displayName must be a string');
    else if (displayName.trim().length > 100) errors.push('displayName must be 100 characters or fewer');
  }

  if (avatar !== undefined) {
    if (typeof avatar !== 'string') errors.push('avatar must be a string');
    else if (avatar !== '' && !URL_REGEX.test(avatar)) errors.push('avatar must be a valid http/https URL');
  }

  if (username !== undefined) {
    if (typeof username !== 'string') errors.push('username must be a string');
    else if (username.trim().length < 3) errors.push('username must be at least 3 characters');
    else if (username.trim().length > 50) errors.push('username must be 50 characters or fewer');
    else if (!/^[a-zA-Z0-9_-]+$/.test(username.trim())) errors.push('username may only contain letters, numbers, underscores, and hyphens');
  }

  if (bio !== undefined) {
    if (typeof bio !== 'string') errors.push('bio must be a string');
    else if (bio.length > 500) errors.push('bio must be 500 characters or fewer');
  }

  if (errors.length > 0) return sendErrors(res, errors);
  next();
};

// ── Preferences validator ─────────────────────────────────────────────────────

const VALID_PREFERENCES = [
  'emailNotifications', 'pushNotifications', 'marketingEmails',
  'privateProfile', 'showOnlineStatus', 'allowMessages',
];

const validatePreferences = (req, res, next) => {
  const errors = [];
  for (const [key, value] of Object.entries(req.body)) {
    if (!VALID_PREFERENCES.includes(key)) {
      errors.push(`Invalid preference key: ${key}`);
    } else if (typeof value !== 'boolean') {
      errors.push(`${key} must be a boolean`);
    }
  }
  if (errors.length > 0) return sendErrors(res, errors);
  next();
};

// ── Settings validator ────────────────────────────────────────────────────────

const validateSettings = (req, res, next) => {
  const { language, theme, currency, timezone, twoFactorEnabled } = req.body;
  const errors = [];

  if (language !== undefined && typeof language !== 'string') errors.push('language must be a string');
  if (theme !== undefined && !['light', 'dark', 'auto'].includes(theme)) errors.push('theme must be light, dark, or auto');
  if (currency !== undefined && typeof currency !== 'string') errors.push('currency must be a string');
  if (timezone !== undefined && typeof timezone !== 'string') errors.push('timezone must be a string');
  if (twoFactorEnabled !== undefined && typeof twoFactorEnabled !== 'boolean') errors.push('twoFactorEnabled must be a boolean');

  if (errors.length > 0) return sendErrors(res, errors);
  next();
};

// ── Social links validator ────────────────────────────────────────────────────

const VALID_SOCIAL_KEYS = ['twitter', 'discord', 'website', 'github'];

const validateSocialLinks = (req, res, next) => {
  const errors = [];
  for (const [key, value] of Object.entries(req.body)) {
    if (!VALID_SOCIAL_KEYS.includes(key)) {
      errors.push(`Invalid social link key: ${key}`);
      continue;
    }
    if (value !== null && value !== '' && typeof value !== 'string') {
      errors.push(`${key} must be a string or null`);
      continue;
    }
    if (key === 'website' && value && !URL_REGEX.test(value)) {
      errors.push('website must be a valid http/https URL');
    }
  }
  if (errors.length > 0) return sendErrors(res, errors);
  next();
};

// ── Rating validator ──────────────────────────────────────────────────────────

const validateRating = (req, res, next) => {
  const { rating, review } = req.body;
  const errors = [];

  if (rating === undefined || rating === null) {
    errors.push('rating is required');
  } else if (typeof rating !== 'number') {
    errors.push('rating must be a number');
  } else if (rating < 0 || rating > 5) {
    errors.push('rating must be between 0 and 5');
  }

  if (review !== undefined) {
    if (typeof review !== 'string') errors.push('review must be a string');
    else if (review.length > 1000) errors.push('review must be 1000 characters or fewer');
  }

  if (errors.length > 0) return sendErrors(res, errors);
  next();
};

// ── Completion validator ──────────────────────────────────────────────────────

const validateCompletion = (req, res, next) => {
  const { percentage } = req.body;
  const errors = [];

  if (percentage === undefined || percentage === null) {
    errors.push('percentage is required');
  } else if (typeof percentage !== 'number') {
    errors.push('percentage must be a number');
  } else if (percentage < 0 || percentage > 100) {
    errors.push('percentage must be between 0 and 100');
  }

  if (errors.length > 0) return sendErrors(res, errors);
  next();
};

// ── Pagination validator ──────────────────────────────────────────────────────

const validatePaginationParams = (req, res, next) => {
  const skip = parseInt(req.query.skip, 10) || 0;
  const limit = parseInt(req.query.limit, 10) || 20;

  if (skip < 0) return res.status(400).json({ success: false, error: 'skip must be non-negative' });
  if (limit < 1 || limit > 100) return res.status(400).json({ success: false, error: 'limit must be between 1 and 100' });

  req.pagination = { skip, limit };
  next();
};

module.exports = {
  validateProfileId,
  validateProfileUpdate,
  validateProfileData,
  validatePreferences,
  validateSettings,
  validateSocialLinks,
  validateRating,
  validateCompletion,
  validatePaginationParams,
};
