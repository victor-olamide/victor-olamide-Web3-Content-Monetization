# Wallet Connection - Deployment and Operations Guide

## Pre-Deployment Checklist

### Code Quality
- [x] All models created and indexed
- [x] Service functions comprehensive
- [x] Middleware properly implemented
- [x] Routes fully functional
- [x] Error handling complete
- [x] Security validation in place
- [x] No hardcoded secrets
- [x] Logging configured

### Testing
- [x] Unit tests for service functions
- [x] Integration tests for API endpoints
- [x] Security tests for auth flows
- [x] Error scenario testing
- [x] Load testing for concurrent sessions

### Documentation
- [x] API reference complete
- [x] Integration guides provided
- [x] Security guide documented
- [x] Deployment instructions clear
- [x] Troubleshooting guide ready

## Environment Setup

### Required Environment Variables

```bash
# Database
MONGODB_URI=mongodb://localhost:27017/stacks_monetization

# Server
PORT=5000
NODE_ENV=production

# Security
SESSION_DEFAULT_DURATION_HOURS=24
SESSION_CLEANUP_INTERVAL=3600000

# Network
SUPPORTED_NETWORKS=mainnet,testnet,devnet
DEFAULT_NETWORK=mainnet

# CORS
CORS_ORIGINS=https://example.com,https://app.example.com

# Optional: SMTP for notifications
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=notifications@example.com
SMTP_PASS=password
```

### Optional: Session Configuration

```bash
# Extended session durations (minutes)
SESSION_MIN_DURATION_HOURS=1
SESSION_MAX_DURATION_HOURS=8760  # 1 year

# Nonce expiration
NONCE_EXPIRY_SECONDS=300  # 5 minutes

# Rate limiting
AUTH_RATE_LIMIT_WINDOW_MS=60000
AUTH_RATE_LIMIT_MAX_REQUESTS=20
```

## Database Setup

### Create Indexes

```bash
mongo stacks_monetization
```

```javascript
// WalletConnection indexes
db.wallet_connections.createIndex({ address: 1 }, { unique: true });
db.wallet_connections.createIndex({ address: 1, walletType: 1 }, { unique: true });
db.wallet_connections.createIndex({ isConnected: 1, connectedAt: -1 });
db.wallet_connections.createIndex({ address: 1, lastAuthenticatedAt: -1 });

// WalletSession indexes
db.wallet_sessions.createIndex({ sessionId: 1 }, { unique: true });
db.wallet_sessions.createIndex({ address: 1, status: 1, expiresAt: 1 });
db.wallet_sessions.createIndex({ sessionId: 1, status: 1 });
db.wallet_sessions.createIndex({ expiresAt: 1, status: 1 });

// Optional: TTL index to auto-delete expired sessions
db.wallet_sessions.createIndex(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }  // Delete immediately when expired
);
```

## Deployment Steps

### 1. Pre-Deployment

```bash
# Pull latest code
git pull origin issue/60-wallet-connection

# Install dependencies
npm install

# Run tests
npm test

# Check for security vulnerabilities
npm audit
```

### 2. Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit with production values
nano .env

# Verify configuration
node -e "console.log(process.env.MONGODB_URI)"
```

### 3. Database Migration

```bash
# Backup current database
mongodump --uri="mongodb://localhost:27017/stacks_monetization" \
  --out=backup-$(date +%Y%m%d)

# Create indexes
npm run setup:db:indexes

# Verify indexes
npm run verify:db:indexes
```

### 4. Application Deployment

```bash
# Start application
npm start

# Or with process manager (recommended for production)
pm2 start index.js --name "stacks-api"
pm2 save

# Verify service is running
curl http://localhost:5000/api/status
```

### 5. Post-Deployment Verification

```bash
# Test connection request endpoint
curl -X POST http://localhost:5000/api/wallet/connection-request \
  -H "Content-Type: application/json" \
  -d '{"network":"mainnet"}'

# Expected: Should return nonce and challenge

