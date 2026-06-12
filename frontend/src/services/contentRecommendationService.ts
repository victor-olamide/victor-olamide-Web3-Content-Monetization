/**
 * Content Recommendation Service
 * Provides algorithms for personalized content discovery based on
 * user interests, viewing history, and content metadata.
 */

import { Content } from '@/types/content';

export interface RecommendationWeights {
  category: number;
  tags: number;
  viewCount: number;
  likes: number;
  price: number;
  creator: number;
  recency: number;
}

export interface ContentScore {
  contentId: string | number;
  score: number;
  reasons: string[];
}

const DEFAULT_WEIGHTS: RecommendationWeights = {
  category: 0.3,
  tags: 0.2,
  viewCount: 0.15,
  likes: 0.1,
  price: 0.1,
  creator: 0.1,
  recency: 0.05,
};

class ContentRecommendationService {
  /**
   * Calculate recommendation score for a content item
   * based on reference content and user preferences
   */
  calculateRecommendationScore(
    candidate: Content,
    reference: Content,
    weights: Partial<RecommendationWeights> = {}
  ): ContentScore {
    const finalWeights = { ...DEFAULT_WEIGHTS, ...weights };
    const reasons: string[] = [];
    let score = 0;

    // Category match (highest weight)
    if (
      candidate.category &&
      reference.category &&
      candidate.category === reference.category
    ) {
      score += finalWeights.category;
      reasons.push('Same category');
    } else {
      score += finalWeights.category * 0.3; // Partial match for other categories
    }

    // Tag overlap
    const tagScore = this.calculateTagOverlap(candidate.tags, reference.tags);
    score += finalWeights.tags * tagScore;
    if (tagScore > 0.5) {
      reasons.push(`Shared interests (${(tagScore * 100).toFixed(0)}% match)`);
    }

    // View count (popularity)
    const viewScore = this.normalizeMetric(
      candidate.viewCount || 0,
      0,
      100000
    );
    score += finalWeights.viewCount * viewScore;
    if ((candidate.viewCount || 0) > 1000) {
      reasons.push('Popular content');
    }

    // Likes/engagement
    const likeScore = this.normalizeMetric(candidate.likes || 0, 0, 10000);
    score += finalWeights.likes * likeScore;

    // Price similarity (penalize if too different)
    const priceScore =
      1 -
      Math.min(
        Math.abs(candidate.price - reference.price) / 100,
        1
      );
    score += finalWeights.price * priceScore;

    // Creator bonus (different creator but same quality tier)
    if (
      candidate.creator !== reference.creator &&
      candidate.viewCount &&
      reference.viewCount
    ) {
      const creatorScore =
        Math.min(candidate.viewCount, reference.viewCount) /
        Math.max(candidate.viewCount, reference.viewCount);
      score += finalWeights.creator * creatorScore;
      reasons.push('Creator recommendation');
    }

    // Recency bonus
    const recencyScore = this.calculateRecencyScore(
      candidate.createdAt || Date.now()
    );
    score += finalWeights.recency * recencyScore;
    if (recencyScore > 0.7) {
      reasons.push('Recently published');
    }

    return {
      contentId: candidate.id || candidate.contentId,
      score: Math.min(score, 1),
      reasons,
    };
  }

  /**
   * Get top N recommendations from a list of content
   */
  getTopRecommendations(
    candidates: Content[],
    reference: Content,
    limit: number = 6,
    excludeIds: (string | number)[] = []
  ): Content[] {
    const scored = candidates
      .filter(
        (c) =>
          (c.id || c.contentId) !== (reference.id || reference.contentId) &&
          !excludeIds.includes(c.id || c.contentId)
      )
      .map((c) => ({
        content: c,
        score: this.calculateRecommendationScore(c, reference),
      }))
      .sort((a, b) => b.score.score - a.score.score)
      .slice(0, limit);

    return scored.map((s) => s.content);
  }

  /**
   * Get recommendations by category similarity
   */
  getRecommendationsByCategory(
    candidates: Content[],
    referenceCategory: string,
    limit: number = 6
  ): Content[] {
    return candidates
      .filter((c) => c.category === referenceCategory)
      .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
      .slice(0, limit);
  }

