/**
 * Profile Validation Middleware
 * Validates profile data and requests
 */

const validateProfileData = (req, res, next) => {
  const { displayName, avatar, username, bio } = req.body;
  const errors = [];

  if (displayName && typeof displayName !== 'string') {
    errors.push('displayName must be a string');
  }

  if (displayName && displayName.length > 100) {
    errors.push('displayName must be less than 100 characters');
  }

  if (avatar && typeof avatar !== 'string') {
    errors.push('avatar must be a string');
  }

  if (username && typeof username !== 'string') {
    errors.push('username must be a string');
  }

  if (username && username.length < 3) {
    errors.push('username must be at least 3 characters');
  }

  if (username && username.length > 50) {
    errors.push('username must be less than 50 characters');
  }

  if (bio && typeof bio !== 'string') {
    errors.push('bio must be a string');
  }

  if (bio && bio.length > 500) {
    errors.push('bio must be less than 500 characters');
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  next();
};

const validatePreferences = (req, res, next) => {
  const preferences = req.body;
  const errors = [];

  const validPreferences = [
    'emailNotifications',
    'pushNotifications',
    'marketingEmails',
    'privateProfile',
    'showOnlineStatus',
    'allowMessages'
  ];

  for (const [key, value] of Object.entries(preferences)) {
    if (!validPreferences.includes(key)) {
      errors.push(`Invalid preference: ${key}`);
      continue;
    }

    if (typeof value !== 'boolean') {
      errors.push(`${key} must be a boolean`);
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  next();
};

const validateSettings = (req, res, next) => {
  const settings = req.body;
  const errors = [];

  if (settings.language && typeof settings.language !== 'string') {
    errors.push('language must be a string');
  }

  if (settings.theme && !['light', 'dark', 'auto'].includes(settings.theme)) {
    errors.push('theme must be light, dark, or auto');
  }

  if (settings.currency && typeof settings.currency !== 'string') {
    errors.push('currency must be a string');
  }

  if (settings.timezone && typeof settings.timezone !== 'string') {
    errors.push('timezone must be a string');
  }

  if (settings.twoFactorEnabled !== undefined && typeof settings.twoFactorEnabled !== 'boolean') {
    errors.push('twoFactorEnabled must be a boolean');
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  next();
};

const validateSocialLinks = (req, res, next) => {
  const socialLinks = req.body;
  const errors = [];

  const validLinks = ['twitter', 'discord', 'website', 'github'];
  const urlRegex = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}/;

  for (const [key, value] of Object.entries(socialLinks)) {
    if (!validLinks.includes(key)) {
      errors.push(`Invalid social link: ${key}`);
      continue;
    }

    if (value && typeof value !== 'string') {
      errors.push(`${key} must be a string`);
      continue;
    }

    if (value && !urlRegex.test(value) && key !== 'twitter' && key !== 'discord' && key !== 'github') {
      errors.push(`${key} must be a valid URL`);
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  next();
};

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

  if (review && typeof review !== 'string') {
    errors.push('review must be a string');
  }

  if (review && review.length > 1000) {
    errors.push('review must be less than 1000 characters');
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  next();
};

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

  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  next();
};

const validatePaginationParams = (req, res, next) => {
  const skip = parseInt(req.query.skip) || 0;
  const limit = parseInt(req.query.limit) || 20;

  if (skip < 0) {
    return res.status(400).json({ success: false, error: 'skip must be non-negative' });
  }

  if (limit < 1 || limit > 100) {
    return res.status(400).json({ success: false, error: 'limit must be between 1 and 100' });
  }

  req.pagination = { skip, limit };
  next();
};

module.exports = {
  validateProfileData,
  validatePreferences,
  validateSettings,
  validateSocialLinks,
  validateRating,
  validateCompletion,
  validatePaginationParams
};
