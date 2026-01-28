'use client';

import React from 'react';

const EarningsCard: React.FC = () => {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wider">Total Earnings</h3>
      <div className="mt-2 flex items-baseline">
        <p className="text-3xl font-semibold text-gray-900">0.00</p>
        <p className="ml-2 text-sm text-gray-500">STX</p>
      </div>
      <div className="mt-4">
        <div className="text-sm text-green-600 font-medium">
          +0% <span className="text-gray-400 font-normal">from last month</span>
        </div>
      </div>
    </div>
  );
};

export default EarningsCard;
