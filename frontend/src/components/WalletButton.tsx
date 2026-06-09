'use client';

import React, { useState } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { ChevronDown } from 'lucide-react';

export const truncate = (addr: string | null) => {
  if (!addr) return '';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
};

export const WalletButton: React.FC = () => {
  const { address, balance, loading, connect, disconnect } = useWallet();
  const [open, setOpen] = useState(false);

  if (!address) {
    return (
      <button
        onClick={connect}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
      >
        Connect Wallet
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-3 px-3 py-2 border rounded-lg hover:bg-gray-50 transition"
      >
        <div className="text-sm font-medium">{truncate(address)}</div>
        <div className="text-xs text-slate-500">{loading ? '...' : `${balance ?? 0} STX`}</div>
        <ChevronDown className="w-4 h-4 text-slate-500" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
          <div className="px-4 py-2 text-sm text-slate-700">{address}</div>
          <button
            onClick={() => { disconnect(); setOpen(false); }}
            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
};

export default WalletButton;
