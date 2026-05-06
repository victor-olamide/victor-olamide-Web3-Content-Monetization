const mongoose = require('mongoose');

/**
 * BackupJob model - tracks individual backup operations
 */
const backupJobSchema = new mongoose.Schema({
  backupId: { type: String, required: true, unique: true },
  type: { type: String, enum: ['database', 'content', 'full'], required: true },
  status: {
    type: String,
    enum: ['pending', 'running', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  startedAt: { type: Date },
  completedAt: { type: Date },
  duration: { type: Number }, // Duration in milliseconds

  // Backup details
  size: { type: Number }, // Size in bytes
  fileCount: { type: Number }, // Number of files backed up
  compressedSize: { type: Number }, // Compressed size in bytes
  checksum: { type: String }, // MD5 or SHA256 checksum

  // Storage information
  localPath: { type: String }, // Local backup file path
  cloudPath: { type: String }, // Cloud storage path
  storageType: { type: String, enum: ['local', 'cloud'], default: 'local' },

  // Error information
  error: { type: String },
  errorDetails: { type: mongoose.Schema.Types.Mixed },

  // Metadata
  triggeredBy: { type: String, enum: ['scheduler', 'manual', 'api'], default: 'scheduler' },
  config: { type: mongoose.Schema.Types.Mixed }, // Backup configuration snapshot

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes for efficient queries
backupJobSchema.index({ type: 1, status: 1 });
backupJobSchema.index({ startedAt: -1 });
backupJobSchema.index({ status: 1, createdAt: -1 });
backupJobSchema.index({ backupId: 1 }, { unique: true });

/**
 * BackupRetention model - tracks backup retention policies and cleanup
 */
const backupRetentionSchema = new mongoose.Schema({
  retentionId: { type: String, required: true, unique: true },
  type: { type: String, enum: ['database', 'content'], required: true },
  policy: {
    maxAge: { type: Number, required: true }, // Maximum age in days
    maxCount: { type: Number }, // Maximum number of backups to keep
    minCount: { type: Number, default: 1 } // Minimum number of backups to keep
  },

  // Cleanup tracking
  lastCleanup: { type: Date },
  cleanedBackups: [{ type: String }], // Array of backup IDs that were cleaned
  totalCleaned: { type: Number, default: 0 },

  // Status
  enabled: { type: Boolean, default: true },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes
backupRetentionSchema.index({ type: 1 });
backupRetentionSchema.index({ enabled: 1, lastCleanup: -1 });

/**
 * BackupVerification model - tracks backup integrity verification
 */
const backupVerificationSchema = new mongoose.Schema({
  verificationId: { type: String, required: true, unique: true },
  backupId: { type: String, required: true },
  type: { type: String, enum: ['database', 'content'], required: true },

  // Verification details
  status: {
    type: String,
    enum: ['pending', 'running', 'passed', 'failed'],
    default: 'pending'
  },
  startedAt: { type: Date },
  completedAt: { type: Date },

  // Verification results
  checksumMatch: { type: Boolean },
  fileCountMatch: { type: Boolean },
  sizeMatch: { type: Boolean },
  sampleVerification: { type: Boolean }, // For content backups, verify sample files

  // Error information
  error: { type: String },
  errorDetails: { type: mongoose.Schema.Types.Mixed },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes
backupVerificationSchema.index({ backupId: 1 });
backupVerificationSchema.index({ status: 1, createdAt: -1 });
backupVerificationSchema.index({ verificationId: 1 }, { unique: true });

// Pre-save middleware to update timestamps
backupJobSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

backupRetentionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

backupVerificationSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = {
  BackupJob: mongoose.model('BackupJob', backupJobSchema),
  BackupRetention: mongoose.model('BackupRetention', backupRetentionSchema),
  BackupVerification: mongoose.model('BackupVerification', backupVerificationSchema)
};