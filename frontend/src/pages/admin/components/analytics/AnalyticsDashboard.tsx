/**
 * Analytics Dashboard Component
 * Comprehensive analytics interface for platform monitoring
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-picker';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  BarChart3,
  TrendingUp,
  Users,
  Eye,
  DollarSign,
  Activity,
  Download,
  RefreshCw,
  Calendar,
  Filter,
} from 'lucide-react';

import { useAnalyticsData } from '../../hooks/useAnalyticsData';
import { AnalyticsCharts } from './analytics/AnalyticsCharts';
import { RealTimeMetrics } from './analytics/RealTimeMetrics';
import { UserAnalytics } from './analytics/UserAnalytics';
import { ContentAnalytics } from './analytics/ContentAnalytics';
import { RevenueAnalytics } from './analytics/RevenueAnalytics';

const AnalyticsDashboard: React.FC = () => {
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    to: new Date(),
  });
  const [granularity, setGranularity] = useState('daily');
  const [activeTab, setActiveTab] = useState('overview');

  const {
    dashboardData,
    realTimeData,
    loading,
    error,
    refreshData,
    exportData,
  } = useAnalyticsData(dateRange, granularity);

  const handleExport = async (format: string) => {
    try {
      await exportData(format);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleRefresh = () => {
    refreshData();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
          <p className="text-gray-600">Monitor platform performance and user engagement</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Select value={granularity} onValueChange={setGranularity}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hourly">Hourly</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={() => handleExport('csv')}
            className="flex items-center"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Date Range Picker */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Calendar className="h-5 w-5 text-gray-400" />
            <DatePickerWithRange
              date={dateRange}
              onDateChange={setDateRange}
              className="flex-1"
            />
            <Badge variant="outline" className="text-sm">
              {granularity.charAt(0).toUpperCase() + granularity.slice(1)} View
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load analytics data: {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Real-time Metrics */}
      <RealTimeMetrics data={realTimeData} loading={loading} />

      {/* Main Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center">
            <BarChart3 className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center">
            <Users className="h-4 w-4 mr-2" />
            Users
          </TabsTrigger>
          <TabsTrigger value="content" className="flex items-center">
            <Eye className="h-4 w-4 mr-2" />
            Content
          </TabsTrigger>
          <TabsTrigger value="revenue" className="flex items-center">
            <DollarSign className="h-4 w-4 mr-2" />
            Revenue
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center">
            <Activity className="h-4 w-4 mr-2" />
            Performance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <AnalyticsCharts
            data={dashboardData?.data || []}
            insights={dashboardData?.insights || {}}
            summary={dashboardData?.summary || {}}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="users">
          <UserAnalytics dateRange={dateRange} granularity={granularity} />
        </TabsContent>

        <TabsContent value="content">
          <ContentAnalytics dateRange={dateRange} granularity={granularity} />
        </TabsContent>

        <TabsContent value="revenue">
          <RevenueAnalytics dateRange={dateRange} granularity={granularity} />
        </TabsContent>

        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>System Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">99.9%</div>
                  <div className="text-sm text-gray-600">Uptime</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">245ms</div>
                  <div className="text-sm text-gray-600">Avg Response Time</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">0.1%</div>
                  <div className="text-sm text-gray-600">Error Rate</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalyticsDashboard;
