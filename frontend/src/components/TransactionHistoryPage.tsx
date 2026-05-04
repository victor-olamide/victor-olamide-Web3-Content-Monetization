import React, { useState, useEffect } from 'react';
import {
  ArrowUpRight,
  ArrowDownLeft,
  Send,
  DollarSign,
  Calendar,
  Filter,
  Search,
  AlertCircle,
  Check,
  Clock,
  X,
  Download
} from 'lucide-react';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  amountUsd: number;
  status: 'pending' | 'confirmed' | 'failed' | 'cancelled';
  timestamp: string;
  description?: string;
  txHash?: string;
  contentTitle?: string;
  relatedAddressName?: string;
  category: 'income' | 'expense' | 'internal_transfer' | 'fee' | 'reward';
  confirmations?: number;
}

/**
 * Transaction History Page Component
 * Displays user's complete STX transaction history with filtering and search
 */
export const TransactionHistoryPage: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [skip, setSkip] = useState(0);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);

  // Date filter
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    fetchTransactions();
  }, [skip, limit, filterStatus, filterType]);

  const fetchTransactions = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        skip: skip.toString(),
        limit: limit.toString()
      });

      if (filterStatus !== 'all') {
        params.append('status', filterStatus);
      }
      if (filterType !== 'all') {
        params.append('type', filterType);
      }

      const response = await fetch(`/api/transactions/history?${params}`, {
        headers: {
          'X-Session-Id': localStorage.getItem('sessionId') || ''
        }
      });

      if (!response.ok) throw new Error('Failed to fetch transactions');

      const data = await response.json();
      let txList = data.data;

      // Client-side filtering
      if (filterCategory !== 'all') {
        txList = txList.filter((tx: Transaction) => tx.category === filterCategory);
      }

      if (searchQuery) {
        txList = txList.filter(
          (tx: Transaction) =>
            tx.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            tx.contentTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            tx.txHash?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      setTransactions(txList);
      setTotal(data.pagination.total);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateFilter = async () => {
    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return;
    }

    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        startDate,
        endDate,
        skip: '0',
        limit: limit.toString()
      });

      const response = await fetch(`/api/transactions/date-range?${params}`, {
        headers: {
          'X-Session-Id': localStorage.getItem('sessionId') || ''
        }
      });

      if (!response.ok) throw new Error('Failed to fetch transactions');

      const data = await response.json();
      setTransactions(data.data);
      setTotal(data.pagination.total);
      setCurrentPage(1);
      setSkip(0);
      setShowDateFilter(false);
      setSuccess('Filtered by date range');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch transactions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const year = new Date().getFullYear();
      const response = await fetch(`/api/transactions/export/tax/${year}`, {
        headers: {
          'X-Session-Id': localStorage.getItem('sessionId') || ''
        }
      });

      if (!response.ok) throw new Error('Failed to export data');

      const data = await response.json();
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `transactions_${year}.json`;
      link.click();

      setSuccess('Transactions exported successfully!');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export transactions');
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'purchase':
      case 'subscription':
      case 'transfer':
      case 'withdrawal':
        return <ArrowDownLeft className="w-5 h-5 text-red-600" />;
      case 'refund':
      case 'payout':
      case 'deposit':
      case 'reward':
      case 'tip':
        return <ArrowUpRight className="w-5 h-5 text-green-600" />;
      case 'fee':
        return <DollarSign className="w-5 h-5 text-orange-600" />;
      default:
        return <Send className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Check className="w-4 h-4 text-green-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'failed':
      case 'cancelled':
        return <X className="w-4 h-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString() + ' ' + new Date(date).toLocaleTimeString();
  };

  const formatAmount = (amount: number) => {
    return amount.toFixed(6);
  };

  if (isLoading && transactions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Transaction History</h1>
            <p className="text-gray-600 mt-2">View all your STX transactions and activities</p>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>

        {/* Error & Success Messages */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3">
            <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
            <p className="text-green-700">{success}</p>
          </div>
        )}

        {/* Filters & Search */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by hash, description, or content..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
                setSkip(0);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="confirmed">Confirmed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            {/* Type Filter */}
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                setCurrentPage(1);
                setSkip(0);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="purchase">Purchase</option>
              <option value="subscription">Subscription</option>
              <option value="refund">Refund</option>
              <option value="payout">Payout</option>
              <option value="deposit">Deposit</option>
              <option value="withdrawal">Withdrawal</option>
            </select>

            {/* Category Filter */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Categories</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
              <option value="fee">Fee</option>
              <option value="reward">Reward</option>
            </select>
          </div>

          {/* Date Range Filter */}
          {showDateFilter && (
            <div className="border-t pt-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleDateFilter}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
                >
                  Apply
                </button>
              </div>
            </div>
          )}

          {/* Date Filter Button */}
          <button
            onClick={() => setShowDateFilter(!showDateFilter)}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm"
          >
            <Calendar className="w-4 h-4" />
            {showDateFilter ? 'Hide Date Filter' : 'Filter by Date Range'}
          </button>
        </div>

        {/* Transactions List */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {transactions.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-600 text-lg">No transactions found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {transactions.map((tx) => (
                <div key={tx.id} className="p-4 hover:bg-gray-50 transition">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      {/* Icon */}
                      <div className="mt-1">{getTransactionIcon(tx.type)}</div>

                      {/* Details */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900 capitalize">
                            {tx.type.replace(/_/g, ' ')}
                          </h3>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${getStatusBadgeColor(tx.status)}`}
                          >
                            {getStatusIcon(tx.status)}
                            {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                          </span>
                        </div>

                        {tx.description && (
                          <p className="text-gray-600 text-sm mt-1">{tx.description}</p>
                        )}

                        {tx.contentTitle && (
                          <p className="text-gray-500 text-sm mt-1">
                            Content: <span className="font-medium">{tx.contentTitle}</span>
                          </p>
                        )}

                        {tx.relatedAddressName && (
                          <p className="text-gray-500 text-sm">
                            {tx.relatedAddressName}
                          </p>
                        )}

                        <p className="text-gray-500 text-xs mt-2">{formatDate(tx.timestamp)}</p>
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {tx.category === 'income' || tx.category === 'reward' ? '+' : '-'}
                        {formatAmount(tx.amount)} STX
                      </p>
                      {tx.amountUsd > 0 && (
                        <p className="text-gray-600 text-sm">${tx.amountUsd.toFixed(2)}</p>
                      )}

                      {tx.txHash && (
                        <p className="text-gray-500 text-xs mt-2 font-mono">
                          {tx.txHash.slice(0, 10)}...{tx.txHash.slice(-8)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {transactions.length > 0 && (
          <div className="mt-8 flex justify-center items-center gap-4">
            <button
              onClick={() => {
                const newSkip = Math.max(0, skip - limit);
                setSkip(newSkip);
                setCurrentPage(Math.max(1, currentPage - 1));
              }}
              disabled={currentPage === 1}
              className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>

            <div className="flex items-center gap-2">
              <span className="text-gray-600">
                Page <strong>{currentPage}</strong> of <strong>{Math.ceil(total / limit)}</strong>
              </span>
              <span className="text-gray-600 text-sm">
                ({total} total transactions)
              </span>
            </div>

            <button
              onClick={() => {
                const newSkip = skip + limit;
                setSkip(newSkip);
                setCurrentPage(currentPage + 1);
              }}
              disabled={skip + limit >= total}
              className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>

            <select
              value={limit}
              onChange={(e) => {
                setLimit(parseInt(e.target.value));
                setCurrentPage(1);
                setSkip(0);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionHistoryPage;
