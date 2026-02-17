# Automated Backup System

## Overview

The automated backup system provides comprehensive database and content backup capabilities for the Web3 content platform. It supports scheduled backups, manual triggers, retention policies, integrity verification, and cloud storage integration.

## Features

- **Database Backups**: Automated MongoDB database dumps with compression and optional encryption
- **Content Backups**: Download and backup of IPFS and Gaia stored content files
- **Scheduled Operations**: Configurable automated backup scheduling
- **Retention Policies**: Automatic cleanup of old backups based on age and count limits
- **Integrity Verification**: Checksum validation and backup integrity testing
- **Cloud Storage**: Optional cloud storage integration (AWS S3, GCP, Azure)
- **Monitoring**: Comprehensive logging and status tracking
- **API Endpoints**: RESTful API for manual operations and monitoring

## Architecture

### Components

1. **Backup Services**
   - `databaseBackupService.js`: Handles MongoDB database backups
   - `contentBackupService.js`: Manages content file backups
   - `backupSchedulerService.js`: Coordinates automated backup operations

2. **Configuration**
   - `backupConfig.js`: Centralized configuration management

3. **Models**
   - `BackupJob.js`: Tracks backup operations and metadata
   - `BackupRetention.js`: Manages retention policies
   - `BackupVerification.js`: Records integrity verification results

4. **Utilities**
   - `backupUtils.js`: Common backup utility functions
   - `createBackupIndexes.js`: Database index creation script

5. **API Routes**
   - `backupRoutes.js`: REST API endpoints for backup operations

## Configuration

### Environment Variables

```bash
# General Settings
BACKUP_SYSTEM_ENABLED=true
BACKUP_TIMEZONE=UTC
BACKUP_LOG_LEVEL=info

# Database Backup
BACKUP_DATABASE_ENABLED=true
BACKUP_DATABASE_INTERVAL_HOURS=24
BACKUP_DATABASE_RETENTION_DAYS=30
BACKUP_DATABASE_COMPRESSION=true
BACKUP_DATABASE_ENCRYPTION=false
BACKUP_ENCRYPTION_KEY=your-encryption-key-here
BACKUP_DATABASE_DIR=./backups/database

# Content Backup
BACKUP_CONTENT_ENABLED=true
BACKUP_CONTENT_INTERVAL_HOURS=24
BACKUP_CONTENT_RETENTION_DAYS=30
BACKUP_CONTENT_COMPRESSION=true
BACKUP_CONTENT_ENCRYPTION=false
BACKUP_CONTENT_CONCURRENCY=3
BACKUP_CONTENT_TIMEOUT_MS=30000
BACKUP_CONTENT_RETRY_ATTEMPTS=3
BACKUP_MAX_FILE_SIZE=104857600

# Cloud Storage (Optional)
BACKUP_CLOUD_ENABLED=false
BACKUP_CLOUD_PROVIDER=aws
BACKUP_CLOUD_BUCKET=your-backup-bucket
BACKUP_CLOUD_REGION=us-east-1
BACKUP_CLOUD_ACCESS_KEY=your-access-key
BACKUP_CLOUD_SECRET_KEY=your-secret-key
```

### Default Directories

- Database backups: `./backups/database/`
- Content backups: `./backups/content/`
- Temporary files: `./backups/temp/`

## API Endpoints

### Status and Monitoring

```http
GET /api/backups/status
```
Get backup system status and statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": {
      "scheduler": {
        "running": true,
        "activeBackups": [],
        "maxConcurrent": 2
      },
      "database": {
        "enabled": true,
        "lastBackup": { ... },
        "totalBackups": 15,
        "failedBackups": 0
      },
      "content": {
        "enabled": true,
        "lastBackup": { ... },
        "totalBackups": 12,
        "failedBackups": 1
      }
    },
    "statistics": { ... }
  }
}
```

### Manual Backup Triggers

```http
POST /api/backups/database
POST /api/backups/content
POST /api/backups/full
```
Trigger manual backups for database, content, or full system.

### Backup Management

```http
GET /api/backups/jobs?page=1&limit=20&type=database&status=completed
```
List backup jobs with pagination and filtering.

```http
GET /api/backups/jobs/:backupId
```
Get details of a specific backup job.

```http
POST /api/backups/jobs/:backupId/verify
```
Verify integrity of a specific backup.

```http
GET /api/backups/list
```
List available backup files on disk.

### Maintenance

```http
POST /api/backups/cleanup
```
Manually trigger retention policy cleanup.

```http
GET /api/backups/config
```
Get current backup configuration (without sensitive data).

```http
POST /api/backups/export
```
Export backup metadata to JSON file.

## Usage

### Starting the Backup System

```javascript
const backupSchedulerService = require('./services/backupSchedulerService');

