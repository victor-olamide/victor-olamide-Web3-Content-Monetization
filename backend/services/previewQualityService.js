/**
 * Preview Quality Configuration Service
 * Manages preview quality settings and optimization
 */

class PreviewQualityService {
  constructor() {
    this.qualityProfiles = {
      low: {
        thumbnail: { maxWidth: 200, maxHeight: 150, quality: 60, format: 'webp' },
        trailer: { resolution: '360p', bitrate: '500k', codec: 'h264' }
      },
      medium: {
        thumbnail: { maxWidth: 400, maxHeight: 300, quality: 75, format: 'webp' },
        trailer: { resolution: '480p', bitrate: '1000k', codec: 'h264' }
      },
      high: {
        thumbnail: { maxWidth: 600, maxHeight: 450, quality: 85, format: 'webp' },
        trailer: { resolution: '720p', bitrate: '2500k', codec: 'h264' }
      },
      ultra: {
        thumbnail: { maxWidth: 1200, maxHeight: 900, quality: 95, format: 'webp' },
        trailer: { resolution: '1080p', bitrate: '5000k', codec: 'h264' }
      }
    };
  }

  /**
   * Get quality profile configuration
   * @param {String} qualityLevel - Quality level (low, medium, high, ultra)
   * @param {String} mediaType - Type of media (thumbnail, trailer)
   * @returns {Object} Quality configuration
   */
  getQualityProfile(qualityLevel = 'high', mediaType = 'thumbnail') {
    const profile = this.qualityProfiles[qualityLevel] || this.qualityProfiles.high;
    return profile[mediaType] || null;
  }

  /**
   * Recommend quality based on file size and content type
   * @param {Number} fileSize - File size in bytes
   * @param {String} contentType - Type of content (video, image, etc)
   * @returns {String} Recommended quality level
   */
  recommendQuality(fileSize, contentType = 'video') {
    const sizeMB = fileSize / (1024 * 1024);

    if (contentType === 'video') {
      if (sizeMB > 100) return 'low';
      if (sizeMB > 50) return 'medium';
      if (sizeMB > 20) return 'high';
      return 'ultra';
    }

    // For images
    if (sizeMB > 10) return 'low';
    if (sizeMB > 5) return 'medium';
    if (sizeMB > 2) return 'high';
    return 'ultra';
  }

  /**
   * Validate quality level
   * @param {String} qualityLevel - Quality level to validate
   * @returns {Boolean} Is valid
   */
  isValidQuality(qualityLevel) {
    return Object.keys(this.qualityProfiles).includes(qualityLevel);
  }

  /**
   * Get all available quality levels
   * @returns {Array<String>} Available quality levels
   */
  getAvailableQualityLevels() {
    return Object.keys(this.qualityProfiles);
  }

  /**
   * Calculate optimal bitrate for trailer
   * @param {String} resolution - Resolution (360p, 480p, 720p, 1080p)
   * @param {Number} duration - Duration in seconds
   * @returns {Object} Bitrate information
   */
  calculateOptimalBitrate(resolution, duration) {
    const bitrates = {
      '360p': { video: 500, audio: 128, total: 628 },
      '480p': { video: 1000, audio: 128, total: 1128 },
      '720p': { video: 2500, audio: 128, total: 2628 },
      '1080p': { video: 5000, audio: 128, total: 5128 }
    };

    const config = bitrates[resolution] || bitrates['720p'];
    const estimatedSize = (config.total * duration) / 8; // Size in MB

    return {
      resolution,
      duration,
      videoBitrate: `${config.video}k`,
      audioBitrate: `${config.audio}k`,
      totalBitrate: `${config.total}k`,
      estimatedSizeMB: Math.round(estimatedSize * 100) / 100
    };
  }

  /**
   * Get compression settings for quality level
   * @param {String} qualityLevel - Quality level
   * @returns {Object} Compression settings
   */
  getCompressionSettings(qualityLevel = 'high') {
    const settings = {
      low: { crf: 28, preset: 'ultrafast', target_quality: 60 },
      medium: { crf: 23, preset: 'faster', target_quality: 75 },
      high: { crf: 18, preset: 'medium', target_quality: 85 },
      ultra: { crf: 15, preset: 'slow', target_quality: 95 }
    };

    return settings[qualityLevel] || settings.high;
  }

  /**
   * Estimate file size after compression
   * @param {Number} originalSize - Original file size in bytes
   * @param {String} fromQuality - Original quality
   * @param {String} toQuality - Target quality
   * @returns {Number} Estimated size in bytes
   */
  estimateCompressedSize(originalSize, fromQuality = 'high', toQuality = 'high') {
    const qualityRatios = {
      low: 0.4,
      medium: 0.65,
      high: 0.85,
      ultra: 1.0
    };

    const ratio = qualityRatios[toQuality] / qualityRatios[fromQuality];
    return Math.round(originalSize * ratio);
  }
}

module.exports = new PreviewQualityService();
