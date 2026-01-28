'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

const EarningsCard: React.FC = () => {
  const { userData } = useAuth();

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
      <div>
        <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wider">Total Earnings</h3>
        <div className="mt-2 flex items-baseline">
          <p className="text-3xl font-semibold text-gray-900">0.00</p>
          <p className="ml-2 text-sm text-gray-500">STX</p>
        </div>
      </div>
      
      {userData && (
        <div className="mt-6 pt-6 border-t border-gray-100">
          <p className="text-xs text-gray-400 font-medium uppercase mb-2">Creator Address</p>
          <p className="text-sm font-mono text-gray-600 truncate" title={userData.profile.stxAddress.mainnet}>
            {userData.profile.stxAddress.mainnet}
          </p>
        </div>
      )}
    </div>
  );
};

export default EarningsCard;
