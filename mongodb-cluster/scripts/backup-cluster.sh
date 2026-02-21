#!/bin/bash

# MongoDB Cluster Backup Script
# Creates consistent backups of the MongoDB replica set

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../.env" 2>/dev/null || true

# Default configuration
MONGO_HOST="${MONGO_HOST:-mongodb-primary}"
MONGO_PORT="${MONGO_PORT:-27017}"
MONGO_USER="${MONGO_USER:-admin}"
MONGO_PASS="${MONGO_PASS:-password123}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
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
        print_status "$GREEN" "Created backup directory: $BACKUP_DIR"
    fi
}

# Function to perform logical backup using mongodump
perform_logical_backup() {
    local backup_path="$BACKUP_DIR/$BACKUP_NAME"

    print_status "$BLUE" "Starting logical backup: $BACKUP_NAME"

    # Create backup directory
    mkdir -p "$backup_path"

    # Perform mongodump
    mongodump \
        --host "$MONGO_HOST" \
        --port "$MONGO_PORT" \
        --username "$MONGO_USER" \
        --password "$MONGO_PASS" \
        --authenticationDatabase admin \
        --out "$backup_path" \
        --gzip \
        --oplog \
        --readPreference secondaryPreferred

    if [ $? -eq 0 ]; then
        print_status "$GREEN" "✅ Logical backup completed: $backup_path"

        # Create backup metadata
        cat > "$backup_path/backup_info.json" << EOF
{
    "backup_type": "logical",
    "timestamp": "$TIMESTAMP",
    "hostname": "$(hostname)",
    "mongodb_host": "$MONGO_HOST:$MONGO_PORT",
    "databases": $(mongosh --host "$MONGO_HOST" --port "$MONGO_PORT" --username "$MONGO_USER" --password "$MONGO_PASS" --authenticationDatabase admin --quiet --eval "JSON.stringify(db.adminCommand('listDatabases').databases.map(db => db.name))"),
    "size_mb": $(du -sm "$backup_path" | cut -f1),
    "compressed": true,
    "oplog_included": true
}
EOF

        return 0
    else
        print_status "$RED" "❌ Logical backup failed"
        rm -rf "$backup_path"
        return 1
    fi
}

# Function to perform filesystem snapshot backup (if using volume snapshots)
perform_snapshot_backup() {
    local backup_path="$BACKUP_DIR/${BACKUP_NAME}_snapshot"

    print_status "$BLUE" "Starting snapshot backup: ${BACKUP_NAME}_snapshot"

    # This would typically use volume snapshot capabilities
    # For Docker volumes, you might use external snapshot tools
    print_status "$YELLOW" "⚠️  Snapshot backup requires external volume management"
    print_status "$YELLOW" "   Consider using: docker volume snapshot, AWS EBS snapshots, etc."

    return 1
}

# Function to verify backup integrity
verify_backup() {
    local backup_path="$BACKUP_DIR/$BACKUP_NAME"

    print_status "$BLUE" "Verifying backup integrity: $BACKUP_NAME"

    if [ ! -d "$backup_path" ]; then
        print_status "$RED" "❌ Backup directory not found: $backup_path"
        return 1
    fi

    # Check if backup contains expected files
    local db_count=$(find "$backup_path" -name "*.bson.gz" | wc -l)
    if [ "$db_count" -eq 0 ]; then
        print_status "$RED" "❌ No database files found in backup"
        return 1
    fi

    # Check backup size
    local size_mb=$(du -sm "$backup_path" | cut -f1)
    if [ "$size_mb" -lt 1 ]; then
        print_status "$RED" "❌ Backup size too small: ${size_mb}MB"
        return 1
    fi

    print_status "$GREEN" "✅ Backup verification passed (${size_mb}MB, $db_count files)"
    return 0
}

# Function to clean up old backups
cleanup_old_backups() {
    print_status "$BLUE" "Cleaning up backups older than $RETENTION_DAYS days..."

    local deleted_count=0
    local freed_space=0

    # Find and remove old backups
    find "$BACKUP_DIR" -name "mongodb_backup_*" -type d -mtime +$RETENTION_DAYS | while read -r old_backup; do
        local size_mb=$(du -sm "$old_backup" 2>/dev/null | cut -f1 || echo 0)
        rm -rf "$old_backup"
        ((deleted_count++))
        ((freed_space += size_mb))
        print_status "$YELLOW" "   Removed: $(basename "$old_backup") (${size_mb}MB)"
    done

    if [ "$deleted_count" -gt 0 ]; then
        print_status "$GREEN" "✅ Cleaned up $deleted_count old backups, freed ${freed_space}MB"
    else
        print_status "$GREEN" "✅ No old backups to clean up"
    fi
}

