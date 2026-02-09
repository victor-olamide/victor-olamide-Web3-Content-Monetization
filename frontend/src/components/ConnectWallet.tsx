'use client';

import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Wallet, Loader2 } from 'lucide-react';

const ConnectWallet: React.FC = () => {
  const { authenticate, logout, isLoggedIn, stxAddress, isAuthenticating } = useAuth();

  if (isAuthenticating) {
    return (
      <button
        disabled
        className="px-6 py-2 text-sm font-medium text-white bg-orange-400 rounded-md cursor-not-allowed flex items-center gap-2"
      >
        <Loader2 className="w-4 h-4 animate-spin" />
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
         className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 active:bg-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200 min-h-[44px]"  
         >  
         <LogOut className="w-4 h-4" />  
         <span className="hidden sm:inline">Logout</span>  
         <span className="sm:hidden">Out</span>  
      </button>
      </div>
    );
  }

  return (
    <button  
       onClick={authenticate}  
       className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 text-sm font-medium text-white bg-orange-500 rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-all shadow-sm min-h-[44px]" // Minimum touch target  
       >  
       <Wallet className="w-4 h-4" />  
       <span className="hidden sm:inline">Connect Wallet</span>  
     <span className="sm:hidden">Connect</span>  
    </button>  
  );
};

export default ConnectWallet;
