'use strict';

/**
 * Metrics routes (#196).
 *
 * GET /metrics         — Prometheus exposition text (scraped by Prometheus server)
 * GET /metrics/summary — JSON snapshot for human inspection / debugging
 */

const express = require('express');
const router = express.Router();
const { metricsEndpoint, metricsSummary } = require('../controllers/metricsController');

router.get('/', metricsEndpoint);
router.get('/summary', metricsSummary);

module.exports = router;
