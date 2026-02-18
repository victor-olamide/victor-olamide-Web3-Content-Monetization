/**
 * User Analytics Component
 * Detailed user behavior and engagement analytics
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Users,
  UserCheck,
  Clock,
  TrendingUp,
  MapPin,
  Smartphone,
} from 'lucide-react';
import { useUserAnalytics } from '../../hooks/useAnalyticsData';

interface UserAnalyticsProps {
  dateRange: any;
  granularity: string;
}

export const UserAnalytics: React.FC<UserAnalyticsProps> = ({
  dateRange,
  granularity,
}) => {
  const { userData, loading, error } = useUserAnalytics(dateRange, granularity);

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
          <p className="text-red-500">Error loading user analytics: {error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!userData) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <p className="text-gray-500">No user analytics data available</p>
        </CardContent>
      </Card>
    );
  }

  const userMetrics = [
    {
      title: 'Total Sessions',
      value: userData.totalSessions?.toLocaleString() || '0',
      icon: Users,
      description: 'User sessions in period',
    },
    {
      title: 'Page Views',
      value: userData.totalPageViews?.toLocaleString() || '0',
      icon: TrendingUp,
      description: 'Total pages viewed',
    },
    {
      title: 'Avg Session Duration',
      value: `${Math.floor((userData.avgSessionDuration || 0) / 60)}m ${((userData.avgSessionDuration || 0) % 60)}s`,
      icon: Clock,
      description: 'Average time per session',
    },
    {
      title: 'Content Views',
      value: userData.totalContentViews?.toLocaleString() || '0',
      icon: UserCheck,
      description: 'Content items viewed',
    },
  ];

  const deviceData = [
    { name: 'Desktop', value: 65, color: 'bg-blue-500' },
    { name: 'Mobile', value: 30, color: 'bg-green-500' },
    { name: 'Tablet', value: 5, color: 'bg-yellow-500' },
  ];

  const topPages = [
    { page: '/dashboard', views: 1250, percentage: 35 },
    { page: '/content', views: 890, percentage: 25 },
    { page: '/profile', views: 650, percentage: 18 },
    { page: '/search', views: 420, percentage: 12 },
    { page: '/settings', views: 280, percentage: 8 },
  ];

  return (
    <div className="space-y-6">
      {/* User Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {userMetrics.map((metric, index) => {
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
                    <p className="text-xs text-gray-500 mt-1">{metric.description}</p>
                  </div>
                  <Icon className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* User Behavior Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Device Usage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Smartphone className="h-5 w-5 mr-2" />
              Device Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {deviceData.map((device, index) => (
                <div key={index}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{device.name}</span>
                    <span>{device.value}%</span>
                  </div>
                  <Progress value={device.value} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Geographic Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MapPin className="h-5 w-5 mr-2" />
              Top Locations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Badge variant="outline" className="mr-2">1</Badge>
                  <span>United States</span>
                </div>
                <span className="text-sm text-gray-600">45%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Badge variant="outline" className="mr-2">2</Badge>
                  <span>United Kingdom</span>
                </div>
                <span className="text-sm text-gray-600">22%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Badge variant="outline" className="mr-2">3</Badge>
                  <span>Canada</span>
                </div>
                <span className="text-sm text-gray-600">15%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Badge variant="outline" className="mr-2">4</Badge>
                  <span>Germany</span>
                </div>
                <span className="text-sm text-gray-600">10%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Badge variant="outline" className="mr-2">5</Badge>
                  <span>Other</span>
                </div>
                <span className="text-sm text-gray-600">8%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Pages */}
      <Card>
        <CardHeader>
          <CardTitle>Top Pages</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topPages.map((page, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center flex-1">
                  <Badge variant="outline" className="mr-3">
                    {index + 1}
                  </Badge>
                  <div className="flex-1">
                    <div className="font-medium">{page.page}</div>
                    <div className="text-sm text-gray-600">{page.views} views</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">{page.percentage}%</div>
                  <Progress value={page.percentage} className="w-20 h-2 mt-1" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* User Engagement Trends */}
      <Card>
        <CardHeader>
          <CardTitle>User Engagement Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">+24%</div>
              <div className="text-sm text-gray-600">Session Increase</div>
              <div className="text-xs text-gray-500 mt-1">vs last period</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">2.4</div>
              <div className="text-sm text-gray-600">Pages per Session</div>
              <div className="text-xs text-gray-500 mt-1">Average</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">68%</div>
              <div className="text-sm text-gray-600">Return Visitors</div>
              <div className="text-xs text-gray-500 mt-1">Rate</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