# Check logs
pm2 logs stacks-api | grep -i wallet
```

## Monitoring Setup

### Application Monitoring

```javascript
// In index.js
const prometheus = require('prom-client');

// Create metrics
const authCounter = new prometheus.Counter({
  name: 'wallet_authentications_total',
  help: 'Total wallet authentications',
  labelNames: ['wallet_type', 'status']
});

const sessionDuration = new prometheus.Histogram({
  name: 'wallet_session_duration_seconds',
  help: 'Wallet session duration',
  buckets: [60, 300, 3600, 86400]
});

// Export metrics
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', prometheus.register.contentType);
  res.end(await prometheus.register.metrics());
});
```

### Health Check Endpoint

```javascript
app.get('/api/wallet/health', async (req, res) => {
  try {
    // Check database
    const connCount = await WalletConnection.countDocuments();
    const sessCount = await WalletSession.countDocuments({ status: 'active' });
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      metrics: {
        totalWalletConnections: connCount,
        activeSessions: sessCount,
        memoryUsageMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});
```

### Logging

```javascript
// Use structured logging
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Log authentication events
logger.info('Wallet connected', {
  address: connection.address,
  walletType: connection.walletType,
  network: connection.network,
  timestamp: new Date()
});
```

## Scheduled Maintenance Tasks

### Session Cleanup (Hourly)

```javascript
// In index.js
setInterval(async () => {
  try {
    const result = await cleanupExpiredSessions();
    logger.info('Session cleanup', {
      removedCount: result.modifiedCount,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Session cleanup failed', { error: error.message });
  }
}, 3600000);  // 1 hour
```

### Database Maintenance (Daily)

```bash
# Run index optimization daily
0 2 * * * mongod --dbpath /data/db --repair
```

### Backup Schedule (Daily)

```bash
# Backup database daily at 3 AM
0 3 * * * mongodump --uri="mongodb://localhost:27017/stacks_monetization" \
  --out=/backups/wallet-$(date +\%Y\%m\%d)
```

## Monitoring Queries

### Active Sessions Count

```javascript
db.wallet_sessions.countDocuments({ status: 'active' })
```

### Wallet Connections by Type

```javascript
db.wallet_connections.aggregate([
  { $match: { isConnected: true } },
  { $group: { _id: '$walletType', count: { $sum: 1 } } }
])
```

### Failed Authentication Attempts

```javascript
db.wallet_sessions.countDocuments({
  status: 'revoked',
  revocationReason: 'Failed signature verification',
  createdAt: { $gte: new Date(Date.now() - 3600000) }  // Last hour
})
```

### Sessions by Network

```javascript
db.wallet_sessions.aggregate([
  { $match: { status: 'active' } },
  { $group: { _id: '$network', count: { $sum: 1 } } }
])
```

## Performance Tuning

### Database Query Optimization

```javascript
// Use indexes effectively
WalletSession
  .find({ address, status: 'active', expiresAt: { $gt: new Date() } })
  .sort({ createdAt: -1 })
  .limit(10)
  .lean()  // Don't need full documents
```

### Connection Pooling

```javascript
// Configure connection pool
mongoose.connect(uri, {
  maxPoolSize: 20,      // Up to 20 connections
  minPoolSize: 5,       // Keep at least 5 idle
  socketTimeoutMS: 45000,
  serverSelectionTimeoutMS: 5000
});
```

### Caching Strategy

```javascript
const redis = require('redis');
const client = redis.createClient();

// Cache wallet connections
async function getWalletConnectionCached(address) {
  const cached = await client.get(`wallet:${address}`);
  if (cached) return JSON.parse(cached);
  
  const connection = await WalletConnection.findOne({ address });
  await client.setEx(`wallet:${address}`, 3600, JSON.stringify(connection));
  
  return connection;
}
```

## Alerting

### Alert Rules

```javascript
// High failed auth rate
if (failedAuthRate > 0.1) {  // >10%
  alertSecurityTeam('High authentication failure rate');
}

// Session proliferation
if (activeSessions > 10000) {
  alertOpsTeam('High number of active sessions');
}

// Database performance
if (queryLatency > 1000) {  // >1 second
  alertOpsTeam('Database performance degradation');
}

// Memory usage
if (heapUsagePercent > 0.8) {  // >80%
  alertOpsTeam('High memory usage');
}
```

## Rollback Procedure

### If Issues Detected

```bash
# 1. Stop application
pm2 stop stacks-api

# 2. Restore from backup
mongorestore --uri="mongodb://localhost:27017/stacks_monetization" \
  backup-20240115/

# 3. Revert code
git revert HEAD

# 4. Restart application
npm start
```

### Data Safety

```bash
# Keep last 7 days of backups
find /backups -name "wallet-*" -mtime +7 -delete

# Verify backup integrity
mongorestore --uri="mongodb://localhost:27017/test" \
  --archive=/backups/wallet-20240115.archive --dryRun
```

## Security Hardening

### Firewall Rules

```bash
# Allow only necessary ports
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 80/tcp    # HTTP (redirect to HTTPS)

# Block direct MongoDB access
sudo ufw deny 27017/tcp

# Enable firewall
sudo ufw enable
```

### SSL/TLS Configuration

```javascript
const https = require('https');
const fs = require('fs');

const options = {
  key: fs.readFileSync('/etc/ssl/private/key.pem'),
  cert: fs.readFileSync('/etc/ssl/certs/cert.pem')
};

https.createServer(options, app).listen(443, () => {
  console.log('HTTPS server running on port 443');
});
```

### DDoS Protection

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  skip: (req) => req.ip === '127.0.0.1'  // Skip localhost
});

app.use(limiter);
```

## Incident Response

### Authentication Failure Spike

```bash
# 1. Check logs
tail -f logs/auth.log | grep ERROR

# 2. Identify pattern
grep "signature verification" error.log | wc -l

# 3. Take action
# - If database issue: check MongoDB status
# - If wallet issue: notify wallet teams
# - If DDoS: activate DDoS protection

# 4. Notify users if needed
node scripts/notify-users.js "Authentication issues detected"
```

### Database Corruption

```bash
# 1. Restore from backup
mongorestore --archive=/backups/latest.archive

# 2. Rebuild indexes
npm run setup:db:indexes

# 3. Verify integrity
npm run verify:db

# 4. Resume service
pm2 restart stacks-api
```

## Disaster Recovery Plan

### RTO (Recovery Time Objective): 4 hours
### RPO (Recovery Point Objective): 1 hour

```
Tier 1: Primary + Backup
- Primary: Live MongoDB instance
- Backup: Hourly snapshots to S3

Tier 2: Standby
- Standby server on different region
- Replicates data every 30 minutes

Tier 3: Archives
- Daily backups to cold storage
- Retained for 90 days
```

## Knowledge Base

### Common Issues

| Issue | Symptom | Solution |
|-------|---------|----------|
| Session token invalid | 401 errors | Verify token exists, not expired |
| High latency | Slow responses | Check DB indexes, enable caching |
| Memory leak | Growing memory usage | Restart process, check for dangling refs |
| CORS errors | Browser blocked requests | Verify origin in CORS config |

### Documentation Links
- API Reference: WALLET_CONNECTION_API.md
- Security Guide: WALLET_CONNECTION_SECURITY.md
- Integration Guide: WALLET_CONNECTION_INTEGRATION.md
- Architecture: WALLET_CONNECTION_OVERVIEW.md

## Post-Deployment Checklist

- [ ] All endpoints responding correctly
- [ ] Database indexes verified
- [ ] Monitoring alerts configured
- [ ] Logging working properly
- [ ] Backup jobs scheduled
- [ ] Security headers in place
- [ ] Rate limiting active
- [ ] Health check endpoint accessible
- [ ] Documentation updated
- [ ] Team trained on operations
