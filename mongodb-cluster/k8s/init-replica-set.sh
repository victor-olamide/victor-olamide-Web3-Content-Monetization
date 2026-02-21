#!/bin/bash

# MongoDB Replica Set Initialization Script for Kubernetes
# Initializes the MongoDB replica set after deployment

set -e

NAMESPACE="${MONGODB_NAMESPACE:-database}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to wait for MongoDB to be ready
wait_for_mongodb() {
    local pod=$1
    local max_attempts=30
    local attempt=1

    print_status "$BLUE" "Waiting for MongoDB in pod $pod to be ready..."

    while [ $attempt -le $max_attempts ]; do
        if kubectl exec -n "$NAMESPACE" "$pod" -- mongosh --eval "db.adminCommand('ping')" &> /dev/null; then
            print_status "$GREEN" "✅ MongoDB in pod $pod is ready"
            return 0
        fi

        print_status "$YELLOW" "⏳ Waiting for MongoDB in pod $pod (attempt $attempt/$max_attempts)..."
        sleep 10
        ((attempt++))
    done

    print_status "$RED" "❌ MongoDB in pod $pod failed to become ready"
    return 1
}

# Function to get pod names
get_pod_names() {
    PRIMARY_POD=$(kubectl get pods -l app=mongodb,role=primary -n "$NAMESPACE" -o jsonpath='{.items[0].metadata.name}')
    SECONDARY_PODS=$(kubectl get pods -l app=mongodb,role=secondary -n "$NAMESPACE" -o jsonpath='{.items[*].metadata.name}')
    ARBITER_POD=$(kubectl get pods -l app=mongodb,role=arbiter -n "$NAMESPACE" -o jsonpath='{.items[0].metadata.name}')

    # Convert space-separated to array
    IFS=' ' read -ra SECONDARY_ARRAY <<< "$SECONDARY_PODS"

    if [ -z "$PRIMARY_POD" ] || [ -z "${SECONDARY_ARRAY[0]}" ] || [ -z "${SECONDARY_ARRAY[1]}" ] || [ -z "$ARBITER_POD" ]; then
        print_status "$RED" "❌ Could not find all required MongoDB pods"
        kubectl get pods -n "$NAMESPACE" -l app=mongodb
        exit 1
    fi

    print_status "$GREEN" "✅ Found MongoDB pods:"
    echo "  Primary: $PRIMARY_POD"
    echo "  Secondary 1: ${SECONDARY_ARRAY[0]}"
    echo "  Secondary 2: ${SECONDARY_ARRAY[1]}"
    echo "  Arbiter: $ARBITER_POD"
}

# Function to initialize replica set
initialize_replica_set() {
    print_status "$BLUE" "Initializing MongoDB replica set..."

    # Build replica set configuration
    MEMBERS_CONFIG="[
      {
        _id: 0,
        host: \"$PRIMARY_POD.mongodb-primary.$NAMESPACE.svc.cluster.local:27017\",
        priority: 3
      },
      {
        _id: 1,
        host: \"${SECONDARY_ARRAY[0]}.mongodb-secondary.$NAMESPACE.svc.cluster.local:27017\",
        priority: 2
      },
      {
        _id: 2,
        host: \"${SECONDARY_ARRAY[1]}.mongodb-secondary.$NAMESPACE.svc.cluster.local:27017\",
        priority: 2
      },
      {
        _id: 3,
        host: \"$ARBITER_POD.mongodb-arbiter.$NAMESPACE.svc.cluster.local:27017\",
        arbiterOnly: true,
        priority: 1
      }
    ]"

    # Initialize replica set
    local init_command="
      rs.initiate({
        _id: 'rs0',
        members: $MEMBERS_CONFIG,
        settings: {
          electionTimeoutMillis: 5000,
          heartbeatTimeoutSecs: 10,
          catchUpTimeoutMillis: 60000
        }
      });
    "

    if kubectl exec -n "$NAMESPACE" "$PRIMARY_POD" -- mongosh --eval "$init_command"; then
        print_status "$GREEN" "✅ Replica set initiated successfully"
    else
        print_status "$RED" "❌ Failed to initiate replica set"
        exit 1
    fi
}

