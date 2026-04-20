/**
 * Keyword Filter Service
 * Provides keyword-based content filtering and auto-flagging for moderation
 */

class KeywordFilterService {
  constructor() {
    // Profanity and offensive keywords - expandable list
    this.profanityKeywords = [
      'badword1', 'badword2', 'offensive', 'inappropriate',
      'slur1', 'slur2', 'hateful', 'discriminatory'
    ];

    // Spam indicators
    this.spamKeywords = [
      'click here', 'buy now', 'click link', 'free money',
      'work from home', 'earn passive income', 'limited offer'
    ];

    // Misinformation indicators
    this.misinformationKeywords = [
      'fake news', 'conspiracy', 'hoax', 'proven false',
      'debunked', 'not real', 'made up', 'fabricated'
    ];

    // Adult content indicators
    this.adultKeywords = [
      'adult content', 'explicit', 'mature content only',
      '18+ only', 'nsfw', 'x-rated'
    ];

    // Harassment indicators
    this.harassmentKeywords = [
      'threatening', 'attack', 'targeted harassment',
      'doxing', 'cyberbullying', 'threats'
    ];

    // Copyright violation indicators
    this.copyrightKeywords = [
      'copyrighted', 'copyright infringement', 'stolen content',
      'unauthorized use', 'all rights reserved', 'cease and desist'
    ];

    // Violence indicators
    this.violenceKeywords = [
      'violence', 'graphic violence', 'brutal', 'gore',
      'kill', 'murder', 'assault', 'extremely graphic'
    ];

    // Keyword categories mapping
    this.keywordCategories = {
      profanity: { keywords: this.profanityKeywords, severity: 'high', reason: 'profanity-adult' },
      spam: { keywords: this.spamKeywords, severity: 'medium', reason: 'spam' },
      misinformation: { keywords: this.misinformationKeywords, severity: 'high', reason: 'misinformation' },
      adult: { keywords: this.adultKeywords, severity: 'high', reason: 'adult-content' },
      harassment: { keywords: this.harassmentKeywords, severity: 'critical', reason: 'harassment' },
      copyright: { keywords: this.copyrightKeywords, severity: 'medium', reason: 'copyright-violation' },
      violence: { keywords: this.violenceKeywords, severity: 'critical', reason: 'violence' }
    };
  }

  /**
   * Analyze content for flaggable keywords
   */
  analyzeContent(content) {
    const findings = {
      detected: [],
      severity: 'low',
      flagging_recommended: false,
      scores: {}
    };

    // Prepare text for analysis
    const textToAnalyze = this.prepareTextForAnalysis(content);

    // Check each category
    for (const [category, config] of Object.entries(this.keywordCategories)) {
      const matches = this.findMatches(textToAnalyze, config.keywords);

      if (matches.length > 0) {
        findings.detected.push({
          category,
          matches,
          severity: config.severity,
          reason: config.reason,
          count: matches.length
        });

        findings.scores[category] = matches.length;

        // Update overall severity
        if (this.compareSeverity(config.severity, findings.severity) > 0) {
          findings.severity = config.severity;
        }
      }
    }

    // Determine if flagging is recommended
    findings.flagging_recommended = findings.detected.length > 0;

    return findings;
  }

  /**
   * Prepare text for analysis (lowercase, remove extra spaces, etc.)
   */
  prepareTextForAnalysis(content) {
    let text = '';

    if (typeof content === 'string') {
      text = content;
    } else if (typeof content === 'object') {
      // Combine title, description, and other text fields
      const textFields = ['title', 'description', 'caption', 'tags', 'comments'];
      textFields.forEach(field => {
        if (content[field]) {
          text += ' ' + content[field];
        }
      });
    }

    // Return lowercase, normalized text
    return text.toLowerCase().trim();
  }

  /**
   * Find keyword matches in text
   */
  findMatches(text, keywords) {
    const matches = [];
    const wordsInText = text.split(/\s+/);

    for (const keyword of keywords) {
      const keywordRegex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches_found = text.match(keywordRegex);

      if (matches_found) {
        matches.push({
          keyword,
          count: matches_found.length,
          positions: this.findKeywordPositions(text, keyword)
        });
      }
    }

    return matches;
  }

