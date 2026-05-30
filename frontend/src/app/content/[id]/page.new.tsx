'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardShell from '@/components/DashboardShell';
import { Lock, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useContentAccess } from '@/hooks/useContentAccess';
import { usePayPerView } from '@/hooks/usePayPerView';
import { useWalletBalance } from '@/hooks/useWalletBalance';
import { useToast } from '@/contexts/ToastContext';
import { useContentView } from '@/hooks/useContentView';
import { useSTXPrice } from '@/hooks/useSTXPrice';
import { STACKS_EXPLORER_BASE, STACKS_CHAIN } from '@/utils/constants';
import ContentPlayer from '@/components/ContentPlayer';
import PaywallComponent from '@/components/PaywallComponent';
import ContentMetadata from '@/components/ContentMetadata';
import ContentErrorBoundary from '@/components/ContentErrorBoundary';
import { ContentLoadingSkeleton } from '@/components/ContentLoadingSkeleton';
import SubscriptionModal from '@/components/SubscriptionModal';
import RelatedContent from '@/components/RelatedContent';
import { handleContentShare } from '@/utils/contentSharingUtils';

export default function ContentView({ params }: { params: { id: string } }) {
  const { isLoggedIn, stxAddress } = useAuth();
  const { content, hasAccess, loading, error, refreshAccess } = useContentAccess(params.id);
  const { purchaseContent } = usePayPerView();
  const { stx, loading: balanceLoading, error: balanceError, refetch: refetchBalance } = useWalletBalance();
  const { stxPrice } = useSTXPrice();
  const { showSuccess, showError, showInfo } = useToast();
  const {
    trackProgress,
    trackPurchase,
    trackShare,
    trackDownload,
    trackReport,
    trackSubscription,
  } = useContentView({ contentId: params.id });

  // State
  const [purchasing, setPurchasing] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [txId, setTxId] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<'pending' | 'success' | 'failed' | null>(null);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [relatedContent, setRelatedContent] = useState([]);
  const [relatedLoading, setRelatedLoading] = useState(false);

  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
      }
    };
  }, []);

  // Fetch related content
  useEffect(() => {
    if (!content) return;

    const fetchRelatedContent = async () => {
      setRelatedLoading(true);
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/content?category=${content.category}&limit=6`,
          { credentials: 'include' }
        );
        if (response.ok) {
          const data = await response.json();
          setRelatedContent(data);
        }
      } catch (err) {
        console.error('Failed to fetch related content:', err);
      } finally {
        setRelatedLoading(false);
      }
    };

    fetchRelatedContent();
  }, [content?.id, content?.category]);

  const pollTransaction = useCallback(
    (id: string) => {
      setTxStatus('pending');

      if (pollRef.current) {
        window.clearInterval(pollRef.current);
      }

      pollRef.current = window.setInterval(async () => {
        try {
          const response = await fetch(
            `https://stacks-node-api.testnet.stacks.co/extended/v1/tx/${id}`
          );
          const data = await response.json();

          if (data.tx_status === 'success') {
            setTxStatus('success');
            if (pollRef.current) {
              window.clearInterval(pollRef.current);
            }
            refreshAccess();
            refetchBalance();
            trackPurchase(content?.price || 0, id);
            showSuccess('Access Granted', 'Your purchase was confirmed on the blockchain.');
          } else if (data.tx_status === 'abort' || data.tx_status === 'failed') {
            setTxStatus('failed');
            if (pollRef.current) {
              window.clearInterval(pollRef.current);
            }
            showError('Transaction Failed', 'Your transaction was rejected on the blockchain.');
          }
        } catch (err) {
          console.error('Polling error:', err);
        }
      }, 10000);
    },
    [content?.price, refreshAccess, refetchBalance, trackPurchase, showSuccess, showError]
  );

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

    if (stx.available < (content.price ?? 0)) {
      setPurchaseError(
        `Insufficient STX balance. You have ${stx.available.toFixed(2)} STX available but need ${content.price} STX.`
      );
      return;
    }

    setPurchasing(true);

    try {
      const result = await purchaseContent(parseInt(params.id, 10), content.price, content.creator);
      const newTxId = result as string;
      setTxId(newTxId);

      try {
        await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/purchases`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contentId: parseInt(params.id, 10),
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
      const errMsg = err instanceof Error ? err.message : 'Purchase failed. Please try again.';
      setPurchaseError(errMsg);
      showError('Purchase Failed', errMsg);
    } finally {
      setPurchasing(false);
    }
  };

  const handleShare = async (platform: string) => {
    if (!content) return;

    const result = await handleContentShare(
      platform as any,
      {
        title: content.title,
        description: content.description,
        url: typeof window !== 'undefined' ? window.location.href : '',
        image: content.thumbnail,
        hashtags: content.tags || ['web3', 'content', 'stacks'],
      }
    );

    if (result.success) {
      trackShare(platform);
      showSuccess('Shared', result.message);
    } else {
      showError('Share Failed', result.message);
    }
  };

  const handleDownload = async () => {
    if (!content?.url) return;
    trackDownload();
    showInfo('Download', 'Download feature coming soon!');
  };

  const handleReport = async () => {
    if (!content) return;
    trackReport('inappropriate content');
    showInfo('Report Submitted', 'Thank you for helping keep our platform safe.');
  };

  const handleSubscribe = async () => {
    setShowSubscriptionModal(true);
  };

  const subscriptionTiers = [
    {
      id: 'monthly',
      name: 'Monthly',
      price: 10,
      interval: 'month' as const,
      description: 'Access all content for 30 days',
      features: [
        'Unlimited streaming',
        'HD quality',
        'Offline downloads',
        'No ads',
        'Early access to new content',
      ],
    },
    {
      id: 'yearly',
      name: 'Yearly',
      price: 99,
      interval: 'year' as const,
      description: 'Save 17% with annual billing',
      features: [
        'Unlimited streaming',
        '4K quality',
        'Offline downloads',
        'No ads',
        'Early access to new content',
        'Priority support',
      ],
      highlighted: true,
    },
  ];

  const handleSubscribeConfirm = async (tierId: string) => {
    trackSubscription(content?.creator || '');
    showSuccess('Subscription', 'Subscription flow coming soon!');
    setShowSubscriptionModal(false);
  };

  if (loading) {
    return (
      <DashboardShell>
        <div className="p-8 max-w-6xl mx-auto">
          <ContentLoadingSkeleton fullPage={true} />
        </div>
      </DashboardShell>
    );
  }

  if (error || !content) {
    return (
      <DashboardShell>
        <div className="p-8 max-w-4xl mx-auto text-center">
          <h1 className="text-3xl font-bold mb-4">{error || 'Content Not Found'}</h1>
          <p className="text-gray-600 mb-8">
            The content you are looking for does not exist or has been removed.
          </p>
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
          <p className="text-gray-600 mb-8">
            Please connect your wallet to view this content and check your access rights.
          </p>
          <Link href="/auth/login" className="text-orange-600 font-bold hover:underline">
            Connect Wallet
          </Link>
        </div>
      </DashboardShell>
    );
  }

  const stacksExplorerUrl = `${STACKS_EXPLORER_BASE}/txid/${txId}?chain=${STACKS_CHAIN}`;

  return (
    <ContentErrorBoundary contentId={params.id}>
      <DashboardShell>
        <div className="p-8 max-w-6xl mx-auto">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-6 text-gray-500 hover:text-gray-700 transition">
            <Link href="/dashboard" className="inline-flex items-center gap-2">
              <ChevronLeft size={20} />
              Back to Dashboard
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Player */}
              {hasAccess ? (
                <ContentPlayer
                  url={content.url}
                  title={content.title}
                  type={content.type as any}
                  thumbnail={content.thumbnail}
                />
              ) : null}

              {/* Metadata */}
              {hasAccess && (
                <ContentMetadata
                  content={content}
                  viewCount={content.viewCount || 0}
                  createdDate={content.createdAt}
                  duration={content.duration}
                  onShare={() => handleShare('web')}
                  onDownload={handleDownload}
                  onReport={handleReport}
                />
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Paywall */}
              {!hasAccess && (
                <PaywallComponent
                  content={content}
                  userBalance={stx}
                  loading={loading}
                  balanceLoading={balanceLoading}
                  balanceError={balanceError}
                  purchaseError={purchaseError}
                  purchasing={purchasing}
                  txId={txId}
                  txStatus={txStatus}
                  onPurchase={handlePurchase}
                  onSubscribe={handleSubscribe}
                  onVerifyToken={handleVerifyAccess}
                  verifying={verifying}
                  stacksExplorerUrl={stacksExplorerUrl}
                  stxPrice={stxPrice}
                />
              )}

              {/* Related Content */}
              <RelatedContent
                contentList={relatedContent}
                currentContentId={params.id}
                loading={relatedLoading}
                maxItems={3}
              />
            </div>
          </div>
        </div>

        {/* Subscription Modal */}
        <SubscriptionModal
          isOpen={showSubscriptionModal}
          onClose={() => setShowSubscriptionModal(false)}
          creatorId={content.creator}
          creatorName={content.creator}
          tiers={subscriptionTiers as any}
          onSubscribe={handleSubscribeConfirm}
          stxBalance={stx.available}
        />
      </DashboardShell>
    </ContentErrorBoundary>
  );
}