# Function to show backup statistics
show_backup_stats() {
    print_status "$BLUE" "Backup Statistics:"

    echo "Backup Directory: $BACKUP_DIR"
    echo "Retention Period: $RETENTION_DAYS days"
    echo ""

    # Count total backups
    local total_backups=$(find "$BACKUP_DIR" -name "mongodb_backup_*" -type d | wc -l)
    echo "Total Backups: $total_backups"

    # Calculate total size
    local total_size_mb=$(find "$BACKUP_DIR" -name "mongodb_backup_*" -type d -exec du -sm {} \; 2>/dev/null | awk '{sum += $1} END {print sum}' || echo 0)
    echo "Total Size: ${total_size_mb}MB"

    # Show recent backups
    echo ""
    echo "Recent Backups:"
    find "$BACKUP_DIR" -name "mongodb_backup_*" -type d -printf "%T@ %p\n" 2>/dev/null | sort -nr | head -5 | while read -r mtime path; do
        local size_mb=$(du -sm "$path" 2>/dev/null | cut -f1 || echo 0)
        local date=$(date -d "@${mtime%.*}" "+%Y-%m-%d %H:%M:%S")
        printf "  %s - %s (%dMB)\n" "$date" "$(basename "$path")" "$size_mb"
    done
}

# Function to restore from backup
restore_backup() {
    local backup_name="$1"

    if [ -z "$backup_name" ]; then
        print_status "$RED" "❌ Please specify backup name to restore"
        echo "Available backups:"
        find "$BACKUP_DIR" -name "mongodb_backup_*" -type d -printf "%P\n" | sort -r | head -10
        return 1
    fi

    local backup_path="$BACKUP_DIR/$backup_name"

    if [ ! -d "$backup_path" ]; then
        print_status "$RED" "❌ Backup not found: $backup_path"
        return 1
    fi

    print_status "$YELLOW" "⚠️  WARNING: This will restore the database from backup"
    print_status "$YELLOW" "   All current data will be lost!"
    read -p "Are you sure you want to continue? (yes/no): " -r
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        print_status "$BLUE" "Restore cancelled"
        return 0
    fi

    print_status "$BLUE" "Starting restore from: $backup_name"

    # Perform mongorestore
    mongorestore \
        --host "$MONGO_HOST" \
        --port "$MONGO_PORT" \
        --username "$MONGO_USER" \
        --password "$MONGO_PASS" \
        --authenticationDatabase admin \
        --drop \
        --gzip \
        --oplogReplay \
        "$backup_path"

    if [ $? -eq 0 ]; then
        print_status "$GREEN" "✅ Database restore completed successfully"
    else
        print_status "$RED" "❌ Database restore failed"
        return 1
    fi
}

# Main backup function
main() {
    echo "========================================"
    print_status "$BLUE" "MongoDB Cluster Backup Tool"
    echo "========================================"
    echo "Timestamp: $(date)"
    echo ""

    create_backup_dir

    case "${1:-backup}" in
        "backup")
            if perform_logical_backup && verify_backup; then
                print_status "$GREEN" "✅ Backup completed successfully"
                cleanup_old_backups
            else
                print_status "$RED" "❌ Backup failed"
                exit 1
            fi
            ;;
        "snapshot")
            perform_snapshot_backup
            ;;
        "verify")
            verify_backup
            ;;
        "cleanup")
            cleanup_old_backups
            ;;
        "stats")
            show_backup_stats
            ;;
        "restore")
            restore_backup "$2"
            ;;
        "list")
            echo "Available backups:"
            find "$BACKUP_DIR" -name "mongodb_backup_*" -type d -printf "%P\n" | sort -r
            ;;
        *)
            echo "Usage: $0 [backup|snapshot|verify|cleanup|stats|restore <name>|list]"
            exit 1
            ;;
    esac

    echo ""
    echo "========================================"
}

# Run main function with all arguments
main "$@"