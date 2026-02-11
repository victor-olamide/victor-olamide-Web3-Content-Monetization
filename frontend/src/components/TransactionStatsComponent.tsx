import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Send, AlertCircle, Check } from 'lucide-react';

interface TransactionStats {
  totalTransactions: number;
  confirmedTransactions: number;
  pendingTransactions: number;
  failedTransactions: number;
  totalAmount: number;
  totalUsd: number;
  averageAmount: number;
  lastTransactionDate: string | null;
}

/**
 * Transaction Statistics Component
 * Displays STX transaction statistics and summaries
 */
export const TransactionStatsComponent: React.FC = () => {
  const [stats, setStats] = useState<TransactionStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setIsLoading(true);

      // Fetch statistics
      const statsResponse = await fetch('/api/transactions/stats', {
        headers: {
          'X-Session-Id': localStorage.getItem('sessionId') || ''
        }
      });

      if (!statsResponse.ok) throw new Error('Failed to fetch stats');

      const statsData = await statsResponse.json();
      setStats(statsData.data);

      // Fetch summary
      const summaryResponse = await fetch('/api/transactions/summary', {
        headers: {
          'X-Session-Id': localStorage.getItem('sessionId') || ''
        }
      });

      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json();
        setSummary(summaryData.data);
      }

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch statistics');
    } finally {
      setIsLoading(false);
    }
  };

  const formatAmount = (amount: number) => {
    return amount.toFixed(2);
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'No transactions';
    return new Date(date).toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-700">{error || 'Failed to load statistics'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Transaction Statistics</h1>
          <p className="text-gray-600 mt-2">Overview of your STX transaction activity</p>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Amount */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-600 font-medium">Total Amount</h3>
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{formatAmount(stats.totalAmount)} STX</p>
            <p className="text-sm text-gray-500 mt-2">${formatAmount(stats.totalUsd)}</p>
          </div>

          {/* Average Per Transaction */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-600 font-medium">Average Amount</h3>
              <Send className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{formatAmount(stats.averageAmount)} STX</p>
            <p className="text-sm text-gray-500 mt-2">Per transaction</p>
          </div>

          {/* Total Transactions */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-600 font-medium">Total Transactions</h3>
              <Check className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.totalTransactions}</p>
            <p className="text-sm text-gray-500 mt-2">Across all statuses</p>
          </div>

          {/* Last Transaction */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-600 font-medium">Last Transaction</h3>
              <TrendingDown className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-lg font-bold text-gray-900">{formatDate(stats.lastTransactionDate)}</p>
            <p className="text-sm text-gray-500 mt-2">Most recent activity</p>
          </div>
        </div>

        {/* Transaction Status Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Status Breakdown */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Transaction Status</h2>

            <div className="space-y-4">
              {/* Confirmed */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-700 font-medium">Confirmed</span>
                  <span className="text-gray-900 font-bold">{stats.confirmedTransactions}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{
                      width: `${stats.totalTransactions > 0 ? (stats.confirmedTransactions / stats.totalTransactions) * 100 : 0}%`
                    }}
                  ></div>
                </div>
              </div>

              {/* Pending */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-700 font-medium">Pending</span>
                  <span className="text-gray-900 font-bold">{stats.pendingTransactions}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-yellow-600 h-2 rounded-full"
                    style={{
                      width: `${stats.totalTransactions > 0 ? (stats.pendingTransactions / stats.totalTransactions) * 100 : 0}%`
                    }}
                  ></div>
                </div>
              </div>

              {/* Failed */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-700 font-medium">Failed/Cancelled</span>
                  <span className="text-gray-900 font-bold">{stats.failedTransactions}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-red-600 h-2 rounded-full"
                    style={{
                      width: `${stats.totalTransactions > 0 ? (stats.failedTransactions / stats.totalTransactions) * 100 : 0}%`
                    }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="inline-block w-3 h-3 bg-green-600 rounded-full mr-2"></div>
                  <span className="text-gray-600">
                    {((stats.confirmedTransactions / stats.totalTransactions) * 100).toFixed(0)}% Confirmed
                  </span>
                </div>
                <div>
                  <div className="inline-block w-3 h-3 bg-yellow-600 rounded-full mr-2"></div>
                  <span className="text-gray-600">
                    {((stats.pendingTransactions / stats.totalTransactions) * 100).toFixed(0)}% Pending
                  </span>
                </div>
                <div>
                  <div className="inline-block w-3 h-3 bg-red-600 rounded-full mr-2"></div>
                  <span className="text-gray-600">
                    {((stats.failedTransactions / stats.totalTransactions) * 100).toFixed(0)}% Failed
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Category Breakdown */}
          {summary && summary.byCategory && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Amount by Category</h2>

              <div className="space-y-4">
                {Object.entries(summary.byCategory || {}).map(([category, amount]: any) => (
                  <div key={category}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-700 font-medium capitalize">
                        {category.replace(/_/g, ' ')}
                      </span>
                      <span className="text-gray-900 font-bold">{formatAmount(amount)} STX</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total Confirmed */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 font-semibold">Total Confirmed</span>
                  <span className="text-lg font-bold text-gray-900">
                    {formatAmount(summary.totalAmount)} STX
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Highest Transaction */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
            <h3 className="text-gray-700 font-medium mb-2">Highest Transaction</h3>
            {summary?.byType ? (
              <>
                <p className="text-2xl font-bold text-blue-900">
                  {formatAmount(Math.max(...Object.values(summary.byType as any)))} STX
                </p>
              </>
            ) : (
              <p className="text-gray-600">No data</p>
            )}
          </div>

          {/* Average Per Month */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
            <h3 className="text-gray-700 font-medium mb-2">Avg Per Month</h3>
            <p className="text-2xl font-bold text-green-900">
              {formatAmount(
                stats.totalTransactions > 0 ? stats.totalAmount / Math.ceil((Date.now() - new Date('2024-01-01').getTime()) / (1000 * 60 * 60 * 24 * 30)) : 0
              )}{' '}
              STX
            </p>
          </div>

          {/* Conversion Rate */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border border-purple-200">
            <h3 className="text-gray-700 font-medium mb-2">Confirmation Rate</h3>
            <p className="text-2xl font-bold text-purple-900">
              {stats.totalTransactions > 0
                ? ((stats.confirmedTransactions / stats.totalTransactions) * 100).toFixed(0)
                : 0}
              %
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionStatsComponent;
