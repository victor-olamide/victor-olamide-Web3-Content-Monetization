const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { backupConfig } = require('../config/backupConfig');
const { BackupJob } = require('../models/BackupJob');

/**
 * Database backup service
 * Handles MongoDB database backups with compression and encryption
 */

class DatabaseBackupService {
  constructor() {
    this.config = backupConfig.database;
  }

  /**
   * Create a database backup
   * @param {Object} options - Backup options
   * @returns {Promise<Object>} Backup result
   */
  async createBackup(options = {}) {
    const backupId = `db_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const timestamp = new Date().toISOString();

    console.log(`[${timestamp}] Starting database backup: ${backupId}`);

    // Create backup job record
    const backupJob = new BackupJob({
      backupId,
      type: 'database',
      status: 'running',
      startedAt: new Date(),
      triggeredBy: options.triggeredBy || 'scheduler',
      config: { ...this.config, ...options }
    });

    try {
      await backupJob.save();

      // Ensure backup directory exists
      await this.ensureBackupDirectory();

      // Generate backup file path
      const backupFileName = `${backupId}.archive`;
      const backupPath = path.join(this.config.backupDir, backupFileName);

      // Create MongoDB dump
      const dumpResult = await this.createMongoDump(backupPath);

      if (!dumpResult.success) {
        throw new Error(`MongoDB dump failed: ${dumpResult.error}`);
      }

      // Compress the backup if enabled
      let finalPath = backupPath;
      let compressedSize = dumpResult.size;

      if (this.config.compression) {
        const compressedPath = `${backupPath}.gz`;
        await this.compressFile(backupPath, compressedPath);
        finalPath = compressedPath;
        compressedSize = await this.getFileSize(compressedPath);

        // Remove uncompressed file
        await fs.unlink(backupPath);
      }

      // Encrypt the backup if enabled
      if (this.config.encryption && this.config.encryptionKey) {
        const encryptedPath = `${finalPath}.enc`;
        await this.encryptFile(finalPath, encryptedPath);
        finalPath = encryptedPath;

        // Remove unencrypted file
        await fs.unlink(finalPath.replace('.enc', this.config.compression ? '.gz' : '.archive'));
      }

      // Calculate checksum
      const checksum = await this.calculateChecksum(finalPath);
      const finalSize = await this.getFileSize(finalPath);

      // Update backup job
      backupJob.status = 'completed';
      backupJob.completedAt = new Date();
      backupJob.duration = backupJob.completedAt - backupJob.startedAt;
      backupJob.size = dumpResult.size;
      backupJob.compressedSize = compressedSize;
      backupJob.checksum = checksum;
      backupJob.localPath = finalPath;

      await backupJob.save();

      console.log(`[${new Date().toISOString()}] Database backup completed: ${backupId}`);

      return {
        success: true,
        backupId,
        path: finalPath,
        size: finalSize,
        checksum,
        duration: backupJob.duration
      };

    } catch (error) {
      console.error(`[${new Date().toISOString()}] Database backup failed: ${backupId}`, error);

      // Update backup job with error
      backupJob.status = 'failed';
      backupJob.completedAt = new Date();
      backupJob.duration = backupJob.completedAt - backupJob.startedAt;
      backupJob.error = error.message;
      backupJob.errorDetails = {
        stack: error.stack,
        code: error.code
      };

      await backupJob.save();

      return {
        success: false,
        backupId,
        error: error.message
      };
    }
  }

  /**
   * Create MongoDB dump using mongodump
   * @param {string} outputPath - Output file path
   * @returns {Promise<Object>} Dump result
   */
  async createMongoDump(outputPath) {
    return new Promise((resolve) => {
      const mongodump = spawn('mongodump', [
        '--uri', this.config.mongoUri,
        '--archive',
        '--gzip', // Always use gzip for mongodump
        '--out', outputPath
      ]);

      let stdout = '';
      let stderr = '';

      mongodump.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      mongodump.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      mongodump.on('close', async (code) => {
        if (code === 0) {
          try {
            const stats = await fs.stat(outputPath);
            resolve({
              success: true,
              size: stats.size,
              output: stdout
            });
          } catch (error) {
            resolve({
              success: false,
              error: `Failed to get file stats: ${error.message}`
            });
          }
        } else {
          resolve({
            success: false,
            error: stderr || `mongodump exited with code ${code}`
          });
        }
      });

      mongodump.on('error', (error) => {
        resolve({
          success: false,
          error: `Failed to start mongodump: ${error.message}`
        });
      });
    });
  }

  /**
   * Compress a file using gzip
   * @param {string} inputPath - Input file path
   * @param {string} outputPath - Output file path
   */
  async compressFile(inputPath, outputPath) {
    const { createGzip } = require('zlib');
    const { pipeline } = require('stream/promises');

    const gzip = createGzip();
    const source = require('fs').createReadStream(inputPath);
    const destination = require('fs').createWriteStream(outputPath);

    await pipeline(source, gzip, destination);
  }

  /**
   * Encrypt a file using AES-256-CBC
   * @param {string} inputPath - Input file path
   * @param {string} outputPath - Output file path
   */
  async encryptFile(inputPath, outputPath) {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(this.config.encryptionKey, 'salt', 32);
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipher(algorithm, key);
    const input = require('fs').createReadStream(inputPath);
    const output = require('fs').createWriteStream(outputPath);

    // Write IV to the beginning of the file
    output.write(iv);

    return new Promise((resolve, reject) => {
      input.pipe(cipher).pipe(output);

      output.on('finish', resolve);
      output.on('error', reject);
      input.on('error', reject);
      cipher.on('error', reject);
    });
  }

  /**
   * Calculate file checksum
   * @param {string} filePath - File path
   * @returns {Promise<string>} SHA256 checksum
   */
  async calculateChecksum(filePath) {
    const fileBuffer = await fs.readFile(filePath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
  }

  /**
   * Get file size
   * @param {string} filePath - File path
   * @returns {Promise<number>} File size in bytes
   */
  async getFileSize(filePath) {
    const stats = await fs.stat(filePath);
    return stats.size;
  }

  /**
   * Ensure backup directory exists
   */
  async ensureBackupDirectory() {
    try {
      await fs.access(this.config.backupDir);
    } catch {
      await fs.mkdir(this.config.backupDir, { recursive: true });
    }
  }

  /**
   * Restore database from backup
   * @param {string} backupPath - Path to backup file
   * @returns {Promise<Object>} Restore result
   */
  async restoreBackup(backupPath) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Starting database restore from: ${backupPath}`);

