const ContentPreview = require('../models/ContentPreview');
const UserPreference = require('../models/UserPreference');
const { scoreContentAgainstPrefs } = require('../utils/scoring');

async function recommendForUser(userId, limit = 10) {
  const prefs = await UserPreference.findOne({ userId }).lean();

  // Fetch a pool of candidate content (most recent, limit multiplier)
  const poolSize = Math.max(limit * 5, 50);
  const candidates = await ContentPreview.find({}).sort({ createdAt: -1 }).limit(poolSize).lean();

  const scored = candidates.map(c => ({
    content: c,
    score: scoreContentAgainstPrefs(c, prefs || {})
  }));

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map(s => s.content);
}

module.exports = { recommendForUser };
