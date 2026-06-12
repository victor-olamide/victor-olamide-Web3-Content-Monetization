"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { STACKS_API_BASE } from '@/utils/constants';

export interface WalletContextType {
  address: string | null;
  balance: number | null; // STX
  loading: boolean;
  connect: () => void;
  disconnect: () => void;
  refreshBalance: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { stxAddress, authenticate, logout } = useAuth();
  const [address, setAddress] = useState<string | null>(stxAddress || null);
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const parseBalanceFromApi = (payload: any): number | null => {
    try {
      // Flexible parsing: several Stacks API shapes exist across versions
      if (!payload) return null;
      if (typeof payload.balance === 'string') return Number(payload.balance) / 1_000_000;
      if (payload.stx?.balance) return Number(payload.stx.balance) / 1_000_000;
      if (payload.balances?.stx?.balance) return Number(payload.balances.stx.balance) / 1_000_000;
      if (payload.stx_balance) return Number(payload.stx_balance) / 1_000_000;
      return null;
    } catch (e) {
      return null;
    }
  };

  const fetchBalance = useCallback(async (addr: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${STACKS_API_BASE}/extended/v1/address/${addr}`);
      if (!res.ok) throw new Error('Failed to fetch balance');
      const json = await res.json();
      const parsed = parseBalanceFromApi(json);
      setBalance(parsed);
    } catch (err) {
      setBalance(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshBalance = useCallback(async () => {
    if (!address) return;
    await fetchBalance(address);
  }, [address, fetchBalance]);

  useEffect(() => {
    setAddress(stxAddress || null);
  }, [stxAddress]);

  useEffect(() => {
    if (address) {
      // fetch initial balance when address becomes available
      fetchBalance(address);
      const id = setInterval(() => fetchBalance(address), 30_000); // refresh every 30s
      return () => clearInterval(id);
    } else {
      setBalance(null);
    }
  }, [address, fetchBalance]);

  const connect = () => authenticate();
  const disconnect = () => {
    logout();
    setAddress(null);
    setBalance(null);
  };

  return (
    <WalletContext.Provider value={{ address, balance, loading, connect, disconnect, refreshBalance }}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within a WalletProvider');
  return ctx;
};

export default WalletContext;
