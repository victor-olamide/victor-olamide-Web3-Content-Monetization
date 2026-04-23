const recommendationService = require('../services/recommendationService');
const logger = require('../utils/logger');

/**
 * Get personalized content recommendations for a user
 * Uses viewing history and preferences for scoring
 */

exports.getRecommendations = async (req, res) => {
  try {
    const userId = req.params.userId || req.query.userId;
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    const limit = Math.min(parseInt(req.query.limit) || 10, 50); // Max 50
    const includeScores = req.query.includeScores === 'true';

    const recommendations = await recommendationService.recommendForUser(userId, limit);

    // Format response
    const response = includeScores
      ? recommendations
      : recommendations.map(r => {
          const { recommendationScore, ...content } = r;
          return content;
        });

    res.json({
      success: true,
      userId,
      recommendations: response,
      count: response.length,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    logger.error('Recommendation error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to get recommendations',
      message: err.message
    });
  }
};

exports.updatePreferences = async (req, res) => {
  try {
    const { userId } = req.params;
    const preferences = req.body;

    // Validate preferences
    const allowedFields = ['preferredContentTypes', 'preferredCreators', 'keywords', 'minPrice', 'maxPrice'];
    const filteredPrefs = {};

    for (const field of allowedFields) {
      if (preferences[field] !== undefined) {
        filteredPrefs[field] = preferences[field];
      }
    }

    await recommendationService.updateUserPreferences(userId, filteredPrefs);

    res.json({
      success: true,
      message: 'User preferences updated successfully'
    });
  } catch (error) {
    logger.error('Error updating preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update preferences',
      error: error.message
    });
  }
};

exports.getUserStats = async (req, res) => {
  try {
    const { userId } = req.params;

    const stats = await recommendationService.getUserViewingStats(userId);

    res.json({
      success: true,
      userId,
      stats
    });
  } catch (error) {
    logger.error('Error getting user stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user statistics',
      error: error.message
    });
  }
};

exports.recordViewing = async (req, res) => {
  try {
    const { userId, contentId, viewDuration, completionRate, liked, shared, sessionId } = req.body;

    if (!userId || !contentId) {
      return res.status(400).json({
        success: false,
        message: 'userId and contentId are required'
      });
    }

    // Get content details
    const Content = require('../models/Content');
    const content = await Content.findOne({ contentId: parseInt(contentId) });

    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Content not found'
      });
    }

    const contentData = {
      contentId: content.contentId,
      contentType: content.contentType,
      creator: content.creator,
      title: content.title
    };

    const viewData = {
      duration: viewDuration,
      completionRate,
      liked,
      shared,
      sessionId
    };

    await recommendationService.recordViewingHistory(userId, contentData, viewData);

    res.json({
      success: true,
      message: 'Viewing history recorded successfully'
    });
  } catch (error) {
    logger.error('Error recording viewing:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record viewing history',
      error: error.message
    });
  }
};
