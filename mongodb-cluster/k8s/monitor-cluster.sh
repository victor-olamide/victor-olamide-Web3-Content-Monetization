#!/bin/bash

# MongoDB Kubernetes Monitoring Script
# Monitors the health and status of MongoDB cluster in Kubernetes

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

# Function to check pod status
check_pod_status() {
    print_status "$BLUE" "Checking MongoDB pod status..."

    local pods=$(kubectl get pods -n "$NAMESPACE" -l app=mongodb -o json)

    echo ""
    echo "Pod Status:"
    echo "==========="
    echo "$pods" | jq -r '.items[] | "\(.metadata.name): \(.status.phase) (\(.status.conditions[]? | select(.type=="Ready") | .status))"'

    # Check for unhealthy pods
    local unhealthy_pods=$(echo "$pods" | jq -r '.items[] | select(.status.phase != "Running" or (.status.conditions[]? | select(.type=="Ready" and .status!="True"))) | .metadata.name')

    if [ -n "$unhealthy_pods" ]; then
        print_status "$RED" "❌ Unhealthy pods detected:"
        echo "$unhealthy_pods"
        return 1
    else
        print_status "$GREEN" "✅ All pods are healthy"
        return 0
    fi
}

# Function to check replica set status
check_replica_set_status() {
    print_status "$BLUE" "Checking MongoDB replica set status..."

    local primary_pod=$(kubectl get pods -l app=mongodb,role=primary -n "$NAMESPACE" -o jsonpath='{.items[0].metadata.name}')

    if [ -z "$primary_pod" ]; then
        print_status "$RED" "❌ No primary pod found"
        return 1
    fi

    local rs_status=$(kubectl exec -n "$NAMESPACE" "$primary_pod" -- mongosh --eval "
      try {
        const status = rs.status();
        if (status.ok === 1) {
          print('OK');
          status.members.forEach(member => {
            const state = member.stateStr;
            const health = member.health;
            const lag = member.optime ? member.optime.t - member.optimeDate.getTime() : 0;
            print(\`\${member._id}:\${member.name}:\${state}:\${health}:\${lag}\`);
          });
        } else {
          print('ERROR');
        }
      } catch (e) {
        print('ERROR');
      }
    " 2>/dev/null)

    echo ""
    echo "Replica Set Status:"
    echo "==================="
    local first_line=true
    local status_ok=false

    while IFS= read -r line; do
        if [ "$first_line" = true ]; then
            if [ "$line" = "OK" ]; then
                status_ok=true
                print_status "$GREEN" "✅ Replica set is healthy"
            else
                print_status "$RED" "❌ Replica set error"
            fi
            first_line=false
        else
            IFS=':' read -ra MEMBER_INFO <<< "$line"
            local member_id=${MEMBER_INFO[0]}
            local member_name=${MEMBER_INFO[1]}
            local member_state=${MEMBER_INFO[2]}
            local member_health=${MEMBER_INFO[3]}
            local member_lag=${MEMBER_INFO[4]}

            case $member_state in
                "PRIMARY")
                    echo "  $member_id: $member_name - $member_state (Health: $member_health)"
                    ;;
                "SECONDARY")
                    echo "  $member_id: $member_name - $member_state (Health: $member_health, Lag: ${member_lag}ms)"
                    ;;
                "ARBITER")
                    echo "  $member_id: $member_name - $member_state (Health: $member_health)"
                    ;;
                *)
                    echo "  $member_id: $member_name - $member_state (Health: $member_health)"
                    ;;
            esac
        fi
    done <<< "$rs_status"

    if [ "$status_ok" = true ]; then
        return 0
    else
        return 1
    fi
}

# Function to check MongoDB connections
check_connections() {
    print_status "$BLUE" "Checking MongoDB connections..."

    local primary_pod=$(kubectl get pods -l app=mongodb,role=primary -n "$NAMESPACE" -o jsonpath='{.items[0].metadata.name}')

    if [ -z "$primary_pod" ]; then
        print_status "$RED" "❌ No primary pod found"
        return 1
    fi

    local conn_info=$(kubectl exec -n "$NAMESPACE" "$primary_pod" -- mongosh --eval "
      const status = db.serverStatus();
      print(\`Current Connections: \${status.connections.current}\`);
      print(\`Available Connections: \${status.connections.available}\`);
      print(\`Total Created: \${status.connections.totalCreated}\`);
    " 2>/dev/null)

    echo ""
    echo "Connection Information:"
    echo "======================="
    echo "$conn_info"

    print_status "$GREEN" "✅ Connection check completed"
}

# Function to check MongoDB performance metrics
check_performance() {
    print_status "$BLUE" "Checking MongoDB performance metrics..."

    local primary_pod=$(kubectl get pods -l app=mongodb,role=primary -n "$NAMESPACE" -o jsonpath='{.items[0].metadata.name}')

    if [ -z "$primary_pod" ]; then
        print_status "$RED" "❌ No primary pod found"
        return 1
    fi

    local perf_info=$(kubectl exec -n "$NAMESPACE" "$primary_pod" -- mongosh --eval "
      const status = db.serverStatus();
      print(\`Uptime: \${Math.floor(status.uptime / 3600)}h \${Math.floor((status.uptime % 3600) / 60)}m\`);
      print(\`Operations (opcounters):\`);
      Object.keys(status.opcounters).forEach(op => {
        print(\`  \${op}: \${status.opcounters[op]}\`);
      });
      print(\`Memory Usage:\`);
      print(\`  Resident: \${Math.round(status.mem.resident / 1024)}GB\`);
      print(\`  Virtual: \${Math.round(status.mem.virtual / 1024)}GB\`);
      print(\`Network:\`);
      print(\`  Bytes In: \${Math.round(status.network.bytesIn / 1024 / 1024)}MB\`);
      print(\`  Bytes Out: \${Math.round(status.network.bytesOut / 1024 / 1024)}MB\`);
    " 2>/dev/null)

    echo ""
    echo "Performance Metrics:"
    echo "===================="
    echo "$perf_info"

    print_status "$GREEN" "✅ Performance check completed"
}

# Function to check database size and collections
check_database_info() {
    print_status "$BLUE" "Checking database information..."

    local primary_pod=$(kubectl get pods -l app=mongodb,role=primary -n "$NAMESPACE" -o jsonpath='{.items[0].metadata.name}')

    if [ -z "$primary_pod" ]; then
        print_status "$RED" "❌ No primary pod found"
        return 1
    fi

    local db_info=$(kubectl exec -n "$NAMESPACE" "$primary_pod" -- mongosh web3content --eval "
      const stats = db.stats();
      print(\`Database: \${stats.db}\`);
      print(\`Collections: \${stats.collections}\`);
      print(\`Documents: \${stats.objects}\`);
      print(\`Data Size: \${Math.round(stats.dataSize / 1024 / 1024)}MB\`);
      print(\`Storage Size: \${Math.round(stats.storageSize / 1024 / 1024)}MB\`);
      print(\`Indexes: \${stats.indexes}\`);
      print(\`Index Size: \${Math.round(stats.indexSize / 1024 / 1024)}MB\`);

      print('');
      print('Collections:');
      db.getCollectionNames().forEach(coll => {
        const collStats = db[coll].stats();
        print(\`  \${coll}: \${collStats.count} documents, \${Math.round(collStats.size / 1024)}KB\`);
      });
    " 2>/dev/null)

    echo ""
    echo "Database Information:"
    echo "====================="
    echo "$db_info"

    print_status "$GREEN" "✅ Database check completed"
}

# Function to check Kubernetes resources
check_kubernetes_resources() {
    print_status "$BLUE" "Checking Kubernetes resource usage..."

    echo ""
    echo "Pod Resource Usage:"
    echo "==================="
    kubectl top pods -n "$NAMESPACE" -l app=mongodb --no-headers=true | while read -r line; do
        echo "  $line"
    done

    echo ""
    echo "Persistent Volume Claims:"
    echo "=========================="
    kubectl get pvc -n "$NAMESPACE" -l app=mongodb -o custom-columns=NAME:.metadata.name,STATUS:.status.phase,CAPACITY:.spec.resources.requests.storage,STORAGECLASS:.spec.storageClassName

    print_status "$GREEN" "✅ Kubernetes resource check completed"
}

# Function to run all checks
run_all_checks() {
    local exit_code=0

    echo "========================================"
    print_status "$BLUE" "MongoDB Cluster Health Check"
    echo "========================================"
    echo "Namespace: $NAMESPACE"
    echo "Timestamp: $(date)"
    echo ""

    if ! check_pod_status; then
        exit_code=1
    fi

    if ! check_replica_set_status; then
        exit_code=1
    fi

    check_connections
    check_performance
    check_database_info
    check_kubernetes_resources

    echo ""
    echo "========================================"
    if [ $exit_code -eq 0 ]; then
        print_status "$GREEN" "✅ All checks passed at $(date)"
    else
        print_status "$RED" "❌ Some checks failed at $(date)"
    fi
    echo "========================================"

    return $exit_code
}

# Function to monitor continuously
monitor_continuous() {
    local interval=${1:-60}

    print_status "$BLUE" "Starting continuous monitoring (interval: ${interval}s)..."
    print_status "$YELLOW" "Press Ctrl+C to stop"

    while true; do
        run_all_checks
        sleep "$interval"
        echo ""
        echo "Waiting ${interval} seconds for next check..."
        echo ""
    done
}

# Main function
main() {
    case "${1:-check}" in
        "check")
            run_all_checks
            ;;
        "monitor")
            monitor_continuous "$2"
            ;;
        "pods")
            check_pod_status
            ;;
        "rs")
            check_replica_set_status
            ;;
        "perf")
            check_performance
            ;;
        "db")
            check_database_info
            ;;
        "k8s")
            check_kubernetes_resources
            ;;
        *)
            echo "Usage: $0 [check|monitor|pods|rs|perf|db|k8s] [interval]"
            echo ""
            echo "Commands:"
            echo "  check     - Run all health checks"
            echo "  monitor   - Continuous monitoring (default 60s interval)"
            echo "  pods      - Check pod status only"
            echo "  rs        - Check replica set status only"
            echo "  perf      - Check performance metrics only"
            echo "  db        - Check database information only"
            echo "  k8s       - Check Kubernetes resources only"
            echo ""
            echo "Examples:"
            echo "  $0 check"
            echo "  $0 monitor 30"
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"