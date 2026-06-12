'use strict';

/**
 * Metrics service (#196).
 * Wraps the shared Prometheus registry and provides helpers for
 * active-user tracking consumed by GET /metrics.
 */

const { registry, activeUsersGauge, dbConnectionGauge } = require('../config/metricsRegistry');
const { getConnectionStatus } = require('../config/database');

/**
 * Render Prometheus exposition format from the shared registry.
 * @returns {Promise<{contentType: string, body: string}>}
 */
async function getPrometheusMetrics() {
  // Sync DB gauge right before scrape
  const { readyState } = getConnectionStatus();
  dbConnectionGauge.set(readyState === 1 ? 1 : 0);

  const body = await registry.metrics();
  return { contentType: registry.contentType, body };
}

/**
 * Increment the active-users gauge (call on authenticated request).
 */
function incrementActiveUsers() {
  activeUsersGauge.inc();
}

/**
 * Decrement the active-users gauge (call on session termination / logout).
 */
function decrementActiveUsers() {
  activeUsersGauge.dec();
}

/**
 * Reset the active-users gauge to a specific value.
 * @param {number} count
 */
function setActiveUsers(count) {
  activeUsersGauge.set(count);
}

/**
 * Return a plain JSON snapshot of current metric values (for debugging).
 */
async function getMetricsSummary() {
  const metrics = await registry.getMetricsAsJSON();
  return metrics.reduce((acc, m) => {
    acc[m.name] = m.values;
    return acc;
  }, {});
}

module.exports = {
  getPrometheusMetrics,
  incrementActiveUsers,
  decrementActiveUsers,
  setActiveUsers,
  getMetricsSummary,
};
