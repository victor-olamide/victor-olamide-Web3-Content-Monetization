'use strict';

/**
 * Health service (#196).
 * Aggregates service status, DB connection state, and process uptime
 * into a single structured health report consumed by GET /health.
 */

const { healthCheck, getConnectionStatus } = require('../config/database');
const { dbConnectionGauge } = require('../config/metricsRegistry');
const logger = require('../utils/logger');

const SERVICE_START_TIME = Date.now();

/**
 * Return full health report.
 * @returns {Promise<{status: string, uptime: number, timestamp: string, database: object, process: object}>}
 */
async function getHealthReport() {
  const dbHealth = await healthCheck().catch((err) => {
    logger.warn('Health check DB ping failed', { err });
    return { status: 'unhealthy', message: err.message };
  });

  const dbStatus = getConnectionStatus();
  const isDbHealthy = dbHealth.status === 'healthy';

  // Keep DB gauge in sync
  dbConnectionGauge.set(isDbHealthy ? 1 : 0);

  const overallStatus = isDbHealthy ? 'healthy' : 'degraded';

  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    uptimeMs: Date.now() - SERVICE_START_TIME,
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    database: {
      status: isDbHealthy ? 'connected' : 'disconnected',
      message: dbHealth.message,
      readyState: dbStatus.readyState,
      host: dbStatus.host,
      name: dbStatus.name,
    },
    process: {
      nodeVersion: process.version,
      platform: process.platform,
      pid: process.pid,
      memoryMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    },
  };
}

/**
 * Lightweight liveness probe — does not hit DB.
 */
function getLivenessReport() {
  return {
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    pid: process.pid,
  };
}

/**
 * Readiness probe — verifies DB is reachable before accepting traffic.
 */
async function getReadinessReport() {
  const dbHealth = await healthCheck().catch(() => ({ status: 'unhealthy', message: 'ping failed' }));
  const ready = dbHealth.status === 'healthy';
  return {
    ready,
    timestamp: new Date().toISOString(),
    database: dbHealth,
  };
}

module.exports = { getHealthReport, getLivenessReport, getReadinessReport, SERVICE_START_TIME };
