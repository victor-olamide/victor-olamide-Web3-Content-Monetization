'use strict';

const logger = {
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
  debug: console.debug ? console.debug.bind(console) : console.log.bind(console),
/**
 * Lightweight structured logger for the backend.
 *
 * Outputs newline-delimited JSON to stdout/stderr so log aggregators
 * (Datadog, CloudWatch, etc.) can parse fields without regex.
 *
 * Log levels (in ascending severity):
 *   debug < info < warn < error
 *
 * The active level is controlled by the LOG_LEVEL environment variable.
 * Defaults to 'info' in production and 'debug' everywhere else.
 *
 * Usage:
 *   const logger = require('../utils/logger');
 *   logger.info('Server started', { port: 3000 });
 *   logger.error('DB connection failed', { err });
 */

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };

const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PROD = NODE_ENV === 'production';

const defaultLevel = process.env.LOG_LEVEL
  ? process.env.LOG_LEVEL.toLowerCase()
  : IS_PROD
  ? 'info'
  : 'debug';

const activeLevel = LEVELS[defaultLevel] ?? LEVELS.info;

/**
 * Serialise an Error into a plain object so it survives JSON.stringify.
 * Strips the full stack trace in production to avoid leaking internals.
 */
function serializeError(err) {
  if (!(err instanceof Error)) return err;
  const out = {
    name: err.name,
    message: err.message,
    code: err.code,
  };
  if (!IS_PROD) {
    out.stack = err.stack;
  }
  return out;
}

/**
 * Build and emit a single log line.
 *
 * @param {'debug'|'info'|'warn'|'error'} level
 * @param {string} message
 * @param {Record<string, unknown>} [meta]
 */
function log(level, message, meta = {}) {
  if (LEVELS[level] < activeLevel) return;

  // Serialise any Error instances in meta
  const safeMeta = {};
  for (const [k, v] of Object.entries(meta)) {
    safeMeta[k] = v instanceof Error ? serializeError(v) : v;
  }

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    env: NODE_ENV,
    ...safeMeta,
  };

  const line = JSON.stringify(entry);

  if (level === 'error' || level === 'warn') {
    process.stderr.write(line + '\n');
  } else {
    process.stdout.write(line + '\n');
  }
}

const logger = {
  debug: (message, meta) => log('debug', message, meta),
  info:  (message, meta) => log('info',  message, meta),
  warn:  (message, meta) => log('warn',  message, meta),
  error: (message, meta) => log('error', message, meta),
};

module.exports = logger;
