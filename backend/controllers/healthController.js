'use strict';

/**
 * Health controller (#196).
 *
 * GET /health        — full service health (status, DB, uptime, process info)
 * GET /health/live   — Kubernetes liveness probe (always 200 if process is up)
 * GET /health/ready  — Kubernetes readiness probe (200 only when DB is reachable)
 */

const { getHealthReport, getLivenessReport, getReadinessReport } = require('../services/healthService');
const logger = require('../utils/logger');

/**
 * GET /health
 * Returns 200 when all dependencies are healthy, 503 when degraded.
 */
async function healthCheck(req, res) {
  try {
    const report = await getHealthReport();
    const statusCode = report.status === 'healthy' ? 200 : 503;
    return res.status(statusCode).json(report);
  } catch (err) {
    logger.error('Health check failed', { err });
    return res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Health check unavailable',
    });
  }
}

/**
 * GET /health/live
 * Liveness probe — does NOT check DB; always 200 while the process runs.
 */
function livenessCheck(req, res) {
  return res.status(200).json(getLivenessReport());
}

/**
 * GET /health/ready
 * Readiness probe — 200 when the service can accept traffic, 503 when not ready.
 */
async function readinessCheck(req, res) {
  try {
    const report = await getReadinessReport();
    const statusCode = report.ready ? 200 : 503;
    return res.status(statusCode).json(report);
  } catch (err) {
    logger.error('Readiness check failed', { err });
    return res.status(503).json({
      ready: false,
      timestamp: new Date().toISOString(),
      error: 'Readiness check unavailable',
    });
  }
}

module.exports = { healthCheck, livenessCheck, readinessCheck };
