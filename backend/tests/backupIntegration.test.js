const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const databaseBackupService = require('../services/databaseBackupService');
const contentBackupService = require('../services/contentBackupService');
const backupSchedulerService = require('../services/backupSchedulerService');
const BackupUtils = require('../utils/backupUtils');
const { BackupJob } = require('../models/BackupJob');
const Content = require('../models/Content');

describe('Backup System Integration Tests', () => {
  let mongoServer;

  beforeAll(async () => {
    // Start in-memory MongoDB server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    // Connect to the in-memory database
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Initialize backup directories and retention policies
    await BackupUtils.createBackupDirectories();
    await BackupUtils.initializeRetentionPolicies();
  });

  afterAll(async () => {
    // Clean up
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear all collections
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }

    // Reset scheduler state
    backupSchedulerService.stopScheduler();
  });

  describe('Database Backup Service', () => {
    test('should create database backup successfully', async () => {
      // Create some test data
      const testContent = new Content({
        contentId: 1,
        title: 'Test Content',
        description: 'Test Description',
        price: 10,
        creator: 'test-creator',
        url: 'ipfs://test-url',
        storageType: 'ipfs'
      });
      await testContent.save();

      // Create backup
      const result = await databaseBackupService.createBackup({ triggeredBy: 'test' });

      expect(result.success).toBe(true);
      expect(result.backupId).toMatch(/^db_/);
      expect(result.size).toBeGreaterThan(0);

      // Verify backup job was created
      const backupJob = await BackupJob.findOne({ backupId: result.backupId });
      expect(backupJob).toBeTruthy();
      expect(backupJob.status).toBe('completed');
      expect(backupJob.type).toBe('database');
    });

    test('should handle backup failures gracefully', async () => {
      // Mock a failure scenario by disconnecting
      await mongoose.disconnect();

      const result = await databaseBackupService.createBackup({ triggeredBy: 'test' });

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();

      // Reconnect for other tests
      await mongoose.connect(mongoServer.getUri(), {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
    });

    test('should list available backups', async () => {
      // Create a backup first
      await databaseBackupService.createBackup({ triggeredBy: 'test' });

      const backups = await databaseBackupService.listBackups();
      expect(Array.isArray(backups)).toBe(true);
      expect(backups.length).toBeGreaterThan(0);

      const backup = backups[0];
      expect(backup.filename).toMatch(/^db_/);
      expect(backup.created).toBeInstanceOf(Date);
    });
  });

  describe('Content Backup Service', () => {
    test('should create content backup with test data', async () => {
      // Create test content
      const testContent = new Content({
        contentId: 1,
        title: 'Test Video',
        description: 'A test video content',
        price: 15,
        creator: 'creator-123',
        url: 'https://example.com/video.mp4', // Mock URL for testing
        storageType: 'ipfs'
      });
      await testContent.save();

      // Mock axios to avoid actual HTTP calls
      const mockAxios = require('axios');
      jest.spyOn(mockAxios, 'create').mockReturnValue({
        get: jest.fn().mockResolvedValue({
          status: 200,
          data: Buffer.from('mock video content')
        })
      });

      const result = await contentBackupService.createBackup({ triggeredBy: 'test' });

      expect(result.success).toBe(true);
      expect(result.backupId).toMatch(/^content_/);
      expect(result.fileCount).toBeGreaterThan(0);

      // Verify backup job was created
      const backupJob = await BackupJob.findOne({ backupId: result.backupId });
      expect(backupJob).toBeTruthy();
      expect(backupJob.status).toBe('completed');
      expect(backupJob.type).toBe('content');
    });

    test('should handle empty content gracefully', async () => {
      const result = await contentBackupService.createBackup({ triggeredBy: 'test' });

      expect(result.success).toBe(true);
      expect(result.fileCount).toBe(0);
      expect(result.message).toContain('No content');
    });
  });

  describe('Backup Scheduler Service', () => {
    test('should initialize scheduler', () => {
      expect(backupSchedulerService.isSchedulerRunning()).toBe(false);

      backupSchedulerService.initializeScheduler();
      expect(backupSchedulerService.isSchedulerRunning()).toBe(true);

      backupSchedulerService.stopScheduler();
      expect(backupSchedulerService.isSchedulerRunning()).toBe(false);
    });

    test('should trigger manual backup', async () => {
      const result = await backupSchedulerService.triggerManualBackup('database');

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('backupId');
    });

    test('should get backup status', async () => {
      const status = await backupSchedulerService.getBackupStatus();

      expect(status).toHaveProperty('scheduler');
      expect(status).toHaveProperty('database');
      expect(status).toHaveProperty('content');
      expect(status.scheduler.running).toBe(false);
    });
  });

  describe('Backup Utilities', () => {
    test('should get backup statistics', async () => {
      // Create some test backups
      await databaseBackupService.createBackup({ triggeredBy: 'test' });

      const stats = await BackupUtils.getBackupStatistics();

      expect(stats).toHaveProperty('totalBackups');
      expect(stats).toHaveProperty('successfulBackups');
      expect(stats).toHaveProperty('backupsByType');
      expect(stats.totalBackups).toBeGreaterThan(0);
    });

    test('should format file sizes correctly', () => {
      expect(BackupUtils.formatFileSize(1024)).toBe('1.00 KB');
      expect(BackupUtils.formatFileSize(1024 * 1024)).toBe('1.00 MB');
      expect(BackupUtils.formatFileSize(1024 * 1024 * 1024)).toBe('1.00 GB');
    });

    test('should validate configuration', async () => {
      const validation = await BackupUtils.validateConfiguration();

      expect(validation).toHaveProperty('success');
      expect(validation).toHaveProperty('errors');
      expect(Array.isArray(validation.errors)).toBe(true);
    });
  });

  describe('Backup Verification', () => {
    test('should verify backup integrity', async () => {
      // Create a backup first
      const backupResult = await databaseBackupService.createBackup({ triggeredBy: 'test' });
      expect(backupResult.success).toBe(true);

      // Verify the backup
      const verificationResult = await BackupUtils.verifyBackupIntegrity(backupResult.backupId);

      expect(verificationResult).toHaveProperty('success');
      expect(verificationResult).toHaveProperty('checksumMatch');
      expect(verificationResult).toHaveProperty('fileExists');
    });
  });
});