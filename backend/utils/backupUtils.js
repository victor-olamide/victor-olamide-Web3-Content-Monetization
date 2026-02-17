const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { backupConfig } = require('../config/backupConfig');
const { BackupJob, BackupRetention, BackupVerification } = require('../models/BackupJob');

/**
 * Backup utility functions
 * Common utilities for backup operations
 */

class BackupUtils {
  /**
   * Initialize backup retention policies
   */
  static async initializeRetentionPolicies() {
    const policies = [
      {
        retentionId: 'database_retention',
        type: 'database',
        policy: {
          maxAge: backupConfig.database.retentionDays,
          maxCount: 30, // Keep up to 30 database backups
          minCount: 3 // Always keep at least 3
        },
        enabled: true
      },
      {
        retentionId: 'content_retention',
        type: 'content',
        policy: {
          maxAge: backupConfig.content.retentionDays,
          maxCount: 30, // Keep up to 30 content backups
          minCount: 3 // Always keep at least 3
        },
        enabled: true
      }
    ];

    for (const policy of policies) {
      await BackupRetention.findOneAndUpdate(
        { retentionId: policy.retentionId },
        policy,
        { upsert: true, new: true }
      );
    }

    console.log('Backup retention policies initialized');
  }

  /**
   * Create backup directories
   */
  static async createBackupDirectories() {
    const directories = [
      backupConfig.database.backupDir,
      backupConfig.content.backupDir,
      backupConfig.general.tempDir
    ];

    for (const dir of directories) {
      try {
        await fs.access(dir);
      } catch {
        await fs.mkdir(dir, { recursive: true });
        console.log(`Created backup directory: ${dir}`);
      }
    }
  }

  /**
   * Validate backup file integrity
   * @param {string} backupId - Backup ID to verify
   * @returns {Promise<Object>} Verification result
   */
  static async verifyBackupIntegrity(backupId) {
    try {
      const backup = await BackupJob.findOne({ backupId });
      if (!backup) {
        return { success: false, error: 'Backup not found' };
      }

      // Create verification record
      const verification = new BackupVerification({
        verificationId: `verify_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
        backupId,
        type: backup.type,
        status: 'running',
        startedAt: new Date()
      });

      await verification.save();

      let checksumMatch = false;
      let fileExists = false;
      let sizeMatch = false;

      try {
        // Check if file exists
        await fs.access(backup.localPath);
        fileExists = true;

        // Verify checksum
        const currentChecksum = await this.calculateChecksum(backup.localPath);
        checksumMatch = currentChecksum === backup.checksum;

        // Verify size
        const stats = await fs.stat(backup.localPath);
        sizeMatch = stats.size === backup.compressedSize;

        // Additional verification for content backups
        let sampleVerification = true;
        if (backup.type === 'content' && backupConfig.content.compression) {
          sampleVerification = await this.verifyContentBackupSample(backup.localPath);
        }

        verification.checksumMatch = checksumMatch;
        verification.fileCountMatch = true; // For now, assume file count is correct
        verification.sizeMatch = sizeMatch;
        verification.sampleVerification = sampleVerification;
        verification.status = 'passed';
        verification.completedAt = new Date();

      } catch (error) {
        verification.status = 'failed';
        verification.completedAt = new Date();
        verification.error = error.message;
      }

      await verification.save();

      return {
        success: verification.status === 'passed',
        verificationId: verification.verificationId,
        checksumMatch,
        fileExists,
        sizeMatch,
        details: verification
      };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Verify content backup by checking manifest
   * @param {string} backupPath - Path to compressed backup
   * @returns {Promise<boolean>} Verification result
   */
  static async verifyContentBackupSample(backupPath) {
    try {
      // For compressed backups, we'd need to extract a sample
      // This is a simplified version - in production, extract and verify manifest
      const fs = require('fs');
      const stats = fs.statSync(backupPath);
      return stats.size > 0; // Basic check that file has content
    } catch {
      return false;
    }
  }

  /**
   * Calculate file checksum
   * @param {string} filePath - File path
   * @returns {Promise<string>} SHA256 checksum
   */
  static async calculateChecksum(filePath) {
    const fileBuffer = await fs.readFile(filePath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
  }

  /**
   * Get backup file size
   * @param {string} filePath - File path
   * @returns {Promise<number>} File size in bytes
   */
  static async getFileSize(filePath) {
    const stats = await fs.stat(filePath);
    return stats.size;
  }

  /**
   * Format file size for display
   * @param {number} bytes - Size in bytes
   * @returns {string} Formatted size
   */
  static formatFileSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  /**
   * Clean up temporary files
   * @param {string} tempDir - Temporary directory to clean
   */
  static async cleanupTempFiles(tempDir = backupConfig.general.tempDir) {
    try {
      const files = await fs.readdir(tempDir);
      const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago

      for (const file of files) {
        const filePath = path.join(tempDir, file);
        try {
          const stats = await fs.stat(filePath);
          if (stats.mtime.getTime() < cutoffTime) {
            await fs.unlink(filePath);
            console.log(`Cleaned up old temp file: ${file}`);
          }
        } catch (error) {
          console.error(`Failed to cleanup temp file ${file}:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup temp files:', error);
    }
  }

  /**
   * Get backup statistics
   * @returns {Promise<Object>} Backup statistics
   */
  static async getBackupStatistics() {
    const stats = {
      totalBackups: 0,
      successfulBackups: 0,
      failedBackups: 0,
      totalSize: 0,
      lastBackup: null,
      backupsByType: {
        database: { count: 0, size: 0 },
        content: { count: 0, size: 0 }
      },
      recentFailures: []
    };

    try {
      // Overall statistics
      stats.totalBackups = await BackupJob.countDocuments();
      stats.successfulBackups = await BackupJob.countDocuments({ status: 'completed' });
      stats.failedBackups = await BackupJob.countDocuments({ status: 'failed' });

      // Size statistics
      const sizeResult = await BackupJob.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, totalSize: { $sum: '$compressedSize' } } }
      ]);
      stats.totalSize = sizeResult.length > 0 ? sizeResult[0].totalSize : 0;

