'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCreatorData } from '@/hooks/useCreatorData';

const EarningsBreakdown: React.FC = () => {
  const { userData } = useAuth();
  const address = userData?.profile?.stxAddress?.mainnet;
  const { earnings, loading } = useCreatorData(address);

  const breakdown = [
    { label: 'Pay-Per-View', value: earnings?.ppvEarnings || 0, count: earnings?.ppvCount || 0, color: 'indigo' },
    { label: 'Subscriptions', value: earnings?.subscriptionEarnings || 0, count: earnings?.subCount || 0, color: 'green' },
  ];

  const total = earnings?.totalEarnings || 0;

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wider mb-6">Earnings Breakdown</h3>
      {loading ? (
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 animate-pulse rounded"></div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {breakdown.map((item, i) => {
            const percentage = total > 0 ? (item.value / total * 100).toFixed(1) : 0;
            return (
              <div key={i} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">{item.label}</span>
                  <span className="text-sm font-bold text-gray-900">{item.value.toFixed(2)} STX</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`bg-${item.color}-500 h-2 rounded-full transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span>{item.count} transactions</span>
                  <span>{percentage}%</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EarningsBreakdown;
