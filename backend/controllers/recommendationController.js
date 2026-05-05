const recommendationService = require('../services/recommendationService');

exports.getRecommendations = async (req, res) => {
  try {
    const userId = req.params.userId || req.query.userId;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const limit = parseInt(req.query.limit) || 10;
    const results = await recommendationService.recommendForUser(userId, limit);
    res.json({ userId, recommendations: results });
  } catch (err) {
    console.error('Recommendation error', err);
    res.status(500).json({ error: err.message });
  }
};
