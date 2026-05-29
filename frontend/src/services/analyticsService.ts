// Analytics service for tracking user interactions with content

export type EventType = 'view' | 'purchase' | 'stream' | 'share' | 'download' | 'report' | 'subscribe';

interface AnalyticsEvent {
  eventType: EventType;
  contentId: string;
  userId?: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

class AnalyticsService {
  private events: AnalyticsEvent[] = [];
  private batchSize = 10;
  private flushInterval = 30000; // 30 seconds
  private timerId: NodeJS.Timeout | null = null;

  constructor() {
    // Initialize interval for batch sending
    if (typeof window !== 'undefined') {
      this.startBatchTimer();
    }
  }

  /**
   * Track a user event
   */
  trackEvent(
    eventType: EventType,
    contentId: string,
    userId?: string,
    metadata?: Record<string, any>
  ): void {
    const event: AnalyticsEvent = {
      eventType,
      contentId,
      userId,
      timestamp: Date.now(),
      metadata,
    };

    this.events.push(event);

    // Flush if batch size reached
    if (this.events.length >= this.batchSize) {
      this.flush();
    }
  }

  /**
   * Track content view
   */
  trackContentView(contentId: string, userId?: string): void {
    this.trackEvent('view', contentId, userId, {
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    });
  }

  /**
   * Track streaming started
   */
  trackStreamStart(contentId: string, userId?: string, duration?: number): void {
    this.trackEvent('stream', contentId, userId, {
      action: 'start',
      duration,
    });
  }

  /**
   * Track streaming progress
   */
  trackStreamProgress(
    contentId: string,
    userId: string | undefined,
    currentTime: number,
    duration: number
  ): void {
    const percentComplete = (currentTime / duration) * 100;
    this.trackEvent('stream', contentId, userId, {
      action: 'progress',
      currentTime,
      percentComplete,
    });
  }

  /**
   * Track content purchase
   */
  trackPurchase(
    contentId: string,
    userId: string | undefined,
    amount: number,
    txId: string
  ): void {
    this.trackEvent('purchase', contentId, userId, {
      amount,
      txId,
      currency: 'STX',
    });
  }

  /**
   * Track content share
   */
  trackShare(contentId: string, userId: string | undefined, platform?: string): void {
    this.trackEvent('share', contentId, userId, {
      platform: platform || 'unknown',
    });
  }

  /**
   * Track content download
   */
  trackDownload(contentId: string, userId: string | undefined): void {
    this.trackEvent('download', contentId, userId);
  }

  /**
   * Track content report
   */
  trackReport(contentId: string, userId: string | undefined, reason?: string): void {
    this.trackEvent('report', contentId, userId, {
      reason: reason || 'unspecified',
    });
  }

  /**
   * Track subscription action
   */
  trackSubscribe(contentId: string, userId: string | undefined, creatorId: string): void {
    this.trackEvent('subscribe', contentId, userId, {
      creatorId,
    });
  }

  /**
   * Flush accumulated events to backend
   */
  private async flush(): Promise<void> {
    if (this.events.length === 0) return;

    const eventsToSend = [...this.events];
    this.events = [];

    try {
      await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/analytics/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          events: eventsToSend,
          batchId: `${Date.now()}-${Math.random()}`,
        }),
      });
    } catch (error) {
      console.error('Failed to send analytics events:', error);
      // Re-add events to queue for retry
      this.events = [...eventsToSend, ...this.events];
    }
  }

  /**
   * Start batch timer for periodic flushing
   */
  private startBatchTimer(): void {
    this.timerId = setInterval(() => {
      this.flush();
    }, this.flushInterval) as NodeJS.Timeout;
  }

  /**
   * Stop batch timer and flush remaining events
   */
  stopBatchTimer(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.flush();
  }

  /**
   * Get pending events (for debugging)
   */
  getPendingEvents(): AnalyticsEvent[] {
    return [...this.events];
  }

  /**
   * Clear all pending events
   */
  clearPendingEvents(): void {
    this.events = [];
  }
}

// Singleton instance
let instance: AnalyticsService | null = null;

export const getAnalyticsService = (): AnalyticsService => {
  if (!instance) {
    instance = new AnalyticsService();
  }
  return instance;
};

export default AnalyticsService;
