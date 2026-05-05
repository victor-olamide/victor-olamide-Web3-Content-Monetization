// Simple scoring utilities for recommendation ranking
function scoreContentAgainstPrefs(content, prefs) {
  let score = 0;
  if (!content || !prefs) return score;

  // Match contentType
  if (prefs.preferredContentTypes && prefs.preferredContentTypes.includes(content.contentType)) score += 30;

  // Match creator
  if (prefs.preferredCreators && prefs.preferredCreators.includes(content.creator)) score += 25;

  // Keyword matches in title/description
  const text = `${content.title || ''} ${content.description || ''}`.toLowerCase();
  if (prefs.keywords && prefs.keywords.length) {
    prefs.keywords.forEach(k => {
      if (!k) return;
      const ki = k.toLowerCase();
      if (text.includes(ki)) score += 5;
    });
  }

  // Price preference
  if (typeof prefs.minPrice === 'number' && typeof content.price === 'number' && content.price < prefs.minPrice) score -= 10;
  if (typeof prefs.maxPrice === 'number' && typeof content.price === 'number' && content.price > prefs.maxPrice) score -= 10;

  // Reward preview enabled content slightly
  if (content.previewEnabled) score += 3;

  return score;
}

module.exports = { scoreContentAgainstPrefs };
