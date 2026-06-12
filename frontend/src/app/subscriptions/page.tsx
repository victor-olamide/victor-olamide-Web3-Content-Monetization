'use client';

import React, { useState } from 'react';
import useSubscriptions from '@/hooks/useSubscriptions';
import SubscriptionTierCard from '@/components/SubscriptionTierCard';
import SubscriptionCheckout from '@/components/SubscriptionCheckout';
import { useAuth } from '@/contexts/AuthContext';

export default function SubscriptionsPage() {
  const { tiers, loading, error, active, refetch } = useSubscriptions();
  const { isLoggedIn, stxAddress } = useAuth();
  const [selected, setSelected] = useState<string | number | null>(null);
  const [txStatus, setTxStatus] = useState<string | null>(null);

  const handleSelect = (tier: any) => {
    setSelected(tier.id);
  };

  const handleSuccess = (txId: string) => {
    setTxStatus(`Transaction sent: ${txId}`);
    // Refresh active subscription after a short delay so backend can reconcile
    setTimeout(() => refetch.active(), 3000);
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Subscriptions</h1>
        <p className="text-sm text-slate-600 mt-2">Choose a subscription tier to unlock creator content and perks.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loading && <div>Loading tiers…</div>}
            {error && <div className="text-red-600">{error}</div>}
            {tiers.map((tier) => (
              <SubscriptionTierCard
                key={tier.id}
                tier={tier}
                active={active?.tierId === tier.id}
                onSelect={handleSelect}
              />
            ))}
          </div>

          <div className="mt-6">
            {selected ? (
              <div className="rounded-lg border p-4 bg-white">
                <h3 className="font-semibold">Checkout</h3>
                <p className="text-sm text-slate-600 mt-2">Pay on-chain with your connected wallet to activate subscription.</p>

                {!isLoggedIn ? (
                  <p className="mt-4 text-sm text-slate-500">Please connect your wallet to continue.</p>
                ) : (
                  <SubscriptionCheckout
                    tierId={selected}
                    priceStx={(tiers.find((t) => t.id === selected)?.priceStx) || 0}
                    onSuccess={handleSuccess}
                    onError={(err) => setTxStatus(`Error: ${err.message}`)}
                  />
                )}

                {txStatus && <p className="mt-3 text-sm text-slate-700">{txStatus}</p>}
              </div>
            ) : (
              <div className="rounded-lg border p-4 bg-white">
                <h3 className="font-semibold">No Tier Selected</h3>
                <p className="text-sm text-slate-500 mt-2">Select a tier to see checkout options.</p>
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-lg border p-4 bg-white">
            <h4 className="font-semibold">Your Subscription</h4>
            {active ? (
              <div className="mt-3">
                <p className="text-sm">Status: <span className="font-medium text-green-700">{active.status}</span></p>
                <p className="text-sm">Started: <span className="font-medium">{new Date(active.startedAt).toLocaleString()}</span></p>
                <p className="text-sm">Renews: <span className="font-medium">{new Date(active.renewsAt).toLocaleString()}</span></p>
              </div>
            ) : (
              <p className="text-sm mt-3 text-slate-600">You don't have an active subscription.</p>
            )}
          </div>

          <div className="rounded-lg border p-4 bg-white">
            <h4 className="font-semibold">Payment Info</h4>
            <p className="text-sm text-slate-600 mt-2">Wallet: <span className="font-medium">{stxAddress || 'Not connected'}</span></p>
            <p className="text-sm text-slate-500 mt-2">All payments are processed on the Stacks blockchain.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
