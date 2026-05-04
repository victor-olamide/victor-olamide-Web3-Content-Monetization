/**
 * Preview Error Handling and Recovery Service
 * Manages errors, retries, and recovery for preview operations
 */

class PreviewErrorService {
  constructor() {
    this.retryAttempts = 3;
    this.retryDelay = 1000; // ms
    this.errorLog = [];
    this.maxErrorLogSize = 1000;
  }

  /**
   * Custom error class for preview-specific errors
   */
  createPreviewError(code, message, details = {}) {
    const error = new Error(message);
    error.code = code;
    error.details = details;
    return error;
  }

  /**
   * Log error for monitoring and debugging
   */
  logError(error, context = {}) {
    const errorEntry = {
      timestamp: new Date(),
      message: error.message,
      code: error.code || 'UNKNOWN',
      stack: error.stack,
      context
    };

    this.errorLog.push(errorEntry);

    // Keep error log size manageable
    if (this.errorLog.length > this.maxErrorLogSize) {
      this.errorLog.shift();
    }

    console.error('[PreviewError]', errorEntry);
  }

  /**
   * Retry a function with exponential backoff
   */
  async retryWithBackoff(fn, context = 'operation') {
    let lastError;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        console.warn(
          `[PreviewRetry] Attempt ${attempt}/${this.retryAttempts} failed for ${context}:`,
          error.message
        );

        if (attempt < this.retryAttempts) {
          // Exponential backoff
          const delay = this.retryDelay * Math.pow(2, attempt - 1);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    this.logError(lastError, { context, attempts: this.retryAttempts });
    throw lastError;
  }

  /**
   * Handle specific preview error codes
   */
  handlePreviewError(error) {
    if (error.code === 'ENOENT') {
      return {
        userMessage: 'Preview file not found',
        status: 404,
        recoveryAction: 'reupload'
      };
    }

    if (error.code === 'EACCES') {
      return {
        userMessage: 'Access denied to preview file',
        status: 403,
        recoveryAction: 'checkPermissions'
      };
    }

    if (error.code === 'ETIMEDOUT') {
      return {
        userMessage: 'Preview loading timed out',
        status: 504,
        recoveryAction: 'retry'
      };
    }

    if (error.message?.includes('IPFS')) {
      return {
        userMessage: 'Failed to fetch preview from storage',
        status: 503,
        recoveryAction: 'retry'
      };
    }

    return {
      userMessage: 'An error occurred loading the preview',
      status: 500,
      recoveryAction: 'contactSupport'
    };
  }

  /**
   * Validate preview data and provide detailed feedback
   */
  validatePreviewData(data) {
    const errors = [];
    const warnings = [];

    // Check required fields
    if (!data.contentId) errors.push('contentId is required');
    if (!data.title) errors.push('title is required');
    if (data.contentType && !['video', 'article', 'image', 'music'].includes(data.contentType)) {
      errors.push('Invalid contentType');
    }

    // Check file URLs
    if (data.thumbnailUrl && !this.isValidUrl(data.thumbnailUrl)) {
      warnings.push('thumbnailUrl appears to be invalid');
    }
    if (data.trailerUrl && !this.isValidUrl(data.trailerUrl)) {
      warnings.push('trailerUrl appears to be invalid');
    }

    // Check quality settings
    if (data.thumbnailQuality && !['low', 'medium', 'high', 'ultra'].includes(data.thumbnailQuality)) {
      errors.push('Invalid thumbnailQuality');
    }
    if (data.trailerQuality && !['360p', '480p', '720p', '1080p'].includes(data.trailerQuality)) {
      errors.push('Invalid trailerQuality');
    }

    // Check duration if present
    if (data.trailerDuration && (data.trailerDuration < 1 || data.trailerDuration > 3600)) {
      warnings.push('trailerDuration should be between 1 and 3600 seconds');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate URL format
   */
  isValidUrl(url) {
    try {
      if (url.startsWith('ipfs://') || url.startsWith('gaia://')) {
        return true;
      }
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get error recovery suggestions
   */
  getRecoverySuggestions(error) {
    const handled = this.handlePreviewError(error);

    const suggestions = {
      retry: 'Please try again in a few moments',
      reupload: 'Please re-upload the preview file',
      checkPermissions: 'Check that you have proper access permissions',
      contactSupport: 'Please contact support if the problem persists'
    };

    return {
      ...handled,
      suggestion: suggestions[handled.recoveryAction]
    };
  }

  /**
   * Get recent errors for debugging
   */
  getRecentErrors(limit = 10) {
    return this.errorLog.slice(-limit);
  }

  /**
   * Clear error log
   */
  clearErrorLog() {
    this.errorLog = [];
  }

  /**
   * Get error statistics
   */
  getErrorStats() {
    const stats = {
      totalErrors: this.errorLog.length,
      errorsByCode: {},
      errorsByContext: {},
      recentErrors: this.getRecentErrors(5)
    };

    this.errorLog.forEach((entry) => {
      stats.errorsByCode[entry.code] = (stats.errorsByCode[entry.code] || 0) + 1;
      const context = entry.context.context || 'unknown';
      stats.errorsByContext[context] = (stats.errorsByContext[context] || 0) + 1;
    });

    return stats;
  }
}

module.exports = new PreviewErrorService();
