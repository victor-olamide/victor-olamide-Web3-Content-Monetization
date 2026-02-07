'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCreatorData } from '@/hooks/useCreatorData';

const EarningsCard: React.FC = () => {
  const { userData } = useAuth();
  const address = userData?.profile?.stxAddress?.mainnet;
  const { earnings, loading } = useCreatorData(address);

  return (
    <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
      <div>
        <h3 className="text-gray-500 text-xs md:text-sm font-medium uppercase tracking-wider">Total Earnings</h3>
        <div className="mt-2 flex items-baseline">
          {loading ? (
            <div className="h-9 w-24 bg-gray-100 animate-pulse rounded"></div>
          ) : (
            <>
              <p className="text-2xl md:text-3xl font-semibold text-gray-900">
                {earnings?.totalEarnings?.toFixed(2) || '0.00'}
              </p>
              <p className="ml-2 text-sm text-gray-500">{earnings?.currency || 'STX'}</p>
            </>
          )}
        </div>
        {!loading && earnings && (
          <div className="mt-4 grid grid-cols-2 gap-2 md:gap-4">
            <div className="bg-gray-50 p-2 md:p-3 rounded-lg">
              <p className="text-xs text-gray-500 font-medium">PPV</p>
              <p className="text-base md:text-lg font-bold text-indigo-600">{earnings.ppvEarnings.toFixed(2)}</p>
            </div>
            <div className="bg-gray-50 p-2 md:p-3 rounded-lg">
              <p className="text-xs text-gray-500 font-medium">Subs</p>
              <p className="text-base md:text-lg font-bold text-green-600">{earnings.subscriptionEarnings.toFixed(2)}</p>
            </div>
          </div>
        )}
      </div>
      
      {userData && (
        <div className="mt-4 md:mt-6 pt-4 md:pt-6 border-t border-gray-100">
          <p className="text-xs text-gray-400 font-medium uppercase mb-2">Creator Address</p>
          <p className="text-xs md:text-sm font-mono text-gray-600 truncate" title={userData.profile.stxAddress.mainnet}>
            {userData.profile.stxAddress.mainnet}
          </p>
        </div>
      )}
    </div>
  );
};

export default EarningsCard;
