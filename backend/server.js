'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();
const logger = require('./utils/logger');
const { validateEnv } = require('./utils/validateEnv');
const { connectDB, disconnectDB } = require('./config/database');
const { initializeRenewalScheduler, stopRenewalScheduler } = require('./services/renewalScheduler');

// Import routes
const authRoutes = require('./routes/authRoutes');
const contentRoutes = require('./routes/contentRoutes');
const creatorRoutes = require('./routes/creatorRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const purchaseRoutes = require('./routes/purchaseRoutes');
const adminRoutes = require('./routes/adminRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const moderationRoutes = require('./routes/moderationRoutes');
const pinningRoutes = require('./routes/pinningRoutes');
const rateLimitAdjustmentRoutes = require('./routes/rateLimitAdjustmentRoutes');
const recommendationRoutes = require('./routes/recommendationRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const collaboratorRoutes = require('./routes/collaboratorRoutes');
const licensingRoutes = require('./routes/licensingRoutes');
const walletRoutes = require('./routes/walletRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const refundRoutes = require('./routes/refundRoutes');
const royaltyRoutes = require('./routes/royaltyRoutes');
const profileRoutes = require('./routes/profileRoutes');
const accessRoutes = require('./routes/accessRoutes');
const gatingRoutes = require('./routes/gatingRoutes');
const previewRoutes = require('./routes/previewRoutes');
const priceRoutes = require('./routes/priceRoutes');
const filterRoutes = require('./routes/filterRoutes');
const deliveryRoutes = require('./routes/deliveryRoutes');
const encryptionRoutes = require('./routes/encryptionRoutes');
const batchOperationRoutes = require('./routes/batchOperationRoutes');
const cdnRoutes = require('./routes/cdnRoutes');
const backupRoutes = require('./routes/backupRoutes');
const subscriptionTierRoutes = require('./routes/subscriptionTierRoutes');
const tierBenefitsRoutes = require('./routes/tierBenefitsRoutes');
const tierMetricsRoutes = require('./routes/tierMetricsRoutes');
const tierBulkOperationsRoutes = require('./routes/tierBulkOperationsRoutes');
const tierUpgradeRoutes = require('./routes/tierUpgradeRoutes');
const webhookAdminRoutes = require('./routes/webhookAdminRoutes');
const blockchainVerificationRoutes = require('./routes/blockchainVerificationRoutes');

// Import routes — health & metrics
const healthRoutes = require('./routes/healthRoutes');
const metricsRoutes = require('./routes/metricsRoutes');

// Import middleware
const { subscriptionRateLimiter } = require('./middleware/subscriptionRateLimiter');
const { errorHandler } = require('./middleware/errorHandler');
const { httpMetricsMiddleware } = require('./middleware/metricsMiddleware');
const { activeUsersMiddleware } = require('./middleware/activeUsersMiddleware');

// Import services
const {
  initializePinningService,
  pinningManager,
} = require('./services/pinningManager');
const { startCacheEvictionJob } = require('./services/verificationCacheEvictionJob');
const { startIndexer, stopIndexer } = require('./services/ppvTransactionIndexer');
const contentGateIndexer = require('./services/contentGateTransactionIndexer');
const ppvContentRoutes = require('./routes/ppvContentRoutes');
const { createPreviewIndexes } = require('./utils/createPreviewIndexes');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));

// Logging middleware
app.use(morgan('combined'));

// Prometheus HTTP metrics middleware (request count, latency, error rate)
app.use(httpMetricsMiddleware);
// Active-users gauge middleware
app.use(activeUsersMiddleware);

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rate limiting middleware
app.use('/api', subscriptionRateLimiter);

// Health endpoints: /health, /health/live, /health/ready, /health/database
app.use('/health', healthRoutes);

// Metrics endpoints: /metrics (Prometheus), /metrics/summary (JSON)
app.use('/metrics', metricsRoutes);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/creators', creatorRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/moderation', moderationRoutes);
app.use('/api/pinning', pinningRoutes);
app.use('/api/rate-limits', rateLimitAdjustmentRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/collaborators', collaboratorRoutes);
app.use('/api/licensing', licensingRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/refunds', refundRoutes);
app.use('/api/royalties', royaltyRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/access', accessRoutes);
app.use('/api/gating', gatingRoutes);
app.use('/api/preview', previewRoutes);
app.use('/api/price', priceRoutes);
app.use('/api/filter', filterRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/encryption', encryptionRoutes);
app.use('/api/batch', batchOperationRoutes);
app.use('/api/cdn', cdnRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/subscription-tiers', subscriptionTierRoutes);
app.use('/api/tier-benefits', tierBenefitsRoutes);
app.use('/api/tier-metrics', tierMetricsRoutes);
app.use('/api/tier-bulk', tierBulkOperationsRoutes);
app.use('/api/tier-upgrades', tierUpgradeRoutes);
app.use('/api/webhook-admin', webhookAdminRoutes);
app.use('/api/blockchain', blockchainVerificationRoutes);
app.use('/api/ppv', ppvContentRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);
// Initialize optional services — non-fatal if they fail
async function initializeServices() {
  try {
    await initializePinningService();
    logger.info('Pinning service initialized');
  } catch (error) {
    logger.error('Failed to initialize pinning service', { err: error });
  }
  startCacheEvictionJob();

  // Ensure preview CID indexes are present (issue #198)
  try {
    await createPreviewIndexes();
  } catch (error) {
    logger.error('Failed to create preview indexes', { err: error });
  }

  const ppvIndexerIntervalMs = parseInt(process.env.PPV_INDEXER_INTERVAL_MS, 10) || 30000;
  startIndexer(ppvIndexerIntervalMs);

  // Start content-gate transaction indexer
  try {
    const cgIndexerIntervalMs = parseInt(process.env.CG_INDEXER_INTERVAL_MS, 10) || 30000;
    contentGateIndexer.pollInterval = cgIndexerIntervalMs;
    await contentGateIndexer.startIndexer();
    logger.info('Content-gate indexer started', { interval: cgIndexerIntervalMs });
  } catch (error) {
    logger.error('Failed to start content-gate indexer', { err: error });
  }

  const renewalIntervalMs = parseInt(process.env.RENEWAL_SCHEDULER_INTERVAL_MS, 10) || 86400000;
  // Initialize automatic subscription renewal scheduler to run daily
  initializeRenewalScheduler(renewalIntervalMs);
}

// Start server — validates env, connects to MongoDB, then binds HTTP port
async function startServer() {
  try {
    validateEnv();
    await connectDB();
    await initializeServices();

    app.listen(PORT, () => {
      logger.info('Server started', { port: PORT, env: process.env.NODE_ENV || 'development' });
      logger.info('Server started', { port: PORT });
    });
  } catch (error) {
    logger.error('Failed to start server', { err: error });
    process.exit(1);
  }
}

// Graceful shutdown — disconnectDB() already closes mongoose connection
async function gracefulShutdown(signal) {
  logger.info(`${signal} received — shutting down gracefully`);
  await disconnectDB();
  stopRenewalScheduler();
  stopIndexer();
  contentGateIndexer.stopIndexer();
  pinningManager.stopMonitoring();
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));

// Catch unhandled promise rejections — log and exit so the process manager restarts cleanly
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', { err: reason instanceof Error ? reason : new Error(String(reason)) });
  process.exit(1);
});

// Catch uncaught exceptions — log and exit
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { err });
  process.exit(1);
});

if (require.main === module) {
  startServer();
}

module.exports = app;
