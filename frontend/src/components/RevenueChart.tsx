'use client';

import React from 'react';

interface RevenueData {
  day: string;
  amount: number;
}

const RevenueChart: React.FC = () => {
  // Mock data for now
  const data: RevenueData[] = [
    { day: 'Mon', amount: 45 },
    { day: 'Tue', amount: 52 },
    { day: 'Wed', amount: 38 },
    { day: 'Thu', amount: 65 },
    { day: 'Fri', amount: 48 },
    { day: 'Sat', amount: 70 },
    { day: 'Sun', amount: 60 },
  ];

  const maxAmount = Math.max(...data.map(d => d.amount));

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wider mb-6">Revenue (Last 7 Days)</h3>
      <div className="flex items-end justify-between h-48 gap-2">
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-2">
            <div 
              className="w-full bg-indigo-500 rounded-t-sm transition-all duration-500 hover:bg-indigo-600"
              style={{ height: `${(d.amount / maxAmount) * 100}%` }}
              title={`${d.amount} STX`}
            ></div>
            <span className="text-[10px] text-gray-400 font-medium">{d.day}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RevenueChart;
