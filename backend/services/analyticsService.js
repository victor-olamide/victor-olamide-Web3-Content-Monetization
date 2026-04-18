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

      const result = {
        views: totalViews,
        revenue: totalRevenue,
        subscriberCount,
        topContent: topContent.slice(0, 10), // Top 10
        periodData
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
}

module.exports = new AnalyticsService();
