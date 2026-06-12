'use client';

import { useEffect, useRef, useCallback } from 'react';
import { getAnalyticsService } from '@/services/analyticsService';
import { useAuth } from '@/contexts/AuthContext';

interface UseContentViewProps {
  contentId: string;
  contentType?: string;
  onMilestone?: (percent: number) => void;
}

export const useContentView = ({
  contentId,
  contentType = 'unknown',
  onMilestone,
}: UseContentViewProps) => {
  const { stxAddress } = useAuth();
  const analyticsService = getAnalyticsService();
  const viewStartedRef = useRef(false);
  const milestonesRef = useRef<Set<number>>(new Set());

  // Track view on mount
  useEffect(() => {
    if (!viewStartedRef.current) {
      analyticsService.trackContentView(contentId, stxAddress);
      viewStartedRef.current = true;
    }

    return () => {
      // Cleanup if needed
    };
  }, [contentId, stxAddress, analyticsService]);

  // Track streaming progress
  const trackProgress = useCallback(
    (currentTime: number, duration: number) => {
      if (duration <= 0) return;

      const percentComplete = Math.round((currentTime / duration) * 100);

      // Track milestone events (25%, 50%, 75%, 100%)
      const milestones = [25, 50, 75, 100];
      for (const milestone of milestones) {
        if (percentComplete >= milestone && !milestonesRef.current.has(milestone)) {
          milestonesRef.current.add(milestone);
          analyticsService.trackStreamProgress(
            contentId,
            stxAddress,
            currentTime,
            duration
          );

          if (onMilestone) {
            onMilestone(milestone);
          }
        }
      }
    },
    [contentId, stxAddress, analyticsService, onMilestone]
  );

  // Track purchase
  const trackPurchase = useCallback(
    (amount: number, txId: string) => {
      analyticsService.trackPurchase(contentId, stxAddress, amount, txId);
    },
    [contentId, stxAddress, analyticsService]
  );

  // Track share
  const trackShare = useCallback(
    (platform: string) => {
      analyticsService.trackShare(contentId, stxAddress, platform);
    },
    [contentId, stxAddress, analyticsService]
  );

  // Track download
  const trackDownload = useCallback(() => {
    analyticsService.trackDownload(contentId, stxAddress);
  }, [contentId, stxAddress, analyticsService]);

  // Track report
  const trackReport = useCallback(
    (reason: string) => {
      analyticsService.trackReport(contentId, stxAddress, reason);
    },
    [contentId, stxAddress, analyticsService]
  );

  // Track subscription
  const trackSubscription = useCallback(
    (creatorId: string) => {
      analyticsService.trackSubscribe(contentId, stxAddress, creatorId);
    },
    [contentId, stxAddress, analyticsService]
  );

  return {
    trackProgress,
    trackPurchase,
    trackShare,
    trackDownload,
    trackReport,
    trackSubscription,
  };
};

export default useContentView;
