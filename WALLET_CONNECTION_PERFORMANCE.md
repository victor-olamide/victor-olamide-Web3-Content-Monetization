# Wallet Connection - Database Optimization and Performance

## Overview

This guide covers database optimization strategies, query performance tuning, indexing strategies, and monitoring for the wallet connection system.

## Index Strategy

### Primary Indexes

```javascript
// WalletConnection indexes
db.wallet_connections.createIndex({ address: 1 }, { unique: true });
db.wallet_connections.createIndex({ address: 1, walletType: 1 }, { unique: true });
db.wallet_connections.createIndex({ isConnected: 1, connectedAt: -1 });
db.wallet_connections.createIndex({ creator: 1, createdAt: -1 });
db.wallet_connections.createIndex({ lastAuthenticatedAt: -1 });
db.wallet_connections.createIndex({ network: 1 });

// WalletSession indexes
db.wallet_sessions.createIndex({ sessionId: 1 }, { unique: true });
db.wallet_sessions.createIndex({ address: 1, status: 1, expiresAt: 1 });
db.wallet_sessions.createIndex({ sessionId: 1, status: 1 });
db.wallet_sessions.createIndex({ expiresAt: 1, status: 1 });
db.wallet_sessions.createIndex({ walletType: 1 });
db.wallet_sessions.createIndex({ network: 1 });
```

### Composite Indexes for Common Queries

```javascript
// Query: Find active sessions for user
db.wallet_sessions.createIndex({
  address: 1,
  status: 1,
  expiresAt: 1
}, { name: "active_sessions_lookup" });

// Query: Find connected wallets by creator
db.wallet_connections.createIndex({
  creator: 1,
  isConnected: 1,
  walletType: 1
}, { name: "creator_wallets" });

// Query: Cleanup expired sessions
db.wallet_sessions.createIndex({
  expiresAt: 1,
  status: 1
}, { name: "cleanup_index" });
```

### TTL Index for Automatic Cleanup

```javascript
// Auto-delete expired sessions after 24 hours
db.wallet_sessions.createIndex(
  { expiresAt: 1 },
  { expireAfterSeconds: 86400 }
);

// Or immediately delete when expired
db.wallet_sessions.createIndex(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);
```

## Query Optimization

### Optimized Service Methods

```javascript
// Efficient session lookup
async function getActiveSession(sessionId) {
  return WalletSession.findOne({
    sessionId,
    status: 'active',
    expiresAt: { $gt: new Date() }
  })
    .select('sessionId address walletType status network')
    .lean()  // Don't need full document
    .exec();
}

// Efficient wallet lookup with projection
async function getWalletConnection(address, walletType) {
  return WalletConnection.findOne({
    address: address.toLowerCase(),
    walletType
  })
    .select('address walletType publicKey isConnected profile connectedAt lastAuthenticatedAt')
    .lean()
    .exec();
}

// Efficient creator wallet list
async function getConnectedWallets(creatorId) {
  return WalletConnection.find({
    creator: creatorId,
    isConnected: true
  })
    .select('address walletType profile connectedAt')
    .sort({ connectedAt: -1 })
    .limit(50)  // Pagination
    .lean()
    .exec();
}

// Efficient session cleanup
async function cleanupExpiredSessions(batchSize = 1000) {
  const result = await WalletSession.updateMany(
    {
      expiresAt: { $lt: new Date() },
      status: { $ne: 'expired' }
    },
    {
      $set: { status: 'expired' }
    },
    { upsert: false }
  );
  
  return result;
}
```

## Performance Monitoring

### Index Usage Analysis

```javascript
// Check index usage
db.wallet_sessions.aggregate([
  { $indexStats: {} }
])

// View index details
db.wallet_connections.getIndexes()

// Analyze query performance
db.wallet_sessions.find({
  address: 'SP123...',
  status: 'active'
}).explain('executionStats')
```

### Query Performance Metrics

```javascript
// Enable profiling
db.setProfilingLevel(1, { slowms: 100 })

// Check slow queries
db.system.profile.find({ millis: { $gt: 100 } })
  .sort({ ts: -1 })
  .limit(10)

// Analyze profile data
db.system.profile.aggregate([
  {
    $match: {
      millis: { $gt: 100 },
      ns: /wallet/
    }
  },
  {
    $group: {
      _id: '$op',
      count: { $sum: 1 },
      avgMs: { $avg: '$millis' }
    }
  },
  {
    $sort: { avgMs: -1 }
  }
])
```

## Connection Pooling

### Mongoose Configuration

```javascript
mongoose.connect(process.env.MONGODB_URI, {
  // Connection pool settings
  maxPoolSize: 20,           // Maximum connections
  minPoolSize: 5,            // Minimum connections
  maxIdleTimeMS: 45000,      // Close idle connections
  
  // Timeout settings
  socketTimeoutMS: 45000,
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 10000,
  
  // Retry policy
  retryWrites: true,
  w: 'majority',
  
  // Performance
  compression: 'snappy'      // Network compression
});
```

