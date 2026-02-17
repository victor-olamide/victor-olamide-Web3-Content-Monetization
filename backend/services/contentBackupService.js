const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');
const { backupConfig } = require('../config/backupConfig');
const { BackupJob } = require('../models/BackupJob');
const Content = require('../models/Content');

/**
 * Content backup service
 * Handles backup of IPFS and Gaia stored content files
 */

class ContentBackupService {
  constructor() {
    this.config = backupConfig.content;
    this.httpClient = axios.create({
      timeout: this.config.timeoutMs,
      maxContentLength: this.config.maxFileSize,
      maxBodyLength: this.config.maxFileSize
    });
  }

  /**
   * Create a content backup
   * @param {Object} options - Backup options
   * @returns {Promise<Object>} Backup result
   */
  async createBackup(options = {}) {
    const backupId = `content_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const timestamp = new Date().toISOString();

    console.log(`[${timestamp}] Starting content backup: ${backupId}`);

    // Create backup job record
    const backupJob = new BackupJob({
      backupId,
      type: 'content',
      status: 'running',
      startedAt: new Date(),
      triggeredBy: options.triggeredBy || 'scheduler',
      config: { ...this.config, ...options }
    });

    try {
      await backupJob.save();

      // Ensure backup directory exists
      await this.ensureBackupDirectory();

      // Get all content that needs backup
      const contentItems = await this.getContentForBackup();

      if (contentItems.length === 0) {
        console.log(`[${timestamp}] No content found for backup`);
        backupJob.status = 'completed';
        backupJob.completedAt = new Date();
        backupJob.duration = backupJob.completedAt - backupJob.startedAt;
        await backupJob.save();

        return {
          success: true,
          backupId,
          fileCount: 0,
          message: 'No content to backup'
        };
      }

      // Create backup directory for this backup
      const backupDir = path.join(this.config.backupDir, backupId);
      await fs.mkdir(backupDir, { recursive: true });

      // Download and backup content files
      const results = await this.downloadContentFiles(contentItems, backupDir);

      // Create manifest file
      const manifestPath = path.join(backupDir, 'manifest.json');
      await this.createManifestFile(contentItems, results, manifestPath);

      // Compress the entire backup directory if enabled
      let finalPath = backupDir;
      let compressedSize = results.totalSize;

      if (this.config.compression) {
        const compressedPath = `${backupDir}.tar.gz`;
        await this.compressDirectory(backupDir, compressedPath);
        finalPath = compressedPath;
        compressedSize = await this.getFileSize(compressedPath);

        // Remove uncompressed directory
        await fs.rm(backupDir, { recursive: true, force: true });
      }

      // Encrypt the backup if enabled
      if (this.config.encryption && backupConfig.database.encryptionKey) {
        const encryptedPath = `${finalPath}.enc`;
        await this.encryptFile(finalPath, encryptedPath);
        finalPath = encryptedPath;

        // Remove unencrypted file
        await fs.unlink(finalPath.replace('.enc', this.config.compression ? '.tar.gz' : ''));
      }

      // Calculate checksum
      const checksum = await this.calculateChecksum(finalPath);
      const finalSize = await this.getFileSize(finalPath);

      // Update backup job
      backupJob.status = 'completed';
      backupJob.completedAt = new Date();
      backupJob.duration = backupJob.completedAt - backupJob.startedAt;
      backupJob.size = results.totalSize;
      backupJob.fileCount = results.successCount;
      backupJob.compressedSize = compressedSize;
      backupJob.checksum = checksum;
      backupJob.localPath = finalPath;

      await backupJob.save();

      console.log(`[${new Date().toISOString()}] Content backup completed: ${backupId}`);

      return {
        success: true,
        backupId,
        path: finalPath,
        fileCount: results.successCount,
        totalSize: results.totalSize,
        checksum,
        duration: backupJob.duration
      };

    } catch (error) {
      console.error(`[${new Date().toISOString()}] Content backup failed: ${backupId}`, error);

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
   * Get content items that need backup
   * @returns {Promise<Array>} Content items
   */
  async getContentForBackup() {
    try {
      const contentItems = await Content.find({
        isRemoved: false,
        storageType: { $in: this.config.storageTypes }
      }).select('contentId title url storageType creator createdAt');

      return contentItems;
    } catch (error) {
      console.error('Failed to get content for backup:', error);
      return [];
    }
  }

  /**
   * Download content files with concurrency control
   * @param {Array} contentItems - Content items to download
   * @param {string} backupDir - Backup directory
   * @returns {Promise<Object>} Download results
   */
  async downloadContentFiles(contentItems, backupDir) {
    const results = {
      successCount: 0,
      failureCount: 0,
      totalSize: 0,
      errors: []
    };

    // Process in batches to control concurrency
    const batches = [];
    for (let i = 0; i < contentItems.length; i += this.config.concurrency) {
      batches.push(contentItems.slice(i, i + this.config.concurrency));
    }

    for (const batch of batches) {
      const promises = batch.map(item => this.downloadContentFile(item, backupDir));
      const batchResults = await Promise.allSettled(promises);

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.successCount++;
          results.totalSize += result.value.size || 0;
        } else {
          results.failureCount++;
          results.errors.push(result.reason);
        }
      }
    }

    return results;
  }

  /**
   * Download a single content file
   * @param {Object} contentItem - Content item
   * @param {string} backupDir - Backup directory
   * @returns {Promise<Object>} Download result
   */
  async downloadContentFile(contentItem, backupDir) {
    const maxRetries = this.config.retryAttempts;
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.httpClient.get(contentItem.url, {
          responseType: 'arraybuffer',
          timeout: this.config.timeoutMs
        });

        if (response.status !== 200) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // Generate safe filename
        const safeTitle = contentItem.title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
        const extension = this.getFileExtension(contentItem.url);
        const filename = `${contentItem.contentId}_${safeTitle}${extension}`;
        const filePath = path.join(backupDir, filename);

        // Write file
        await fs.writeFile(filePath, Buffer.from(response.data));

        return {
          contentId: contentItem.contentId,
          filename,
          path: filePath,
          size: response.data.length,
          url: contentItem.url,
          storageType: contentItem.storageType
        };

      } catch (error) {
        lastError = error;
        console.warn(`Download attempt ${attempt}/${maxRetries} failed for ${contentItem.contentId}:`, error.message);

        if (attempt < maxRetries) {
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    throw new Error(`Failed to download ${contentItem.contentId} after ${maxRetries} attempts: ${lastError.message}`);
  }

  /**
   * Get file extension from URL
   * @param {string} url - Content URL
   * @returns {string} File extension
   */
  getFileExtension(url) {
    try {
      const urlPath = new URL(url).pathname;
      const extension = path.extname(urlPath);
      return extension || '.bin'; // Default extension if none found
    } catch {
      return '.bin';
    }
  }

  /**
   * Create manifest file with backup metadata
   * @param {Array} contentItems - Original content items
   * @param {Object} results - Download results
   * @param {string} manifestPath - Manifest file path
   */
  async createManifestFile(contentItems, results, manifestPath) {
    const manifest = {
      backupId: path.basename(path.dirname(manifestPath)),
      createdAt: new Date().toISOString(),
      totalItems: contentItems.length,
      successfulDownloads: results.successCount,
      failedDownloads: results.failureCount,
      totalSize: results.totalSize,
      content: contentItems.map(item => ({
        contentId: item.contentId,
        title: item.title,
        url: item.url,
        storageType: item.storageType,
        creator: item.creator,
        createdAt: item.createdAt
      })),
      errors: results.errors
    };

    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  }

  /**
   * Compress directory using tar and gzip
   * @param {string} sourceDir - Source directory
   * @param {string} outputPath - Output file path
   */
  async compressDirectory(sourceDir, outputPath) {
    const { spawn } = require('child_process');

    return new Promise((resolve, reject) => {
      const tar = spawn('tar', ['-czf', outputPath, '-C', path.dirname(sourceDir), path.basename(sourceDir)]);

      tar.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`tar exited with code ${code}`));
        }
      });

      tar.on('error', reject);
    });
  }

  /**
   * Encrypt a file using AES-256-CBC
   * @param {string} inputPath - Input file path
   * @param {string} outputPath - Output file path
   */
  async encryptFile(inputPath, outputPath) {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(backupConfig.database.encryptionKey, 'salt', 32);
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
   * List available content backups
   * @returns {Promise<Array>} List of backup files
   */
  async listBackups() {
    try {
      const files = await fs.readdir(this.config.backupDir);
      const backupFiles = files
        .filter(file => file.startsWith('content_') && (file.endsWith('.tar.gz') || file.endsWith('.enc') || fs.statSync(path.join(this.config.backupDir, file)).isDirectory()))
        .map(file => ({
          filename: file,
          path: path.join(this.config.backupDir, file),
          created: this.extractTimestampFromFilename(file),
          isDirectory: fs.statSync(path.join(this.config.backupDir, file)).isDirectory()
        }))
        .sort((a, b) => b.created - a.created);

      return backupFiles;
    } catch (error) {
      console.error('Failed to list content backups:', error);
      return [];
    }
  }

  /**
   * Extract timestamp from backup filename
   * @param {string} filename - Backup filename
   * @returns {Date} Creation date
   */
  extractTimestampFromFilename(filename) {
    const match = filename.match(/content_(\d+)_/);
    if (match) {
      return new Date(parseInt(match[1]));
    }
    return new Date(0);
  }
}

module.exports = new ContentBackupService();