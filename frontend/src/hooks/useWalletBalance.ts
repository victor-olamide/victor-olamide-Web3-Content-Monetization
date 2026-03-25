'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { STACKS_API_BASE } from '@/utils/constants';

export interface WalletBalance {
  stx: {
    balance: number;
    locked: number;
    available: number;
  };
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const STX_DECIMALS = 1_000_000;

export function useWalletBalance(): WalletBalance {
  const { stxAddress } = useAuth();
  const [balance, setBalance] = useState(0);
  const [locked, setLocked] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    if (!stxAddress) {
      setBalance(0);
      setLocked(0);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `${STACKS_API_BASE}/v2/accounts/${stxAddress}?proof=0`
      );

      if (!res.ok) {
        throw new Error(`Failed to fetch balance: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();

      // Balance is returned in micro-STX (1 STX = 1,000,000 micro-STX)
      const rawBalance = parseInt(data.balance ?? '0', 16);
      const rawLocked = parseInt(data.locked ?? '0', 16);

      setBalance(rawBalance / STX_DECIMALS);
      setLocked(rawLocked / STX_DECIMALS);
    } catch (err: any) {
      setError(err.message ?? 'Unable to fetch wallet balance');
    } finally {
      setLoading(false);
    }
  }, [stxAddress]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  return {
    stx: {
      balance,
      locked,
      available: Math.max(0, balance - locked),
    },
    loading,
    error,
    refetch: fetchBalance,
  };
}
