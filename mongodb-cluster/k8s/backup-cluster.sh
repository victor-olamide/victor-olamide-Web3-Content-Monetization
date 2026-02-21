#!/bin/bash

# MongoDB Kubernetes Backup Script
# Creates backups of MongoDB data in Kubernetes

set -e

NAMESPACE="${MONGODB_NAMESPACE:-database}"
BACKUP_DIR="${MONGODB_BACKUP_DIR:-/tmp/mongodb-backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="mongodb_backup_${TIMESTAMP}"

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

# Function to create backup directory
create_backup_dir() {
    if [ ! -d "$BACKUP_DIR" ]; then
        mkdir -p "$BACKUP_DIR"
        print_status "$GREEN" "✅ Created backup directory: $BACKUP_DIR"
    fi
}

# Function to get primary pod
get_primary_pod() {
    PRIMARY_POD=$(kubectl get pods -l app=mongodb,role=primary -n "$NAMESPACE" -o jsonpath='{.items[0].metadata.name}')

    if [ -z "$PRIMARY_POD" ]; then
        print_status "$RED" "❌ No primary pod found"
        exit 1
    fi

    print_status "$GREEN" "✅ Primary pod: $PRIMARY_POD"
}

# Function to create database backup
create_database_backup() {
    print_status "$BLUE" "Creating database backup..."

    local backup_path="$BACKUP_DIR/$BACKUP_NAME"

    # Create backup using mongodump
    kubectl exec -n "$NAMESPACE" "$PRIMARY_POD" -- mongodump \
        --db web3content \
        --out "/tmp/$BACKUP_NAME" \
        --username web3app \
        --password web3app_password \
        --authenticationDatabase admin

    # Copy backup from pod to local machine
    kubectl cp "$NAMESPACE/$PRIMARY_POD:/tmp/$BACKUP_NAME" "$backup_path"

    # Clean up backup from pod
    kubectl exec -n "$NAMESPACE" "$PRIMARY_POD" -- rm -rf "/tmp/$BACKUP_NAME"

    print_status "$GREEN" "✅ Database backup created: $backup_path"

    # Compress backup
    print_status "$BLUE" "Compressing backup..."
    tar -czf "${backup_path}.tar.gz" -C "$BACKUP_DIR" "$BACKUP_NAME"
    rm -rf "$backup_path"

    print_status "$GREEN" "✅ Backup compressed: ${backup_path}.tar.gz"
}

# Function to create replica set configuration backup
create_config_backup() {
    print_status "$BLUE" "Creating replica set configuration backup..."

    local config_file="$BACKUP_DIR/${BACKUP_NAME}_config.json"

    # Get replica set configuration
    kubectl exec -n "$NAMESPACE" "$PRIMARY_POD" -- mongosh --eval "
      const config = rs.config();
      print(JSON.stringify(config, null, 2));
    " > "$config_file"

    print_status "$GREEN" "✅ Replica set configuration backed up: $config_file"
}

# Function to create users backup
create_users_backup() {
    print_status "$BLUE" "Creating users backup..."

    local users_file="$BACKUP_DIR/${BACKUP_NAME}_users.json"

    # Get users from admin database
    kubectl exec -n "$NAMESPACE" "$PRIMARY_POD" -- mongosh admin --eval "
      const users = db.getUsers();
      print(JSON.stringify(users, null, 2));
    " > "$users_file"

    print_status "$GREEN" "✅ Users backed up: $users_file"
}

