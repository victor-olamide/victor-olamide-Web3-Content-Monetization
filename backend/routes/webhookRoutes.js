const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

// Incoming webhook endpoint for blockchain events
router.post('/events', webhookController.receiveEvent);

module.exports = router;
