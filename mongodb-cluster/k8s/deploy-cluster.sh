#!/bin/bash

# MongoDB Kubernetes Deployment Script
# Deploys MongoDB replica set cluster to Kubernetes

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
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

# Function to check if kubectl is available
check_kubectl() {
    if ! command -v kubectl &> /dev/null; then
        print_status "$RED" "❌ kubectl not found. Please install kubectl first."
        exit 1
    fi
}

# Function to check if namespace exists
check_namespace() {
    if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
        print_status "$BLUE" "Creating namespace: $NAMESPACE"
        kubectl create namespace "$NAMESPACE"
    else
        print_status "$GREEN" "✅ Namespace $NAMESPACE already exists"
    fi
}

# Function to generate secrets
generate_secrets() {
    print_status "$BLUE" "Generating MongoDB secrets..."

    # Generate random passwords if not provided
    ROOT_PASSWORD="${MONGODB_ROOT_PASSWORD:-$(openssl rand -base64 32)}"
    APP_PASSWORD="${MONGODB_APP_PASSWORD:-$(openssl rand -base64 24)}"
    KEYFILE="${MONGODB_KEYFILE:-$(openssl rand -base64 756)}"

    # Create secret
    cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Secret
metadata:
  name: mongodb-secret
  namespace: $NAMESPACE
type: Opaque
data:
  mongodb-root-password: $(echo -n "$ROOT_PASSWORD" | base64)
  mongodb-app-password: $(echo -n "$APP_PASSWORD" | base64)
  mongodb-keyfile: $(echo -n "$KEYFILE" | base64)
EOF

    print_status "$GREEN" "✅ Secrets generated and applied"
    print_status "$YELLOW" "⚠️  IMPORTANT: Save these credentials securely!"
    echo "Root Password: $ROOT_PASSWORD"
    echo "App Password: $APP_PASSWORD"
}

# Function to deploy MongoDB cluster
deploy_cluster() {
    print_status "$BLUE" "Deploying MongoDB cluster to Kubernetes..."

    # Apply the cluster configuration
    kubectl apply -f "$SCRIPT_DIR/mongodb-cluster.yaml"

    print_status "$GREEN" "✅ MongoDB cluster deployed"
}

# Function to wait for pods to be ready
wait_for_pods() {
    print_status "$BLUE" "Waiting for MongoDB pods to be ready..."

    # Wait for primary
    kubectl wait --for=condition=ready pod -l app=mongodb,role=primary -n "$NAMESPACE" --timeout=300s

    # Wait for secondaries
    kubectl wait --for=condition=ready pod -l app=mongodb,role=secondary -n "$NAMESPACE" --timeout=300s

    # Wait for arbiter
    kubectl wait --for=condition=ready pod -l app=mongodb,role=arbiter -n "$NAMESPACE" --timeout=300s

    print_status "$GREEN" "✅ All MongoDB pods are ready"
}

