/**
 * Revenue Analytics Component
 * Detailed revenue and financial analytics
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Wallet,
  PieChart,
  Target,
} from 'lucide-react';
import { useRevenueAnalytics } from '../../hooks/useAnalyticsData';

interface RevenueAnalyticsProps {
  dateRange: any;
  granularity: string;
}

export const RevenueAnalytics: React.FC<RevenueAnalyticsProps> = ({
  dateRange,
  granularity,
}) => {
  const { revenueData, loading, error } = useRevenueAnalytics(dateRange, granularity);

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-32"></div>
            </CardHeader>
            <CardContent>
              <div className="h-32 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <p className="text-red-500">Error loading revenue analytics: {error}</p>
        </CardContent>
      </Card>
    );
  }

  // Mock data for demonstration
  const revenueMetrics = [
    {
      title: 'Total Revenue',
      value: '$45,231',
      change: '+18%',
      changeType: 'positive',
      icon: DollarSign,
      description: 'All time revenue',
    },
    {
      title: 'Platform Fees',
      value: '$6,784',
      change: '+12%',
      changeType: 'positive',
      icon: PieChart,
      description: 'Platform earnings',
    },
    {
      title: 'Creator Payouts',
      value: '$38,447',
      change: '+20%',
      changeType: 'positive',
      icon: Wallet,
      description: 'Paid to creators',
    },
    {
      title: 'Avg Transaction',
      value: '$24.50',
      change: '+5%',
      changeType: 'positive',
      icon: Target,
      description: 'Per transaction',
    },
  ];

  const paymentMethods = [
    { method: 'Credit Card', amount: 23450, percentage: 52, color: 'bg-blue-500' },
    { method: 'Crypto Wallet', amount: 15680, percentage: 35, color: 'bg-green-500' },
    { method: 'PayPal', amount: 5670, percentage: 12, color: 'bg-yellow-500' },
    { method: 'Bank Transfer', amount: 1431, percentage: 3, color: 'bg-purple-500' },
  ];

  const revenueByContentType = [
    { type: 'Video Content', amount: 18234, percentage: 40, growth: '+25%' },
    { type: 'Digital Art', amount: 13678, percentage: 30, growth: '+15%' },
    { type: 'Documents', amount: 6823, percentage: 15, growth: '+8%' },
    { type: 'Audio Content', amount: 4496, percentage: 10, growth: '+12%' },
    { type: 'Other', amount: 2000, percentage: 5, growth: '+3%' },
  ];

  const topEarningCreators = [
    { name: 'ArtistPro', earnings: 8750, contentCount: 12, avgRating: 4.8 },
    { name: 'TechGuru', earnings: 6230, contentCount: 8, avgRating: 4.9 },
    { name: 'DesignMaster', earnings: 4890, contentCount: 15, avgRating: 4.7 },
    { name: 'MusicMaker', earnings: 3450, contentCount: 6, avgRating: 4.6 },
    { name: 'WriterPro', earnings: 2890, contentCount: 20, avgRating: 4.5 },
  ];

  return (
    <div className="space-y-6">
      {/* Revenue Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {revenueMetrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <Card key={index}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      {metric.title}
                    </p>
                    <p className="text-2xl font-bold mt-1">{metric.value}</p>
                    <div className="flex items-center mt-1">
                      <Badge
                        variant="outline"
                        className={`text-xs mr-2 ${
                          metric.changeType === 'positive'
                            ? 'text-green-600 border-green-600'
                            : 'text-red-600 border-red-600'
                        }`}
                      >
                        {metric.change}
                      </Badge>
                      <span className="text-xs text-gray-500">{metric.description}</span>
                    </div>
                  </div>
                  <Icon className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Revenue Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CreditCard className="h-5 w-5 mr-2" />
              Payment Methods
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {paymentMethods.map((method, index) => (
                <div key={index}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{method.method}</span>
                    <span>${method.amount.toLocaleString()} ({method.percentage}%)</span>
                  </div>
                  <Progress value={method.percentage} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Revenue by Content Type */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <PieChart className="h-5 w-5 mr-2" />
              Revenue by Content Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {revenueByContentType.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span>{item.type}</span>
                      <span>${item.amount.toLocaleString()}</span>
                    </div>
                    <Progress value={item.percentage} className="h-2" />
                  </div>
                  <Badge
                    variant="outline"
                    className="ml-3 text-green-600 border-green-600"
                  >
                    {item.growth}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Earning Creators */}
      <Card>
        <CardHeader>
          <CardTitle>Top Earning Creators</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topEarningCreators.map((creator, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center">
                  <Badge variant="outline" className="mr-3">
                    {index + 1}
                  </Badge>
                  <div>
                    <div className="font-medium">@{creator.name}</div>
                    <div className="text-sm text-gray-600">
                      {creator.contentCount} items • ⭐ {creator.avgRating}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-green-600">
                    ${creator.earnings.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">Total earnings</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Revenue Trends & Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Growth</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">+24%</div>
              <div className="text-sm text-gray-600">vs last month</div>
              <div className="mt-4">
                <Progress value={75} className="h-2" />
                <div className="text-xs text-gray-500 mt-1">75% of monthly target</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Conversion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">3.2%</div>
              <div className="text-sm text-gray-600">Visitor to customer</div>
              <div className="mt-4">
                <Progress value={32} className="h-2" />
                <div className="text-xs text-gray-500 mt-1">Industry avg: 2.1%</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Avg Order Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">$24.50</div>
              <div className="text-sm text-gray-600">Per transaction</div>
              <div className="mt-4">
                <Progress value={85} className="h-2" />
                <div className="text-xs text-gray-500 mt-1">85% of target</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center mb-2">
                <TrendingUp className="h-5 w-5 text-green-600 mr-2" />
                <span className="font-medium text-green-800">Strong Growth</span>
              </div>
              <p className="text-sm text-green-700">
                Video content revenue increased by 25% this month, driving overall platform growth.
              </p>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center mb-2">
                <CreditCard className="h-5 w-5 text-blue-600 mr-2" />
                <span className="font-medium text-blue-800">Payment Trends</span>
              </div>
              <p className="text-sm text-blue-700">
                Crypto payments now account for 35% of transactions, showing adoption growth.
              </p>
            </div>

            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-center mb-2">
                <Target className="h-5 w-5 text-purple-600 mr-2" />
                <span className="font-medium text-purple-800">Creator Success</span>
              </div>
              <p className="text-sm text-purple-700">
                Top 10% of creators generate 60% of platform revenue, indicating creator quality impact.
              </p>
            </div>

            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center mb-2">
                <Wallet className="h-5 w-5 text-yellow-600 mr-2" />
                <span className="font-medium text-yellow-800">Payout Efficiency</span>
              </div>
              <p className="text-sm text-yellow-700">
                Creator payouts processed within 24 hours, maintaining high satisfaction rates.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
