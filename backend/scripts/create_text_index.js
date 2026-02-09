const mongoose = require('mongoose');
require('dotenv').config();
const Content = require('../models/Content');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/stacks_monetization';

(async () => {
  try {
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB');
    await Content.syncIndexes();
    console.log('Indexes synced (text index created if not present)');
    process.exit(0);
  } catch (err) {
    console.error('Index creation failed:', err);
    process.exit(1);
  }
})();
