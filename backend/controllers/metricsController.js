'use strict';

/**
 * Metrics controller (#196).
 *
 * GET /metrics         — Prometheus exposition format (for Prometheus scraping)
 * GET /metrics/summary — JSON snapshot of current metric values (debugging)
 */

const { getPrometheusMetrics, getMetricsSummary } = require('../services/metricsService');
const logger = require('../utils/logger');

/**
 * GET /metrics
 * Returns Prometheus text exposition format consumed by a Prometheus scraper.
 */
async function metricsEndpoint(req, res) {
  try {
    const { contentType, body } = await getPrometheusMetrics();
    res.set('Content-Type', contentType);
    return res.end(body);
  } catch (err) {
    logger.error('Failed to render Prometheus metrics', { err });
    return res.status(500).send('# Error generating metrics\n');
  }
}

/**
 * GET /metrics/summary
 * Returns a JSON object keyed by metric name — useful for dashboards / debugging.
 * Should be protected by auth/IP allowlist in production.
 */
async function metricsSummary(req, res) {
  try {
    const summary = await getMetricsSummary();
    return res.status(200).json({ timestamp: new Date().toISOString(), metrics: summary });
  } catch (err) {
    logger.error('Failed to render metrics summary', { err });
    return res.status(500).json({ error: 'Failed to retrieve metrics summary' });
  }
}

module.exports = { metricsEndpoint, metricsSummary };