  /**
   * Find positions of keyword in text
   */
  findKeywordPositions(text, keyword) {
    const positions = [];
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    let match;

    while ((match = regex.exec(text)) !== null) {
      positions.push({
        start: match.index,
        end: match.index + match[0].length,
        matched_text: match[0]
      });
    }

    return positions.slice(0, 5); // Limit to first 5 occurrences
  }

  /**
   * Compare severity levels
   */
  compareSeverity(severity1, severity2) {
    const severityLevels = { low: 1, medium: 2, high: 3, critical: 4 };
    return severityLevels[severity1] - severityLevels[severity2];
  }

  /**
   * Add custom keyword to category
   */
  addKeyword(category, keyword) {
    if (this.keywordCategories[category]) {
      if (!this.keywordCategories[category].keywords.includes(keyword)) {
        this.keywordCategories[category].keywords.push(keyword.toLowerCase());
        console.log(`Added keyword "${keyword}" to category "${category}"`);
      }
    }
  }

  /**
   * Remove keyword from category
   */
  removeKeyword(category, keyword) {
    if (this.keywordCategories[category]) {
      const index = this.keywordCategories[category].keywords.indexOf(keyword.toLowerCase());
      if (index > -1) {
        this.keywordCategories[category].keywords.splice(index, 1);
        console.log(`Removed keyword "${keyword}" from category "${category}"`);
      }
    }
  }

  /**
   * Get risk assessment for content
   */
  getRiskAssessment(analysisResult) {
    const assessment = {
      risk_level: 'safe',
      confidence: 100,
      recommendation: 'publish',
      reasons: []
    };

    if (analysisResult.detected.length === 0) {
      return assessment;
    }

    // Calculate risk based on severity and detection count
    let riskScore = 0;

    for (const detection of analysisResult.detected) {
      switch (detection.severity) {
        case 'critical':
          riskScore += 100;
          assessment.reasons.push(`Critical severity: ${detection.reason}`);
          break;
        case 'high':
          riskScore += 50;
          assessment.reasons.push(`High severity: ${detection.reason}`);
          break;
        case 'medium':
          riskScore += 20;
          assessment.reasons.push(`Medium severity: ${detection.reason}`);
          break;
        case 'low':
          riskScore += 5;
          break;
      }
    }

    // Determine risk level
    if (riskScore >= 100) {
      assessment.risk_level = 'critical';
      assessment.recommendation = 'auto-flag';
      assessment.confidence = Math.min(95, riskScore / 2);
    } else if (riskScore >= 70) {
      assessment.risk_level = 'high';
      assessment.recommendation = 'flag-for-review';
      assessment.confidence = Math.min(90, riskScore / 2);
    } else if (riskScore >= 40) {
      assessment.risk_level = 'medium';
      assessment.recommendation = 'review-recommended';
      assessment.confidence = Math.min(85, riskScore / 2);
    } else if (riskScore > 0) {
      assessment.risk_level = 'low';
      assessment.recommendation = 'publish-with-caution';
      assessment.confidence = Math.min(80, riskScore / 2);
    }

    return assessment;
  }

  /**
   * Filter multiple content items
   */
  filterBatch(contentItems) {
    return contentItems.map(item => ({
      id: item.id || item._id,
      analysis: this.analyzeContent(item),
      assessment: this.getRiskAssessment(this.analyzeContent(item))
    }));
  }

  /**
   * Get all keyword categories
   */
  getAllCategories() {
    return Object.keys(this.keywordCategories);
  }

  /**
   * Get keywords by category
   */
  getKeywordsByCategory(category) {
    if (this.keywordCategories[category]) {
      return {
        category,
        keywords: this.keywordCategories[category].keywords,
        count: this.keywordCategories[category].keywords.length,
        severity: this.keywordCategories[category].severity
      };
    }
    return null;
  }

  /**
   * Get all keywords across all categories
   */
  getAllKeywords() {
    const allKeywords = {};
    for (const [category, config] of Object.entries(this.keywordCategories)) {
      allKeywords[category] = config.keywords;
    }
    return allKeywords;
  }
}

module.exports = new KeywordFilterService();
