const databaseBackupService = require('./databaseBackupService');
const contentBackupService = require('./contentBackupService');
const { backupConfig } = require('../config/backupConfig');
const { BackupJob, BackupRetention } = require('../models/BackupJob');

/**
 * Backup scheduler service
 * Manages automated backup scheduling and execution
 */

let schedulerInstance = null;
let isRunning = false;
let activeBackups = new Set();

class BackupSchedulerService {
  constructor() {
    this.config = backupConfig.general;
    this.databaseInterval = backupConfig.database.intervalHours * 60 * 60 * 1000; // Convert to milliseconds
    this.contentInterval = backupConfig.content.intervalHours * 60 * 60 * 1000;
  }

  /**
   * Initialize the backup scheduler
   */
  initializeScheduler() {
    if (schedulerInstance) {
      console.warn('Backup scheduler already initialized');
      return;
    }

    if (!this.config.enabled) {
      console.log('Backup scheduler disabled in configuration');
      return;
    }

    console.log('Initializing backup scheduler...');

    // Run initial backups (with delay to ensure DB connection)
    setTimeout(async () => {
      await this.runScheduledBackups();
    }, 10000);

    // Schedule recurring database backups
    if (backupConfig.database.enabled) {
      schedulerInstance = setInterval(async () => {
        await this.runDatabaseBackup();
      }, this.databaseInterval);

      console.log(`Database backup scheduler initialized with interval: ${this.databaseInterval}ms`);
    }

    // Schedule recurring content backups
    if (backupConfig.content.enabled) {
      setTimeout(async () => {
        await this.runContentBackup();
      }, this.contentInterval / 2); // Offset content backups from database backups

      const contentScheduler = setInterval(async () => {
        await this.runContentBackup();
      }, this.contentInterval);

      console.log(`Content backup scheduler initialized with interval: ${this.contentInterval}ms`);
    }

    // Schedule retention cleanup
    this.scheduleRetentionCleanup();

    isRunning = true;
    console.log('Backup scheduler initialized successfully');
  }

  /**
   * Run all scheduled backups
   */
  async runScheduledBackups() {
    console.log(`[${new Date().toISOString()}] Running scheduled backups...`);

    const promises = [];

    if (backupConfig.database.enabled) {
      promises.push(this.runDatabaseBackup());
    }

    if (backupConfig.content.enabled) {
      promises.push(this.runContentBackup());
    }

    try {
      await Promise.allSettled(promises);
      console.log(`[${new Date().toISOString()}] Scheduled backups completed`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Scheduled backups failed:`, error);
    }
  }

  /**
   * Run database backup
   */
  async runDatabaseBackup() {
    if (activeBackups.has('database')) {
      console.log('Database backup already running, skipping...');
      return;
    }

    if (this.getActiveBackupCount() >= this.config.maxConcurrentBackups) {
      console.log('Maximum concurrent backups reached, skipping database backup...');
      return;
    }

    activeBackups.add('database');

    try {
      console.log(`[${new Date().toISOString()}] Starting scheduled database backup...`);
      const result = await databaseBackupService.createBackup({ triggeredBy: 'scheduler' });

      if (result.success) {
        console.log(`[${new Date().toISOString()}] Scheduled database backup completed: ${result.backupId}`);
      } else {
        console.error(`[${new Date().toISOString()}] Scheduled database backup failed:`, result.error);
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Scheduled database backup error:`, error);
    } finally {
      activeBackups.delete('database');
    }
  }

  /**
   * Run content backup
   */
  async runContentBackup() {
    if (activeBackups.has('content')) {
      console.log('Content backup already running, skipping...');
      return;
    }

    if (this.getActiveBackupCount() >= this.config.maxConcurrentBackups) {
      console.log('Maximum concurrent backups reached, skipping content backup...');
      return;
    }

    activeBackups.add('content');

    try {
      console.log(`[${new Date().toISOString()}] Starting scheduled content backup...`);
      const result = await contentBackupService.createBackup({ triggeredBy: 'scheduler' });

      if (result.success) {
        console.log(`[${new Date().toISOString()}] Scheduled content backup completed: ${result.backupId}`);
      } else {
        console.error(`[${new Date().toISOString()}] Scheduled content backup failed:`, result.error);
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Scheduled content backup error:`, error);
    } finally {
      activeBackups.delete('content');
    }
  }

  /**
   * Schedule retention policy cleanup
   */
  scheduleRetentionCleanup() {
    // Run retention cleanup daily
    const cleanupInterval = 24 * 60 * 60 * 1000; // 24 hours

    setTimeout(async () => {
      await this.runRetentionCleanup();
    }, 30000); // Initial delay

    setInterval(async () => {
      await this.runRetentionCleanup();
    }, cleanupInterval);

    console.log(`Retention cleanup scheduler initialized with interval: ${cleanupInterval}ms`);
  }

  /**
   * Run retention policy cleanup
   */
  async runRetentionCleanup() {
    try {
      console.log(`[${new Date().toISOString()}] Running retention cleanup...`);

      // Cleanup database backups
      if (backupConfig.database.enabled) {
        await this.cleanupBackupsByRetention('database');
      }

      // Cleanup content backups
      if (backupConfig.content.enabled) {
        await this.cleanupBackupsByRetention('content');
      }

      console.log(`[${new Date().toISOString()}] Retention cleanup completed`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Retention cleanup failed:`, error);
    }
  }

