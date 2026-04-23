// Simple scoring utilities for recommendation ranking
function scoreContentAgainstPrefs(content, prefs, viewingHistory = []) {
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

  // History-based scoring
  if (viewingHistory && viewingHistory.length > 0) {
    // Boost content from creators user has viewed before
    const viewedCreators = viewingHistory.map(h => h.creator);
    if (viewedCreators.includes(content.creator)) score += 15;

    // Boost similar content types
    const viewedTypes = viewingHistory.map(h => h.contentType);
    const typeFrequency = viewedTypes.filter(t => t === content.contentType).length;
    score += Math.min(typeFrequency * 5, 20); // Max 20 points

    // Penalize already viewed content
    const alreadyViewed = viewingHistory.some(h => h.contentId === content.contentId);
    if (alreadyViewed) score -= 50;

    // Boost content similar to highly rated views
    const highRatedViews = viewingHistory.filter(h => h.completionRate > 80 || h.liked);
    const similarTitles = highRatedViews.filter(h =>
      h.title.toLowerCase().split(' ').some(word =>
        text.includes(word.toLowerCase())
      )
    );
    score += similarTitles.length * 10;
  }

  return score;
}

module.exports = { scoreContentAgainstPrefs };
