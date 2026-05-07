#!/bin/bash

# MongoDB Cluster Status Script
# Shows comprehensive status of MongoDB cluster deployment

set -e

NAMESPACE="${MONGODB_NAMESPACE:-database}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to print section header
print_header() {
    local title=$1
    echo ""
    echo "=================================================================================="
    print_status "$CYAN" "$title"
    echo "=================================================================================="
}

# Function to check cluster deployment status
check_deployment_status() {
    print_header "🔍 CLUSTER DEPLOYMENT STATUS"

    # Check namespace
    if kubectl get namespace "$NAMESPACE" &> /dev/null; then
        print_status "$GREEN" "✅ Namespace '$NAMESPACE' exists"
    else
        print_status "$RED" "❌ Namespace '$NAMESPACE' does not exist"
        return 1
    fi

    # Check pods
    local total_pods=$(kubectl get pods -n "$NAMESPACE" -l app=mongodb --no-headers 2>/dev/null | wc -l)
    local running_pods=$(kubectl get pods -n "$NAMESPACE" -l app=mongodb --no-headers 2>/dev/null | grep Running | wc -l)

    echo ""
    echo "Pod Status:"
    kubectl get pods -n "$NAMESPACE" -l app=mongodb -o custom-columns=NAME:.metadata.name,STATUS:.status.phase,READY:.status.ready,RESTARTS:.status.containerStatuses[0].restartCount,AGE:.metadata.creationTimestamp --no-headers | while read -r line; do
        local status=$(echo "$line" | awk '{print $2}')
        if [ "$status" = "Running" ]; then
            echo -e "  ${GREEN}✅ $line${NC}"
        else
            echo -e "  ${RED}❌ $line${NC}"
        fi
    done

    if [ "$running_pods" -eq 4 ]; then
        print_status "$GREEN" "✅ All $total_pods MongoDB pods are running"
    else
        print_status "$RED" "❌ Only $running_pods/$total_pods pods are running"
        return 1
    fi

    # Check services
    echo ""
    echo "Services:"
    kubectl get services -n "$NAMESPACE" -l app=mongodb -o custom-columns=NAME:.metadata.name,TYPE:.spec.type,CLUSTER-IP:.spec.clusterIP,EXTERNAL-IP:.status.loadBalancer.ingress[0].ip,PORTS:.spec.ports[0].port --no-headers | while read -r line; do
        echo "  $line"
    done

    # Check persistent volume claims
    echo ""
    echo "Persistent Volume Claims:"
    kubectl get pvc -n "$NAMESPACE" -l app=mongodb -o custom-columns=NAME:.metadata.name,STATUS:.status.phase,CAPACITY:.status.capacity.storage,STORAGECLASS:.spec.storageClassName --no-headers | while read -r line; do
        echo "  $line"
    done

    return 0
}