## Aggregation Pipeline Optimization

### Efficient Aggregations

```javascript
// Get session statistics
async function getSessionStats() {
  return WalletSession.aggregate([
    {
      $match: {
        createdAt: {
          $gte: new Date(Date.now() - 86400000)  // Last 24 hours
        }
      }
    },
    {
      $group: {
        _id: {
          walletType: '$walletType',
          status: '$status'
        },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]).exec();
}

// Get wallet distribution
async function getWalletDistribution() {
  return WalletConnection.aggregate([
    {
      $match: { isConnected: true }
    },
    {
      $group: {
        _id: '$walletType',
        count: { $sum: 1 },
        totalAddresses: { $sum: 1 }
      }
    },
    {
      $project: {
        walletType: '$_id',
        count: 1,
        percentage: {
          $multiply: [
            { $divide: ['$count', '$totalAddresses'] },
            100
          ]
        }
      }
    }
  ]).exec();
}

// Get user activity metrics
async function getUserActivityMetrics(creatorId) {
  return WalletSession.aggregate([
    {
      $match: {
        creator: mongoose.Types.ObjectId(creatorId),
        createdAt: {
          $gte: new Date(Date.now() - 604800000)  // Last 7 days
        }
      }
    },
    {
      $facet: {
        totalSessions: [
          { $count: 'count' }
        ],
        sessionsByDay: [
          {
            $group: {
              _id: {
                $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
              },
              count: { $sum: 1 }
            }
          },
          { $sort: { _id: 1 } }
        ],
        statusDistribution: [
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 }
            }
          }
        ]
      }
    }
  ]).exec();
}
```

## Caching Strategy

### Redis Integration

```javascript
const redis = require('redis');
const client = redis.createClient(process.env.REDIS_URL);

// Cache wallet connection
async function getWalletConnectionCached(address) {
  const cacheKey = `wallet:${address.toLowerCase()}`;
  
  // Check cache
  const cached = await client.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Query database
  const wallet = await WalletConnection.findOne({ address });
  
  if (wallet) {
    // Cache for 1 hour
    await client.setEx(
      cacheKey,
      3600,
      JSON.stringify(wallet.toJSON())
    );
  }
  
  return wallet;
}

// Cache session lookup
async function getSessionCached(sessionId) {
  const cacheKey = `session:${sessionId}`;
  
  const cached = await client.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  
  const session = await WalletSession.findOne({ sessionId });
  
  if (session) {
    // Cache for 5 minutes
    await client.setEx(
      cacheKey,
      300,
      JSON.stringify(session.toJSON())
    );
  }
  
  return session;
}

// Invalidate cache on updates
async function updateWalletConnectionCached(address, updates) {
  await WalletConnection.updateOne({ address }, updates);
  
  // Clear cache
  await client.del(`wallet:${address.toLowerCase()}`);
}
```

## Data Partitioning

### Time-Based Partitioning

```javascript
// Archive old sessions to separate collection
async function archiveOldSessions() {
  const cutoffDate = new Date(Date.now() - 7776000000);  // 90 days ago
  
  // Move expired sessions to archive
  const sessions = await WalletSession.find({
    expiresAt: { $lt: cutoffDate },
    status: 'expired'
  });
  
  if (sessions.length > 0) {
    await db.collection('wallet_sessions_archive').insertMany(
      sessions.map(s => s.toObject())
    );
    
    await WalletSession.deleteMany({
      expiresAt: { $lt: cutoffDate }
    });
  }
}

// Run daily
setInterval(archiveOldSessions, 86400000);  // 24 hours
```

### Sharding Recommendation

For production scale (millions of sessions):

```javascript
// Shard by address hash
sh.shardCollection("stacks_monetization.wallet_sessions", { address: 1 })

// Or by wallet type
sh.shardCollection("stacks_monetization.wallet_connections", { walletType: 1, address: 1 })
```

## Bulk Operations

### Batch Processing

```javascript
async function bulkCreateSessions(sessions) {
  const bulk = WalletSession.collection.initializeUnorderedBulkOp();
  
  sessions.forEach(session => {
    bulk.insert(session);
  });
  
  return bulk.execute();
}

async function bulkUpdateWallets(updates) {
  const bulk = WalletConnection.collection.initializeUnorderedBulkOp();
  
  updates.forEach(({ address, data }) => {
    bulk.find({ address }).updateOne({ $set: data });
  });
  
  return bulk.execute();
}
```

## Write Optimization

### Batch Writes

```javascript
async function batchInsertSessions(sessions, batchSize = 1000) {
  for (let i = 0; i < sessions.length; i += batchSize) {
    const batch = sessions.slice(i, i + batchSize);
    await WalletSession.insertMany(batch, { ordered: false });
  }
}

// Upsert operations
async function upsertWallets(wallets) {
  const operations = wallets.map(wallet => ({
    updateOne: {
      filter: { address: wallet.address, walletType: wallet.walletType },
      update: { $set: wallet },
      upsert: true
    }
  }));
  
  return WalletConnection.bulkWrite(operations);
}
```

