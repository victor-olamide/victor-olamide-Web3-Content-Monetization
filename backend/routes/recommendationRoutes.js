const express = require('express');
const router = express.Router();
const recommendationController = require('../controllers/recommendationController');
const { seedAll } = require('../services/recommendationSeed');

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

// POST /api/recommendations/seed - Seed sample data (development only)
router.post('/seed', async (req, res) => {
  try {
    await seedAll();
    res.json({
      success: true,
      message: 'Recommendation data seeded successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to seed data',
      error: error.message
    });
  }
});

module.exports = router;