# Function to wait for replica set to be ready
wait_for_replica_set() {
    print_status "$BLUE" "Waiting for replica set to be ready..."

    local max_attempts=30
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        local status=$(kubectl exec -n "$NAMESPACE" "$PRIMARY_POD" -- mongosh --eval "
          try {
            const status = rs.status();
            if (status.ok === 1) {
              const primaryCount = status.members.filter(m => m.stateStr === 'PRIMARY').length;
              const secondaryCount = status.members.filter(m => m.stateStr === 'SECONDARY').length;
              const arbiterCount = status.members.filter(m => m.stateStr === 'ARBITER').length;
              print(\`\${primaryCount},\${secondaryCount},\${arbiterCount}\`);
            } else {
              print('0,0,0');
            }
          } catch (e) {
            print('0,0,0');
          }
        " 2>/dev/null)

        IFS=',' read -ra STATUS_ARRAY <<< "$status"
        local primary_count=${STATUS_ARRAY[0]:-0}
        local secondary_count=${STATUS_ARRAY[1]:-0}
        local arbiter_count=${STATUS_ARRAY[2]:-0}

        if [ "$primary_count" -eq 1 ] && [ "$secondary_count" -eq 2 ] && [ "$arbiter_count" -eq 1 ]; then
            print_status "$GREEN" "✅ Replica set is fully operational"
            return 0
        fi

        print_status "$YELLOW" "⏳ Replica set status: ${primary_count}P/${secondary_count}S/${arbiter_count}A (attempt $attempt/$max_attempts)"
        sleep 10
        ((attempt++))
    done

    print_status "$RED" "❌ Replica set failed to become ready"
    kubectl exec -n "$NAMESPACE" "$PRIMARY_POD" -- mongosh --eval "rs.status()"
    exit 1
}

# Function to create application database and user
setup_application_database() {
    print_status "$BLUE" "Setting up application database..."

    local setup_command="
      // Switch to admin database for user creation
      use admin;

      // Create application user with readWrite role
      try {
        db.createUser({
          user: 'web3app',
          pwd: 'web3app_password',
          roles: [
            { role: 'readWrite', db: 'web3content' },
            { role: 'read', db: 'admin' }
          ]
        });
        print('✅ Application user created');
      } catch (e) {
        if (e.code === 11000) {
          print('ℹ️  Application user already exists');
        } else {
          throw e;
        }
      }

      // Switch to application database
      use web3content;

      // Create collections
      const collections = ['users', 'content', 'subscriptions', 'transactions', 'analytics'];
      collections.forEach(coll => {
        try {
          db.createCollection(coll);
          print(\`✅ Collection '\${coll}' created\`);
        } catch (e) {
          if (e.code === 48) {
            print(\`ℹ️  Collection '\${coll}' already exists\`);
          } else {
            throw e;
          }
        }
      });

      // Create indexes
      const indexes = [
        { collection: 'users', key: { email: 1 }, options: { unique: true } },
        { collection: 'users', key: { walletAddress: 1 }, options: { unique: true } },
        { collection: 'content', key: { creatorId: 1 } },
        { collection: 'content', key: { createdAt: -1 } },
        { collection: 'subscriptions', key: { userId: 1, status: 1 } },
        { collection: 'transactions', key: { userId: 1, timestamp: -1 } }
      ];

      indexes.forEach(idx => {
        try {
          db[idx.collection].createIndex(idx.key, idx.options || {});
          print(\`✅ Index created on \${idx.collection}\`);
        } catch (e) {
          if (e.code === 85) {
            print(\`ℹ️  Index already exists on \${idx.collection}\`);
          } else {
            throw e;
          }
        }
      });

      print('✅ Application database setup completed');
    "

    if kubectl exec -n "$NAMESPACE" "$PRIMARY_POD" -- mongosh --eval "$setup_command"; then
        print_status "$GREEN" "✅ Application database setup completed"
    else
        print_status "$RED" "❌ Failed to setup application database"
        exit 1
    fi
}

# Function to verify replica set configuration
verify_replica_set() {
    print_status "$BLUE" "Verifying replica set configuration..."

    local status=$(kubectl exec -n "$NAMESPACE" "$PRIMARY_POD" -- mongosh --eval "
      const status = rs.status();
      print('Replica Set Status:');
      print('==================');
      status.members.forEach(member => {
        print(\`\${member._id}: \${member.name} - \${member.stateStr} (Priority: \${member.config.priority})\`);
      });
      print('');
      print('Configuration:');
      print('==============');
      print(\`ID: \${status.set}\`);
      print(\`Primary: \${status.primary}\`);
      print(\`Members: \${status.members.length}\`);
    ")

    echo "$status"
    print_status "$GREEN" "✅ Replica set verification completed"
}

# Main function
main() {
    echo "========================================"
    print_status "$BLUE" "MongoDB Replica Set Initialization"
    echo "========================================"
    echo "Namespace: $NAMESPACE"
    echo "Timestamp: $(date)"
    echo ""

    # Check if kubectl is available
    if ! command -v kubectl &> /dev/null; then
        print_status "$RED" "❌ kubectl not found. Please install kubectl first."
        exit 1
    fi

    # Get pod names
    get_pod_names

    # Wait for all MongoDB instances to be ready
    wait_for_mongodb "$PRIMARY_POD"
    wait_for_mongodb "${SECONDARY_ARRAY[0]}"
    wait_for_mongodb "${SECONDARY_ARRAY[1]}"
    wait_for_mongodb "$ARBITER_POD"

    # Initialize replica set
    initialize_replica_set

    # Wait for replica set to be ready
    wait_for_replica_set

    # Setup application database
    setup_application_database

    # Verify configuration
    verify_replica_set

    echo ""
    echo "========================================"
    print_status "$GREEN" "Replica set initialization completed at $(date)"
    echo "========================================"
}

# Run main function
main "$@"