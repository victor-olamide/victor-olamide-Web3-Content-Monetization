const recommendationService = require('../services/recommendationService');
const { scoreContentAgainstPrefs } = require('../utils/scoring');

describe('Recommendation Service', () => {
  test('scoreContentAgainstPrefs should score content based on preferences', () => {
    const content = {
      contentType: 'video',
      creator: 'creator1',
      title: 'Blockchain Tutorial',
      description: 'Learn about blockchain',
      price: 10
    };

    const prefs = {
      preferredContentTypes: ['video'],
      preferredCreators: ['creator1'],
      keywords: ['blockchain']
    };

    const score = scoreContentAgainstPrefs(content, prefs);
    expect(score).toBeGreaterThan(0);
  });

  test('scoreContentAgainstPrefs should penalize already viewed content', () => {
    const content = {
      contentId: 1,
      contentType: 'video',
      creator: 'creator1'
    };

    const prefs = {};
    const viewingHistory = [
      { contentId: 1, contentType: 'video', creator: 'creator1' }
    ];

    const score = scoreContentAgainstPrefs(content, prefs, viewingHistory);
    expect(score).toBe(-50); // Penalty for already viewed
  });

  test('recommendForUser should return recommendations', async () => {
    // This would require mocking the database
    // For now, just test that the function exists and can be called
    expect(typeof recommendationService.recommendForUser).toBe('function');
  });

  test('recordViewingHistory should be a function', () => {
    expect(typeof recommendationService.recordViewingHistory).toBe('function');
  });

  test('updateUserPreferences should be a function', () => {
    expect(typeof recommendationService.updateUserPreferences).toBe('function');
  });

  test('getUserViewingStats should be a function', () => {
    expect(typeof recommendationService.getUserViewingStats).toBe('function');
  });
});