# Function to create full cluster backup (using volume snapshots if available)
create_volume_snapshot() {
    print_status "$BLUE" "Creating volume snapshot backup..."

    # Check if volume snapshot is supported
    if kubectl api-resources | grep -q volumesnapshot; then
        print_status "$GREEN" "✅ Volume snapshot API available"

        # Create volume snapshot class if it doesn't exist
        if ! kubectl get volumesnapshotclass &> /dev/null; then
            print_status "$YELLOW" "⚠️  No VolumeSnapshotClass found. Creating default..."

            cat <<EOF | kubectl apply -f -
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: mongodb-snapshot-class
driver: hostpath.csi.k8s.io
deletionPolicy: Delete
EOF
        fi

        # Get PVC names
        local pvcs=$(kubectl get pvc -n "$NAMESPACE" -l app=mongodb -o jsonpath='{.items[*].metadata.name}')

        for pvc in $pvcs; do
            local snapshot_name="${pvc}-snapshot-${TIMESTAMP}"

            cat <<EOF | kubectl apply -f -
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: $snapshot_name
  namespace: $NAMESPACE
spec:
  volumeSnapshotClassName: mongodb-snapshot-class
  source:
    persistentVolumeClaimName: $pvc
EOF

            print_status "$GREEN" "✅ Volume snapshot created: $snapshot_name"
        done
    else
        print_status "$YELLOW" "⚠️  Volume snapshot API not available. Skipping volume snapshots."
    fi
}

# Function to list existing backups
list_backups() {
    print_status "$BLUE" "Listing existing backups..."

    if [ ! -d "$BACKUP_DIR" ]; then
        print_status "$YELLOW" "⚠️  Backup directory does not exist: $BACKUP_DIR"
        return
    fi

    echo ""
    echo "Backup Directory: $BACKUP_DIR"
    echo "=================="

    local backup_files=$(find "$BACKUP_DIR" -name "*.tar.gz" -o -name "*_config.json" -o -name "*_users.json" | sort -r)

    if [ -z "$backup_files" ]; then
        echo "No backups found."
        return
    fi

    echo "Database Backups:"
    echo "-----------------"
    find "$BACKUP_DIR" -name "*.tar.gz" -printf "%T@ %Tc %p\n" | sort -nr | head -10 | while read -r line; do
        local size=$(echo "$line" | awk '{print $NF}' | xargs ls -lh | awk '{print $5}')
        local name=$(echo "$line" | awk '{print $NF}' | xargs basename)
        echo "  $name ($size)"
    done

    echo ""
    echo "Configuration Backups:"
    echo "----------------------"
    find "$BACKUP_DIR" -name "*_config.json" -printf "%T@ %Tc %p\n" | sort -nr | head -5 | while read -r line; do
        local name=$(echo "$line" | awk '{print $NF}' | xargs basename)
        echo "  $name"
    done

    echo ""
    echo "User Backups:"
    echo "-------------"
    find "$BACKUP_DIR" -name "*_users.json" -printf "%T@ %Tc %p\n" | sort -nr | head -5 | while read -r line; do
        local name=$(echo "$line" | awk '{print $NF}' | xargs basename)
        echo "  $name"
    done

    # List volume snapshots
    if kubectl api-resources | grep -q volumesnapshot; then
        echo ""
        echo "Volume Snapshots:"
        echo "-----------------"
        kubectl get volumesnapshot -n "$NAMESPACE" -o custom-columns=NAME:.metadata.name,READY:.status.readyToUse,CREATED:.metadata.creationTimestamp --sort-by=.metadata.creationTimestamp | tail -10
    fi
}

# Function to restore from backup
restore_backup() {
    local backup_name=$1

    if [ -z "$backup_name" ]; then
        print_status "$RED" "❌ Backup name required for restore"
        echo "Usage: $0 restore <backup_name>"
        exit 1
    fi

    local backup_path="$BACKUP_DIR/${backup_name}.tar.gz"

    if [ ! -f "$backup_path" ]; then
        print_status "$RED" "❌ Backup file not found: $backup_path"
        exit 1
    fi

    print_status "$BLUE" "Restoring from backup: $backup_name"

    # Extract backup
    local extract_dir="$BACKUP_DIR/restore_$TIMESTAMP"
    mkdir -p "$extract_dir"
    tar -xzf "$backup_path" -C "$extract_dir"

    # Copy backup to pod
    kubectl cp "$extract_dir/$backup_name" "$NAMESPACE/$PRIMARY_POD:/tmp/restore"

    # Restore database
    kubectl exec -n "$NAMESPACE" "$PRIMARY_POD" -- mongorestore \
        --db web3content \
        --drop \
        "/tmp/restore" \
        --username web3app \
        --password web3app_password \
        --authenticationDatabase admin

    # Clean up
    kubectl exec -n "$NAMESPACE" "$PRIMARY_POD" -- rm -rf "/tmp/restore"
    rm -rf "$extract_dir"

    print_status "$GREEN" "✅ Database restored from backup: $backup_name"
}

