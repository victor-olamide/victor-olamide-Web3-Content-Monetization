'use client';

import React, { useState } from 'react';
import { useAuth } from "@/contexts/AuthContext";
import DashboardShell from "@/components/DashboardShell";
import { Lock, Unlock, PlayCircle, ChevronLeft, Loader2, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useContentAccess } from '@/hooks/useContentAccess';
import { usePayPerView } from '@/hooks/usePayPerView';

export default function ContentView({ params }: { params: { id: string } }) {
  const { isLoggedIn, stxAddress } = useAuth();
  const { content, hasAccess, loading, error, refreshAccess } = useContentAccess(params.id);
  const { purchaseContent } = usePayPerView();
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [txId, setTxId] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<'pending' | 'success' | 'failed' | null>(null);

  const pollTransaction = async (id: string) => {
    setTxStatus('pending');
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`https://stacks-node-api.testnet.stacks.co/extended/v1/tx/${id}`);
        const data = await response.json();
        if (data.tx_status === 'success') {
          setTxStatus('success');
          clearInterval(interval);
          refreshAccess();
        } else if (data.tx_status === 'abort' || data.tx_status === 'failed') {
          setTxStatus('failed');
          clearInterval(interval);
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 10000);
  };

  const handlePurchase = async () => {
    if (!content || !stxAddress) return;
    
    setPurchaseError(null);
    // Simple balance check (mock)
    // In a real app, you would fetch the balance from the API/Contract
    const mockBalance = 1000; 
    if (mockBalance < content.price) {
      setPurchaseError("Insufficient STX balance");
      return;
    }
    
    setPurchasing(true);
    try {
      const result = await purchaseContent(
        parseInt(params.id), 
        content.price, 
        content.creator
      );
      setTxId(result as string);
      
      // Notify backend about the purchase
      try {
        await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/purchases`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contentId: parseInt(params.id),
            user: stxAddress,
            txId: result,
            amount: content.price
          })
        });
      } catch (backendErr) {
        console.warn("Failed to notify backend:", backendErr);
      }

      pollTransaction(result as string);
    } catch (err: any) {
      console.error(err);
      setTxId(null);
      setPurchaseError(err.message || "Purchase failed");
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
          <Link href="/dashboard" className="text-orange-600 font-bold hover:underline">
            Return to Dashboard
          </Link>
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
        <Link 
          href="/dashboard" 
          className="flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-6 transition"
        >
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
                <p className="text-gray-600 mb-8">
                  This content requires a one-time payment of {content?.price || 'some'} STX or a subscription.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button 
                    onClick={handlePurchase}
                    disabled={purchasing}
                    className={`bg-orange-500 text-white font-bold py-3 px-8 rounded-lg ${purchasing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-orange-600'} transition flex items-center gap-2`}
                  >
                    {purchasing ? <Loader2 className="animate-spin" size={20} /> : null}
                    {purchasing ? 'Processing...' : 'Purchase Access'}
                  </button>
                  <button 
                    onClick={() => alert('Initiating subscription...')}
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
                      {txStatus === 'pending' ? 'Transaction pending...' : 
                       txStatus === 'success' ? 'Purchase confirmed! Access Granted' : 
                       'Transaction failed'}
                    </p>
                    {txStatus === 'success' && (
                      <button 
                        onClick={() => window.location.reload()}
                        className="text-xs font-bold text-green-800 underline mt-1"
                      >
                        Refresh Content
                      </button>
                    )}
                    <a 
                      href={`https://explorer.stacks.co/txid/${txId}?chain=testnet`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs flex items-center gap-1 hover:underline"
                    >
                      View on Explorer <ExternalLink size={12} />
                    </a>
                    {txStatus === 'pending' && (
                      <p className="text-[10px] text-blue-500 mt-1">Access will be granted once the transaction is confirmed.</p>
                    )}
                  </div>
                )}
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <p className="text-sm text-gray-500 mb-4">
                    OR hold at least {content?.gating?.threshold} {content?.gating?.tokenSymbol} tokens
                  </p>
                  <button className="text-gray-700 font-semibold py-2 px-6 rounded-lg border border-gray-300 hover:bg-gray-50 transition">
                    Verify Token Balance
                  </button>
                </div>
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
