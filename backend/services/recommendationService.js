/**
 * Recommendation Service
 * Provides personalized content recommendations based on user preferences and viewing history
 * Uses collaborative filtering and content-based scoring
 */

const ContentPreview = require('../models/ContentPreview');
const UserPreference = require('../models/UserPreference');
const ViewingHistory = require('../models/ViewingHistory');
const { scoreContentAgainstPrefs } = require('../utils/scoring');
const logger = require('../utils/logger');

async function recommendForUser(userId, limit = 10) {
  try {
    logger.info(`Generating recommendations for user ${userId}, limit: ${limit}`);

    // Get user preferences
    const prefs = await UserPreference.findOne({ userId }).lean() || {};

    // Get user's viewing history (last 100 views)
    const viewingHistory = await ViewingHistory.find({ userId })
      .sort({ viewedAt: -1 })
      .limit(100)
      .lean();

    logger.debug(`Found ${viewingHistory.length} viewing history items for user ${userId}`);

    // Fetch a pool of candidate content (most recent, limit multiplier)
    const poolSize = Math.max(limit * 5, 50);
    const candidates = await ContentPreview.find({})
      .sort({ createdAt: -1 })
      .limit(poolSize)
      .lean();

    // Score each candidate
    const scored = candidates.map(c => ({
      content: c,
      score: scoreContentAgainstPrefs(c, prefs, viewingHistory)
    }));

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    // Return top recommendations
    const recommendations = scored.slice(0, limit).map(s => ({
      ...s.content,
      recommendationScore: s.score
    }));

    logger.info(`Generated ${recommendations.length} recommendations for user ${userId}`);
    return recommendations;
  } catch (error) {
    logger.error(`Error generating recommendations for user ${userId}:`, error);
    // Fallback to basic recommendations
    return await getFallbackRecommendations(limit);
  }
}

async function getFallbackRecommendations(limit = 10) {
  // Simple fallback: return most recent content
  const candidates = await ContentPreview.find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return candidates.map(c => ({
    ...c,
    recommendationScore: 0
  }));
}

async function recordViewingHistory(userId, contentData, viewData = {}) {
  try {
    const historyEntry = new ViewingHistory({
      userId,
      contentId: contentData.contentId,
      contentType: contentData.contentType,
      creator: contentData.creator,
      title: contentData.title,
      viewDuration: viewData.duration || 0,
      completionRate: viewData.completionRate || 0,
      liked: viewData.liked || false,
      shared: viewData.shared || false,
      sessionId: viewData.sessionId
    });

    await historyEntry.save();
    return historyEntry;
  } catch (error) {
    console.error('Error recording viewing history:', error);
    throw error;
  }
}

async function updateUserPreferences(userId, preferences) {
  try {
    const update = {
      userId,
      ...preferences
    };

    const result = await UserPreference.updateOne(
      { userId },
      { $set: update },
      { upsert: true }
    );

    return result;
  } catch (error) {
    console.error('Error updating user preferences:', error);
    throw error;
  }
}

async function getUserViewingStats(userId) {
  try {
    const stats = await ViewingHistory.aggregate([
      { $match: { userId: require('mongoose').Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          totalViews: { $sum: 1 },
          totalDuration: { $sum: '$viewDuration' },
          avgCompletionRate: { $avg: '$completionRate' },
          preferredTypes: {
            $push: '$contentType'
          },
          preferredCreators: {
            $push: '$creator'
          }
        }
      }
    ]);

    if (stats.length === 0) {
      return {
        totalViews: 0,
        totalDuration: 0,
        avgCompletionRate: 0,
        preferredTypes: [],
        preferredCreators: []
      };
    }

    const stat = stats[0];
    const typeCounts = stat.preferredTypes.reduce((acc, type) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    const creatorCounts = stat.preferredCreators.reduce((acc, creator) => {
      acc[creator] = (acc[creator] || 0) + 1;
      return acc;
    }, {});

    return {
      totalViews: stat.totalViews,
      totalDuration: stat.totalDuration,
      avgCompletionRate: stat.avgCompletionRate,
      preferredTypes: Object.keys(typeCounts).sort((a, b) => typeCounts[b] - typeCounts[a]),
      preferredCreators: Object.keys(creatorCounts).sort((a, b) => creatorCounts[b] - creatorCounts[a])
    };
  } catch (error) {
    console.error('Error getting user viewing stats:', error);
    throw error;
  }
}

module.exports = {
  recommendForUser,
  recordViewingHistory,
  updateUserPreferences,
  getUserViewingStats,
  getFallbackRecommendations
};
