'use strict';

/**
 * Environment variable validation.
 *
 * Call validateEnv() early in server startup to catch missing
 * required configuration before any connections are attempted.
 */

const logger = require('./logger');

const REQUIRED_VARS = ['DB_URI', 'JWT_SECRET', 'PORT', 'CONTENT_ENCRYPTION_MASTER_KEY'];

/**
 * Validate that all required environment variables are set.
 * Logs a warning for each missing var and throws if any are absent.
 *
 * @throws {Error} if one or more required vars are missing
 */
function validateEnv() {
  const missing = REQUIRED_VARS.filter((key) => !process.env[key]);

  if (missing.length === 0) {
    logger.debug('Environment validation passed', { checked: REQUIRED_VARS });
    return;
  }

  missing.forEach((key) => {
    logger.warn(`Missing required environment variable: ${key}`);
  });

  throw new Error(
    `Server cannot start — missing required env vars: ${missing.join(', ')}. ` +
    'Copy backend/.env.example to backend/.env and fill in the values.'
  );
}

module.exports = { validateEnv, REQUIRED_VARS };
