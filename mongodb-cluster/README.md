# MongoDB Production Cluster Setup

This document provides comprehensive instructions for setting up and managing a production-ready MongoDB replica set cluster for the Web3 Content Monetization platform.

## Overview

The MongoDB cluster consists of:
- **1 Primary Node**: Handles all write operations
- **2 Secondary Nodes**: Handle read operations and provide redundancy
- **1 Arbiter Node**: Participates in elections without storing data
- **1 Config Server**: Supports sharding (for future scalability)

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Application    │────│  Load Balancer  │────│  MongoDB        │
│  Servers        │    │  (Read/Write)   │    │  Primary        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                        │
                                │                        │
                                ▼                        ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │  MongoDB        │    │  MongoDB        │
                       │  Secondary 1    │    │  Secondary 2    │
                       │  (Read-only)    │    │  (Read-only)    │
                       └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │  MongoDB        │
                       │  Arbiter        │
                       │  (Election)     │
                       └─────────────────┘
```

## Prerequisites

- Docker and Docker Compose
- At least 8GB RAM per MongoDB node
- 50GB+ storage per node
- Network connectivity between all nodes
- SSL certificates (generated automatically)

## Quick Start

### 1. Environment Setup

```bash
# Copy environment template
cp mongodb-cluster/.env.example mongodb-cluster/.env

# Edit with your production values
nano mongodb-cluster/.env
```

### 2. Generate SSL Certificates

```bash
cd mongodb-cluster/ssl
chmod +x generate-certificates.sh
./generate-certificates.sh
```

### 3. Start MongoDB Cluster

```bash
cd mongodb-cluster
docker-compose up -d
```

### 4. Initialize Replica Set

```bash
# Wait for containers to be ready
sleep 30

# Initialize replica set (runs automatically via init-replica-set.js)
docker-compose logs mongodb-primary
```

### 5. Verify Setup

```bash
# Check cluster status
./scripts/monitor-cluster.sh

# Test connection
mongosh "mongodb://web3app:web3app_password_123@mongodb-primary:27017,mongodb-secondary1:27017,mongodb-secondary2:27017/web3content?replicaSet=rs0"
```

## Configuration

### Environment Variables

```bash
# MongoDB Authentication
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=CHANGE_THIS_STRONG_PASSWORD_IN_PRODUCTION
MONGO_DATABASE=web3content

# Replica Set Configuration
MONGO_REPLICA_SET_NAME=rs0
MONGO_REPLICA_SET_KEY=CHANGE_THIS_REPLICA_SET_KEY_IN_PRODUCTION

# Application User
MONGO_APP_USERNAME=web3app
MONGO_APP_PASSWORD=CHANGE_THIS_APP_PASSWORD_IN_PRODUCTION

# Port Configuration
MONGO_PRIMARY_PORT=27017
MONGO_SECONDARY1_PORT=27018
MONGO_SECONDARY2_PORT=27019
MONGO_ARBITER_PORT=27020
MONGO_CONFIG_PORT=27021

# Performance Tuning
MONGO_WIREDTIGER_CACHE_SIZE_GB=2
MONGO_MAX_CONNECTIONS=1000
MONGO_JOURNAL_COMMIT_INTERVAL_MS=100
```

### Application Connection

Update your application environment variables:

```bash
# For replica set connection
MONGODB_URI=mongodb://web3app:web3app_password_123@mongodb-primary:27017,mongodb-secondary1:27017,mongodb-secondary2:27017/web3content?replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=true&retryReads=true

