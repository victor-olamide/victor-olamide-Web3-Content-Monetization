'use strict';

/**
 * Prometheus metrics registry (#196).
 *
 * Exports a single shared Registry plus every named metric used across
 * the application:
 *   - httpRequestsTotal      (Counter)   — total HTTP requests by method/route/status
 *   - httpRequestDuration    (Histogram) — request latency buckets
 *   - httpErrorsTotal        (Counter)   — 4xx/5xx responses by method/route/status
 *   - activeUsersGauge       (Gauge)     — currently authenticated sessions
 *   - dbConnectionGauge      (Gauge)     — mongoose readyState (0=disconnected,1=connected)
 *   - dbOperationDuration    (Histogram) — DB query latency (opt-in per route)
 *
 * All Node.js default metrics (event loop lag, GC, heap, etc.) are also
 * collected automatically via collectDefaultMetrics().
 */

const promClient = require('prom-client');

const registry = new promClient.Registry();

promClient.collectDefaultMetrics({ register: registry, prefix: 'node_' });

// ── HTTP request counter ──────────────────────────────────────────────────────
const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests received',
  labelNames: ['method', 'route', 'status_code'],
  registers: [registry],
});

// ── HTTP latency histogram ────────────────────────────────────────────────────
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request latency in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [registry],
});

// ── HTTP error counter ────────────────────────────────────────────────────────
const httpErrorsTotal = new promClient.Counter({
  name: 'http_errors_total',
  help: 'Total number of HTTP 4xx/5xx responses',
  labelNames: ['method', 'route', 'status_code'],
  registers: [registry],
});

// ── Active users gauge ────────────────────────────────────────────────────────
const activeUsersGauge = new promClient.Gauge({
  name: 'active_users_total',
  help: 'Number of currently active authenticated user sessions',
  registers: [registry],
});

// ── DB connection gauge ───────────────────────────────────────────────────────
const dbConnectionGauge = new promClient.Gauge({
  name: 'db_connection_state',
  help: 'MongoDB connection readyState (1 = connected, 0 = disconnected)',
  registers: [registry],
});

// ── DB operation latency histogram ───────────────────────────────────────────
const dbOperationDuration = new promClient.Histogram({
  name: 'db_operation_duration_seconds',
  help: 'MongoDB operation latency in seconds',
  labelNames: ['operation', 'collection'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [registry],
});

module.exports = {
  registry,
  httpRequestsTotal,
  httpRequestDuration,
  httpErrorsTotal,
  activeUsersGauge,
  dbConnectionGauge,
  dbOperationDuration,
};
