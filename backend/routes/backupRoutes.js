const express = require('express');
const router = express.Router();
const databaseBackupService = require('../services/databaseBackupService');
const contentBackupService = require('../services/contentBackupService');
const backupSchedulerService = require('../services/backupSchedulerService');
const BackupUtils = require('../utils/backupUtils');
const { BackupJob } = require('../models/BackupJob');

// Middleware to check if user is admin/creator (simplified for backup operations)
const requireBackupAccess = (req, res, next) => {
  // In production, implement proper authentication
  // For now, allow all requests
  next();
};

/**
 * @route GET /api/backups/status
 * @desc Get backup system status and statistics
 * @access Private (Admin)
 */
router.get('/status', requireBackupAccess, async (req, res) => {
  try {
    const status = await backupSchedulerService.getBackupStatus();
    const statistics = await BackupUtils.getBackupStatistics();

    res.json({
      success: true,
      data: {
        status,
        statistics
      }
    });
  } catch (error) {
    console.error('Failed to get backup status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get backup status'
    });
  }
});

/**
 * @route POST /api/backups/database
 * @desc Trigger manual database backup
 * @access Private (Admin)
 */
router.post('/database', requireBackupAccess, async (req, res) => {
  try {
    const result = await backupSchedulerService.triggerManualBackup('database');

    res.json({
      success: result.success,
      data: result
    });
  } catch (error) {
    console.error('Failed to trigger database backup:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger database backup'
    });
  }
});

/**
 * @route POST /api/backups/content
 * @desc Trigger manual content backup
 * @access Private (Admin)
 */
router.post('/content', requireBackupAccess, async (req, res) => {
  try {
    const result = await backupSchedulerService.triggerManualBackup('content');

    res.json({
      success: result.success,
      data: result
    });
  } catch (error) {
    console.error('Failed to trigger content backup:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger content backup'
    });
  }
});

/**
 * @route POST /api/backups/full
 * @desc Trigger manual full backup (database + content)
 * @access Private (Admin)
 */
router.post('/full', requireBackupAccess, async (req, res) => {
  try {
    const result = await backupSchedulerService.triggerManualBackup('full');

    res.json({
      success: result.success,
      data: result
    });
  } catch (error) {
    console.error('Failed to trigger full backup:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger full backup'
    });
  }
});

/**
 * @route GET /api/backups/jobs
 * @desc Get backup jobs with pagination
 * @access Private (Admin)
 */
router.get('/jobs', requireBackupAccess, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const type = req.query.type; // 'database', 'content', or undefined for all
    const status = req.query.status; // 'completed', 'failed', etc.

    const query = {};
    if (type) query.type = type;
    if (status) query.status = status;

    const total = await BackupJob.countDocuments(query);
    const jobs = await BackupJob.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('-__v');

    res.json({
      success: true,
      data: {
        jobs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Failed to get backup jobs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get backup jobs'
    });
  }
});

/**
 * @route GET /api/backups/jobs/:backupId
 * @desc Get specific backup job details
 * @access Private (Admin)
 */
router.get('/jobs/:backupId', requireBackupAccess, async (req, res) => {
  try {
    const { backupId } = req.params;
    const job = await BackupJob.findOne({ backupId });

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Backup job not found'
      });
    }

    res.json({
      success: true,
      data: job
    });
  } catch (error) {
    console.error('Failed to get backup job:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get backup job'
    });
  }
});

/**
 * @route POST /api/backups/jobs/:backupId/verify
 * @desc Verify backup integrity
 * @access Private (Admin)
 */
router.post('/jobs/:backupId/verify', requireBackupAccess, async (req, res) => {
  try {
    const { backupId } = req.params;
    const result = await BackupUtils.verifyBackupIntegrity(backupId);

    res.json({
      success: result.success,
      data: result
    });
  } catch (error) {
    console.error('Failed to verify backup:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify backup'
    });
  }
});

/**
 * @route GET /api/backups/list
 * @desc List available backup files
 * @access Private (Admin)
 */
router.get('/list', requireBackupAccess, async (req, res) => {
  try {
    const databaseBackups = await databaseBackupService.listBackups();
    const contentBackups = await contentBackupService.listBackups();

    res.json({
      success: true,
      data: {
        database: databaseBackups,
        content: contentBackups
      }
    });
  } catch (error) {
    console.error('Failed to list backups:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list backups'
    });
  }
});

/**
 * @route POST /api/backups/cleanup
 * @desc Manually trigger retention cleanup
 * @access Private (Admin)
 */
router.post('/cleanup', requireBackupAccess, async (req, res) => {
  try {
    await backupSchedulerService.runRetentionCleanup();

    res.json({
      success: true,
      message: 'Retention cleanup completed'
    });
  } catch (error) {
    console.error('Failed to run retention cleanup:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to run retention cleanup'
    });
  }
});

/**
 * @route GET /api/backups/config
 * @desc Get backup configuration (without sensitive data)
 * @access Private (Admin)
 */
router.get('/config', requireBackupAccess, async (req, res) => {
  try {
    const { backupConfig } = require('../config/backupConfig');

    // Remove sensitive information
    const safeConfig = JSON.parse(JSON.stringify(backupConfig));
    if (safeConfig.database.encryptionKey) {
      safeConfig.database.encryptionKey = '***';
    }
    if (safeConfig.cloud.accessKey) {
      safeConfig.cloud.accessKey = '***';
    }
    if (safeConfig.cloud.secretKey) {
      safeConfig.cloud.secretKey = '***';
    }

    const validation = await BackupUtils.validateConfiguration();

    res.json({
      success: true,
      data: {
        config: safeConfig,
        validation
      }
    });
  } catch (error) {
    console.error('Failed to get backup config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get backup config'
    });
  }
});

/**
 * @route POST /api/backups/export
 * @desc Export backup metadata
 * @access Private (Admin)
 */
router.post('/export', requireBackupAccess, async (req, res) => {
  try {
    const exportPath = `./backups/backup_metadata_${Date.now()}.json`;
    const result = await BackupUtils.exportBackupMetadata(exportPath);

    if (result.success) {
      res.json({
        success: true,
        data: {
          path: result.path,
          message: 'Backup metadata exported successfully'
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Failed to export backup metadata:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export backup metadata'
    });
  }
});

module.exports = router;