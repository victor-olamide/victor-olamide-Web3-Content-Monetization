const express = require('express');
const router = express.Router();
const recommendationController = require('../controllers/recommendationController');

// GET /api/recommendations/:userId - Get personalized recommendations
router.get('/:userId', recommendationController.getRecommendations);

// GET /api/recommendations?userId=... - Alternative way to get recommendations
router.get('/', recommendationController.getRecommendations);

// POST /api/recommendations/:userId/preferences - Update user preferences
router.post('/:userId/preferences', recommendationController.updatePreferences);

// GET /api/recommendations/:userId/stats - Get user viewing statistics
router.get('/:userId/stats', recommendationController.getUserStats);

// POST /api/recommendations/viewing - Record viewing history
router.post('/viewing', recommendationController.recordViewing);

module.exports = router;
