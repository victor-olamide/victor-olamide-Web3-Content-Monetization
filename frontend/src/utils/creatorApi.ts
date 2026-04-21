/**
 * Creator dashboard API helpers.
 */

import { httpClient } from './httpClient';
import { API_URL } from './constants';

export type CreatorContentType = 'video' | 'article' | 'image' | 'music';

export interface ContentItem {
  contentId: number;
  title: string;
  description: string;
  contentType: CreatorContentType;
  price: number;
  views: number;
  purchases: number;
  revenue: number;
  createdAt: string;
  updatedAt: string;
  metadataUrl?: string;
  creator: string;
  url?: string;
}

export interface CreatorStats {
  totalEarnings: number;
  ppvEarnings: number;
  subscriptionEarnings: number;
  ppvCount: number;
  subCount: number;
  totalViews?: number;
  totalPurchases?: number;
  currency: string;
}

export interface SubscriberInfo {
  user?: string;
  name?: string;
  email?: string;
  avatar?: string;
  subscriptionTier?: string;
  subscribedAt?: string;
  expiresAt?: string;
  amount: number;
  timestamp?: string;
  expiry?: string;
  transactionId?: string;
  tierId?: number;
}

export interface GrowthData {
  current: number;
  previous: number;
  growth: string | number;
}

export interface RevenueSeriesPoint {
  date: string;
  ppv: number;
  subscription: number;
  total: number;
}

export interface CreatorAnalyticsPoint {
  date: string;
  amount: number;
  views?: number;
}

export interface CreatorDashboardMetrics {
  earnings: CreatorStats;
  subscribers: { count: number; subscribers: SubscriberInfo[] };
  growth: GrowthData;
  analytics: RevenueSeriesPoint[];
}

export interface CreatorContentInput {
  contentId: number;
  title: string;
  description: string;
  contentType: CreatorContentType;
  price: number;
  creator: string;
  url?: string;
}

export interface CreatorContentFormValues {
  title: string;
  description: string;
  contentType: CreatorContentType;
  price: number;
  existingUrl?: string;
  file?: File | null;
}

type ContentSearchResponse =
  | ContentItem[]
  | {
      page?: number;
      limit?: number;
      total?: number;
      pages?: number;
      results?: ContentItem[];
    };

class CreatorApiClient {
  constructor(private baseURL: string = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api') {}

  private normalizeContentItem(item: ContentItem): ContentItem {
    return {
      ...item,
      views: Number(item.views || 0),
      purchases: Number(item.purchases || 0),
      revenue: Number(item.revenue || 0),
      price: Number(item.price || 0),
    };
  }

  private normalizeContent(payload: ContentSearchResponse): ContentItem[] {
    const items = Array.isArray(payload) ? payload : payload.results || [];

    return items.map((item) => this.normalizeContentItem(item));
  }

  private normalizeRevenueSeries(payload: Record<string, { ppv: number; subscription: number; total: number }>): RevenueSeriesPoint[] {
    return Object.entries(payload)
      .map(([date, value]) => ({
        date,
        ppv: Number(value.ppv || 0),
        subscription: Number(value.subscription || 0),
        total: Number(value.total || 0),
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  private buildCreatorHeaders(creatorAddress: string): Record<string, string> {
    return {
      'x-creator-address': creatorAddress,
    };
  }

  async getCreatorContent(creatorAddress: string): Promise<ContentItem[]> {
    const response = await httpClient.get<ContentSearchResponse>('/content', {
      params: { creator: creatorAddress },
    });

    return this.normalizeContent(response.data);
  }

  async createContent(data: CreatorContentInput): Promise<ContentItem> {
    const response = await httpClient.post<ContentItem>('/content', data);
    return this.normalizeContentItem(response.data);
  }

  async updateContent(
    contentId: number,
    creatorAddress: string,
    data: Partial<CreatorContentInput>
  ): Promise<ContentItem> {
    const response = await httpClient.patch<{ content: ContentItem }>(`/content/${contentId}`, data, {
      headers: this.buildCreatorHeaders(creatorAddress),
    });

    return this.normalizeContentItem(response.data.content);
  }

  async deleteContent(contentId: number, creatorAddress: string): Promise<{ success: boolean }> {
    await httpClient.post(
      `/content/${contentId}/remove`,
      { creator: creatorAddress, reason: 'Removed from creator dashboard' },
      { headers: this.buildCreatorHeaders(creatorAddress) }
    );

    return { success: true };
  }

  async uploadContentFile(file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${this.baseURL}/content/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => null);
      throw new Error(error?.message || 'Failed to upload file');
    }

    return response.json();
  }

  async getEarnings(address: string): Promise<CreatorStats> {
    const response = await httpClient.get<CreatorStats>(`/creator/earnings/${address}`);
    return response.data;
  }

  async getSubscribers(address: string): Promise<{ count: number; subscribers: SubscriberInfo[] }> {
    const response = await httpClient.get<{ count: number; subscribers: SubscriberInfo[] }>(
      `/creator/subscribers/${address}`
    );
    return response.data;
  }

  async getGrowth(address: string): Promise<GrowthData> {
    const response = await httpClient.get<GrowthData>(`/creator/growth/${address}`);
    return response.data;
  }

  async getRevenueAnalytics(address: string, period: '7d' | '30d' = '30d'): Promise<RevenueSeriesPoint[]> {
    const response = await httpClient.get<Record<string, { ppv: number; subscription: number; total: number }>>(
      `/creator/analytics/${address}`,
      { params: { period } }
    );

    return this.normalizeRevenueSeries(response.data);
  }

  async getDashboardMetrics(address: string, period: '7d' | '30d' = '30d'): Promise<CreatorDashboardMetrics> {
    const [earnings, subscribers, growth, analytics] = await Promise.all([
      this.getEarnings(address),
      this.getSubscribers(address),
      this.getGrowth(address),
      this.getRevenueAnalytics(address, period),
    ]);

    return {
      earnings,
      subscribers,
      growth,
      analytics,
    };
  }

  nextContentId(content: ContentItem[]): number {
    const maxContentId = content.reduce((max, item) => Math.max(max, item.contentId), 0);
    return maxContentId + 1;
  }

  async saveContent(
    creatorAddress: string,
    existingContent: ContentItem[],
    values: CreatorContentFormValues,
    contentToEdit?: ContentItem | null
  ): Promise<ContentItem> {
    let uploadedUrl = values.existingUrl?.trim() || '';
    const normalizedPrice = Number.isFinite(Number(values.price)) ? Number(values.price) : 0;

    if (values.file) {
      const uploadResult = await this.uploadContentFile(values.file);
      uploadedUrl = uploadResult.url;
    }

    const payload: CreatorContentInput = {
      contentId: contentToEdit?.contentId ?? this.nextContentId(existingContent),
      title: values.title.trim(),
      description: values.description.trim(),
      contentType: values.contentType,
      price: normalizedPrice,
      creator: creatorAddress,
      url: uploadedUrl || undefined,
    };

    if (contentToEdit) {
      return this.updateContent(contentToEdit.contentId, creatorAddress, payload);
    }

    return this.createContent(payload);
  }
}

export const creatorApi = new CreatorApiClient(API_URL);
