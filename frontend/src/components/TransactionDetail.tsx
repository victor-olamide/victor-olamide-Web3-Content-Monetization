import React, { useState, useEffect } from 'react';
import { X, Copy, CheckCircle, AlertCircle, Clock, DollarSign, Hash, Calendar } from 'lucide-react';

interface TransactionDetail {
  _id: string;
  userAddress: string;
  transactionType: string;
  amount: number;
  amountUsd: number;
  stxPrice: number;
  txHash: string;
  blockHeight: number;
  blockTime: string;
  confirmations: number;
  status: string;
  description: string;
  category: string;
  relatedContentId?: string;
  relatedAddress?: string;
  metadata?: Record<string, any>;
  taxRelevant: boolean;
  isReconciled: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TransactionDetailProps {
  transactionId: string;
  onClose: () => void;
  isOpen: boolean;
}

/**
 * Transaction Detail Modal Component
 * Displays full details of a single STX transaction
 */
export const TransactionDetail: React.FC<TransactionDetailProps> = ({
  transactionId,
  onClose,
  isOpen
}) => {
  const [transaction, setTransaction] = useState<TransactionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && transactionId) {
      fetchTransactionDetail();
    }
  }, [isOpen, transactionId]);

  const fetchTransactionDetail = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/transactions/${transactionId}`, {
        headers: {
          'X-Session-Id': localStorage.getItem('sessionId') || ''
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch transaction details');
      }

      const data = await response.json();
      setTransaction(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transaction');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      purchase: '🛒',
      subscription: '📅',
      refund: '↩️',
      payout: '💰',
      transfer: '↔️',
      deposit: '⬇️',
      withdrawal: '⬆️',
      renewal: '🔄',
      upgrade: '📈',
      downgrade: '📉',
      fee: '⚙️',
      tip: '💝',
      reward: '🎁'
    };
    return icons[type] || '📊';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Transaction Details</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-blue-500 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3 mb-6">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {transaction && (
            <div className="space-y-6">
              {/* Summary Card */}
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">{getTypeIcon(transaction.transactionType)}</span>
                    <div>
                      <p className="text-sm text-gray-600">Transaction Type</p>
                      <p className="text-xl font-bold text-gray-900 capitalize">
                        {transaction.transactionType.replace(/_/g, ' ')}
                      </p>
                    </div>
                  </div>
                  <div className={`px-4 py-2 rounded-full font-semibold ${getStatusColor(transaction.status)} capitalize`}>
                    {transaction.status}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Amount</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {transaction.amount.toFixed(2)} STX
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">USD Value</p>
                    <p className="text-2xl font-bold text-gray-900">
                      ${transaction.amountUsd.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Core Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Core Information</h3>

                {/* Description */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <label className="text-sm font-medium text-gray-600 block mb-2">Description</label>
                  <p className="text-gray-900">{transaction.description || 'No description'}</p>
                </div>

                {/* Category */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <label className="text-sm font-medium text-gray-600 block mb-2">Category</label>
                  <p className="text-gray-900 capitalize">{transaction.category}</p>
                </div>

                {/* STX Price at Transaction */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <label className="text-sm font-medium text-gray-600 block mb-2">STX Price (at time of transaction)</label>
                  <p className="text-gray-900">${transaction.stxPrice.toFixed(4)}</p>
                </div>
              </div>

              {/* Blockchain Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Blockchain Information</h3>

                {/* Transaction Hash */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <label className="text-sm font-medium text-gray-600 block mb-2 flex items-center gap-2">
                    <Hash className="w-4 h-4" />
                    Transaction Hash
                  </label>
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-gray-100 px-3 py-2 rounded flex-1 overflow-x-auto font-mono text-gray-900">
                      {transaction.txHash}
                    </code>
                    <button
                      onClick={() => handleCopyToClipboard(transaction.txHash, 'txHash')}
                      className={`p-2 rounded transition-all ${
                        copiedField === 'txHash'
                          ? 'bg-green-100 text-green-600'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {copiedField === 'txHash' ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Block Height */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <label className="text-sm font-medium text-gray-600 block mb-2">Block Height</label>
                    <p className="text-lg font-semibold text-gray-900">{transaction.blockHeight || 'Pending'}</p>
                  </div>

                  {/* Confirmations */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <label className="text-sm font-medium text-gray-600 block mb-2">Confirmations</label>
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-semibold text-gray-900">{transaction.confirmations}</p>
                      {transaction.status === 'confirmed' && transaction.confirmations >= 6 && (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Block Time */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <label className="text-sm font-medium text-gray-600 block mb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Block Time
                  </label>
                  <p className="text-gray-900">{formatDate(transaction.blockTime)}</p>
                </div>
              </div>

              {/* Transaction Timeline */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Timeline</h3>

                <div className="border border-gray-200 rounded-lg p-4">
                  <label className="text-sm font-medium text-gray-600 block mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Created
                  </label>
                  <p className="text-gray-900">{formatDate(transaction.createdAt)}</p>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <label className="text-sm font-medium text-gray-600 block mb-2">Last Updated</label>
                  <p className="text-gray-900">{formatDate(transaction.updatedAt)}</p>
                </div>
              </div>

              {/* Related Information */}
              {(transaction.relatedContentId || transaction.relatedAddress) && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Related Information</h3>

                  {transaction.relatedContentId && (
                    <div className="border border-gray-200 rounded-lg p-4">
                      <label className="text-sm font-medium text-gray-600 block mb-2">Related Content ID</label>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-gray-100 px-3 py-2 rounded flex-1 overflow-x-auto font-mono text-gray-900">
                          {transaction.relatedContentId}
                        </code>
                        <button
                          onClick={() => handleCopyToClipboard(transaction.relatedContentId || '', 'contentId')}
                          className={`p-2 rounded transition-all ${
                            copiedField === 'contentId'
                              ? 'bg-green-100 text-green-600'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {copiedField === 'contentId' ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {transaction.relatedAddress && (
                    <div className="border border-gray-200 rounded-lg p-4">
                      <label className="text-sm font-medium text-gray-600 block mb-2">Related Address</label>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-gray-100 px-3 py-2 rounded flex-1 overflow-x-auto font-mono text-gray-900">
                          {transaction.relatedAddress}
                        </code>
                        <button
                          onClick={() => handleCopyToClipboard(transaction.relatedAddress || '', 'address')}
                          className={`p-2 rounded transition-all ${
                            copiedField === 'address'
                              ? 'bg-green-100 text-green-600'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {copiedField === 'address' ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Metadata */}
              {transaction.metadata && Object.keys(transaction.metadata).length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Additional Details</h3>
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <pre className="text-xs text-gray-900 overflow-x-auto">
                      {JSON.stringify(transaction.metadata, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Tax Information */}
              {transaction.taxRelevant && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900">
                    ✓ This transaction is marked as relevant for tax reporting
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    const link = `https://explorer.stacks.co/txid/${transaction.txHash}`;
                    window.open(link, '_blank');
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  View on Stacks Explorer
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransactionDetail;