# Function to check replica set status
check_replica_set_status() {
    print_header "🔄 REPLICA SET STATUS"

    local primary_pod=$(kubectl get pods -l app=mongodb,role=primary -n "$NAMESPACE" -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)

    if [ -z "$primary_pod" ]; then
        print_status "$RED" "❌ No primary pod found"
        return 1
    fi

    local rs_status=$(kubectl exec -n "$NAMESPACE" "$primary_pod" -- mongosh --eval "
      try {
        const status = rs.status();
        if (status.ok === 1) {
          print('OK');
          print(\`Set: \${status.set}\`);
          print(\`Primary: \${status.primary}\`);
          print(\`Members: \${status.members.length}\`);
          status.members.forEach(member => {
            print(\`\${member._id}|\${member.name}|\${member.stateStr}|\${member.health}|\${member.config.priority}\`);
          });
        } else {
          print('ERROR');
          print('Details: ' + JSON.stringify(status));
        }
      } catch (e) {
        print('ERROR');
        print('Exception: ' + e.message);
      }
    " 2>/dev/null)

    local first_line=true
    local rs_ok=false
    local set_name=""
    local primary=""
    local member_count=0

    while IFS= read -r line; do
        if [ "$first_line" = true ]; then
            if [ "$line" = "OK" ]; then
                rs_ok=true
            else
                print_status "$RED" "❌ Replica set error: $line"
                first_line=false
                continue
            fi
            first_line=false
        elif [ "$rs_ok" = true ]; then
            if [[ $line == Set:* ]]; then
                set_name=$(echo "$line" | cut -d' ' -f2)
            elif [[ $line == Primary:* ]]; then
                primary=$(echo "$line" | cut -d' ' -f2)
            elif [[ $line == Members:* ]]; then
                member_count=$(echo "$line" | cut -d' ' -f2)
            else
                # Member information
                IFS='|' read -ra MEMBER <<< "$line"
                local id=${MEMBER[0]}
                local name=${MEMBER[1]}
                local state=${MEMBER[2]}
                local health=${MEMBER[3]}
                local priority=${MEMBER[4]}

                case $state in
                    "PRIMARY")
                        echo -e "  ${GREEN}👑 $id: $name - $state (Health: $health, Priority: $priority)${NC}"
                        ;;
                    "SECONDARY")
                        echo -e "  ${BLUE}🔄 $id: $name - $state (Health: $health, Priority: $priority)${NC}"
                        ;;
                    "ARBITER")
                        echo -e "  ${YELLOW}⚖️  $id: $name - $state (Health: $health, Priority: $priority)${NC}"
                        ;;
                    *)
                        echo -e "  ${RED}❓ $id: $name - $state (Health: $health, Priority: $priority)${NC}"
                        ;;
                esac
            fi
        fi
    done <<< "$rs_status"

    if [ "$rs_ok" = true ]; then
        echo ""
        print_status "$GREEN" "✅ Replica set '$set_name' is healthy"
        echo "  Primary: $primary"
        echo "  Members: $member_count"
        return 0
    else
        return 1
    fi
}

# Function to check database status
check_database_status() {
    print_header "🗄️  DATABASE STATUS"

    local primary_pod=$(kubectl get pods -l app=mongodb,role=primary -n "$NAMESPACE" -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)

    if [ -z "$primary_pod" ]; then
        print_status "$RED" "❌ No primary pod found"
        return 1
    fi

    # Check database statistics
    local db_stats=$(kubectl exec -n "$NAMESPACE" "$primary_pod" -- mongosh web3content --eval "
      const stats = db.stats();
      print(\`Database: \${stats.db}\`);
      print(\`Collections: \${stats.collections}\`);
      print(\`Documents: \${stats.objects}\`);
      print(\`Data Size: \${Math.round(stats.dataSize / 1024 / 1024)} MB\`);
      print(\`Storage Size: \${Math.round(stats.storageSize / 1024 / 1024)} MB\`);
      print(\`Indexes: \${stats.indexes}\`);
      print(\`Index Size: \${Math.round(stats.indexSize / 1024 / 1024)} MB\`);
    " 2>/dev/null)

    echo "$db_stats"

    # Check collections
    echo ""
    echo "Collections:"
    kubectl exec -n "$NAMESPACE" "$primary_pod" -- mongosh web3content --eval "
      db.getCollectionNames().forEach(coll => {
        const count = db[coll].countDocuments();
        const stats = db[coll].stats();
        const size = Math.round(stats.size / 1024);
        print(\`\${coll}: \${count} documents, \${size} KB\`);
      });
    " 2>/dev/null

    # Check users
    echo ""
    echo "Database Users:"
    kubectl exec -n "$NAMESPACE" "$primary_pod" -- mongosh admin --eval "
      const users = db.getUsers();
      users.users.forEach(user => {
        print(\`\${user.user}: \${user.roles.map(r => r.role).join(', ')}\`);
      });
    " 2>/dev/null

    print_status "$GREEN" "✅ Database status check completed"
}

# Function to check performance metrics
check_performance_metrics() {
    print_header "📊 PERFORMANCE METRICS"

    local primary_pod=$(kubectl get pods -l app=mongodb,role=primary -n "$NAMESPACE" -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)

    if [ -z "$primary_pod" ]; then
        print_status "$RED" "❌ No primary pod found"
        return 1
    fi

    local perf_stats=$(kubectl exec -n "$NAMESPACE" "$primary_pod" -- mongosh --eval "
      const status = db.serverStatus();
      print(\`Uptime: \${Math.floor(status.uptime / 3600)}h \${Math.floor((status.uptime % 3600) / 60)}m\`);
      print(\`Connections: \${status.connections.current}/\${status.connections.available}\`);
      print(\`Memory - Resident: \${Math.round(status.mem.resident / 1024)}GB, Virtual: \${Math.round(status.mem.virtual / 1024)}GB\`);
      print(\`Network - In: \${Math.round(status.network.bytesIn / 1024 / 1024)}MB, Out: \${Math.round(status.network.bytesOut / 1024 / 1024)}MB\`);

      print('');
      print('Operations:');
      Object.keys(status.opcounters).forEach(op => {
        print(\`  \${op}: \${status.opcounters[op]}\`);
      });
    " 2>/dev/null)

    echo "$perf_stats"

    # Check Kubernetes resource usage
    echo ""
    echo "Kubernetes Resource Usage:"
    kubectl top pods -n "$NAMESPACE" -l app=mongodb --no-headers 2>/dev/null | while read -r line; do
        echo "  $line"
    done

    print_status "$GREEN" "✅ Performance metrics check completed"
}

# Function to show connection information
show_connection_info() {
    print_header "🔗 CONNECTION INFORMATION"

    echo "Namespace: $NAMESPACE"
    echo "Replica Set: rs0"
    echo ""

    echo "Internal Connection String:"
    echo "mongodb://web3app:web3app_password@mongodb-primary.$NAMESPACE.svc.cluster.local:27017,mongodb-secondary.$NAMESPACE.svc.cluster.local:27017/web3content?replicaSet=rs0&readPreference=secondaryPreferred"
    echo ""

    echo "Services Endpoints:"
    kubectl get services -n "$NAMESPACE" -l app=mongodb -o custom-columns=NAME:.metadata.name,CLUSTER-IP:.spec.clusterIP,PORTS:.spec.ports[0].port --no-headers | while read -r line; do
        echo "  $line"
    done

    echo ""
    echo "Pod Endpoints:"
    kubectl get pods -n "$NAMESPACE" -l app=mongodb -o custom-columns=NAME:.metadata.name,IP:.status.podIP --no-headers | while read -r line; do
        echo "  $line"
    done
}

# Function to show backup information
show_backup_info() {
    print_header "💾 BACKUP INFORMATION"

    local backup_dir="${MONGODB_BACKUP_DIR:-/tmp/mongodb-backups}"

    if [ -d "$backup_dir" ]; then
        local backup_count=$(find "$backup_dir" -name "*.tar.gz" 2>/dev/null | wc -l)
        local latest_backup=$(find "$backup_dir" -name "*.tar.gz" -printf "%T@ %p\n" 2>/dev/null | sort -nr | head -1 | cut -d' ' -f2-)

        echo "Backup Directory: $backup_dir"
        echo "Total Backups: $backup_count"

        if [ -n "$latest_backup" ]; then
            local backup_size=$(ls -lh "$latest_backup" | awk '{print $5}')
            local backup_date=$(stat -c %y "$latest_backup" 2>/dev/null | cut -d'.' -f1)
            echo "Latest Backup: $(basename "$latest_backup") ($backup_size, $backup_date)"
        fi
    else
        echo "Backup Directory: $backup_dir (not found)"
        echo "Total Backups: 0"
    fi

    # Check volume snapshots
    if kubectl api-resources 2>/dev/null | grep -q volumesnapshot; then
        echo ""
        echo "Volume Snapshots:"
        kubectl get volumesnapshot -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l | xargs echo "Total Snapshots:"
        kubectl get volumesnapshot -n "$NAMESPACE" -o custom-columns=NAME:.metadata.name,READY:.status.readyToUse,AGE:.metadata.creationTimestamp --no-headers 2>/dev/null | head -3
    fi
}

# Function to show cluster health score
calculate_health_score() {
    print_header "🏥 CLUSTER HEALTH SCORE"

    local score=0
    local max_score=100
    local checks_passed=0
    local total_checks=0

    # Check deployment status
    ((total_checks++))
    if check_deployment_status &>/dev/null; then
        ((checks_passed++))
        ((score += 25))
    fi

    # Check replica set status
    ((total_checks++))
    if check_replica_set_status &>/dev/null; then
        ((checks_passed++))
        ((score += 25))
    fi

    # Check database status
    ((total_checks++))
    if check_database_status &>/dev/null; then
        ((checks_passed++))
        ((score += 25))
    fi

    # Check performance
    ((total_checks++))
    if check_performance_metrics &>/dev/null; then
        ((checks_passed++))
        ((score += 25))
    fi

    echo "Health Score: $score/$max_score"
    echo "Checks Passed: $checks_passed/$total_checks"

    if [ $score -ge 90 ]; then
        print_status "$GREEN" "🎉 EXCELLENT: Cluster is in excellent health"
    elif [ $score -ge 75 ]; then
        print_status "$GREEN" "✅ GOOD: Cluster is healthy"
    elif [ $score -ge 50 ]; then
        print_status "$YELLOW" "⚠️  WARNING: Cluster has some issues"
    else
        print_status "$RED" "❌ CRITICAL: Cluster requires immediate attention"
    fi
}

# Main function
main() {
    echo "=================================================================================="
    print_status "$PURPLE" "🚀 MONGODB CLUSTER STATUS REPORT"
    echo "=================================================================================="
    echo "Report Generated: $(date)"
    echo "Namespace: $NAMESPACE"
    echo ""

    # Run all checks
    check_deployment_status
    check_replica_set_status
    check_database_status
    check_performance_metrics
    show_connection_info
    show_backup_info
    calculate_health_score

    echo ""
    echo "=================================================================================="
    print_status "$GREEN" "📋 Status report completed at $(date)"
    echo "=================================================================================="
}

# Run main function
main "$@"