/**
 * Admin Audit Log Model
 * Tracks all admin actions for compliance and auditing
 */

const mongoose = require('mongoose');

const adminAuditLogSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    adminEmail: {
      type: String,
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        'CREATE',
        'UPDATE',
        'DELETE',
        'VIEW',
        'APPROVE',
        'REJECT',
        'SUSPEND',
        'ACTIVATE',
        'CONFIGURE',
        'BACKUP',
      ],
      index: true,
    },
    resourceType: {
      type: String,
      enum: [
        'USER',
        'CONTENT',
        'MODERATION',
        'BACKUP',
        'CONFIGURATION',
        'SYSTEM',
        'RATE_LIMIT',
        'ANALYTICS',
      ],
      required: true,
      index: true,
    },
    resourceId: {
      type: String,
      index: true,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: ['SUCCESS', 'FAILED', 'PENDING'],
      default: 'SUCCESS',
    },
    ipAddress: String,
    userAgent: String,
    errorMessage: String,
    changedFields: [
      {
        fieldName: String,
        oldValue: mongoose.Schema.Types.Mixed,
        newValue: mongoose.Schema.Types.Mixed,
      },
    ],
  },
  {
    timestamps: true,
    collection: 'adminAuditLogs',
  }
);

// Indexes for efficient querying
adminAuditLogSchema.index({ createdAt: -1 });
adminAuditLogSchema.index({ adminId: 1, createdAt: -1 });
adminAuditLogSchema.index({ action: 1, createdAt: -1 });
adminAuditLogSchema.index({ resourceType: 1, resourceId: 1 });

/**
 * Create audit log entry
 */
adminAuditLogSchema.statics.logAction = async function (
  adminId,
  adminEmail,
  action,
  resourceType,
  resourceId,
  details = {},
  ipAddress = null,
  userAgent = null
) {
  try {
    const auditLog = new this({
      adminId,
      adminEmail,
      action,
      resourceType,
      resourceId,
      details,
      ipAddress,
      userAgent,
      status: 'SUCCESS',
    });

    return await auditLog.save();
  } catch (error) {
    console.error('Error creating audit log:', error);
    throw error;
  }
};

/**
 * Log failed action
 */
adminAuditLogSchema.statics.logFailedAction = async function (
  adminId,
  adminEmail,
  action,
  resourceType,
  resourceId,
  errorMessage,
  ipAddress = null,
  userAgent = null
) {
  try {
    const auditLog = new this({
      adminId,
      adminEmail,
      action,
      resourceType,
      resourceId,
      ipAddress,
      userAgent,
      status: 'FAILED',
      errorMessage,
    });

    return await auditLog.save();
  } catch (error) {
    console.error('Error logging failed action:', error);
    throw error;
  }
};

module.exports = mongoose.model('AdminAuditLog', adminAuditLogSchema);
