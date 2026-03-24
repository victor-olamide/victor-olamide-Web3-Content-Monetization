'use client';

import React from 'react';
import { RefreshCw, Wallet } from 'lucide-react';
import { useWalletBalance } from '@/hooks/useWalletBalance';

const WalletBalanceCard: React.FC = () => {
  const { stx, loading, error, refetch } = useWalletBalance();

  return (
    <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Wallet size={16} className="text-blue-500" />
          <h3 className="text-gray-500 text-xs font-medium uppercase tracking-wider">Wallet Balance</h3>
        </div>
        <button
          onClick={refetch}
          disabled={loading}
          className="text-gray-400 hover:text-gray-600 transition disabled:opacity-50"
          title="Refresh balance"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error ? (
        <p className="text-xs text-red-500">{error}</p>
      ) : loading ? (
        <div className="space-y-2">
          <div className="h-8 w-32 bg-gray-100 animate-pulse rounded" />
          <div className="h-4 w-24 bg-gray-100 animate-pulse rounded" />
        </div>
      ) : (
        <div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl md:text-3xl font-semibold text-gray-900">
              {stx.available.toFixed(4)}
            </p>
            <p className="text-sm text-gray-500">STX</p>
          </div>
          {stx.locked > 0 && (
            <p className="text-xs text-amber-600 mt-1">
              {stx.locked.toFixed(4)} STX locked in stacking
            </p>
          )}
          <p className="text-xs text-gray-400 mt-1">
            Total: {stx.balance.toFixed(4)} STX
          </p>
        </div>
      )}
    </div>
  );
};

export default WalletBalanceCard;
