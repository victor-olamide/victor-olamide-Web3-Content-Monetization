'use client';

import { useState, useEffect, useCallback } from 'react';
import { API_URL } from '@/utils/constants';

export interface Tier {
  id: string | number;
  name: string;
  priceStx: number;
  period: 'monthly' | 'yearly';
  perks: string[];
  recommended?: boolean;
}

export interface ActiveSubscription {
  tierId: string | number;
  startedAt: string;
  renewsAt: string;
  status: 'active' | 'expired' | 'cancelled';
}

export const useSubscriptions = () => {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<ActiveSubscription | null>(null);

  const fetchTiers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/subscriptions`);
      if (!res.ok) throw new Error('Failed to load subscription tiers');
      const data = await res.json();
      setTiers(data.tiers || data);
    } catch (err: any) {
      setError(err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchActive = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/subscriptions/active`, { credentials: 'include' });
      if (!res.ok) {
        if (res.status === 404) {
          setActive(null);
          return;
        }
        throw new Error('Failed to load active subscription');
      }
      const data = await res.json();
      setActive(data.active || data);
    } catch (err: any) {
      setError(err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTiers();
    fetchActive();
  }, [fetchTiers, fetchActive]);

  return { tiers, loading, error, active, refetch: { tiers: fetchTiers, active: fetchActive } };
};

export default useSubscriptions;