# Alternative: Use the database configuration
# The backend/config/database.js will automatically build the URI
MONGO_HOSTS=mongodb-primary:27017,mongodb-secondary1:27017,mongodb-secondary2:27017
MONGO_APP_USERNAME=web3app
MONGO_APP_PASSWORD=web3app_password_123
MONGO_DATABASE=web3content
MONGO_REPLICA_SET_NAME=rs0
```

## Node Configuration

### Primary Node
- Handles all write operations
- Coordinates replica set operations
- Highest priority in elections
- Configured for optimal write performance

### Secondary Nodes
- Handle read operations (load distribution)
- Maintain copies of all data
- Can become primary during failover
- Configured for read optimization

### Arbiter Node
- Lightweight node for elections
- No data storage
- Ensures odd number of voting members
- Minimal resource requirements

### Config Server
- Stores metadata for sharding
- Required for sharded clusters
- Can be expanded to replica set for HA

## Security

### Authentication
- Root user for administration
- Application user with limited privileges
- Keyfile authentication for cluster communication

### TLS/SSL Encryption
- Auto-generated certificates for development
- Production certificates should be provided
- All cluster communication encrypted

### Network Security
- Bind to specific interfaces only
- Use firewalls to restrict access
- Monitor connection attempts

## Monitoring

### Built-in Monitoring

```bash
# Check cluster status
./scripts/monitor-cluster.sh

# View detailed status
./scripts/monitor-cluster.sh status

# Monitor continuously
watch -n 10 ./scripts/monitor-cluster.sh
```

### Health Check Endpoints

```bash
# Basic health check
curl http://your-app/api/health/database

# Detailed status
curl http://your-app/api/health/database/status
```

### Key Metrics to Monitor

- **Replication Lag**: Time between primary and secondary
- **Connection Count**: Active connections per node
- **Disk Usage**: Storage consumption
- **Memory Usage**: RAM utilization
- **Operation Counts**: Reads/writes per second
- **Election Status**: Primary/secondary state

## Backup and Recovery

### Automated Backups

```bash
# Run backup
./scripts/backup-cluster.sh

# List backups
./scripts/backup-cluster.sh list

# Restore from backup
./scripts/backup-cluster.sh restore mongodb_backup_20241201_120000
```

### Backup Strategy

- **Frequency**: Daily full backups
- **Retention**: 30 days rolling
- **Storage**: Off-site encrypted storage
- **Testing**: Monthly restore testing

### Point-in-Time Recovery

```bash
# Backup with oplog (default)
./scripts/backup-cluster.sh

# Restore to specific point
mongorestore --oplogReplay --oplogLimit "2024-01-01T12:00:00Z" /path/to/backup
```

## Scaling

### Vertical Scaling

```bash
# Increase memory limits
docker-compose up -d --scale mongodb-primary=1 --scale mongodb-secondary1=1 --scale mongodb-secondary2=1

# Update resource limits in docker-compose.yml
services:
  mongodb-primary:
    deploy:
      resources:
        limits:
          memory: 8G
          cpus: '2.0'
```

### Horizontal Scaling (Sharding)

1. **Enable Sharding**:
```javascript
sh.enableSharding("web3content")
```

2. **Add Shard**:
```javascript
sh.addShard("rs0/mongodb-primary:27017,mongodb-secondary1:27017,mongodb-secondary2:27017")
```

3. **Shard Collections**:
```javascript
db.adminCommand({
  shardCollection: "web3content.content",
  key: { "creatorId": 1, "createdAt": 1 }
})
```

## Kubernetes Deployment

For production deployment in Kubernetes, use the provided Kubernetes manifests and scripts in the `k8s/` directory.

### Prerequisites

- Kubernetes cluster (v1.19+)
- kubectl configured
- Storage class for persistent volumes
- At least 8GB RAM per MongoDB pod
- 50GB+ storage per pod

### Quick Kubernetes Start

```bash
# Deploy MongoDB cluster
cd mongodb-cluster/k8s
./deploy-cluster.sh

# Check deployment status
./cluster-status.sh

# Monitor cluster health
./monitor-cluster.sh

