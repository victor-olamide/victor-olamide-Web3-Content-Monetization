'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { API_URL } from '@/utils/constants';

interface Transaction {
  id: string;
  type: 'purchase' | 'subscription';
  user: string;
  amount: number;
  timestamp: string;
  contentId?: string;
  tierId?: number;
}

const TransactionList: React.FC = () => {
  const { userData } = useAuth();
  const address = userData?.profile?.stxAddress?.mainnet;
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!address) return;

    const fetchTransactions = async () => {
      try {
        const res = await fetch(`${API_URL}/creator/history/${address}`);
        if (res.ok) {
          const data = await res.json();
          setTransactions(data.slice(0, 10));
        }
      } catch (err) {
        console.error('Failed to fetch transactions', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [address]);

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wider mb-4">Recent Transactions</h3>
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 animate-pulse rounded"></div>
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-8">No transactions yet</p>
      ) : (
        <div className="space-y-3">
          {transactions.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded ${
                    tx.type === 'purchase' ? 'bg-indigo-100 text-indigo-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {tx.type === 'purchase' ? 'PPV' : 'SUB'}
                  </span>
                  <span className="text-sm font-mono text-gray-600 truncate max-w-[120px]">{tx.user}</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">{new Date(tx.timestamp).toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-gray-900">{tx.amount.toFixed(2)}</p>
                <p className="text-xs text-gray-500">STX</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TransactionList;
