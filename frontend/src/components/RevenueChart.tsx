'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCreatorData } from '@/hooks/useCreatorData';

interface RevenueData {
  day: string;
  amount: number;
}

const RevenueChart: React.FC = () => {
  const { userData } = useAuth();
  const address = userData?.profile?.stxAddress?.mainnet;
  const { analytics, loading } = useCreatorData(address);

  const data: RevenueData[] = React.useMemo(() => {
    if (!analytics) return [];
    
    const dates = Object.keys(analytics).sort().reverse().slice(0, 7).reverse();
    return dates.map(date => ({
      day: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
      amount: analytics[date].total
    }));
  }, [analytics]);

  const maxAmount = data.length > 0 ? Math.max(...data.map(d => d.amount), 1) : 1;

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wider mb-6">Revenue (Last 7 Days)</h3>
      {loading ? (
        <div className="flex items-end justify-between h-48 gap-2">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full bg-gray-100 animate-pulse rounded-t-sm" style={{ height: '60%' }}></div>
              <span className="text-[10px] text-gray-400 font-medium">...</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-end justify-between h-48 gap-2">
          {data.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2">
              <div 
                className="w-full bg-indigo-500 rounded-t-sm transition-all duration-500 hover:bg-indigo-600"
                style={{ height: `${(d.amount / maxAmount) * 100}%` }}
                title={`${d.amount.toFixed(2)} STX`}
              ></div>
              <span className="text-[10px] text-gray-400 font-medium">{d.day}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RevenueChart;
