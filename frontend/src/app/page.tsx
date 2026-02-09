'use client';

import ConnectWallet from "@/components/ConnectWallet";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";

export default function Home() {
  const { isLoggedIn, userData } = useAuth();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-24 bg-gray-50">
     <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm flex flex-col sm:flex-row mb-12 gap-4">  
       <p className="w-full justify-center border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl lg:static lg:w-auto lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 text-center">  
       Stacks Content Monetization  
       </p>  
    <div className="flex items-center gap-2 sm:gap-4">  
    {isLoggedIn && (  
      <Link   
        href="/dashboard"  
        className="text-orange-600 hover:text-orange-700 font-medium text-sm sm:text-base px-3 py-2 rounded-md hover:bg-orange-50 transition-colors"  
        >  
        Dashboard  
      </Link>  
       )}  
       <ConnectWallet />  
      </div>  
   </div>  

    <div className="text-center px-4">  
     <h1 className="text-2xl sm:text-4xl font-bold mb-4">Welcome to Web3 Content</h1>  
     <p className="text-lg sm:text-xl text-gray-600 mb-8">  
    Unlock exclusive content using Bitcoin-secured smart contracts.  
    </p>  
  
    {isLoggedIn && (  
    <div className="bg-white p-4 sm:p-8 rounded-xl shadow-md mt-8 max-w-2xl mx-auto">  
      <h2 className="text-xl sm:text-2xl font-bold mb-4 text-orange-600">Your Profile</h2>  
      <div className="text-left space-y-2 text-sm sm:text-base">  
        <p><strong>Mainnet Address:</strong> {userData.profile.stxAddress.mainnet}</p>  
        <p><strong>Testnet Address:</strong> {userData.profile.stxAddress.testnet}</p>  
       </div>  
     </div>  
     )}  
     </div>
    </main>
  );
}
