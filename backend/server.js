const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

// Import routes
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
const rateLimitRoutes = require('./routes/rateLimitRoutes');
const webhookAdminRoutes = require('./routes/webhookAdminRoutes');

// Import middleware
const { subscriptionRateLimiter } = require('./middleware/subscriptionRateLimiter');
const { errorHandler } = require('./middleware/errorHandler');

// Import services
const { initializePinningService } = require('./services/pinningManager');

const app = express();
const PORT = process.env.PORT || 3000;

// Prometheus metrics
const promClient = require('prom-client');
const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5]
});
register.registerMetric(httpRequestDuration);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
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
    uptime: process.uptime()
  });
});

// API routes
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

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});
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
app.use('/api/rate-limit', rateLimitRoutes);
app.use('/api/webhook-admin', webhookAdminRoutes);

// Error handling middleware (must be last)
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Database connection
async function connectDB() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/web3-content-platform';
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

// Initialize services
async function initializeServices() {
  try {
    await initializePinningService();
    console.log('✅ Pinning service initialized');
  } catch (error) {
    console.error('❌ Failed to initialize pinning service:', error);
  }
}

// Start server
async function startServer() {
  try {
    await connectDB();
    await initializeServices();

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`📚 API Documentation: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  await mongoose.connection.close();
  process.exit(0);
});

// Start the server
if (require.main === module) {
  startServer();
}

module.exports = app;