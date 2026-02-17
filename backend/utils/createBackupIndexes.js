const mongoose = require('mongoose');
const { BackupJob, BackupRetention, BackupVerification } = require('../models/BackupJob');

/**
 * Create database indexes for backup system
 * This script creates necessary indexes for optimal backup system performance
 */

async function createBackupIndexes() {
  try {
    console.log('Creating backup system database indexes...');

    // BackupJob indexes
    await mongoose.connection.db.collection('backupjobs').createIndex(
      { backupId: 1 },
      { unique: true, name: 'backupId_unique' }
    );

    await mongoose.connection.db.collection('backupjobs').createIndex(
      { type: 1, status: 1 },
      { name: 'type_status' }
    );

    await mongoose.connection.db.collection('backupjobs').createIndex(
      { startedAt: -1 },
      { name: 'startedAt_desc' }
    );

    await mongoose.connection.db.collection('backupjobs').createIndex(
      { status: 1, createdAt: -1 },
      { name: 'status_createdAt' }
    );

    await mongoose.connection.db.collection('backupjobs').createIndex(
      { "config.triggeredBy": 1 },
      { name: 'triggeredBy' }
    );

    // BackupRetention indexes
    await mongoose.connection.db.collection('backupretentions').createIndex(
      { retentionId: 1 },
      { unique: true, name: 'retentionId_unique' }
    );

    await mongoose.connection.db.collection('backupretentions').createIndex(
      { type: 1 },
      { name: 'type' }
    );

    await mongoose.connection.db.collection('backupretentions').createIndex(
      { enabled: 1, lastCleanup: -1 },
      { name: 'enabled_lastCleanup' }
    );

    // BackupVerification indexes
    await mongoose.connection.db.collection('backupverifications').createIndex(
      { verificationId: 1 },
      { unique: true, name: 'verificationId_unique' }
    );

    await mongoose.connection.db.collection('backupverifications').createIndex(
      { backupId: 1 },
      { name: 'backupId' }
    );

    await mongoose.connection.db.collection('backupverifications').createIndex(
      { status: 1, createdAt: -1 },
      { name: 'status_createdAt' }
    );

    console.log('Backup system database indexes created successfully');

  } catch (error) {
    console.error('Failed to create backup system indexes:', error);
    throw error;
  }
}

module.exports = { createBackupIndexes };

// Run if called directly
if (require.main === module) {
  require('dotenv').config();

  mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/web3platform', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(async () => {
    console.log('Connected to MongoDB');
    await createBackupIndexes();
    console.log('Backup indexes creation completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  });
}