// Dashboard specific types and interfaces

export type ContentType = 'video' | 'article' | 'image' | 'music';
export type SortField = 'date' | 'views' | 'revenue' | 'price';
export type SortOrder = 'asc' | 'desc';
export type FilterType = 'all' | ContentType;

export interface DashboardMetric {
  label: string;
  value: string | number;
  unit?: string;
  change?: {
    value: number;
    isPositive: boolean;
  };
  icon?: React.ComponentType<{ className: string }>;
  tint?: string;
}

export interface DateRange {
  startDate: string;
  endDate: string;
  label: string;
}

export interface ContentStats {
  title: string;
  revenue: number;
  views: number;
  purchases: number;
  engagementRate: string;
}

export interface PerformanceMetrics {
  totalViews: number;
  totalPurchases: number;
  totalRevenue: string;
  avgEngagementRate: string;
  topPerformer?: ContentStats;
  lowestPerformer?: ContentStats;
  avgRevenuePerContent: string;
  avgViewsPerContent: number;
}

export interface SubscriberMetrics {
  averageSubscriptionValue: string;
  highValueSubscribers: number;
  recentSubscribers: number;
  churnRisk: number;
  retentionRate: string;
  monthlyRecurringRevenue: string;
}

export interface ExportData {
  content?: {
    total: number;
    items: any[];
  };
  stats?: {
    totalEarnings: number;
    ppvEarnings: number;
    subscriptionEarnings: number;
    ppvCount: number;
    subCount: number;
    currency: string;
  };
  analytics?: Array<{
    date: string;
    ppv: number;
    subscription: number;
    total: number;
  }>;
  exportDate?: string;
  summary?: {
    totalContent: number;
    totalViews: number;
    totalRevenue: number;
    subscribers: number;
  };
}

export interface DashboardState {
  isLoading: boolean;
  isSaving: boolean;
  isDeletingId: number | null;
  error: string | null;
  dateRange: DateRange;
  activeTab?: string;
}

export interface DashboardContextType {
  state: DashboardState;
  refreshData: () => Promise<void>;
  updateDateRange: (range: DateRange) => void;
  setError: (error: string | null) => void;
  setTab: (tabId: string) => void;
}

export interface ExportOptions {
  format: 'csv' | 'json';
  type: 'content' | 'analytics' | 'combined';
  includeTimestamp?: boolean;
  filename?: string;
}

export interface AutoRefreshOptions {
  interval?: number;
  enabled?: boolean;
}

export interface RefreshState {
  isRefreshing: boolean;
  lastRefresh: Date | null;
  nextRefresh: Date | null;
}

export interface CacheState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  isCacheValid: boolean;
}