# Function to initialize replica set
initialize_replica_set() {
    print_status "$BLUE" "Initializing MongoDB replica set..."

    # Get pod names
    PRIMARY_POD=$(kubectl get pods -l app=mongodb,role=primary -n "$NAMESPACE" -o jsonpath='{.items[0].metadata.name}')
    SECONDARY_PODS=$(kubectl get pods -l app=mongodb,role=secondary -n "$NAMESPACE" -o jsonpath='{.items[*].metadata.name}')
    ARBITER_POD=$(kubectl get pods -l app=mongodb,role=arbiter -n "$NAMESPACE" -o jsonpath='{.items[0].metadata.name}')

    # Convert space-separated to array
    IFS=' ' read -ra SECONDARY_ARRAY <<< "$SECONDARY_PODS"

    # Build replica set configuration
    MEMBERS_CONFIG="[
      {_id: 0, host: \"$PRIMARY_POD.mongodb-primary.$NAMESPACE.svc.cluster.local:27017\", priority: 3},
      {_id: 1, host: \"${SECONDARY_ARRAY[0]}.mongodb-secondary.$NAMESPACE.svc.cluster.local:27017\", priority: 2},
      {_id: 2, host: \"${SECONDARY_ARRAY[1]}.mongodb-secondary.$NAMESPACE.svc.cluster.local:27017\", priority: 2},
      {_id: 3, host: \"$ARBITER_POD.mongodb-arbiter.$NAMESPACE.svc.cluster.local:27017\", arbiterOnly: true, priority: 1}
    ]"

    # Initialize replica set
    kubectl exec -n "$NAMESPACE" "$PRIMARY_POD" -- mongosh --eval "
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

    print_status "$GREEN" "✅ Replica set initialized"
}

# Function to create application user
create_app_user() {
    print_status "$BLUE" "Creating application user..."

    PRIMARY_POD=$(kubectl get pods -l app=mongodb,role=primary -n "$NAMESPACE" -o jsonpath='{.items[0].metadata.name}')

    # Wait for replica set to be ready
    sleep 10

    # Create application database and user
    kubectl exec -n "$NAMESPACE" "$PRIMARY_POD" -- mongosh --eval "
      use web3content;

      // Create collections
      db.createCollection('users');
      db.createCollection('content');
      db.createCollection('subscriptions');
      db.createCollection('transactions');
      db.createCollection('analytics');

      // Create indexes
      db.users.createIndex({'email': 1}, {unique: true});
      db.users.createIndex({'walletAddress': 1}, {unique: true});
      db.content.createIndex({'creatorId': 1});
      db.content.createIndex({'createdAt': -1});
      db.subscriptions.createIndex({'userId': 1, 'status': 1});
      db.transactions.createIndex({'userId': 1, 'timestamp': -1});

      print('✅ Database and indexes created');
    "

    print_status "$GREEN" "✅ Application user and database configured"
}

# Function to verify deployment
verify_deployment() {
    print_status "$BLUE" "Verifying MongoDB cluster deployment..."

    # Check pod status
    kubectl get pods -n "$NAMESPACE" -l app=mongodb

    # Check services
    kubectl get services -n "$NAMESPACE" -l app=mongodb

    # Check replica set status
    PRIMARY_POD=$(kubectl get pods -l app=mongodb,role=primary -n "$NAMESPACE" -o jsonpath='{.items[0].metadata.name}')
    kubectl exec -n "$NAMESPACE" "$PRIMARY_POD" -- mongosh --eval "rs.status().ok"

    print_status "$GREEN" "✅ MongoDB cluster verification completed"
}

# Function to show connection information
show_connection_info() {
    print_status "$BLUE" "MongoDB Cluster Connection Information:"
    echo ""
    echo "Namespace: $NAMESPACE"
    echo "Replica Set: rs0"
    echo ""
    echo "Connection String:"
    echo "mongodb://web3app:<password>@mongodb-primary.$NAMESPACE.svc.cluster.local:27017,mongodb-secondary.$NAMESPACE.svc.cluster.local:27017/web3content?replicaSet=rs0&readPreference=secondaryPreferred"
    echo ""
    echo "Services:"
    kubectl get services -n "$NAMESPACE" -l app=mongodb
    echo ""
    echo "Pods:"
    kubectl get pods -n "$NAMESPACE" -l app=mongodb
}

# Function to cleanup deployment
cleanup() {
    print_status "$YELLOW" "⚠️  Cleaning up MongoDB cluster..."

    kubectl delete -f "$SCRIPT_DIR/mongodb-cluster.yaml" --ignore-not-found=true
    kubectl delete secret mongodb-secret -n "$NAMESPACE" --ignore-not-found=true
    kubectl delete configmap mongodb-config -n "$NAMESPACE" --ignore-not-found=true

    print_status "$GREEN" "✅ Cleanup completed"
}

# Main deployment function
main() {
    echo "========================================"
    print_status "$BLUE" "MongoDB Kubernetes Deployment"
    echo "========================================"
    echo "Namespace: $NAMESPACE"
    echo "Timestamp: $(date)"
    echo ""

    case "${1:-deploy}" in
        "deploy")
            check_kubectl
            check_namespace
            generate_secrets
            deploy_cluster
            wait_for_pods
            initialize_replica_set
            create_app_user
            verify_deployment
            show_connection_info
            ;;
        "cleanup")
            cleanup
            ;;
        "status")
            verify_deployment
            ;;
        "info")
            show_connection_info
            ;;
        *)
            echo "Usage: $0 [deploy|cleanup|status|info]"
            echo ""
            echo "Commands:"
            echo "  deploy  - Deploy MongoDB cluster"
            echo "  cleanup - Remove MongoDB cluster"
            echo "  status  - Check cluster status"
            echo "  info    - Show connection information"
            exit 1
            ;;
    esac

    echo ""
    echo "========================================"
    print_status "$GREEN" "Operation completed at $(date)"
    echo "========================================"
}

# Run main function with all arguments
main "$@"