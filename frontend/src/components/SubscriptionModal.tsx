'use client';

import React, { useState } from 'react';
import { X, Check, Loader2 } from 'lucide-react';

interface SubscriptionTier {
  id: string;
  name: string;
  price: number;
  interval: 'month' | 'year';
  description: string;
  features: string[];
  highlighted?: boolean;
}

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  creatorId: string;
  creatorName: string;
  tiers: SubscriptionTier[];
  onSubscribe: (tierId: string) => Promise<void>;
  stxBalance: number;
  loading?: boolean;
  error?: string | null;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onClose,
  creatorId,
  creatorName,
  tiers,
  onSubscribe,
  stxBalance,
  loading = false,
  error = null,
}) => {
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);
  const [subscribing, setSubscribing] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubscribe = async (tierId: string) => {
    const tier = tiers.find((t) => t.id === tierId);
    if (!tier) return;

    if (stxBalance < tier.price) {
      setSubscriptionError(`Insufficient balance. You need ${tier.price} STX.`);
      return;
    }

    setSubscribing(true);
    setSubscriptionError(null);

    try {
      await onSubscribe(tierId);
      setSelectedTierId(null);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Subscription failed';
      setSubscriptionError(message);
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Subscribe to {creatorName}</h2>
            <p className="text-gray-600 text-sm mt-1">
              Get unlimited access to all content from this creator
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Close modal"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Error Display */}
          {(error || subscriptionError) && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              {error || subscriptionError}
            </div>
          )}

          {/* Balance Display */}
          <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-600">
              Current Balance: <span className="font-bold">{stxBalance.toFixed(2)} STX</span>
            </p>
          </div>

          {/* Subscription Tiers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {tiers.map((tier) => {
              const hasInsufficientBalance = stxBalance < tier.price;
              const isSelected = selectedTierId === tier.id;

              return (
                <div
                  key={tier.id}
                  className={`rounded-xl border-2 transition ${
                    tier.highlighted
                      ? 'border-orange-500 bg-orange-50'
                      : isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white'
                  } ${!tier.highlighted && 'hover:border-gray-300'} cursor-pointer`}
                  onClick={() => {
                    if (!hasInsufficientBalance && !subscribing) {
                      setSelectedTierId(isSelected ? null : tier.id);
                    }
                  }}
                >
                  {/* Ribbon for recommended */}
                  {tier.highlighted && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                        RECOMMENDED
                      </span>
                    </div>
                  )}

                  <div className="p-6">
                    <h3 className="text-xl font-bold mb-2">{tier.name}</h3>
                    <p className="text-gray-600 text-sm mb-4">{tier.description}</p>

                    {/* Price */}
                    <div className="mb-6">
                      <div className="text-3xl font-bold text-orange-600">
                        {tier.price} STX
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Per {tier.interval}
                      </div>
                    </div>

                    {/* Features */}
                    <ul className="space-y-3 mb-6">
                      {tier.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-gray-700">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {/* Subscribe Button */}
                    <button
                      onClick={() => handleSubscribe(tier.id)}
                      disabled={
                        hasInsufficientBalance ||
                        subscribing ||
                        loading ||
                        selectedTierId !== tier.id
                      }
                      className={`w-full py-2 px-4 rounded-lg font-semibold transition ${
                        hasInsufficientBalance
                          ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                          : selectedTierId === tier.id
                          ? 'bg-orange-500 text-white hover:bg-orange-600'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {subscribing && selectedTierId === tier.id ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="animate-spin" size={16} />
                          Processing...
                        </span>
                      ) : hasInsufficientBalance ? (
                        `Insufficient balance`
                      ) : (
                        'Subscribe Now'
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Terms */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 text-xs text-gray-600">
            <p className="mb-2">
              By subscribing, you authorize recurring charges to your wallet on the selected interval.
            </p>
            <p>
              Subscriptions can be canceled anytime. You'll retain access until your subscription period ends.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionModal;
