'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');
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

// Import middleware
const { subscriptionRateLimiter } = require('./middleware/subscriptionRateLimiter');
const { errorHandler } = require('./middleware/errorHandler');
const { databaseHealthCheck, databaseStatusCheck } = require('./middleware/databaseHealth');

// Import services
const { initializePinningService } = require('./services/pinningManager');
const { startCacheEvictionJob } = require('./services/verificationCacheEvictionJob');

const app = express();
const PORT = process.env.PORT || 5000;

// Prometheus metrics
const promClient = require('prom-client');
const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5],
});
register.registerMetric(httpRequestDuration);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));

// Logging middleware
app.use(morgan('combined'));

// Metrics middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration
      .labels(req.method, req.route?.path || req.path, res.statusCode.toString())
      .observe(duration);
  });
  next();
});

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rate limiting middleware
app.use('/api', subscriptionRateLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Database health endpoints
app.get('/health/database', databaseHealthCheck);
app.get('/health/database/status', databaseStatusCheck);

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Note: duplicate /health route removed — single definition above is authoritative

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

// Graceful shutdown — delegates DB teardown to database.js
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received — shutting down gracefully');
  await disconnectDB();
  stopRenewalScheduler();
  logger.info('Renewal scheduler stopped');
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received — shutting down gracefully');
  await disconnectDB();
  logger.info('SIGINT received, shutting down gracefully');
  await mongoose.connection.close();
  process.exit(0);
});

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
