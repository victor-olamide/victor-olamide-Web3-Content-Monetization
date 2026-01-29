'use client';

import React, { useState } from 'react';
import { Lock } from 'lucide-react';

const TokenGating: React.FC = () => {
  const [contentId, setContentId] = useState('');
  const [tokenAddress, setTokenAddress] = useState('');
  const [threshold, setThreshold] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSetGate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    console.log('Setting gate:', { contentId, tokenAddress, threshold });
    
    // Simulate transaction delay
    setTimeout(() => {
      setLoading(false);
      setMessage('Gating rule transaction submitted!');
    }, 2000);
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
          disabled={loading}
          className={`w-full ${loading ? 'bg-gray-400' : 'bg-gray-800 hover:bg-gray-900'} text-white font-bold py-2 px-4 rounded transition`}
        >
          {loading ? 'Processing...' : 'Set Gating Rule'}
        </button>
        {message && <p className="text-sm text-green-600 mt-2 text-center font-medium">{message}</p>}
      </form>
    </div>
  );
};

export default TokenGating;
