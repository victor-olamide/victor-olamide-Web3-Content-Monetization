'use strict';

/**
 * Health routes (#196).
 *
 * GET /health        — full service health report
 * GET /health/live   — liveness probe (process alive)
 * GET /health/ready  — readiness probe (DB reachable)
 * GET /health/database        — delegated to databaseHealth middleware
 * GET /health/database/status — detailed DB connection state
 */

const express = require('express');
const router = express.Router();
const { healthCheck, livenessCheck, readinessCheck } = require('../controllers/healthController');
const { databaseHealthCheck, databaseStatusCheck } = require('../middleware/databaseHealth');

router.get('/', healthCheck);
router.get('/live', livenessCheck);
router.get('/ready', readinessCheck);
router.get('/database', databaseHealthCheck);
router.get('/database/status', databaseStatusCheck);

module.exports = router;
