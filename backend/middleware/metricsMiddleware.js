'use strict';

/**
 * HTTP metrics middleware (#196).
 *
 * Attaches to every request and records:
 *   - httpRequestsTotal      — incremented on response finish
 *   - httpRequestDuration    — observed on response finish
 *   - httpErrorsTotal        — incremented for 4xx/5xx responses
 */

const {
  httpRequestsTotal,
  httpRequestDuration,
  httpErrorsTotal,
} = require('../config/metricsRegistry');

/**
 * Normalise a raw Express path into a stable label value.
 * Replaces ObjectId-like segments and numeric IDs with a placeholder
 * so high-cardinality labels don't explode the time-series database.
 *
 * e.g.  /api/content/64f1a2b3c4d5e6f7a8b9c0d1  →  /api/content/:id
 *       /api/users/42/profile                   →  /api/users/:id/profile
 */
function normaliseRoute(path) {
  return path
    .replace(/\/[0-9a-f]{24}/gi, '/:id')   // MongoDB ObjectId
    .replace(/\/\d+/g, '/:id');             // numeric ids
}

/**
 * Express middleware — must be registered BEFORE all API routes.
 */
function httpMetricsMiddleware(req, res, next) {
  const startAt = process.hrtime.bigint();

  res.on('finish', () => {
    const elapsedNs = process.hrtime.bigint() - startAt;
    const durationSeconds = Number(elapsedNs) / 1e9;

    const method     = req.method;
    const route      = normaliseRoute(req.route?.path || req.path);
    const statusCode = String(res.statusCode);

    httpRequestsTotal.labels(method, route, statusCode).inc();
    httpRequestDuration.labels(method, route, statusCode).observe(durationSeconds);

    if (res.statusCode >= 400) {
      httpErrorsTotal.labels(method, route, statusCode).inc();
    }
  });

  next();
}

module.exports = { httpMetricsMiddleware, normaliseRoute };
