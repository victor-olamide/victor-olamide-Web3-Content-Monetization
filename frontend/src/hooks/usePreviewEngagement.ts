import { useState, useCallback, useEffect, useRef } from 'react';

interface TrackingOptions {
  debounceDelay?: number;
  autoTrack?: boolean;
}

/**
 * Hook for tracking preview engagement (views, downloads, watch time)
 */
export const usePreviewEngagement = (contentId: number, options: TrackingOptions = {}) => {
  const {
    debounceDelay = 1000,
    autoTrack = true
  } = options;

  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [engagementMetrics, setEngagementMetrics] = useState({
    viewed: false,
    downloaded: false,
    watchTime: 0,
    playCount: 0,
    pauses: 0
  });

  const debounceTimerRef = useRef<NodeJS.Timeout>();
  const metricsRef = useRef(engagementMetrics);

  // Update metrics ref when engagementMetrics changes
  useEffect(() => {
    metricsRef.current = engagementMetrics;
  }, [engagementMetrics]);

  const trackEvent = useCallback(async (eventType: 'view' | 'download') => {
    try {
      setIsTracking(true);
      const response = await fetch(
        `/api/preview/${contentId}/track/${eventType}`,
        { method: 'POST' }
      );

      if (!response.ok) {
        throw new Error(`Failed to track ${eventType} event`);
      }

      setEngagementMetrics((prev) => ({
        ...prev,
        [eventType === 'view' ? 'viewed' : 'downloaded']: true
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tracking failed');
      console.error(`Error tracking ${eventType}:`, err);
    } finally {
      setIsTracking(false);
    }
  }, [contentId]);

  const trackView = useCallback(() => {
    // Debounce view tracking
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      if (!metricsRef.current.viewed && autoTrack) {
        trackEvent('view');
      }
    }, debounceDelay);
  }, [trackEvent, debounceDelay, autoTrack]);

  const trackDownload = useCallback(() => {
    trackEvent('download');
  }, [trackEvent]);

  const recordWatchTime = useCallback((duration: number) => {
    setEngagementMetrics((prev) => ({
      ...prev,
      watchTime: prev.watchTime + duration
    }));
  }, []);

  const recordPlayback = useCallback((action: 'play' | 'pause') => {
    setEngagementMetrics((prev) => ({
      ...prev,
      playCount: action === 'play' ? prev.playCount + 1 : prev.playCount,
      pauses: action === 'pause' ? prev.pauses + 1 : prev.pauses
    }));
  }, []);

  const getEngagementStats = () => ({
    ...engagementMetrics,
    engagementScore: calculateEngagementScore(engagementMetrics)
  });

  const clearMetrics = useCallback(() => {
    setEngagementMetrics({
      viewed: false,
      downloaded: false,
      watchTime: 0,
      playCount: 0,
      pauses: 0
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    metrics: engagementMetrics,
    isTracking,
    error,
    trackView,
    trackDownload,
    recordWatchTime,
    recordPlayback,
    getEngagementStats,
    clearMetrics
  };
};

/**
 * Calculate engagement score based on user interactions
 */
const calculateEngagementScore = (metrics: typeof initialMetrics): number => {
  let score = 0;

  if (metrics.viewed) score += 10;
  if (metrics.downloaded) score += 20;
  if (metrics.watchTime > 0) score += Math.min(metrics.watchTime / 60 * 5, 30); // Up to 30 points for watch time
  if (metrics.playCount > 0) score += Math.min(metrics.playCount * 2, 20);

  return Math.round(Math.min(score, 100));
};

const initialMetrics = {
  viewed: false,
  downloaded: false,
  watchTime: 0,
  playCount: 0,
  pauses: 0
};

export default usePreviewEngagement;