  /**
   * Cleanup backups based on retention policy
   * @param {string} type - Backup type ('database' or 'content')
   */
  async cleanupBackupsByRetention(type) {
    try {
      const retentionPolicy = await BackupRetention.findOne({ type, enabled: true });
      if (!retentionPolicy) {
        console.log(`No retention policy found for ${type} backups`);
        return;
      }

      const config = type === 'database' ? backupConfig.database : backupConfig.content;
      const maxAge = retentionPolicy.policy.maxAge * 24 * 60 * 60 * 1000; // Convert days to milliseconds
      const cutoffDate = new Date(Date.now() - maxAge);

      // Find backups older than retention period
      const oldBackups = await BackupJob.find({
        type,
        status: 'completed',
        startedAt: { $lt: cutoffDate }
      }).sort({ startedAt: -1 });

      if (oldBackups.length <= retentionPolicy.policy.minCount) {
        console.log(`Keeping all ${oldBackups.length} ${type} backups (minimum count)`);
        return;
      }

      // Keep minimum count, delete the rest
      const backupsToDelete = oldBackups.slice(retentionPolicy.policy.minCount);
      const deletedIds = [];

      for (const backup of backupsToDelete) {
        try {
          // Delete physical file if it exists
          if (backup.localPath) {
            const fs = require('fs').promises;
            await fs.unlink(backup.localPath);
          }

          // Mark as deleted in database
          await BackupJob.findByIdAndDelete(backup._id);
          deletedIds.push(backup.backupId);

        } catch (error) {
          console.error(`Failed to delete ${type} backup ${backup.backupId}:`, error);
        }
      }

      // Update retention record
      retentionPolicy.lastCleanup = new Date();
      retentionPolicy.cleanedBackups = deletedIds;
      retentionPolicy.totalCleaned += deletedIds.length;
      await retentionPolicy.save();

      console.log(`Cleaned up ${deletedIds.length} old ${type} backups`);

    } catch (error) {
      console.error(`Failed to cleanup ${type} backups:`, error);
    }
  }

  /**
   * Get count of active backups
   * @returns {number} Active backup count
   */
  getActiveBackupCount() {
    return activeBackups.size;
  }

  /**
   * Manually trigger a backup
   * @param {string} type - Backup type ('database', 'content', or 'full')
   * @returns {Promise<Object>} Backup result
   */
  async triggerManualBackup(type) {
    console.log(`[${new Date().toISOString()}] Manual backup triggered: ${type}`);

    switch (type) {
      case 'database':
        return await databaseBackupService.createBackup({ triggeredBy: 'manual' });

      case 'content':
        return await contentBackupService.createBackup({ triggeredBy: 'manual' });

      case 'full':
        const results = await Promise.allSettled([
          databaseBackupService.createBackup({ triggeredBy: 'manual' }),
          contentBackupService.createBackup({ triggeredBy: 'manual' })
        ]);

        return {
          success: results.every(r => r.status === 'fulfilled' && r.value.success),
          database: results[0].status === 'fulfilled' ? results[0].value : results[0].reason,
          content: results[1].status === 'fulfilled' ? results[1].value : results[1].reason
        };

      default:
        throw new Error(`Invalid backup type: ${type}`);
    }
  }

  /**
   * Get backup status and statistics
   * @returns {Promise<Object>} Backup status
   */
  async getBackupStatus() {
    const stats = {
      scheduler: {
        running: isRunning,
        activeBackups: Array.from(activeBackups),
        maxConcurrent: this.config.maxConcurrentBackups
      },
      database: {
        enabled: backupConfig.database.enabled,
        lastBackup: null,
        totalBackups: 0,
        failedBackups: 0
      },
      content: {
        enabled: backupConfig.content.enabled,
        lastBackup: null,
        totalBackups: 0,
        failedBackups: 0
      }
    };

    try {
      // Database backup stats
      if (backupConfig.database.enabled) {
        const dbBackups = await BackupJob.find({ type: 'database' })
          .sort({ startedAt: -1 })
          .limit(1);

        if (dbBackups.length > 0) {
          stats.database.lastBackup = dbBackups[0];
        }

        stats.database.totalBackups = await BackupJob.countDocuments({ type: 'database', status: 'completed' });
        stats.database.failedBackups = await BackupJob.countDocuments({ type: 'database', status: 'failed' });
      }

      // Content backup stats
      if (backupConfig.content.enabled) {
        const contentBackups = await BackupJob.find({ type: 'content' })
          .sort({ startedAt: -1 })
          .limit(1);

        if (contentBackups.length > 0) {
          stats.content.lastBackup = contentBackups[0];
        }

        stats.content.totalBackups = await BackupJob.countDocuments({ type: 'content', status: 'completed' });
        stats.content.failedBackups = await BackupJob.countDocuments({ type: 'content', status: 'failed' });
      }

    } catch (error) {
      console.error('Failed to get backup status:', error);
    }

    return stats;
  }

  /**
   * Stop the backup scheduler
   */
  stopScheduler() {
    if (schedulerInstance) {
      clearInterval(schedulerInstance);
      schedulerInstance = null;
      isRunning = false;
      activeBackups.clear();
      console.log('Backup scheduler stopped');
    }
  }

  /**
   * Check if scheduler is running
   * @returns {boolean} Running status
   */
  isSchedulerRunning() {
    return isRunning;
  }
}

module.exports = new BackupSchedulerService();