## Read Optimization

### Pagination

```javascript
async function getWalletsWithPagination(creatorId, page = 1, pageSize = 20) {
  const skip = (page - 1) * pageSize;
  
  const [wallets, total] = await Promise.all([
    WalletConnection.find({ creator: creatorId })
      .skip(skip)
      .limit(pageSize)
      .sort({ createdAt: -1 })
      .lean(),
    WalletConnection.countDocuments({ creator: creatorId })
  ]);
  
  return {
    data: wallets,
    pagination: {
      page,
      pageSize,
      total,
      pages: Math.ceil(total / pageSize)
    }
  };
}
```

### Cursor-Based Pagination

```javascript
async function getWalletsWithCursor(creatorId, cursor = null, limit = 20) {
  const query = { creator: creatorId };
  
  if (cursor) {
    query._id = { $gt: mongoose.Types.ObjectId(cursor) };
  }
  
  const wallets = await WalletConnection.find(query)
    .limit(limit + 1)
    .sort({ _id: 1 })
    .lean();
  
  const hasMore = wallets.length > limit;
  const nextCursor = hasMore ? wallets[limit]._id : null;
  
  return {
    data: wallets.slice(0, limit),
    nextCursor,
    hasMore
  };
}
```

## Connection Timeout Handling

```javascript
// Graceful connection timeout handling
const connectionTimeout = 30000;  // 30 seconds

const connectPromise = mongoose.connect(process.env.MONGODB_URI);

Promise.race([
  connectPromise,
  new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Connection timeout')), connectionTimeout)
  )
]).catch(error => {
  console.error('Database connection failed:', error);
  process.exit(1);
});
```

## Monitoring and Metrics

### Database Statistics

```javascript
async function getDatabaseStats() {
  const db = mongoose.connection.db;
  const stats = await db.stats();
  
  return {
    collections: stats.collections,
    dataSize: stats.dataSize,
    indexSize: stats.indexSize,
    avgObjSize: stats.avgObjSize
  };
}

async function getCollectionStats() {
  const walletConnStats = await WalletConnection.collection.stats();
  const sessionStats = await WalletSession.collection.stats();
  
  return {
    walletConnections: {
      count: walletConnStats.count,
      size: walletConnStats.size,
      indexSize: walletConnStats.totalIndexSize
    },
    sessions: {
      count: sessionStats.count,
      size: sessionStats.size,
      indexSize: sessionStats.totalIndexSize
    }
  };
}
```

## Query Plan Analysis

```javascript
// Analyze query execution plan
function analyzeQuery(model, query, projection) {
  const plan = model.collection
    .find(query)
    .project(projection)
    .explain('executionStats');
  
  return {
    executionStages: plan.executionStats.executionStages,
    executionTimeMs: plan.executionStats.executionTimeMillis,
    totalDocsExamined: plan.executionStats.totalDocsExamined,
    totalKeysExamined: plan.executionStats.totalKeysExamined,
    executedStages: plan.executionStats.executionStages.stage
  };
}
```

## Performance Tuning Checklist

- [ ] All recommended indexes created
- [ ] Connection pool configured (maxPoolSize 20, minPoolSize 5)
- [ ] Slow query profiling enabled (slowms < 100)
- [ ] TTL index for session cleanup
- [ ] Redis caching for frequent queries
- [ ] Pagination implemented for large result sets
- [ ] Aggregation pipelines optimized with $match first
- [ ] Unused indexes identified and removed
- [ ] Query plans analyzed for efficiency
- [ ] Database statistics monitored
- [ ] Archival strategy for old data implemented
- [ ] Bulk operations used for batch processing
- [ ] Read preference configured for replicas
- [ ] Write concern set appropriately
- [ ] Network compression enabled

## Performance Benchmarks

Expected performance with proper optimization:

| Operation | Response Time |
|-----------|---------------|
| Create session | <50ms |
| Verify session | <20ms |
| Get wallet | <30ms |
| List wallets (10 items) | <100ms |
| Create wallet connection | <75ms |
| Cleanup expired sessions (1000) | <500ms |

## Troubleshooting

### High Latency Issues

```bash
# Check slow queries
db.system.profile.find({ millis: { $gt: 500 } }).sort({ ts: -1 }).limit(10)

# Analyze query plan
db.wallet_sessions.find({ status: 'active' }).explain('executionStats')

# Check index usage
db.wallet_sessions.aggregate([{ $indexStats: {} }])
```

### Memory Issues

```bash
# Monitor memory usage
db.serverStatus().memory

# Find large documents
db.wallet_connections.find({}).batchSize(1000).forEach(doc => {
  if (Object.bsonsize(doc) > 1000000) {  // > 1MB
    print('Large doc:', doc._id);
  }
});
```

### Connection Pool Issues

```bash
# Monitor connections
db.currentOp()

# Kill slow operations
db.killOp(123)  // Use opid from currentOp()
```
