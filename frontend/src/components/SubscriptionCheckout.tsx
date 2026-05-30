'use client';

import React, { useState } from 'react';
import { openContractCall } from '@stacks/connect';
import {
  uintCV,
  PostConditionMode,
  FungibleConditionCode,
  makeStandardSTXPostCondition,
} from '@stacks/transactions';
import { useAuth } from '@/contexts/AuthContext';
import { STACKS_NETWORK, CONTRACT_ADDRESS, SUBSCRIPTION_CONTRACT } from '@/utils/constants';
import { StacksMainnet, StacksTestnet } from '@stacks/network';

interface Props {
  tierId: string | number;
  priceStx: number;
  onSuccess?: (txId: string) => void;
  onError?: (err: Error) => void;
}

export const SubscriptionCheckout: React.FC<Props> = ({ tierId, priceStx, onSuccess, onError }) => {
  const { stxAddress } = useAuth();
  const [isProcessing, setProcessing] = useState(false);

  const handleSubscribe = async () => {
    if (!stxAddress) {
      onError?.(new Error('Wallet not connected'));
      return;
    }

    setProcessing(true);
    const network = STACKS_NETWORK === 'mainnet' ? new StacksMainnet() : new StacksTestnet();
    const priceMicro = priceStx * 1000000;

    const postCondition = makeStandardSTXPostCondition(
      stxAddress || '',
      FungibleConditionCode.Equal,
      priceMicro
    );

    try {
      const txId: string = await new Promise((resolve, reject) => {
        openContractCall({
          network,
          contractAddress: CONTRACT_ADDRESS,
          contractName: SUBSCRIPTION_CONTRACT,
          functionName: 'purchase-subscription',
          functionArgs: [uintCV(Number(tierId))],
          postConditions: [postCondition],
          postConditionMode: PostConditionMode.Deny,
          onFinish: (data) => resolve(data.txId),
          onCancel: () => reject(new Error('User cancelled')),
        });
      });

      onSuccess?.(txId);
    } catch (err: any) {
      console.error('Subscription checkout error', err);
      onError?.(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="mt-4">
      <button
        onClick={handleSubscribe}
        disabled={isProcessing}
        className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
      >
        {isProcessing ? 'Processing...' : `Subscribe — ${priceStx} STX`}
      </button>
    </div>
  );
};

export default SubscriptionCheckout;
