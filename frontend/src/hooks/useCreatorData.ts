'use client';

import { useState, useEffect } from 'react';
import { API_URL } from '@/utils/constants';

interface EarningsData {
  totalEarnings: number;
  ppvEarnings: number;
  subscriptionEarnings: number;
  ppvCount: number;
  subCount: number;
  currency: string;
}

interface Subscriber {
  user: string;
  amount: number;
  timestamp: string;
  expiry: string;
  transactionId: string;
  tierId: number;
}

interface SubscribersData {
  count: number;
  subscribers: Subscriber[];
}

interface GrowthData {
  current: number;
  previous: number;
  growth: string;
}

interface AnalyticsData {
  [date: string]: {
    ppv: number;
    subscription: number;
    total: number;
  };
}

export function useCreatorData(address: string | undefined) {
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [subscribers, setSubscribers] = useState<SubscribersData | null>(null);
  const [growth, setGrowth] = useState<GrowthData | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [earningsRes, subscribersRes, growthRes, analyticsRes] = await Promise.all([
          fetch(`${API_URL}/creator/earnings/${address}`),
          fetch(`${API_URL}/creator/subscribers/${address}`),
          fetch(`${API_URL}/creator/growth/${address}`),
          fetch(`${API_URL}/creator/analytics/${address}?period=7d`)
        ]);

        if (!earningsRes.ok || !subscribersRes.ok || !growthRes.ok || !analyticsRes.ok) {
          throw new Error('Failed to fetch creator data');
        }

        const earningsData = await earningsRes.json();
        const subscribersData = await subscribersRes.json();
        const growthData = await growthRes.json();
        const analyticsData = await analyticsRes.json();

        setEarnings(earningsData);
        setSubscribers(subscribersData);
        setGrowth(growthData);
        setAnalytics(analyticsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [address]);

  return { earnings, subscribers, growth, analytics, loading, error };
}
