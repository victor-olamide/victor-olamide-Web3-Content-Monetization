/**
 * Real-Time Metrics Component
 * Displays live platform metrics
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Activity,
  Eye,
  ShoppingCart,
  Clock,
} from 'lucide-react';

interface RealTimeMetricsProps {
  data: any;
  loading: boolean;
}

export const RealTimeMetrics: React.FC<RealTimeMetricsProps> = ({
  data,
  loading,
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="h-4 bg-gray-200 rounded w-20"></div>
                <div className="h-6 w-6 bg-gray-200 rounded"></div>
              </div>
              <div className="mt-4 h-8 bg-gray-200 rounded w-16"></div>
              <div className="mt-2 h-3 bg-gray-200 rounded w-24"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center justify-center h-24">
            <p className="text-gray-500">No real-time data available</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const metrics = [
    {
      title: 'Active Users',
      value: data.activeUsers?.toLocaleString() || '0',
      change: '+12%',
      changeType: 'positive',
      icon: Users,
      description: 'Currently online',
    },
    {
      title: 'Live Sessions',
      value: data.currentSessions?.toLocaleString() || '0',
      change: '+8%',
      changeType: 'positive',
      icon: Activity,
      description: 'Active sessions',
    },
    {
      title: 'Page Views',
      value: data.recentPageViews?.toLocaleString() || '0',
      change: '+15%',
      changeType: 'positive',
      icon: Eye,
      description: 'Last 5 minutes',
    },
    {
      title: 'Recent Sales',
      value: data.recentTransactions || '0',
      change: '+5%',
      changeType: 'positive',
      icon: ShoppingCart,
      description: 'Last hour',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {metrics.map((metric, index) => {
        const Icon = metric.icon;
        return (
          <Card key={index} className="relative overflow-hidden">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-600">
                  {metric.title}
                </p>
                <Icon className="h-5 w-5 text-gray-400" />
              </div>
              <div className="mt-2">
                <div className="text-2xl font-bold">{metric.value}</div>
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
                  <span className="text-xs text-gray-600">{metric.description}</span>
                </div>
              </div>
            </CardContent>

            {/* Live indicator */}
            <div className="absolute top-2 right-2">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1"></div>
                <span className="text-xs text-green-600 font-medium">LIVE</span>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};
