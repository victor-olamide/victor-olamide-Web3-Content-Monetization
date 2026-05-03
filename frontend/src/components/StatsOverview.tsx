'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCreatorData } from '@/hooks/useCreatorData';

const StatsOverview: React.FC = () => {
  const { userData } = useAuth();
  const address = userData?.profile?.stxAddress?.mainnet;
  const { earnings, subscribers, loading } = useCreatorData(address);

  const stats = [
    { label: 'Total Revenue', value: `${earnings?.totalEarnings?.toFixed(2) || '0.00'} STX`, icon: '💰' },
    { label: 'Active Subscribers', value: subscribers?.count || 0, icon: '👥' },
    { label: 'PPV Sales', value: earnings?.ppvCount || 0, icon: '🎬' },
    { label: 'Subscription Sales', value: earnings?.subCount || 0, icon: '📅' },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="space-y-2">
              <div className="h-4 w-16 bg-gray-100 animate-pulse rounded"></div>
              <div className="h-6 w-24 bg-gray-100 animate-pulse rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat, i) => (
        <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">{stat.icon}</span>
            <p className="text-xs text-gray-500 font-medium uppercase">{stat.label}</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
        </div>
      ))}
    </div>
  );
};

export default StatsOverview;
