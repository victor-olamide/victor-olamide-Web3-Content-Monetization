/**
 * Creator analytics and content API client
 */

import { httpClient } from './httpClient';

export interface ContentItem {
  contentId: number;
  title: string;
  description: string;
  contentType: 'video' | 'audio' | 'document' | 'image';
  price: number;
  views: number;
  purchases: number;
  revenue: number;
  createdAt: string;
  updatedAt: string;
  metadataUrl: string;
  creator: string;
}

export interface CreatorStats {
  totalEarnings: number;
  ppvEarnings: number;
  subscriptionEarnings: number;
  ppvCount: number;
  subCount: number;
  totalViews: number;
  totalPurchases: number;
  currency: string;
}

export interface SubscriberInfo {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  subscriptionTier: string;
  subscribedAt: string;
  expiresAt: string;
  amount: number;
}

export interface CreatorAnalytics {
  contentStats: {
    totalContent: number;
    totalViews: number;
    totalPurchases: number;
    averagePrice: number;
  };
  revenueStats: {
    dailyEarnings: { date: string; amount: number }[];
    monthlyEarnings: { month: string; amount: number }[];
    topContent: ContentItem[];
  };
  performanceMetrics: {
    conversionRate: number;
    avgViewDuration: number;
    engagementRate: number;
  };
}

export interface ContentAnalytics {
  contentId: number;
  title: string;
  views: number;
  purchases: number;
  revenue: number;
  conversionRate: number;
  avgViewDuration: number;
  topRegions: { region: string; views: number }[];
  viewsOverTime: { date: string; views: number }[];
}

class CreatorApiClient {
  private baseURL: string;

  constructor(baseURL: string = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api') {
    this.baseURL = baseURL;
  }

  /**
   * Get all content for creator
   */
  async getCreatorContent(creatorAddress?: string): Promise<ContentItem[]> {
    try {
      const endpoint = creatorAddress
        ? `/content?creator=${creatorAddress}`
        : '/content/creator/my-content';

      const response = await httpClient.get<ContentItem[]>(endpoint);
      return response.data;
    } catch (err) {
      console.error('Failed to fetch creator content:', err);
      throw err;
    }
  }

  /**
   * Get single content item
   */
  async getContent(contentId: number): Promise<ContentItem> {
    try {
      const response = await httpClient.get<ContentItem>(`/content/${contentId}`);
      return response.data;
    } catch (err) {
      console.error('Failed to fetch content:', err);
      throw err;
    }
  }

  /**
   * Create new content
   */
  async createContent(data: Partial<ContentItem>): Promise<ContentItem> {
    try {
      const response = await httpClient.post<ContentItem>('/content', { data });
      return response.data;
    } catch (err) {
      console.error('Failed to create content:', err);
      throw err;
    }
  }

  /**
   * Update content
   */
  async updateContent(contentId: number, data: Partial<ContentItem>): Promise<ContentItem> {
    try {
      const response = await httpClient.put<ContentItem>(`/content/${contentId}`, { data });
      return response.data;
    } catch (err) {
      console.error('Failed to update content:', err);
      throw err;
    }
  }

  /**
   * Delete content
   */
  async deleteContent(contentId: number): Promise<{ success: boolean }> {
    try {
      const response = await httpClient.delete(`/content/${contentId}`);
      return response.data;
    } catch (err) {
      console.error('Failed to delete content:', err);
      throw err;
    }
  }

  /**
   * Get creator earnings summary
   */
  async getEarnings(address: string): Promise<CreatorStats> {
    try {
      const response = await httpClient.get<CreatorStats>(`/creator/earnings/${address}`);
      return response.data;
    } catch (err) {
      console.error('Failed to fetch earnings:', err);
      throw err;
    }
  }

  /**
   * Get creator subscribers
   */
  async getSubscribers(address: string): Promise<{ count: number; subscribers: SubscriberInfo[] }> {
    try {
      const response = await httpClient.get(`/creator/subscribers/${address}`);
      return response.data;
    } catch (err) {
      console.error('Failed to fetch subscribers:', err);
      throw err;
    }
  }

  /**
   * Get revenue history
   */
  async getRevenueHistory(address: string): Promise<any[]> {
    try {
      const response = await httpClient.get(`/creator/history/${address}`);
      return response.data;
    } catch (err) {
      console.error('Failed to fetch revenue history:', err);
      throw err;
    }
  }

  /**
   * Get content access statistics
   */
  async getContentStats(contentId: number): Promise<ContentAnalytics> {
    try {
      const response = await httpClient.get<ContentAnalytics>(`/analytics/stats/${contentId}`);
      return response.data;
    } catch (err) {
      console.error('Failed to fetch content stats:', err);
      throw err;
    }
  }

  /**
   * Get creator analytics dashboard data
   */
  async getCreatorAnalytics(address: string): Promise<CreatorAnalytics> {
    try {
      const [earnings, content, history] = await Promise.all([
        this.getEarnings(address),
        this.getCreatorContent(address),
        this.getRevenueHistory(address)
      ]);

      const totalViews = content.reduce((sum, c) => sum + (c.views || 0), 0);
      const totalPurchases = content.reduce((sum, c) => sum + (c.purchases || 0), 0);
      const avgPrice = content.length > 0
        ? content.reduce((sum, c) => sum + c.price, 0) / content.length
        : 0;

      // Process daily earnings from history
      const dailyEarnings: Record<string, number> = {};
      history.forEach((h: any) => {
        const date = new Date(h.timestamp).toISOString().split('T')[0];
        dailyEarnings[date] = (dailyEarnings[date] || 0) + (h.amount || 0);
      });

      const dailyEarningsArray = Object.entries(dailyEarnings)
        .map(([date, amount]) => ({ date, amount }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      return {
        contentStats: {
          totalContent: content.length,
          totalViews,
          totalPurchases,
          averagePrice: avgPrice
        },
        revenueStats: {
          dailyEarnings: dailyEarningsArray,
          monthlyEarnings: [], // Can be computed from dailyEarnings
          topContent: content.sort((a, b) => (b.revenue || 0) - (a.revenue || 0)).slice(0, 5)
        },
        performanceMetrics: {
          conversionRate: totalViews > 0 ? (totalPurchases / totalViews) * 100 : 0,
          avgViewDuration: 0, // Would come from more detailed analytics
          engagementRate: 0 // Would come from more detailed analytics
        }
      };
    } catch (err) {
      console.error('Failed to fetch creator analytics:', err);
      throw err;
    }
  }

  /**
   * Get content access logs
   */
  async getContentAccessLogs(contentId: number, limit: number = 50): Promise<any[]> {
    try {
      const response = await httpClient.get(`/analytics/content/${contentId}?limit=${limit}`);
      return response.data.logs || [];
    } catch (err) {
      console.error('Failed to fetch access logs:', err);
      throw err;
    }
  }
}

export const creatorApi = new CreatorApiClient();
