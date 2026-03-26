/**
 * Shared domain types for Analytics entities.
 */

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface CountryDataPoint {
  country: string;
  count: number;
  percentage?: number;
}

export interface AnalyticsInsights {
  totalRevenue?: number;
  totalUsers?: number;
  totalContent?: number;
  growthRate?: number;
  topCountry?: string;
  [key: string]: unknown;
}

export interface AnalyticsSummary {
  total?: number;
  change?: number;
  changePercent?: number;
  [key: string]: unknown;
}

export interface RealTimeMetricData {
  activeUsers?: number;
  requestsPerMinute?: number;
  errorRate?: number;
  [key: string]: unknown;
}

export interface DailyAnalytics {
  ppv: number;
  subscription: number;
  total: number;
}

/** Map of date string to daily analytics breakdown */
export type AnalyticsData = Record<string, DailyAnalytics>;
