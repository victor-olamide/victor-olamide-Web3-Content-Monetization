const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');
const { rateLimiter } = require('../utils/simpleRateLimiter');

// Incoming webhook endpoint for blockchain events. Apply a simple rate limiter.
router.post('/events', rateLimiter({ windowMs: 60000, max: 120 }), webhookController.receiveEvent);

module.exports = router;
