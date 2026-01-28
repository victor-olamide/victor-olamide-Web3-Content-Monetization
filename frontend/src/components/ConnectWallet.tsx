'use client';

import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const ConnectWallet: React.FC = () => {
  const { authenticate, logout, isLoggedIn, userData } = useAuth();

  if (isLoggedIn) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">
          {userData.profile.stxAddress.mainnet.slice(0, 6)}...
          {userData.profile.stxAddress.mainnet.slice(-4)}
        </span>
        <button
          onClick={logout}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
        >
          Logout
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={authenticate}
      className="px-6 py-2 bg-orange-500 text-white rounded font-bold hover:bg-orange-600 transition"
    >
      Connect Wallet
    </button>
  );
};

export default ConnectWallet;
