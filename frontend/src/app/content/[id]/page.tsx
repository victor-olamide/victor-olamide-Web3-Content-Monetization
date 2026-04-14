'use client';

import React, { useState, useCallback } from 'react';
import { useAuth } from "@/contexts/AuthContext";
import DashboardShell from "@/components/DashboardShell";
import { Lock, Unlock, PlayCircle, ChevronLeft, Loader2, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useContentAccess } from '@/hooks/useContentAccess';
import { usePayPerView } from '@/hooks/usePayPerView';
import { useWalletBalance } from '@/hooks/useWalletBalance';
import { useToast } from '@/contexts/ToastContext';
import { STACKS_API_BASE, STACKS_EXPLORER_BASE, STACKS_CHAIN } from '@/utils/constants';

export default function ContentView({ params }: { params: { id: string } }) {
  const { isLoggedIn, stxAddress } = useAuth();
  const { content, hasAccess, loading, error, refreshAccess } = useContentAccess(params.id);
  const { purchaseContent } = usePayPerView();
  const { stx, loading: balanceLoading, error: balanceError, refetch: refetchBalance } = useWalletBalance();
  const { showSuccess, showError, showInfo } = useToast();
  const [purchasing, setPurchasing] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [txId, setTxId] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<'pending' | 'success' | 'failed' | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [pollingError, setPollingError] = useState<string | null>(null);

  const pollTransaction = useCallback((id: string) => {
    setTxStatus('pending');
    setAttempts(0);
    setPollingError(null);
    let count = 0;
    const interval = setInterval(async () => {
      count++;
      setAttempts(count);
      if (count > 30) {
        clearInterval(interval);
        setPollingError('Transaction confirmation timed out. Please check the explorer.');
        showError('Transaction Timeout', 'Could not confirm transaction after 5 minutes. Check the explorer for status.');
        return;
      }
      try {
        const response = await fetch(`${STACKS_API_BASE}/extended/v1/tx/${id}`);
        const data = await response.json();
        if (data.tx_status === 'success') {
          setTxStatus('success');
          clearInterval(interval);
          refreshAccess();
          refetchBalance();
          showSuccess('Access Granted', 'Your purchase was confirmed on the blockchain!');
        } else if (data.tx_status === 'abort' || data.tx_status === 'failed') {
          setTxStatus('failed');
          clearInterval(interval);
          showError('Transaction Failed', 'Your transaction was rejected by the blockchain.');
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 10000);
  }, [refreshAccess, refetchBalance, showSuccess, showError]);

  const handleVerifyAccess = async () => {
    setVerifying(true);
    await refreshAccess();
    setVerifying(false);
  };

  const handlePurchase = async () => {
    if (!content || !stxAddress) return;

    setPurchaseError(null);
    setTxStatus(null);

    if (balanceLoading) {
      setPurchaseError('Fetching wallet balance, please try again.');
      return;
    }
    if (balanceError) {
      setPurchaseError(`Could not verify balance: ${balanceError}`);
      return;
    }
    if (stx.available < content.price) {
      setPurchaseError(
        `Insufficient STX balance. You have ${stx.available.toFixed(2)} STX available but need ${content.price} STX.`
      );
      return;
    }

    setPurchasing(true);
    try {
      const result = await purchaseContent(parseInt(params.id), content.price, content.creator);
      const newTxId = result as string;
      setTxId(newTxId);

      try {
        await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/purchases`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contentId: parseInt(params.id),
            user: stxAddress,
            creator: content.creator,
            txId: newTxId,
            amount: content.price,
          }),
        });
      } catch (backendErr) {
        console.warn('Failed to notify backend:', backendErr);
      }

      showSuccess('Purchase Submitted', 'Your transaction is being processed on the blockchain.');
      pollTransaction(newTxId);
    } catch (err: unknown) {
      console.error(err);
      setTxId(null);
      const errMsg = err instanceof Error ? err.message : 'Purchase failed';
      setPurchaseError(errMsg);
      showError('Purchase Failed', errMsg);
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-xl animate-pulse">Checking access...</p>
        </div>
      </DashboardShell>
    );
  }

  if (error || !content) {
    return (
      <DashboardShell>
        <div className="p-8 max-w-4xl mx-auto text-center">
          <h1 className="text-3xl font-bold mb-4">{error || 'Content Not Found'}</h1>
          <p className="text-gray-600 mb-8">The content you are looking for does not exist or has been removed.</p>
          <Link href="/dashboard" className="text-orange-600 font-bold hover:underline">Return to Dashboard</Link>
        </div>
      </DashboardShell>
    );
  }

  if (!isLoggedIn) {
    return (
      <DashboardShell>
        <div className="p-8 max-w-4xl mx-auto text-center">
          <Lock size={48} className="mx-auto text-gray-400 mb-4" />
          <h1 className="text-3xl font-bold mb-4">Authentication Required</h1>
          <p className="text-gray-600 mb-8">Please connect your wallet to view this content and check your access rights.</p>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="p-8 max-w-4xl mx-auto">
        <Link href="/dashboard" className="flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-6 transition">
          <ChevronLeft size={20} />
          Back to Dashboard
        </Link>
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
          <div className="p-8">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded uppercase tracking-wider">
                {content?.type}
              </span>
            </div>
            <h1 className="text-3xl font-bold mb-4">{content?.title}</h1>
            <p className="text-gray-600 mb-6">{content?.description}</p>

            {!hasAccess ? (
              <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-12 text-center">
                <Lock size={48} className="mx-auto text-orange-500 mb-4" />
                <h2 className="text-2xl font-bold mb-2">Content Locked</h2>
                <p className="text-gray-600 mb-4">
                  This content requires a one-time payment of <strong>{content?.price || 'some'} STX</strong> or a subscription.
                </p>
                {isLoggedIn && (
                  <div className="inline-flex items-center gap-2 text-sm text-gray-500 bg-gray-100 rounded-full px-4 py-1 mb-6">
                    {balanceLoading ? (
                      <span className="animate-pulse">Fetching balance...</span>
                    ) : balanceError ? (
                      <span className="text-red-500">Balance unavailable</span>
                    ) : (
                      <>
                        <span>Your balance:</span>
                        <span className={`font-bold ${stx.available < (content?.price ?? 0) ? 'text-red-600' : 'text-green-600'}`}>
                          {stx.available.toFixed(2)} STX
                        </span>
                        {stx.locked > 0 && (
                          <span className="text-xs text-gray-400">({stx.locked.toFixed(2)} locked)</span>
                        )}
                      </>
                    )}
                  </div>
                )}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    onClick={handlePurchase}
                    disabled={purchasing || balanceLoading || (!balanceError && stx.available < (content?.price ?? 0))}
                    className={`bg-orange-500 text-white font-bold py-3 px-8 rounded-lg ${
                      purchasing || balanceLoading || (!balanceError && stx.available < (content?.price ?? 0))
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:bg-orange-600'
                    } transition flex items-center gap-2`}
                  >
                    {purchasing ? <Loader2 className="animate-spin" size={20} /> : null}
                    {purchasing ? 'Processing...' : 'Purchase Access'}
                  </button>
                  <button
                    onClick={() => showInfo('Subscription', 'Subscription flow coming soon. Stay tuned!')}
                    disabled={purchasing}
                    className="bg-gray-800 text-white font-bold py-3 px-8 rounded-lg hover:bg-gray-900 transition disabled:opacity-50"
                  >
                    Subscribe to Creator
                  </button>
                </div>

                {purchaseError && (
                  <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm text-center">
                    {purchaseError}
                  </div>
                )}

                {txId && (
                  <div className={`mt-4 p-4 rounded-lg flex flex-col items-center gap-2 ${
                    txStatus === 'success' ? 'bg-green-50 text-green-700' :
                    txStatus === 'failed' ? 'bg-red-50 text-red-700' :
                    'bg-blue-50 text-blue-700'
                  }`}>
                    <p className="font-medium text-sm flex items-center gap-2">
                      {txStatus === 'pending' && <Loader2 className="animate-spin" size={16} />}
                      {txStatus === 'success' && <Unlock size={16} />}
                      {txStatus === 'failed' && <Lock size={16} />}
                      {txStatus === 'pending'
                        ? `Transaction pending... (attempt ${attempts}/30)`
                        : txStatus === 'success'
                        ? 'Purchase confirmed! Access Granted'
                        : 'Transaction failed'}
                    </p>
                    {txStatus === 'success' && (
                      <button onClick={() => window.location.reload()} className="text-xs font-bold text-green-800 underline mt-1">
                        Refresh Content
                      </button>
                    )}
                    <a
                      href={`${STACKS_EXPLORER_BASE}/txid/${txId}?chain=${STACKS_CHAIN}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs flex items-center gap-1 hover:underline"
                    >
                      View on Explorer <ExternalLink size={12} />
                    </a>
                    {txStatus === 'pending' && (
                      <p className="text-[10px] text-blue-500 mt-1">
                        Access will be granted once the transaction is confirmed.
                      </p>
                    )}
                    {pollingError && (
                      <p className="text-[10px] text-red-500 mt-1">{pollingError}</p>
                    )}
                  </div>
                )}

                {content?.tokenGating?.enabled && (
                  <div className="mt-6 pt-6 border-t border-gray-100">
                    <p className="text-sm text-gray-500 mb-4">
                      OR hold at least <strong>{content.tokenGating.minBalance}</strong>
                      {content.tokenGating.tokenType === 'sip-009' ? ' NFT(s)' : ' tokens'} from:
                      <br />
                      <span className="font-mono text-[10px] bg-gray-100 p-1 rounded inline-block mt-1">
                        {content.tokenGating.tokenContract}
                      </span>
                    </p>
                    <button
                      onClick={handleVerifyAccess}
                      disabled={verifying}
                      className="text-gray-700 font-semibold py-2 px-6 rounded-lg border border-gray-300 hover:bg-gray-50 transition flex items-center gap-2 mx-auto"
                    >
                      {verifying ? <Loader2 className="animate-spin" size={16} /> : null}
                      {verifying ? 'Verifying...' : 'Verify Token Ownership'}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl overflow-hidden">
                {content?.type === 'video' ? (
                  <div className="bg-black aspect-video flex items-center justify-center">
                    <PlayCircle size={64} className="text-white opacity-80 cursor-pointer hover:opacity-100 transition" />
                  </div>
                ) : (
                  <div className="prose max-w-none bg-gray-50 p-8 border border-gray-100 rounded-xl">
                    <p>Exclusive article content revealed here...</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-gray-50 p-6 border-t border-gray-100 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Creator: <span className="font-mono text-gray-700">{content?.creator}</span>
            </div>
            <div className="flex items-center gap-2 text-orange-600 font-medium">
              {hasAccess ? <><Unlock size={18} /> Access Granted</> : <><Lock size={18} /> Locked</>}
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
