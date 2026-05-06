/**
 * Analytics Aggregation Job
 * Background job for processing and aggregating analytics data
 */

const cron = require('node-cron');
const analyticsService = require('../services/analyticsService');

class AnalyticsAggregationJob {
  constructor() {
    this.jobs = [];
    this.isRunning = false;
  }

  /**
   * Start the analytics aggregation jobs
   */
  start() {
    console.log('Starting analytics aggregation jobs...');

    // Hourly aggregation (runs at the top of every hour)
    this.jobs.push(
      cron.schedule('0 * * * *', async () => {
        await this.runHourlyAggregation();
      }, {
        scheduled: false, // Don't start immediately
      })
    );

    // Daily aggregation (runs at 2 AM every day)
    this.jobs.push(
      cron.schedule('0 2 * * *', async () => {
        await this.runDailyAggregation();
      }, {
        scheduled: false,
      })
    );

    // Weekly aggregation (runs at 3 AM every Sunday)
    this.jobs.push(
      cron.schedule('0 3 * * 0', async () => {
        await this.runWeeklyAggregation();
      }, {
        scheduled: false,
      })
    );

    // Monthly aggregation (runs at 4 AM on the 1st of every month)
    this.jobs.push(
      cron.schedule('0 4 1 * *', async () => {
        await this.runMonthlyAggregation();
      }, {
        scheduled: false,
      })
    );

    // Data cleanup job (runs daily at 5 AM)
    this.jobs.push(
      cron.schedule('0 5 * * *', async () => {
        await this.runDataCleanup();
      }, {
        scheduled: false,
      })
    );

    // Start all jobs
    this.jobs.forEach(job => job.start());
    console.log('Analytics aggregation jobs started successfully');
  }

  /**
   * Stop all analytics aggregation jobs
   */
  stop() {
    console.log('Stopping analytics aggregation jobs...');

    this.jobs.forEach(job => job.stop());
    this.jobs = [];
    this.isRunning = false;

    console.log('Analytics aggregation jobs stopped');
  }

  /**
   * Run hourly aggregation
   */
  async runHourlyAggregation() {
    if (this.isRunning) {
      console.log('Hourly aggregation already running, skipping...');
      return;
    }

    try {
      this.isRunning = true;
      console.log('Starting hourly analytics aggregation...');

      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      await analyticsService.aggregateData(oneHourAgo, now, 'hourly');

      console.log('Hourly analytics aggregation completed');
    } catch (error) {
      console.error('Error in hourly analytics aggregation:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Run daily aggregation
   */
  async runDailyAggregation() {
    try {
      console.log('Starting daily analytics aggregation...');

      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const today = new Date(yesterday);
      today.setDate(today.getDate() + 1);

      await analyticsService.aggregateData(yesterday, today, 'daily');

      console.log('Daily analytics aggregation completed');
    } catch (error) {
      console.error('Error in daily analytics aggregation:', error);
    }
  }

  /**
   * Run weekly aggregation
   */
  async runWeeklyAggregation() {
    try {
      console.log('Starting weekly analytics aggregation...');

      const now = new Date();
      const lastWeek = new Date(now);
      lastWeek.setDate(lastWeek.getDate() - 7);
      lastWeek.setHours(0, 0, 0, 0);

      const thisWeek = new Date(lastWeek);
      thisWeek.setDate(thisWeek.getDate() + 7);

      await analyticsService.aggregateData(lastWeek, thisWeek, 'weekly');

      console.log('Weekly analytics aggregation completed');
    } catch (error) {
      console.error('Error in weekly analytics aggregation:', error);
    }
  }

  /**
   * Run monthly aggregation
   */
  async runMonthlyAggregation() {
    try {
      console.log('Starting monthly analytics aggregation...');

      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      await analyticsService.aggregateData(lastMonth, thisMonth, 'monthly');

      console.log('Monthly analytics aggregation completed');
    } catch (error) {
      console.error('Error in monthly analytics aggregation:', error);
    }
  }

  /**
   * Run data cleanup
   */
  async runDataCleanup() {
    try {
      console.log('Starting analytics data cleanup...');

      const deletedCount = await analyticsService.cleanupOldData();

      console.log(`Analytics data cleanup completed. Deleted ${deletedCount} old records.`);
    } catch (error) {
      console.error('Error in analytics data cleanup:', error);
    }
  }

  /**
   * Manually trigger aggregation for testing
   */
  async triggerManualAggregation(granularity = 'daily', daysBack = 1) {
    try {
      console.log(`Manually triggering ${granularity} analytics aggregation for ${daysBack} days back...`);

      const now = new Date();
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - daysBack);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(startDate);
      if (granularity === 'hourly') {
        endDate.setHours(endDate.getHours() + 24);
      } else {
        endDate.setDate(endDate.getDate() + 1);
      }

      await analyticsService.aggregateData(startDate, endDate, granularity);

      console.log(`Manual ${granularity} analytics aggregation completed`);
    } catch (error) {
      console.error('Error in manual analytics aggregation:', error);
      throw error;
    }
  }

  /**
   * Get job status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      jobCount: this.jobs.length,
      jobs: this.jobs.map((job, index) => ({
        id: index + 1,
        running: job.running,
        scheduled: job.scheduled,
      })),
    };
  }
}

module.exports = new AnalyticsAggregationJob();