# Create backup
./backup-cluster.sh
```

### Kubernetes Architecture

```
┌─────────────────┐    ┌─────────────────┐
│  Application    │────│  Kubernetes     │
│  Services       │    │  Service        │
└─────────────────┘    └─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│  MongoDB        │    │  MongoDB        │
│  Primary        │    │  Secondary 1    │
│  StatefulSet    │    │  StatefulSet    │
└─────────────────┘    └─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│  MongoDB        │    │  MongoDB        │
│  Secondary 2    │    │  Arbiter        │
│  StatefulSet    │    │  Deployment     │
└─────────────────┘    └─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│  Persistent     │    │  ConfigMap &    │
│  Volumes        │    │  Secrets        │
└─────────────────┘    └─────────────────┘
```

### Kubernetes Files

- `mongodb-cluster.yaml`: Complete cluster deployment (StatefulSets, Services, ConfigMaps, Secrets)
- `deploy-cluster.sh`: Automated deployment script
- `init-replica-set.sh`: Replica set initialization
- `monitor-cluster.sh`: Health monitoring and metrics
- `backup-cluster.sh`: Backup and restore operations
- `cluster-status.sh`: Comprehensive status reporting

### Environment Variables for Kubernetes

```bash
# Namespace for deployment
export MONGODB_NAMESPACE=database

# Backup configuration
export MONGODB_BACKUP_DIR=/tmp/mongodb-backups

# Optional: Custom passwords (auto-generated if not set)
export MONGODB_ROOT_PASSWORD=your_strong_root_password
export MONGODB_APP_PASSWORD=your_app_password
export MONGODB_KEYFILE=your_replica_set_key
```

### Kubernetes Deployment Steps

#### 1. Deploy Cluster

```bash
cd mongodb-cluster/k8s
./deploy-cluster.sh
```

This script will:
- Create namespace
- Generate secrets
- Deploy MongoDB pods
- Initialize replica set
- Setup application database

#### 2. Verify Deployment

```bash
# Comprehensive status report
./cluster-status.sh

# Continuous monitoring
./monitor-cluster.sh monitor
```

#### 3. Connect Application

Update your application with the Kubernetes connection string:

```javascript
// backend/config/database.js
const mongoURI = `mongodb://web3app:web3app_password@mongodb-primary.${NAMESPACE}.svc.cluster.local:27017,mongodb-secondary.${NAMESPACE}.svc.cluster.local:27017/web3content?replicaSet=rs0&readPreference=secondaryPreferred`;
```

### Kubernetes Management

#### Scaling

```bash
# Scale secondary nodes
kubectl scale statefulset mongodb-secondary --replicas=3 -n database

# Add more arbiters if needed
kubectl scale deployment mongodb-arbiter --replicas=2 -n database
```

#### Backup and Restore

```bash
# Create full backup
./backup-cluster.sh backup

# List backups
./backup-cluster.sh list

# Restore from backup
./backup-cluster.sh restore mongodb_backup_20231201_120000

# Cleanup old backups
./backup-cluster.sh cleanup 30
```

#### Monitoring

```bash
# Health check
./monitor-cluster.sh check

# Performance metrics
./monitor-cluster.sh perf

# Database information
./monitor-cluster.sh db
```

#### Troubleshooting Kubernetes

```bash
# Check pod logs
kubectl logs -f mongodb-primary-0 -n database

# Describe pod
kubectl describe pod mongodb-primary-0 -n database

# Check events
kubectl get events -n database --sort-by=.metadata.creationTimestamp

# Debug connectivity
kubectl exec -it mongodb-primary-0 -n database -- mongosh

# Check persistent volumes
kubectl get pvc -n database
kubectl describe pvc mongodb-data-mongodb-primary-0 -n database
```

### Kubernetes Resource Requirements

```yaml
# Per MongoDB pod
resources:
  requests:
    memory: "2Gi"
    cpu: "500m"
  limits:
    memory: "4Gi"
    cpu: "1000m"

# Storage per pod
storage: "50Gi"
```

### High Availability

The Kubernetes deployment provides:
- **Pod Anti-Affinity**: Ensures pods run on different nodes
- **Persistent Volumes**: Data persistence across pod restarts
- **Readiness/Liveness Probes**: Automatic pod restart on failures
- **Rolling Updates**: Zero-downtime updates
- **Load Balancing**: Service-based load distribution

## Troubleshooting

### Common Issues

#### Replica Set Not Initializing

```bash
# Check container logs
docker-compose logs mongodb-primary

