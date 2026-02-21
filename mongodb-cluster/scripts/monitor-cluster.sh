#!/bin/bash

# MongoDB Cluster Monitoring Script
# Monitors replica set health, performance, and provides status information

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../.env" 2>/dev/null || true

# Default values
MONGO_HOST="${MONGO_HOST:-mongodb-primary}"
MONGO_PORT="${MONGO_PORT:-27017}"
MONGO_USER="${MONGO_USER:-admin}"
MONGO_PASS="${MONGO_PASS:-password123}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to check if MongoDB is accessible
check_mongodb_connection() {
    local host=$1
    local port=$2

    if mongosh --host "$host" --port "$port" --eval "db.adminCommand('ping')" &>/dev/null; then
        return 0
    else
        return 1
    fi
}

# Function to get replica set status
get_replica_status() {
    mongosh --host "$MONGO_HOST" --port "$MONGO_PORT" --quiet --eval "
        var status = rs.status();
        print(JSON.stringify(status, null, 2));
    "
}

# Function to get database statistics
get_db_stats() {
    mongosh --host "$MONGO_HOST" --port "$MONGO_PORT" --quiet --eval "
        var stats = db.serverStatus();
        print('MongoDB Server Status:');
        print('Version: ' + stats.version);
        print('Uptime: ' + Math.floor(stats.uptime / 3600) + ' hours');
        print('Connections: ' + stats.connections.current + '/' + stats.connections.available);
        print('Memory Used: ' + Math.floor(stats.mem.resident / 1024) + ' MB');
        print('Operations (opcounters):');
        print('  Insert: ' + stats.opcounters.insert);
        print('  Query: ' + stats.opcounters.query);
        print('  Update: ' + stats.opcounters.update);
        print('  Delete: ' + stats.opcounters.delete);
    "
}

# Function to check replica set health
check_replica_health() {
    print_status "$BLUE" "Checking MongoDB Replica Set Health..."

    local status_output
    status_output=$(get_replica_status 2>/dev/null)

    if [ $? -ne 0 ]; then
        print_status "$RED" "❌ Cannot connect to MongoDB replica set"
        return 1
    fi

    # Parse replica set status
    local primary_count=$(echo "$status_output" | grep -c '"stateStr": "PRIMARY"')
    local secondary_count=$(echo "$status_output" | grep -c '"stateStr": "SECONDARY"')
    local arbiter_count=$(echo "$status_output" | grep -c '"arbiterOnly": true')

    print_status "$GREEN" "✅ Replica Set Status:"
    echo "  Primary nodes: $primary_count"
    echo "  Secondary nodes: $secondary_count"
    echo "  Arbiter nodes: $arbiter_count"

    # Check for issues
    if [ "$primary_count" -ne 1 ]; then
        print_status "$RED" "⚠️  Warning: Expected 1 primary, found $primary_count"
    fi

    if [ "$secondary_count" -lt 1 ]; then
        print_status "$RED" "⚠️  Warning: No secondary nodes available"
    fi

    return 0
}

# Function to show cluster topology
show_topology() {
    print_status "$BLUE" "MongoDB Cluster Topology:"

    local nodes=("mongodb-primary" "mongodb-secondary1" "mongodb-secondary2" "mongodb-arbiter" "mongodb-config")
    local ports=("27017" "27018" "27019" "27020" "27021")

    for i in "${!nodes[@]}"; do
        local node="${nodes[$i]}"
        local port="${ports[$i]}"

        if check_mongodb_connection "$node" "$port"; then
            print_status "$GREEN" "✅ $node:$port - Online"
        else
            print_status "$RED" "❌ $node:$port - Offline"
        fi
    done
}

# Function to show database information
show_database_info() {
    print_status "$BLUE" "Database Information:"

    mongosh --host "$MONGO_HOST" --port "$MONGO_PORT" --quiet --eval "
        print('Databases:');
        db.adminCommand('listDatabases').databases.forEach(function(db) {
            print('  ' + db.name + ': ' + (db.sizeOnDisk / 1024 / 1024).toFixed(2) + ' MB');
        });
    "
}

# Function to show current operations
show_current_ops() {
    print_status "$BLUE" "Current Operations:"

    mongosh --host "$MONGO_HOST" --port "$MONGO_PORT" --quiet --eval "
        var ops = db.currentOp();
        var activeOps = ops.inprog.filter(function(op) {
            return op.active && op.op !== 'none';
        });

        print('Active operations: ' + activeOps.length);
        activeOps.slice(0, 5).forEach(function(op, index) {
            print('  ' + (index + 1) + '. ' + op.op + ' on ' + op.ns + ' (' + (op.secs_running || 0) + 's)');
        });
    "
}

# Main monitoring function
main() {
    echo "========================================"
    print_status "$BLUE" "MongoDB Cluster Monitoring Dashboard"
    echo "========================================"
    echo "Timestamp: $(date)"
    echo ""

    # Check cluster topology
    show_topology
    echo ""

    # Check replica set health
    check_replica_health
    echo ""

    # Show database information
    show_database_info
    echo ""

    # Show current operations
    show_current_ops
    echo ""

    # Show server statistics
    get_db_stats
    echo ""

    echo "========================================"
    print_status "$GREEN" "Monitoring completed at $(date)"
    echo "========================================"
}

# Parse command line arguments
case "${1:-}" in
    "status")
        check_replica_health
        ;;
    "topology")
        show_topology
        ;;
    "databases")
        show_database_info
        ;;
    "operations")
        show_current_ops
        ;;
    "stats")
        get_db_stats
        ;;
    *)
        main
        ;;
esac