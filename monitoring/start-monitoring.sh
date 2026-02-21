#!/bin/bash

# Start monitoring stack

cd monitoring

echo "Starting monitoring services..."
docker-compose up -d

echo "Monitoring services started."
echo "Prometheus: http://localhost:9090"
echo "Grafana: http://localhost:3000 (admin/admin)"
echo "Alertmanager: http://localhost:9093"