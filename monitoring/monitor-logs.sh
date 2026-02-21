#!/bin/bash

# Log monitoring script

LOG_FILE="backend/logs/app.log"

if [ ! -f "$LOG_FILE" ]; then
    echo "Log file does not exist"
    exit 1
fi

# Check for errors in the last hour
ERROR_COUNT=$(tail -n 1000 "$LOG_FILE" | grep -i error | wc -l)

if [ "$ERROR_COUNT" -gt 10 ]; then
    echo "High error count detected: $ERROR_COUNT"
    # Send alert
else
    echo "Error count is normal: $ERROR_COUNT"
fi