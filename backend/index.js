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

app.use('/api/content', contentRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/subscriptions', subscriptionRoutes);

// Start Indexer
const indexer = require('./services/indexer');
indexer.start();

app.get('/api/status', (req, res) => {
  res.json({
    server: 'up',
    indexer: indexer.getStatus()
  });
});

app.get('/', (req, res) => {
  res.send('Stacks Content Monetization API');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