  /**
   * Get trending recommendations based on view count and recency
   */
  getTrendingRecommendations(
    candidates: Content[],
    limit: number = 6
  ): Content[] {
    const now = Date.now();
    const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;

    return candidates
      .filter((c) => {
        const createdAt =
          typeof c.createdAt === 'string'
            ? new Date(c.createdAt).getTime()
            : (c.createdAt || 0);
        return now - createdAt < ONE_WEEK;
      })
      .sort(
        (a, b) =>
          (b.viewCount || 0) - (a.viewCount || 0) ||
          ((b.likes || 0) - (a.likes || 0)) * 10
      )
      .slice(0, limit);
  }

  /**
   * Calculate overlap between two tag arrays
   */
  private calculateTagOverlap(tags1?: string[], tags2?: string[]): number {
    if (!tags1 || !tags2 || tags1.length === 0 || tags2.length === 0) {
      return 0;
    }

    const set1 = new Set(tags1.map((t) => t.toLowerCase()));
    const set2 = new Set(tags2.map((t) => t.toLowerCase()));

    const intersection = [...set1].filter((tag) => set2.has(tag)).length;
    const union = new Set([...set1, ...set2]).size;

    return union > 0 ? intersection / union : 0;
  }

  /**
   * Normalize a metric to 0-1 range
   */
  private normalizeMetric(value: number, min: number, max: number): number {
    if (max === min) return 0;
    return Math.max(0, Math.min(1, (value - min) / (max - min)));
  }

  /**
   * Calculate recency score (newer = higher)
   */
  private calculateRecencyScore(createdAt: string | number): number {
    const now = Date.now();
    const created =
      typeof createdAt === 'string'
        ? new Date(createdAt).getTime()
        : createdAt;

    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000;

    if (created > oneWeekAgo) return 1; // Very recent
    if (created > oneMonthAgo) return 0.7; // Recent
    if (created > oneMonthAgo - 30 * 24 * 60 * 60 * 1000) return 0.4; // Somewhat recent
    return 0.1; // Older
  }

  /**
   * Get personalized recommendations based on viewing history
   */
  getPersonalizedRecommendations(
    candidates: Content[],
    viewingHistory: Content[],
    limit: number = 6
  ): Content[] {
    if (viewingHistory.length === 0) {
      return this.getTrendingRecommendations(candidates, limit);
    }

    const scored = candidates
      .filter(
        (c) =>
          !viewingHistory.find(
            (v) => (v.id || v.contentId) === (c.id || c.contentId)
          )
      )
      .map((c) => {
        // Score against each item in history and average
        const scores = viewingHistory.map((v) =>
          this.calculateRecommendationScore(c, v)
        );
        const avgScore =
          scores.reduce((sum, s) => sum + s.score, 0) / scores.length;
        const allReasons = new Set(
          scores.flatMap((s) => s.reasons)
        );

        return {
          content: c,
          score: avgScore,
          reasons: Array.from(allReasons).slice(0, 2),
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return scored.map((s) => s.content);
  }

  /**
   * Get diverse recommendations (mix of different categories)
   */
  getDiverseRecommendations(
    candidates: Content[],
    referenceCategory: string,
    limit: number = 6
  ): Content[] {
    const byCategory = new Map<string, Content[]>();

    candidates.forEach((c) => {
      const category = c.category || 'uncategorized';
      if (!byCategory.has(category)) {
        byCategory.set(category, []);
      }
      byCategory.get(category)!.push(c);
    });

    // Primary category gets half the slots
    const primarySlots = Math.ceil(limit / 2);
    const secondarySlots = limit - primarySlots;

    const recommended: Content[] = [];

    // Add from primary category
    const primaryCandidates =
      byCategory.get(referenceCategory) || [];
    const primary = primaryCandidates
      .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
      .slice(0, primarySlots);
    recommended.push(...primary);

    // Add from other categories
    const otherCategories = Array.from(byCategory.entries()).filter(
      ([cat]) => cat !== referenceCategory
    );

    const secondary: Content[] = [];
    for (const [, items] of otherCategories) {
      if (secondary.length < secondarySlots) {
        secondary.push(
          items.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))[0]
        );
      }
    }
    recommended.push(...secondary);

    return recommended.slice(0, limit);
  }
}

// Export singleton instance
export const contentRecommendationService =
  new ContentRecommendationService();

export default contentRecommendationService;
