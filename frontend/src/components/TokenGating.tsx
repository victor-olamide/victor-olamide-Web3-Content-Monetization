'use client';

import React, { useState } from 'react';
import { Lock } from 'lucide-react';

const TokenGating: React.FC = () => {
  const [contentId, setContentId] = useState('');
  const [tokenAddress, setTokenAddress] = useState('');
  const [threshold, setThreshold] = useState('');

  const handleSetGate = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Setting gate:', { contentId, tokenAddress, threshold });
    // Handle SIP-010 gating logic via @stacks/connect
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mt-6">
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
        <Lock size={20} className="text-orange-500" />
        SIP-010 Token Gating
      </h3>
      <form onSubmit={handleSetGate} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Content ID</label>
          <input
            type="number"
            value={contentId}
            onChange={(e) => setContentId(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            placeholder="1"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Token Contract Address</label>
          <input
            type="text"
            value={tokenAddress}
            onChange={(e) => setTokenAddress(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            placeholder="SP3X...token-name"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Minimum Balance Required</label>
          <input
            type="number"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            placeholder="1000"
            required
          />
        </div>
        <button
          type="submit"
          className="w-full bg-gray-800 text-white font-bold py-2 px-4 rounded hover:bg-gray-900 transition"
        >
          Set Gating Rule
        </button>
      </form>
    </div>
  );
};

export default TokenGating;
