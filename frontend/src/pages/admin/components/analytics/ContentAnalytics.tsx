/**
 * Content Analytics Component
 * Detailed content performance and engagement analytics
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Eye,
  ThumbsUp,
  Share,
  TrendingUp,
  FileText,
  Image,
  Video,
  Music,
} from 'lucide-react';
import { useContentAnalytics } from '../../hooks/useAnalyticsData';

interface ContentAnalyticsProps {
  dateRange: any;
  granularity: string;
}

export const ContentAnalytics: React.FC<ContentAnalyticsProps> = ({
  dateRange,
  granularity,
}) => {
  const { contentData, loading, error } = useContentAnalytics(dateRange, granularity);

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
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
          <p className="text-red-500">Error loading content analytics: {error}</p>
        </CardContent>
      </Card>
    );
  }

  // Mock data for demonstration
  const contentMetrics = [
    {
      title: 'Total Views',
      value: '45,231',
      change: '+18%',
      changeType: 'positive',
      icon: Eye,
    },
    {
      title: 'Total Likes',
      value: '2,847',
      change: '+12%',
      changeType: 'positive',
      icon: ThumbsUp,
    },
    {
      title: 'Total Shares',
      value: '1,234',
      change: '+8%',
      changeType: 'positive',
      icon: Share,
    },
    {
      title: 'Avg Engagement Rate',
      value: '6.2%',
      change: '+2.1%',
      changeType: 'positive',
      icon: TrendingUp,
    },
  ];

  const contentTypeData = [
    { type: 'Video', views: 18234, percentage: 40, icon: Video, color: 'text-red-500' },
    { type: 'Image', views: 15678, percentage: 35, icon: Image, color: 'text-blue-500' },
    { type: 'Document', views: 8923, percentage: 20, icon: FileText, color: 'text-green-500' },
    { type: 'Audio', views: 2396, percentage: 5, icon: Music, color: 'text-purple-500' },
  ];

  const topContent = [
    {
      id: '1',
      title: 'Digital Art Masterclass',
      type: 'Video',
      views: 5432,
      likes: 234,
      shares: 89,
      revenue: 1250.00,
      creator: 'ArtistPro',
    },
    {
      id: '2',
      title: 'Photography Portfolio',
      type: 'Image',
      views: 4321,
      likes: 198,
      shares: 67,
      revenue: 890.50,
      creator: 'PhotoMaster',
    },
    {
      id: '3',
      title: 'Business Plan Template',
      type: 'Document',
      views: 3876,
      likes: 156,
      shares: 45,
      revenue: 675.25,
      creator: 'BizExpert',
    },
    {
      id: '4',
      title: 'Podcast: Future of Web3',
      type: 'Audio',
      views: 2156,
      likes: 89,
      shares: 34,
      revenue: 234.75,
      creator: 'TechTalk',
    },
  ];

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'Video': return Video;
      case 'Image': return Image;
      case 'Document': return FileText;
      case 'Audio': return Music;
      default: return FileText;
    }
  };

  const getContentTypeColor = (type: string) => {
    switch (type) {
      case 'Video': return 'text-red-500';
      case 'Image': return 'text-blue-500';
      case 'Document': return 'text-green-500';
      case 'Audio': return 'text-purple-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Content Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {contentMetrics.map((metric, index) => {
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
                        className={`text-xs ${
                          metric.changeType === 'positive'
                            ? 'text-green-600 border-green-600'
                            : 'text-red-600 border-red-600'
                        }`}
                      >
                        {metric.change}
                      </Badge>
                    </div>
                  </div>
                  <Icon className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Content Type Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Content Type Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {contentTypeData.map((item, index) => {
              const Icon = item.icon;
              return (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Icon className={`h-6 w-6 ${item.color}`} />
                    <span className="text-sm font-medium">{item.percentage}%</span>
                  </div>
                  <div className="text-lg font-bold">{item.views.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">{item.type} views</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Top Performing Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Top Performing Content
            <Button variant="outline" size="sm">
              View All
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Content</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Views</TableHead>
                <TableHead>Likes</TableHead>
                <TableHead>Shares</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>Creator</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topContent.map((content) => {
                const Icon = getContentTypeIcon(content.type);
                return (
                  <TableRow key={content.id}>
                    <TableCell>
                      <div className="flex items-center">
                        <Icon className={`h-4 w-4 mr-2 ${getContentTypeColor(content.type)}`} />
                        <div>
                          <div className="font-medium">{content.title}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{content.type}</Badge>
                    </TableCell>
                    <TableCell>{content.views.toLocaleString()}</TableCell>
                    <TableCell>{content.likes}</TableCell>
                    <TableCell>{content.shares}</TableCell>
                    <TableCell>${content.revenue.toFixed(2)}</TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">@{content.creator}</span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Content Engagement Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Engagement by Content Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {contentTypeData.map((item, index) => (
                <div key={index}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="flex items-center">
                      <item.icon className={`h-4 w-4 mr-2 ${item.color}`} />
                      {item.type}
                    </span>
                    <span>{item.percentage}% engagement</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${item.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Content Performance Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center">
                  <TrendingUp className="h-5 w-5 text-green-600 mr-2" />
                  <div>
                    <div className="font-medium text-green-800">High Engagement</div>
                    <div className="text-sm text-green-600">Video content shows 40% higher engagement</div>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center">
                  <Eye className="h-5 w-5 text-blue-600 mr-2" />
                  <div>
                    <div className="font-medium text-blue-800">Peak Viewing Times</div>
                    <div className="text-sm text-blue-600">Most views between 7-9 PM local time</div>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-center">
                  <Share className="h-5 w-5 text-purple-600 mr-2" />
                  <div>
                    <div className="font-medium text-purple-800">Viral Potential</div>
                    <div className="text-sm text-purple-600">Content with early shares tend to go viral</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
