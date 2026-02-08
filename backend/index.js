const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const morgan = require('morgan');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/stacks_monetization')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Could not connect to MongoDB', err));

// Routes
const contentRoutes = require('./routes/contentRoutes');
const purchaseRoutes = require('./routes/purchaseRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const gatingRoutes = require('./routes/gatingRoutes');
const accessRoutes = require('./routes/accessRoutes');
const creatorRoutes = require('./routes/creatorRoutes');
const deliveryRoutes = require('./routes/deliveryRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const refundRoutes = require('./routes/refundRoutes');
const proRataRefundRoutes = require('./routes/proRataRefundRoutes');
const subscriptionTierRoutes = require('./routes/subscriptionTierRoutes');
const collaboratorRoutes = require('./routes/collaboratorRoutes');
const royaltyRoutes = require('./routes/royaltyRoutes');

app.use('/api/content', contentRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/subscriptions', subscriptionTierRoutes);
app.use('/api/gating', gatingRoutes);
app.use('/api/access', accessRoutes);
app.use('/api/creator', creatorRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/refunds', refundRoutes);
app.use('/api/refunds', proRataRefundRoutes);
app.use('/api/collaborators', collaboratorRoutes);
app.use('/api/royalties', royaltyRoutes);

// Start Indexer
const indexer = require('./services/indexer');
const { checkStorageHealth } = require('./services/storageService');
const { initializeScheduler, getHealthStatus } = require('./services/refundScheduler');
const { initializeRenewalScheduler, getRenewalStats } = require('./services/renewalScheduler');
const { initializeRefundScheduler, getRefundSchedulerStats } = require('./services/proRataRefundScheduler');

indexer.start();

// Initialize refund scheduler (runs every hour by default)
const refundScheduleInterval = parseInt(process.env.REFUND_SCHEDULE_INTERVAL) || 3600000;
initializeScheduler(refundScheduleInterval);

// Initialize renewal scheduler (runs every hour by default)
const renewalScheduleInterval = parseInt(process.env.RENEWAL_SCHEDULE_INTERVAL) || 3600000;
initializeRenewalScheduler(renewalScheduleInterval);

// Initialize pro-rata refund scheduler (runs every hour by default)
const proRataRefundScheduleInterval = parseInt(process.env.PRO_RATA_REFUND_SCHEDULE_INTERVAL) || 3600000;
initializeRefundScheduler(proRataRefundScheduleInterval);

app.get('/api/status', async (req, res) => {
  const storageHealthy = await checkStorageHealth();
  const refundHealth = await getHealthStatus();
  const renewalHealth = await getRenewalStats();
  const proRataRefundHealth = getRefundSchedulerStats();
  res.json({
    server: 'up',
    indexer: indexer.getStatus(),
    storage: storageHealthy ? 'connected' : 'disconnected',
    refunds: refundHealth,
    renewals: renewalHealth,
    proRataRefunds: proRataRefundHealth
  });
});

app.get('/', (req, res) => {
  res.send('Stacks Content Monetization API');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
