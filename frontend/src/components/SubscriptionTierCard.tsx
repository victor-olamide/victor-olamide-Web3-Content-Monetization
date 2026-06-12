'use client';

import React from 'react';

export interface SubscriptionTier {
  id: string | number;
  name: string;
  priceStx: number;
  period: 'monthly' | 'yearly';
  perks: string[];
  recommended?: boolean;
}

interface Props {
  tier: SubscriptionTier;
  active?: boolean;
  onSelect: (tier: SubscriptionTier) => void;
}

export const SubscriptionTierCard: React.FC<Props> = ({ tier, active, onSelect }) => {
  return (
    <div className={`rounded-2xl border p-6 shadow-sm bg-white ${tier.recommended ? 'ring-2 ring-yellow-300' : ''}`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{tier.name}</h3>
          <p className="text-sm text-slate-500">{tier.period === 'monthly' ? 'Billed monthly' : 'Billed yearly'}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-slate-900">{tier.priceStx} STX</div>
          <div className="text-sm text-slate-500">≈ ${(tier.priceStx * 1.2).toFixed(2)} USD</div>
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        {tier.perks.map((p, i) => (
          <li key={i} className="text-sm text-slate-700">• {p}</li>
        ))}
      </ul>

      <div className="mt-6 flex items-center justify-between">
        {active ? (
          <span className="px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm font-medium">Active</span>
        ) : (
          <button
            onClick={() => onSelect(tier)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Choose
          </button>
        )}
        {tier.recommended && <span className="text-xs text-yellow-700">Recommended</span>}
      </div>
    </div>
  );
};

export default SubscriptionTierCard;