// Initialize and start automated backups
backupSchedulerService.initializeScheduler();
```

### Manual Backup Operations

```javascript
const backupSchedulerService = require('./services/backupSchedulerService');

// Trigger manual backups
await backupSchedulerService.triggerManualBackup('database');
await backupSchedulerService.triggerManualBackup('content');
await backupSchedulerService.triggerManualBackup('full');
```

### Backup Verification

```javascript
const BackupUtils = require('./utils/backupUtils');

// Verify backup integrity
const result = await BackupUtils.verifyBackupIntegrity('db_1234567890_abc123');
console.log('Verification result:', result);
```

## Backup Process

### Database Backup Process

1. **Preparation**: Validate configuration and ensure backup directory exists
2. **Dump Creation**: Use `mongodump` to create database archive
3. **Compression**: Apply gzip compression if enabled
4. **Encryption**: Encrypt backup with AES-256 if enabled
5. **Verification**: Calculate checksum and update metadata
6. **Cleanup**: Remove temporary files

### Content Backup Process

1. **Content Discovery**: Query database for content items to backup
2. **Download**: Download content files with concurrency control and retry logic
3. **Organization**: Create backup directory structure with manifest
4. **Compression**: Compress entire backup directory
5. **Encryption**: Encrypt if enabled
6. **Verification**: Calculate checksums and update metadata

## Retention Policies

The system automatically manages backup retention based on configurable policies:

- **Age-based**: Delete backups older than specified days
- **Count-based**: Keep maximum number of backups per type
- **Minimum Count**: Always retain minimum number of recent backups

Default retention policies:
- Database: 30 days, max 30 backups, min 3 backups
- Content: 30 days, max 30 backups, min 3 backups

## Security Considerations

### Encryption

- Database and content backups can be encrypted using AES-256-CBC
- Encryption keys should be stored securely (environment variables, key management service)
- Encrypted backups cannot be restored without the encryption key

### Access Control

- Backup API endpoints require authentication (admin/creator access)
- Backup files should be stored in secure locations
- Cloud storage credentials should use IAM roles when possible

### Data Privacy

- Backup files may contain sensitive user data
- Ensure compliance with data protection regulations (GDPR, CCPA)
- Consider data anonymization for test environments

## Monitoring and Alerting

### Logging

The system provides comprehensive logging:
- Backup operation start/completion
- File sizes and checksums
- Error conditions and retry attempts
- Retention cleanup operations

### Metrics

Available metrics include:
- Total backups by type
- Success/failure rates
- Backup file sizes
- Retention cleanup statistics
- Verification results

### Alerts

Configure alerts for:
- Backup failures
- Verification failures
- Storage space issues
- Retention policy violations

## Troubleshooting

### Common Issues

1. **Backup Directory Permissions**
   - Ensure the application has write permissions to backup directories
   - Check disk space availability

2. **MongoDB Connection Issues**
   - Verify MONGODB_URI configuration
   - Check database connectivity and authentication

3. **Content Download Failures**
   - Verify IPFS/Gaia URLs are accessible
   - Check network connectivity and timeouts
   - Review content storage type configurations

4. **Encryption Key Issues**
   - Ensure BACKUP_ENCRYPTION_KEY is set for encrypted backups
   - Verify key format and length

5. **Cloud Storage Failures**
   - Check cloud credentials and permissions
   - Verify bucket/container exists and is accessible

### Recovery Procedures

1. **Database Restore**
   ```javascript
   const databaseBackupService = require('./services/databaseBackupService');
   await databaseBackupService.restoreBackup('/path/to/backup.file');
   ```

2. **Content Restore**
   - Manual process: Extract backup archive and upload files back to IPFS/Gaia
   - Use manifest file to verify content integrity

3. **Backup Verification**
   ```javascript
   const BackupUtils = require('./utils/backupUtils');
   const result = await BackupUtils.verifyBackupIntegrity('backup_id');
   ```

## Performance Considerations

### Optimization Strategies

- **Concurrency Control**: Limit concurrent backup operations
- **File Size Limits**: Prevent large file downloads from blocking backups
- **Compression**: Reduce storage requirements and transfer times
- **Incremental Backups**: Future enhancement for changed content only

### Resource Usage

- Database backups: Moderate CPU and memory usage during dump operations
- Content backups: Network I/O intensive, controlled by concurrency settings
- Storage: Plan for backup storage growth based on retention policies

## Future Enhancements

- **Incremental Backups**: Only backup changed content since last backup
- **Point-in-Time Recovery**: Restore to specific timestamps
- **Multi-Region Replication**: Cross-region backup replication
- **Backup Analytics**: Detailed reporting and trend analysis
- **Integration APIs**: Webhooks for backup events
- **Automated Testing**: Backup/restore validation in CI/CD pipelines