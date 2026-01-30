'use client';

import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const ConnectWallet: React.FC = () => {
  const { authenticate, logout, isLoggedIn, stxAddress, isAuthenticating } = useAuth();

  if (isAuthenticating) {
    return (
      <button
        disabled
        className="px-6 py-2 text-sm font-medium text-white bg-orange-400 rounded-md cursor-not-allowed flex items-center gap-2"
      >
        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
        Authenticating...
      </button>
    );
  }

  if (isLoggedIn) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-gray-700">
          {stxAddress ? `${stxAddress.slice(0, 5)}...${stxAddress.slice(-5)}` : 'Connected'}
        </span>
        <button
          onClick={logout}
          className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          Logout
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={authenticate}
      className="px-6 py-2 text-sm font-medium text-white bg-orange-500 rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-all shadow-sm"
    >
      Connect Wallet
    </button>
  );
};

export default ConnectWallet;
