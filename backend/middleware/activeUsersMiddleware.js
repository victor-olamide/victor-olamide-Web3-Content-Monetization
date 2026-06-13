'use strict';

/**
 * Active users middleware (#196).
 *
 * Increments the active_users_total gauge for every request that carries a
 * valid Authorization header (bearer token present), and decrements it when
 * the response finishes.  This gives a real-time in-flight authenticated
 * request count rather than a persistent session count.
 *
 * For persistent session tracking, call metricsService.setActiveUsers()
 * from the auth controller on login/logout.
 */

const { activeUsersGauge } = require('../config/metricsRegistry');

function activeUsersMiddleware(req, res, next) {
  const hasAuth = !!(req.headers.authorization || req.headers['x-auth-token']);
  if (hasAuth) {
    activeUsersGauge.inc();
    res.on('finish', () => activeUsersGauge.dec());
  }
  next();
}

module.exports = { activeUsersMiddleware };