    return new Promise((resolve) => {
      const mongorestore = spawn('mongorestore', [
        '--uri', this.config.mongoUri,
        '--archive',
        '--gzip',
        '--drop', // Drop existing collections before restore
        backupPath
      ]);

      let stdout = '';
      let stderr = '';

      mongorestore.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      mongorestore.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      mongorestore.on('close', (code) => {
        if (code === 0) {
          console.log(`[${new Date().toISOString()}] Database restore completed`);
          resolve({
            success: true,
            output: stdout
          });
        } else {
          console.error(`[${new Date().toISOString()}] Database restore failed`);
          resolve({
            success: false,
            error: stderr || `mongorestore exited with code ${code}`
          });
        }
      });

      mongorestore.on('error', (error) => {
        resolve({
          success: false,
          error: `Failed to start mongorestore: ${error.message}`
        });
      });
    });
  }

  /**
   * List available backups
   * @returns {Promise<Array>} List of backup files
   */
  async listBackups() {
    try {
      const files = await fs.readdir(this.config.backupDir);
      const backupFiles = files
        .filter(file => file.startsWith('db_') && (file.endsWith('.archive') || file.endsWith('.gz') || file.endsWith('.enc')))
        .map(file => ({
          filename: file,
          path: path.join(this.config.backupDir, file),
          created: this.extractTimestampFromFilename(file)
        }))
        .sort((a, b) => b.created - a.created);

      return backupFiles;
    } catch (error) {
      console.error('Failed to list backups:', error);
      return [];
    }
  }

  /**
   * Extract timestamp from backup filename
   * @param {string} filename - Backup filename
   * @returns {Date} Creation date
   */
  extractTimestampFromFilename(filename) {
    const match = filename.match(/db_(\d+)_/);
    if (match) {
      return new Date(parseInt(match[1]));
    }
    return new Date(0);
  }
}

module.exports = new DatabaseBackupService();