# Function to cleanup old backups
cleanup_old_backups() {
    local days=${1:-30}

    print_status "$BLUE" "Cleaning up backups older than $days days..."

    if [ ! -d "$BACKUP_DIR" ]; then
        print_status "$YELLOW" "⚠️  Backup directory does not exist: $BACKUP_DIR"
        return
    fi

    local deleted_count=0

    # Delete old database backups
    while IFS= read -r file; do
        rm -f "$file"
        ((deleted_count++))
    done < <(find "$BACKUP_DIR" -name "*.tar.gz" -mtime +"$days")

    # Delete old config backups
    while IFS= read -r file; do
        rm -f "$file"
        ((deleted_count++))
    done < <(find "$BACKUP_DIR" -name "*_config.json" -mtime +"$days")

    # Delete old user backups
    while IFS= read -r file; do
        rm -f "$file"
        ((deleted_count++))
    done < <(find "$BACKUP_DIR" -name "*_users.json" -mtime +"$days")

    # Delete old volume snapshots
    if kubectl api-resources | grep -q volumesnapshot; then
        kubectl delete volumesnapshot -n "$NAMESPACE" -l "snapshot-timestamp" --field-selector "metadata.creationTimestamp.lt=$(date -d "$days days ago" +%Y-%m-%dT%H:%M:%SZ)" --ignore-not-found=true
    fi

    print_status "$GREEN" "✅ Cleanup completed. Deleted $deleted_count old backup files."
}

# Function to run full backup
run_full_backup() {
    print_status "$BLUE" "Starting full MongoDB backup..."

    create_backup_dir
    get_primary_pod

    create_database_backup
    create_config_backup
    create_users_backup
    create_volume_snapshot

    print_status "$GREEN" "✅ Full backup completed: $BACKUP_NAME"

    # Show backup summary
    echo ""
    echo "Backup Summary:"
    echo "==============="
    echo "Name: $BACKUP_NAME"
    echo "Location: $BACKUP_DIR"
    echo "Database: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
    echo "Config: ${BACKUP_DIR}/${BACKUP_NAME}_config.json"
    echo "Users: ${BACKUP_DIR}/${BACKUP_NAME}_users.json"
    echo "Volume Snapshots: Created (if supported)"
}

# Main function
main() {
    echo "========================================"
    print_status "$BLUE" "MongoDB Kubernetes Backup Tool"
    echo "========================================"
    echo "Namespace: $NAMESPACE"
    echo "Backup Directory: $BACKUP_DIR"
    echo "Timestamp: $(date)"
    echo ""

    case "${1:-backup}" in
        "backup")
            run_full_backup
            ;;
        "list")
            list_backups
            ;;
        "restore")
            get_primary_pod
            restore_backup "$2"
            ;;
        "cleanup")
            cleanup_old_backups "$2"
            ;;
        "db")
            create_backup_dir
            get_primary_pod
            create_database_backup
            ;;
        "config")
            create_backup_dir
            get_primary_pod
            create_config_backup
            ;;
        "users")
            create_backup_dir
            get_primary_pod
            create_users_backup
            ;;
        "snapshot")
            get_primary_pod
            create_volume_snapshot
            ;;
        *)
            echo "Usage: $0 [backup|list|restore|cleanup|db|config|users|snapshot] [options]"
            echo ""
            echo "Commands:"
            echo "  backup     - Create full backup (database + config + users + snapshots)"
            echo "  list       - List existing backups"
            echo "  restore    - Restore from database backup (requires backup name)"
            echo "  cleanup    - Clean up old backups (default 30 days)"
            echo "  db         - Create database backup only"
            echo "  config     - Create configuration backup only"
            echo "  users      - Create users backup only"
            echo "  snapshot   - Create volume snapshots only"
            echo ""
            echo "Examples:"
            echo "  $0 backup"
            echo "  $0 list"
            echo "  $0 restore mongodb_backup_20231201_120000"
            echo "  $0 cleanup 7"
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