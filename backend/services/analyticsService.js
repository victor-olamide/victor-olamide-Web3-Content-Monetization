/**
 * Analytics Service
 * Handles analytics data collection, processing, and aggregation
 */

const AnalyticsEvent = require('../models/AnalyticsEvent');
const AnalyticsAggregation = require('../models/AnalyticsAggregation');
const User = require('../models/User');
const Content = require('../models/Content');

class AnalyticsService {
  constructor() {
    this.analyticsCache = new Map();
    this.CACHE_TTL = 10 * 60 * 1000; // 10 minutes for analytics
  }

  /**
   * Get cached analytics data
   */
  getCachedAnalytics(key) {
    const cached = this.analyticsCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }
    this.analyticsCache.delete(key);
    return null;
  }

  /**
   * Set cached analytics data
   */
  setCachedAnalytics(key, data) {
    this.analyticsCache.set(key, { data, timestamp: Date.now() });
  }

  /**
   * Track analytics event
   */
  async trackEvent(eventData) {
    try {
      // Enrich event data with additional information
      const enrichedData = await this.enrichEventData(eventData);

      // Create and save the event
      const event = await AnalyticsEvent.createEvent(enrichedData);

      // Trigger real-time processing for critical events
      if (this.isCriticalEvent(eventData.eventType)) {
        await this.processRealTimeMetrics(event);
      }

      return event;
    } catch (error) {
      console.error('Error tracking analytics event:', error);
      throw error;
    }
  }

  /**
   * Enrich event data with additional context
   */
  async enrichEventData(eventData) {
    const enriched = { ...eventData };

    // Add user information if userId is provided
    if (eventData.userId) {
      try {
        const user = await User.findById(eventData.userId).select('role country city');
        if (user) {
          enriched.userRole = user.role;
          enriched.userCountry = user.country;
          enriched.userCity = user.city;
        }
      } catch (error) {
        console.warn('Could not enrich user data:', error);
      }
    }

    // Add content information if contentId is provided
    if (eventData.contentId) {
      try {
        const content = await Content.findById(eventData.contentId).select('contentType creator');
        if (content) {
          enriched.contentType = content.contentType;
          enriched.creatorId = content.creator;
        }
      } catch (error) {
        console.warn('Could not enrich content data:', error);
      }
    }

    // Add device and geographic information from user agent
    if (eventData.userAgent) {
      enriched.deviceInfo = this.parseUserAgent(eventData.userAgent);
    }

    return enriched;
  }

  /**
   * Parse user agent string for device information
   */
  parseUserAgent(userAgent) {
    const ua = userAgent.toLowerCase();

    let deviceType = 'desktop';
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      deviceType = 'mobile';
    } else if (ua.includes('tablet') || ua.includes('ipad')) {
      deviceType = 'tablet';
    }

    let browser = 'unknown';
    if (ua.includes('chrome')) browser = 'chrome';
    else if (ua.includes('firefox')) browser = 'firefox';
    else if (ua.includes('safari')) browser = 'safari';
    else if (ua.includes('edge')) browser = 'edge';

    let os = 'unknown';
    if (ua.includes('windows')) os = 'windows';
    else if (ua.includes('mac')) os = 'macos';
    else if (ua.includes('linux')) os = 'linux';
    else if (ua.includes('android')) os = 'android';
    else if (ua.includes('ios')) os = 'ios';

    return { deviceType, browser, os };
  }

  /**
   * Check if event type requires real-time processing
   */
  isCriticalEvent(eventType) {
    const criticalEvents = [
      'CONTENT_PURCHASE',
      'USER_REGISTRATION',
      'TRANSACTION',
      'MODERATION_ACTION',
      'ADMIN_ACTION',
    ];

    return criticalEvents.includes(eventType);
  }

  /**
   * Process real-time metrics for critical events
   */
  async processRealTimeMetrics(event) {
    try {
      // Update real-time counters in Redis or in-memory cache
      // This would typically use Redis for real-time metrics
      console.log('Processing real-time metrics for event:', event.eventType);
    } catch (error) {
      console.error('Error processing real-time metrics:', error);
    }
  }

  /**
   * Aggregate analytics data for a specific time period
   */
  async aggregateData(startDate, endDate, granularity = 'daily') {
    try {
      console.log(`Starting aggregation for ${granularity} data from ${startDate} to ${endDate}`);

      const startTime = Date.now();

      // Get unprocessed events for the period
      const events = await AnalyticsEvent.find({
        timestamp: { $gte: startDate, $lt: endDate },
        processed: false,
      }).limit(50000); // Limit to prevent memory issues

      if (events.length === 0) {
        console.log('No unprocessed events found for aggregation');
        return;
      }

      // Group events by date based on granularity
      const groupedEvents = this.groupEventsByDate(events, granularity);

      // Process each date group
      for (const [dateKey, dateEvents] of Object.entries(groupedEvents)) {
        const date = new Date(dateKey);

        // Check if aggregation already exists
        const existingAggregation = await AnalyticsAggregation.findOne({
          date,
          granularity,
        });

        if (existingAggregation) {
          console.log(`Aggregation already exists for ${dateKey}, skipping`);
          continue;
        }

        // Create aggregation
        const aggregation = await AnalyticsAggregation.aggregateMetrics(
          date,
          granularity,
          dateEvents
        );

        // Save aggregation
        await new AnalyticsAggregation(aggregation).save();

        console.log(`Created ${granularity} aggregation for ${dateKey} with ${dateEvents.length} events`);
      }

      // Mark events as processed
      const eventIds = events.map(event => event._id);
      await AnalyticsEvent.markAsProcessed(eventIds);

      const processingTime = Date.now() - startTime;
      console.log(`Aggregation completed in ${processingTime}ms. Processed ${events.length} events.`);

    } catch (error) {
      console.error('Error aggregating analytics data:', error);
      throw error;
    }
  }

  /**
   * Group events by date based on granularity
   */
  groupEventsByDate(events, granularity) {
    const groups = {};

    for (const event of events) {
      let dateKey;

      switch (granularity) {
        case 'hourly':
          const hour = new Date(event.timestamp);
          hour.setMinutes(0, 0, 0);
          dateKey = hour.toISOString();
          break;

        case 'daily':
          const day = new Date(event.timestamp);
          day.setHours(0, 0, 0, 0);
          dateKey = day.toISOString().split('T')[0];
          break;

        case 'weekly':
          const week = new Date(event.timestamp);
          const dayOfWeek = week.getDay();
          week.setDate(week.getDate() - dayOfWeek);
          week.setHours(0, 0, 0, 0);
          dateKey = week.toISOString().split('T')[0];
          break;

        case 'monthly':
          const month = new Date(event.timestamp);
          month.setDate(1);
          month.setHours(0, 0, 0, 0);
          dateKey = month.toISOString().slice(0, 7); // YYYY-MM
          break;

        default:
          dateKey = event.timestamp.toISOString().split('T')[0];
      }

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(event);
    }

    return groups;
  }

  /**
   * Get creator analytics data
   * Returns views, revenue, subscriber count, and top content for a creator
   * Aggregates data daily/weekly/monthly based on granularity
   * @param {string} creatorId - Creator's MongoDB ObjectId
   * @param {Date} startDate - Start date for analytics
   * @param {Date} endDate - End date for analytics
   * @param {string} granularity - 'hourly', 'daily', 'weekly', or 'monthly'
   * @returns {Promise<Object>} Analytics data
   */
  async getCreatorAnalytics(creatorId, startDate, endDate, granularity = 'daily') {
    try {
      console.log(`Getting creator analytics for ${creatorId} from ${startDate} to ${endDate}`);

      // Create cache key
      const cacheKey = `creator_analytics_${creatorId}_${startDate.toISOString()}_${endDate.toISOString()}_${granularity}`;
      const cached = this.getCachedAnalytics(cacheKey);
      if (cached) {
        console.log('Returning cached creator analytics');
        return cached;
      }

      // Get creator's content IDs
      const Content = require('../models/Content');
      const creatorContent = await Content.find({ creator: creatorId }, '_id').lean();
      const contentIds = creatorContent.map(c => c._id);

      if (contentIds.length === 0) {
        const result = {
          views: 0,
          revenue: 0,
          subscriberCount: 0,
          topContent: [],
          periodData: []
        };
        this.setCachedAnalytics(cacheKey, result);
        return result;
      }

      // Aggregate data from events
      const events = await AnalyticsEvent.find({
        contentId: { $in: contentIds },
        timestamp: { $gte: startDate, $lt: endDate },
        eventType: { $in: ['CONTENT_VIEW', 'CONTENT_PURCHASE'] }
      }).lean();

      // Group by date based on granularity
      const groupedData = {};
      for (const event of events) {
        let dateKey;
        const eventDate = new Date(event.timestamp);

        switch (granularity) {
          case 'hourly':
            const hour = new Date(eventDate);
            hour.setMinutes(0, 0, 0);
            dateKey = hour.toISOString();
            break;
          case 'daily':
            const day = new Date(eventDate);
            day.setHours(0, 0, 0, 0);
            dateKey = day.toISOString().split('T')[0];
            break;
          case 'weekly':
            const week = new Date(eventDate);
            const dayOfWeek = week.getDay();
            week.setDate(week.getDate() - dayOfWeek);
            week.setHours(0, 0, 0, 0);
            dateKey = week.toISOString().split('T')[0];
            break;
          case 'monthly':
            const month = new Date(eventDate);
            month.setDate(1);
            month.setHours(0, 0, 0, 0);
            dateKey = month.toISOString().slice(0, 7); // YYYY-MM
            break;
          default:
            dateKey = eventDate.toISOString().split('T')[0];
        }

        if (!groupedData[dateKey]) {
          groupedData[dateKey] = [];
        }
        groupedData[dateKey].push(event);
      }

      // Calculate metrics
      const periodData = [];
      let totalViews = 0;
      let totalRevenue = 0;
      const contentStats = new Map();

      for (const [dateKey, dateEvents] of Object.entries(groupedData)) {
        const date = new Date(dateKey);
        let views = 0;
        let revenue = 0;

        for (const event of dateEvents) {
          if (event.eventType === 'CONTENT_VIEW') {
            views++;
            totalViews++;
          } else if (event.eventType === 'CONTENT_PURCHASE') {
            revenue += event.metadata?.amount || 0;
            totalRevenue += revenue;
          }

          // Track content stats
          const contentId = event.contentId.toString();
          if (!contentStats.has(contentId)) {
            contentStats.set(contentId, { views: 0, revenue: 0, purchases: 0 });
          }
          const stats = contentStats.get(contentId);
          if (event.eventType === 'CONTENT_VIEW') {
            stats.views++;
          } else if (event.eventType === 'CONTENT_PURCHASE') {
            stats.revenue += event.metadata?.amount || 0;
            stats.purchases++;
          }
        }

        periodData.push({
          date: dateKey,
          views,
          revenue,
          granularity
        });
      }

      // Get top content
      const topContent = [];
      for (const [contentId, stats] of contentStats.entries()) {
        const content = await Content.findById(contentId, 'title contentType').lean();
        if (content) {
          topContent.push({
            contentId,
            title: content.title,
            type: content.contentType,
            views: stats.views,
            revenue: stats.revenue,
            purchases: stats.purchases
          });
        }
      }

      // Sort top content by revenue, then views
      topContent.sort((a, b) => b.revenue - a.revenue || b.views - a.views);

      // Get subscriber count
      const Subscription = require('../models/Subscription');
      const subscriberCount = await Subscription.countDocuments({
        creator: creatorId,
        cancelledAt: null
      });

      // Calculate engagement metrics
      const engagementMetrics = this.calculateEngagementMetrics(
        topContent.map(c => ({ views: c.views, revenue: c.revenue, purchases: c.purchases }))
      );

      // Categorize content by performance
      const performanceCategories = this.categorizeContentPerformance(topContent);

      // Calculate trends
      const trends = this.calculateTrends(periodData);

      // Calculate previous period metrics for comparison
      let comparison = null;
      try {
        const previousMetrics = await this.calculatePreviousPeriodMetrics(creatorId, startDate, endDate, granularity);
        comparison = {
          viewsGrowth: this.calculateGrowthRate(totalViews, previousMetrics.views),
          revenueGrowth: this.calculateGrowthRate(totalRevenue, previousMetrics.revenue),
          subscriberGrowth: this.calculateGrowthRate(subscriberCount, previousMetrics.subscriberCount),
          previousViews: previousMetrics.views,
          previousRevenue: previousMetrics.revenue,
          previousSubscriberCount: previousMetrics.subscriberCount,
        };
      } catch (error) {
        console.warn('Could not calculate comparison metrics:', error.message);
        // Comparison is optional, don't fail if it's not available
      }

      const result = {
        views: totalViews,
        revenue: totalRevenue,
        subscriberCount,
        topContent: topContent.slice(0, 10), // Top 10
        periodData,
        engagementMetrics: {
          totalEngagements: engagementMetrics.totalEngagements,
          conversionRate: engagementMetrics.conversionRate.toFixed(2),
          avgViewsPerContent: engagementMetrics.avgViewsPerContent.toFixed(2),
          avgRevenuePerContent: engagementMetrics.avgRevenuePerContent.toFixed(2),
        },
        performanceAnalysis: {
          topTierCount: performanceCategories.topTier.length,
          midTierCount: performanceCategories.midTier.length,
          lowTierCount: performanceCategories.lowTier.length,
          topPerformers: performanceCategories.topTier.slice(0, 5),
        },
        trends: trends,
        comparison: comparison || null,
      };

      // Cache the result
      this.setCachedAnalytics(cacheKey, result);

      return result;
    } catch (error) {
      console.error('Error getting creator analytics:', error);
      throw error;
    }
  }

  /**
   * Get analytics data for dashboard
   */
  async getDashboardData(startDate, endDate, granularity = 'daily') {
    try {
      const aggregations = await AnalyticsAggregation.getAggregatedData(
        startDate,
        endDate,
        granularity
      );

      // Calculate trends and insights
      const insights = this.calculateInsights(aggregations);

      return {
        data: aggregations,
        insights,
        summary: this.calculateSummary(aggregations),
      };
    } catch (error) {
      console.error('Error getting dashboard data:', error);
      throw error;
    }
  }

  /**
   * Calculate insights from aggregated data
   */
  calculateInsights(aggregations) {
    if (aggregations.length < 2) return {};

    const insights = {};
    const latest = aggregations[aggregations.length - 1];
    const previous = aggregations[aggregations.length - 2];

    // User growth insights
    if (latest.metrics.newUsers > previous.metrics.newUsers) {
      insights.userGrowth = 'positive';
    } else if (latest.metrics.newUsers < previous.metrics.newUsers) {
      insights.userGrowth = 'negative';
    }

    // Revenue insights
    const revenueChange = latest.metrics.transactionVolume - previous.metrics.transactionVolume;
    if (revenueChange > 0) {
      insights.revenueGrowth = 'positive';
    } else if (revenueChange < 0) {
      insights.revenueGrowth = 'negative';
    }

    // Engagement insights
    const engagementChange = latest.metrics.contentViews - previous.metrics.contentViews;
    if (engagementChange > 0) {
      insights.engagementGrowth = 'positive';
    }

    return insights;
  }

  /**
   * Calculate summary statistics
   */
  calculateSummary(aggregations) {
    if (aggregations.length === 0) return {};

    const summary = {
      totalUsers: 0,
      totalRevenue: 0,
      totalContentViews: 0,
      totalTransactions: 0,
      avgSessionDuration: 0,
      topCountry: null,
      topContentType: null,
    };

    for (const agg of aggregations) {
      summary.totalUsers += agg.metrics.totalUsers || 0;
      summary.totalRevenue += agg.metrics.transactionVolume || 0;
      summary.totalContentViews += agg.metrics.contentViews || 0;
      summary.totalTransactions += agg.metrics.totalTransactions || 0;
    }

    // Find top country
    const countryCounts = {};
    for (const agg of aggregations) {
      for (const country of agg.metrics.topCountries || []) {
        countryCounts[country.country] = (countryCounts[country.country] || 0) + country.count;
      }
    }

    const topCountry = Object.entries(countryCounts).sort((a, b) => b[1] - a[1])[0];
    if (topCountry) {
      summary.topCountry = { country: topCountry[0], count: topCountry[1] };
    }

    return summary;
  }

  /**
   * Clean up old analytics data based on retention policy
   */
  async cleanupOldData() {
    try {
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

      // Remove old raw events (TTL should handle this, but manual cleanup as backup)
      const deletedEvents = await AnalyticsEvent.deleteMany({
        createdAt: { $lt: ninetyDaysAgo },
        processed: true,
      });

      console.log(`Cleaned up ${deletedEvents.deletedCount} old analytics events`);

      return deletedEvents.deletedCount;
    } catch (error) {
      console.error('Error cleaning up old analytics data:', error);
      throw error;
    }
  }

  /**
   * Calculate metrics for a previous period for comparison
   */
  async calculatePreviousPeriodMetrics(creatorId, startDate, endDate, granularity) {
    try {
      // Calculate the period duration
      const periodDuration = endDate - startDate;
      const previousEndDate = new Date(startDate);
      const previousStartDate = new Date(startDate - periodDuration);

      // Calculate metrics for previous period
      const previousMetrics = await this.getCreatorAnalytics(
        creatorId,
        previousStartDate,
        previousEndDate,
        granularity
      );

      return previousMetrics;
    } catch (error) {
      console.error('Error calculating previous period metrics:', error);
      throw error;
    }
  }

  /**
   * Calculate growth rates for key metrics
   */
  calculateGrowthRate(currentValue, previousValue) {
    if (previousValue === 0) {
      return currentValue > 0 ? 100 : 0; // 100% growth if previous was 0
    }
    return ((currentValue - previousValue) / previousValue) * 100;
  }

  /**
   * Calculate engagement rate based on views and interactions
   */
  calculateEngagementMetrics(contentStats) {
    const metrics = {
      totalEngagements: 0,
      conversionRate: 0,
      avgViewsPerContent: 0,
      avgRevenuePerContent: 0,
    };

    if (contentStats.length === 0) {
      return metrics;
    }

    let totalViews = 0;
    let totalRevenue = 0;
    let totalPurchases = 0;

    for (const content of contentStats) {
      totalViews += content.views || 0;
      totalRevenue += content.revenue || 0;
      totalPurchases += content.purchases || 0;
    }

    metrics.totalEngagements = totalPurchases;
    metrics.conversionRate = totalViews > 0 ? (totalPurchases / totalViews) * 100 : 0;
    metrics.avgViewsPerContent = totalViews / contentStats.length;
    metrics.avgRevenuePerContent = totalRevenue / contentStats.length;

    return metrics;
  }

  /**
   * Categorize content by performance tier
   */
  categorizeContentPerformance(contentList) {
    if (contentList.length === 0) {
      return { topTier: [], midTier: [], lowTier: [] };
    }

    // Sort by revenue
    const sorted = [...contentList].sort((a, b) => b.revenue - a.revenue);

    // Calculate tiers by quartiles
    const topTierCount = Math.ceil(sorted.length * 0.25); // Top 25%
    const midTierCount = Math.ceil(sorted.length * 0.5); // Next 25-50%

    return {
      topTier: sorted.slice(0, topTierCount),
      midTier: sorted.slice(topTierCount, topTierCount + midTierCount),
      lowTier: sorted.slice(topTierCount + midTierCount),
    };
  }

  /**
   * Calculate time-based trends for metrics
   */
  calculateTrends(periodData) {
    if (periodData.length < 2) {
      return { viewsTrend: 'stable', revenueTrend: 'stable' };
    }

    // Compare first half with second half
    const midPoint = Math.floor(periodData.length / 2);
    const firstHalf = periodData.slice(0, midPoint);
    const secondHalf = periodData.slice(midPoint);

    const firstHalfViews = firstHalf.reduce((sum, d) => sum + d.views, 0);
    const secondHalfViews = secondHalf.reduce((sum, d) => sum + d.views, 0);

    const firstHalfRevenue = firstHalf.reduce((sum, d) => sum + d.revenue, 0);
    const secondHalfRevenue = secondHalf.reduce((sum, d) => sum + d.revenue, 0);

    return {
      viewsTrend: secondHalfViews > firstHalfViews ? 'increasing' : 'decreasing',
      revenueTrend: secondHalfRevenue > firstHalfRevenue ? 'increasing' : 'decreasing',
    };
  }
}

module.exports = new AnalyticsService();
