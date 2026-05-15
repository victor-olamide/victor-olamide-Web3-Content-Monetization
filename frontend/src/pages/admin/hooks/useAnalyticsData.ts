/**
 * Analytics Data Hook
 * Fetches and manages analytics data from the API
 */

import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../../utils/adminApi';

export const useAnalyticsData = (dateRange, granularity) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [realTimeData, setRealTimeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await adminApi.getDashboardData({
        startDate: dateRange.from.toISOString(),
        endDate: dateRange.to.toISOString(),
        granularity,
      });

      if (response.success) {
        setDashboardData(response.data);
      } else {
        setError(response.message || 'Failed to fetch dashboard data');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while fetching dashboard data');
    } finally {
      setLoading(false);
    }
  }, [dateRange, granularity]);

  const fetchRealTimeData = useCallback(async () => {
    try {
      const response = await adminApi.getRealTimeMetrics();
      if (response.success) {
        setRealTimeData(response.data);
      }
    } catch (err) {
      console.error('Error fetching real-time data:', err);
    }
  }, []);

  const refreshData = useCallback(() => {
    fetchDashboardData();
    fetchRealTimeData();
  }, [fetchDashboardData, fetchRealTimeData]);

  const exportData = useCallback(async (format = 'json') => {
    try {
      const response = await adminApi.exportAnalyticsData({
        dataType: 'dashboard',
        format,
        startDate: dateRange.from.toISOString(),
        endDate: dateRange.to.toISOString(),
      });

      if (response.success) {
        // In a real implementation, this would trigger a download
        console.log('Export initiated:', response.data);
      }
    } catch (err) {
      throw new Error('Export failed: ' + err.message);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    fetchRealTimeData();
    // Set up real-time updates every 30 seconds
    const interval = setInterval(fetchRealTimeData, 30000);
    return () => clearInterval(interval);
  }, [fetchRealTimeData]);

  return {
    dashboardData,
    realTimeData,
    loading,
    error,
    refreshData,
    exportData,
  };
};

/**
 * User Analytics Hook
 */
export const useUserAnalytics = (dateRange, granularity) => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchUserData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await adminApi.getUserBehaviorAnalytics({
        startDate: dateRange.from.toISOString(),
        endDate: dateRange.to.toISOString(),
      });

      if (response.success) {
        setUserData(response.data);
      } else {
        setError(response.message || 'Failed to fetch user analytics');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while fetching user analytics');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  return {
    userData,
    loading,
    error,
    refetch: fetchUserData,
  };
};

/**
 * Content Analytics Hook
 */
export const useContentAnalytics = (dateRange, granularity) => {
  const [contentData, setContentData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchContentData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await adminApi.getContentPerformanceAnalytics({
        startDate: dateRange.from.toISOString(),
        endDate: dateRange.to.toISOString(),
      });

      if (response.success) {
        setContentData(response.data);
      } else {
        setError(response.message || 'Failed to fetch content analytics');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while fetching content analytics');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchContentData();
  }, [fetchContentData]);

  return {
    contentData,
    loading,
    error,
    refetch: fetchContentData,
  };
};

/**
 * Revenue Analytics Hook
 */
export const useRevenueAnalytics = (dateRange, granularity) => {
  const [revenueData, setRevenueData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchRevenueData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await adminApi.getRevenueAnalytics({
        startDate: dateRange.from.toISOString(),
        endDate: dateRange.to.toISOString(),
      });

      if (response.success) {
        setRevenueData(response.data);
      } else {
        setError(response.message || 'Failed to fetch revenue analytics');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while fetching revenue analytics');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchRevenueData();
  }, [fetchRevenueData]);

  return {
    revenueData,
    loading,
    error,
    refetch: fetchRevenueData,
  };
};