# Manual initialization
docker exec -it mongodb-primary mongosh
rs.initiate({
  _id: "rs0",
  members: [
    {_id: 0, host: "mongodb-primary:27017"},
    {_id: 1, host: "mongodb-secondary1:27017"},
    {_id: 2, host: "mongodb-secondary2:27017"},
    {_id: 3, host: "mongodb-arbiter:27017", arbiterOnly: true}
  ]
})
```

#### Connection Refused

```bash
# Check if containers are running
docker-compose ps

# Check network connectivity
docker exec -it mongodb-primary ping mongodb-secondary1

# Verify authentication
mongosh --host mongodb-primary --username admin --password password123
```

#### High Replication Lag

```bash
# Check replication status
rs.status()

# Check network latency
ping mongodb-secondary1

# Check system resources
docker stats
```

#### Election Issues

```bash
# Force re-election
rs.stepDown()

# Check arbiter status
rs.status().members.find(m => m.arbiterOnly)
```

### Logs and Diagnostics

```bash
# View all logs
docker-compose logs

# View specific service logs
docker-compose logs mongodb-primary

# Follow logs in real-time
docker-compose logs -f mongodb-primary

# Export logs for analysis
docker-compose logs > mongodb-cluster-logs.txt
```

## Performance Tuning

### Connection Pooling

```javascript
// Application-level connection pooling
const mongoose = require('mongoose');
mongoose.connect(uri, {
  maxPoolSize: 10,
  minPoolSize: 5,
  maxIdleTimeMS: 30000,
});
```

### Read Preferences

```javascript
// Route reads to secondaries
const doc = await Model.find().read('secondaryPreferred');

// Route specific queries
const user = await User.findById(id).read('primary');
```

### Indexing Strategy

```javascript
// Create compound indexes
db.content.createIndex({ "creatorId": 1, "createdAt": -1 });
db.subscriptions.createIndex({ "userId": 1, "status": 1 });

// Analyze slow queries
db.currentOp({
  "active": true,
  "secs_running": { "$gt": 5 }
});
```

## Maintenance

### Regular Tasks

#### Weekly
- Review backup integrity
- Check disk space usage
- Monitor performance metrics
- Update security patches

#### Monthly
- Test backup restoration
- Review access logs
- Optimize slow queries
- Update MongoDB version

#### Quarterly
- Security audit
- Performance benchmarking
- Capacity planning
- Documentation review

### Emergency Procedures

#### Primary Node Failure

1. **Automatic Failover**: Secondary promotes to primary
2. **Monitor**: Check replication lag and application performance
3. **Investigate**: Determine cause of failure
4. **Recovery**: Restart failed node and rejoin replica set

#### Complete Cluster Failure

1. **Assess Damage**: Check data integrity
2. **Restore from Backup**: Use latest backup
3. **Rebuild**: Initialize new replica set
4. **Verify**: Test all functionality

## Production Checklist

- [ ] Environment variables configured
- [ ] SSL certificates generated/installed
- [ ] Network security configured
- [ ] Backup strategy implemented
- [ ] Monitoring alerts set up
- [ ] Application connection tested
- [ ] Failover procedures documented
- [ ] Team trained on operations

## Support

For issues and questions:
1. Check logs: `docker-compose logs`
2. Review documentation
3. Test with development environment
4. Contact DevOps team

---

## Quick Commands Reference

### Docker Compose

```bash
# Start cluster
docker-compose up -d

# Stop cluster
docker-compose down

# Check status
./scripts/monitor-cluster.sh

# Backup
./scripts/backup-cluster.sh

# Connect to primary
mongosh mongodb://admin:password@mongodb-primary:27017/admin

# View replica set status
rs.status()

# Check database size
db.stats()
```

### Kubernetes

```bash
cd mongodb-cluster/k8s

# Deploy cluster
./deploy-cluster.sh

# Check status
./cluster-status.sh

# Monitor continuously
./monitor-cluster.sh monitor

# Create backup
./backup-cluster.sh backup

# List backups
./backup-cluster.sh list

# Connect via kubectl
kubectl exec -it mongodb-primary-0 -n database -- mongosh

# View logs
kubectl logs -f mongodb-primary-0 -n database

# Scale cluster
kubectl scale statefulset mongodb-secondary --replicas=3 -n database
```