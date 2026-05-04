import React, { useState, useEffect } from 'react';
import { AlertCircle, TrendingUp } from 'lucide-react';

interface BalanceDataPoint {
  date: string;
  balance: number;
  transactions: number;
}

/**
 * Balance Chart Component
 * Displays historical STX balance over time with transaction counts
 */
export const BalanceChart: React.FC = () => {
  const [balanceData, setBalanceData] = useState<BalanceDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);
  const [maxBalance, setMaxBalance] = useState(0);

  useEffect(() => {
    fetchBalanceData();
  }, [days]);

  const fetchBalanceData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(
        `/api/transactions/balance-over-time?days=${days}`,
        {
          headers: {
            'X-Session-Id': localStorage.getItem('sessionId') || ''
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch balance data');
      }

      const data = await response.json();
      const points = data.data || [];

      setBalanceData(points);

      // Calculate max balance for scaling
      if (points.length > 0) {
        const max = Math.max(...points.map((p: BalanceDataPoint) => p.balance));
        setMaxBalance(max);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load balance history');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatBalance = (balance: number) => {
    return balance.toFixed(2);
  };

  // Calculate percentage of max for bar height
  const getBarHeight = (balance: number) => {
    if (maxBalance === 0) return 0;
    return (balance / maxBalance) * 100;
  };

  // Get color based on balance trend
  const getBarColor = (balance: number, index: number) => {
    if (index === 0) return 'bg-blue-400';

    const previousBalance = balanceData[index - 1]?.balance || balance;
    if (balance > previousBalance) {
      return 'bg-green-500';
    } else if (balance < previousBalance) {
      return 'bg-red-500';
    }
    return 'bg-blue-400';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Balance History</h1>
          <p className="text-gray-600 mt-2">STX balance trends over time</p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3 mb-6">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Time Period Selector */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Time Period</h2>
          <div className="flex gap-3 flex-wrap">
            {[7, 14, 30, 60, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  days === d
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {d} Days
              </button>
            ))}
          </div>
        </div>

        {/* Chart Container */}
        <div className="bg-white rounded-lg shadow-md p-8">
          {balanceData.length === 0 ? (
            <div className="text-center py-16">
              <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">No transaction data available for this period</p>
            </div>
          ) : (
            <>
              {/* Chart */}
              <div className="mb-12">
                {/* Y-axis Label */}
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700">Balance (STX)</p>
                </div>

                {/* Chart Area */}
                <div className="bg-gray-50 rounded-lg p-8 min-h-80">
                  {/* Grid Lines */}
                  <div className="relative h-80">
                    {/* Y-axis gridlines */}
                    {[0, 25, 50, 75, 100].map((percent) => (
                      <div
                        key={percent}
                        className="absolute w-full border-t border-gray-200"
                        style={{
                          bottom: `${percent}%`,
                          left: 0
                        }}
                      >
                        <span className="absolute -left-12 text-xs text-gray-500 -mt-2">
                          {maxBalance > 0 ? formatBalance((maxBalance * percent) / 100) : 0}
                        </span>
                      </div>
                    ))}

                    {/* Bars */}
                    <div className="absolute inset-0 flex items-end justify-between px-4 py-4 gap-1">
                      {balanceData.map((point, index) => (
                        <div
                          key={index}
                          className="flex-1 flex flex-col items-center group"
                        >
                          {/* Tooltip */}
                          <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-2 bg-gray-900 text-white px-3 py-2 rounded-lg whitespace-nowrap text-sm z-10 transition-opacity">
                            <p className="font-semibold">{formatDate(point.date)}</p>
                            <p>{formatBalance(point.balance)} STX</p>
                            <p className="text-gray-300">{point.transactions} transaction(s)</p>
                          </div>

                          {/* Bar */}
                          <div
                            className={`w-full ${getBarColor(point.balance, index)} rounded-t-md transition-all hover:opacity-80 cursor-pointer relative`}
                            style={{
                              height: `${getBarHeight(point.balance)}%`,
                              minHeight: '4px'
                            }}
                          ></div>

                          {/* X-axis Label */}
                          <div className="mt-2 text-xs text-gray-600 text-center w-full">
                            {formatDate(point.date)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Legend */}
                <div className="mt-8 flex gap-6 justify-center flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-500 rounded"></div>
                    <span className="text-sm text-gray-700">Increase</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-500 rounded"></div>
                    <span className="text-sm text-gray-700">Decrease</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-blue-400 rounded"></div>
                    <span className="text-sm text-gray-700">Starting Balance</span>
                  </div>
                </div>
              </div>

              {/* Summary Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 border-t border-gray-200 pt-8">
                {/* Starting Balance */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
                  <p className="text-sm text-gray-700 font-medium mb-1">Starting Balance</p>
                  <p className="text-xl font-bold text-blue-900">
                    {balanceData.length > 0
                      ? formatBalance(balanceData[0].balance)
                      : '0.00'}{' '}
                    STX
                  </p>
                </div>

                {/* Current Balance */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
                  <p className="text-sm text-gray-700 font-medium mb-1">Current Balance</p>
                  <p className="text-xl font-bold text-green-900">
                    {balanceData.length > 0
                      ? formatBalance(balanceData[balanceData.length - 1].balance)
                      : '0.00'}{' '}
                    STX
                  </p>
                </div>

                {/* Change */}
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
                  <p className="text-sm text-gray-700 font-medium mb-1">Change</p>
                  {balanceData.length > 0 && (
                    <>
                      <p className="text-xl font-bold text-purple-900">
                        {(
                          balanceData[balanceData.length - 1].balance -
                          balanceData[0].balance
                        ).toFixed(2)}{' '}
                        STX
                      </p>
                      <p className="text-xs text-purple-700 mt-1">
                        {(
                          ((balanceData[balanceData.length - 1].balance -
                            balanceData[0].balance) /
                            balanceData[0].balance) *
                          100
                        ).toFixed(1)}
                        %
                      </p>
                    </>
                  )}
                </div>

                {/* Peak Balance */}
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4">
                  <p className="text-sm text-gray-700 font-medium mb-1">Peak Balance</p>
                  <p className="text-xl font-bold text-orange-900">
                    {balanceData.length > 0
                      ? formatBalance(
                          Math.max(...balanceData.map((p) => p.balance))
                        )
                      : '0.00'}{' '}
                    STX
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Data Table */}
        {balanceData.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mt-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Daily Summary</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Date</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-900">Balance</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-900">Transactions</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-900">Change</th>
                  </tr>
                </thead>
                <tbody>
                  {balanceData.map((point, index) => {
                    const change =
                      index === 0
                        ? 0
                        : point.balance - balanceData[index - 1].balance;
                    return (
                      <tr
                        key={index}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="py-3 px-4 text-gray-900">
                          {formatDate(point.date)}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-gray-900">
                          {formatBalance(point.balance)} STX
                        </td>
                        <td className="py-3 px-4 text-right text-gray-700">
                          {point.transactions}
                        </td>
                        <td className={`py-3 px-4 text-right font-semibold ${
                          change > 0
                            ? 'text-green-600'
                            : change < 0
                            ? 'text-red-600'
                            : 'text-gray-600'
                        }`}>
                          {change > 0 ? '+' : ''}{formatBalance(change)} STX
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BalanceChart;