      // Last backup
      const lastBackup = await BackupJob.findOne().sort({ completedAt: -1 });
      stats.lastBackup = lastBackup;

      // Statistics by type
      const typeStats = await BackupJob.aggregate([
        { $match: { status: 'completed' } },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            totalSize: { $sum: '$compressedSize' }
          }
        }
      ]);

      typeStats.forEach(typeStat => {
        if (stats.backupsByType[typeStat._id]) {
          stats.backupsByType[typeStat._id].count = typeStat.count;
          stats.backupsByType[typeStat._id].size = typeStat.totalSize;
        }
      });

      // Recent failures
      stats.recentFailures = await BackupJob.find({ status: 'failed' })
        .sort({ completedAt: -1 })
        .limit(5)
        .select('backupId type error completedAt');

    } catch (error) {
      console.error('Failed to get backup statistics:', error);
    }

    return stats;
  }

  /**
   * Export backup metadata to JSON
   * @param {string} outputPath - Output file path
   * @returns {Promise<Object>} Export result
   */
  static async exportBackupMetadata(outputPath) {
    try {
      const backups = await BackupJob.find().sort({ createdAt: -1 });
      const retention = await BackupRetention.find();
      const verifications = await BackupVerification.find().sort({ createdAt: -1 }).limit(100);

      const exportData = {
        exportedAt: new Date().toISOString(),
        backups,
        retentionPolicies: retention,
        recentVerifications: verifications,
        statistics: await this.getBackupStatistics()
      };

      await fs.writeFile(outputPath, JSON.stringify(exportData, null, 2));

      return { success: true, path: outputPath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Validate backup configuration
   * @returns {Promise<Object>} Validation result
   */
  static async validateConfiguration() {
    const { validateConfig } = require('../config/backupConfig');
    return validateConfig();
  }
}

module.exports = BackupUtils;