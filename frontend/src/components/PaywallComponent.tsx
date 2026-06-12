'use client';

import React from 'react';
import { Lock, Loader2, ExternalLink, AlertCircle } from 'lucide-react';
import type { Content } from '@/types/content';

interface PaywallComponentProps {
  content: Content;
  userBalance: {
    available: number;
    locked: number;
  };
  loading: boolean;
  balanceLoading: boolean;
  balanceError: string | null;
  purchaseError: string | null;
  purchasing: boolean;
  txId: string | null;
  txStatus: 'pending' | 'success' | 'failed' | null;
  onPurchase: () => void;
  onSubscribe: () => void;
  onVerifyToken: () => void;
  verifying: boolean;
  stacksExplorerUrl: string;
  stxPrice?: number;
}

export const PaywallComponent: React.FC<PaywallComponentProps> = ({
  content,
  userBalance,
  loading,
  balanceLoading,
  balanceError,
  purchaseError,
  purchasing,
  txId,
  txStatus,
  onPurchase,
  onSubscribe,
  onVerifyToken,
  verifying,
  stacksExplorerUrl,
  stxPrice = 0,
}) => {
  const hasInsufficientBalance = !balanceError && userBalance.available < (content.price ?? 0);
  const usdPrice = (content.price ?? 0) * stxPrice;

  return (
    <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-12 text-center">
      <Lock size={48} className="mx-auto text-orange-500 mb-4" />
      <h2 className="text-2xl font-bold mb-2">Content Locked</h2>
      <p className="text-gray-600 mb-6">
        This content requires a one-time payment or subscription to access.
      </p>

      {/* Balance Display */}
      <div className="inline-flex items-center gap-2 text-sm text-gray-500 bg-gray-100 rounded-full px-4 py-2 mb-6">
        {balanceLoading ? (
          <span className="animate-pulse">Fetching balance...</span>
        ) : balanceError ? (
          <span className="text-red-500 flex items-center gap-1">
            <AlertCircle size={16} />
            Balance unavailable
          </span>
        ) : (
          <>
            <span>Your balance:</span>
            <span className={`font-bold ${userBalance.available < (content.price ?? 0) ? 'text-red-600' : 'text-green-600'}`}>
              {userBalance.available.toFixed(2)} STX
            </span>
            {userBalance.locked > 0 && (
              <span className="text-xs text-gray-400">({userBalance.locked.toFixed(2)} locked)</span>
            )}
          </>
        )}
      </div>

      {/* Price Display */}
      <div className="mb-8 p-4 bg-white rounded-lg border border-gray-200">
        <div className="text-3xl font-bold text-orange-600 mb-1">
          {content.price} STX
        </div>
        {stxPrice > 0 && (
          <div className="text-sm text-gray-500">
            ≈ ${usdPrice.toFixed(2)} USD
          </div>
        )}
        <div className="text-xs text-gray-400 mt-2">
          One-time access to this content
        </div>
      </div>

      {/* Purchase Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
        <button
          onClick={onPurchase}
          disabled={purchasing || balanceLoading || hasInsufficientBalance}
          className={`bg-orange-500 text-white font-bold py-3 px-8 rounded-lg transition flex items-center justify-center gap-2 ${
            purchasing || balanceLoading || hasInsufficientBalance
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:bg-orange-600'
          }`}
          aria-label="Purchase content"
        >
          {purchasing ? <Loader2 className="animate-spin" size={20} /> : null}
          {purchasing ? 'Processing...' : 'Purchase Access'}
        </button>

        <button
          onClick={onSubscribe}
          disabled={purchasing}
          className="bg-gray-800 text-white font-bold py-3 px-8 rounded-lg hover:bg-gray-900 transition disabled:opacity-50"
          aria-label="Subscribe to creator"
        >
          Subscribe to Creator
        </button>
      </div>

      {/* Error Display */}
      {purchaseError && (
        <div className="mb-6 p-3 bg-red-50 text-red-700 rounded-lg text-sm text-center border border-red-200">
          <AlertCircle size={16} className="inline mr-2" />
          {purchaseError}
        </div>
      )}

      {hasInsufficientBalance && (
        <div className="mb-6 p-3 bg-yellow-50 text-yellow-700 rounded-lg text-sm text-center border border-yellow-200">
          <AlertCircle size={16} className="inline mr-2" />
          You need at least {content.price} STX to purchase. Currently have {userBalance.available.toFixed(2)} STX.
        </div>
      )}

      {/* Transaction Status */}
      {txId && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            txStatus === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : txStatus === 'failed'
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-blue-50 text-blue-700 border border-blue-200'
          }`}
        >
          <div className="flex items-center gap-2 mb-3">
            {txStatus === 'pending' && <Loader2 className="animate-spin" size={16} />}
            <p className="font-medium">
              {txStatus === 'pending'
                ? 'Transaction pending...'
                : txStatus === 'success'
                ? 'Purchase confirmed!'
                : 'Transaction failed'}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {txStatus === 'success' && (
              <button
                onClick={() => window.location.reload()}
                className="text-sm font-bold underline hover:no-underline"
              >
                Refresh to view content
              </button>
            )}
            <a
              href={stacksExplorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm flex items-center gap-1 hover:underline w-fit"
            >
              View on Explorer <ExternalLink size={12} />
            </a>
          </div>
        </div>
      )}

      {/* Token Gating Section */}
      {content.tokenGating?.enabled && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600 mb-4">
            OR hold at least <strong>{content.tokenGating.minBalance}</strong>
            {content.tokenGating.tokenType === 'sip-009' ? ' NFT(s)' : ' tokens'} from:
          </p>
          <p className="font-mono text-xs bg-gray-100 p-2 rounded mb-4 text-gray-700 break-all">
            {content.tokenGating.tokenContract}
          </p>
          <button
            onClick={onVerifyToken}
            disabled={verifying || purchasing}
            className="text-gray-700 font-semibold py-2 px-6 rounded-lg border border-gray-300 hover:bg-gray-50 transition flex items-center gap-2 mx-auto disabled:opacity-50"
            aria-label="Verify token ownership"
          >
            {verifying ? <Loader2 className="animate-spin" size={16} /> : null}
            {verifying ? 'Verifying...' : 'Verify Token Ownership'}
          </button>
        </div>
      )}
    </div>
  );
};

export default PaywallComponent;
