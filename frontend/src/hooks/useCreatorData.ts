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

export function useCreatorData(address: string | undefined) {
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [subscribers, setSubscribers] = useState<SubscribersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [earningsRes, subscribersRes] = await Promise.all([
          fetch(`${API_URL}/creator/earnings/${address}`),
          fetch(`${API_URL}/creator/subscribers/${address}`)
        ]);

        if (!earningsRes.ok || !subscribersRes.ok) {
          throw new Error('Failed to fetch creator data');
        }

        const earningsData = await earningsRes.json();
        const subscribersData = await subscribersRes.json();

        setEarnings(earningsData);
        setSubscribers(subscribersData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [address]);

  return { earnings, subscribers, loading, error };
}
