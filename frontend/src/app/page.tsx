'use client';

import ConnectWallet from "@/components/ConnectWallet";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-24 bg-gray-50">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm flex mb-12">
        <p className="fixed left-0 top-0 flex w-full justify-center border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl lg:static lg:w-auto  lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4">
          Stacks Content Monetization
        </p>
        <ConnectWallet />
      </div>

      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Welcome to Web3 Content</h1>
        <p className="text-xl text-gray-600 mb-8">
          Unlock exclusive content using Bitcoin-secured smart contracts.
        </p>
      </div>
    </main>
  );
}
