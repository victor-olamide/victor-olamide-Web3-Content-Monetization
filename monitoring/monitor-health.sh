#!/bin/bash

# Health check script

BACKEND_URL="http://localhost:3000/health"
FRONTEND_URL="http://localhost:3001"
MONGODB_URL="mongodb://localhost:27017"

echo "Checking backend health..."
if curl -f -s $BACKEND_URL > /dev/null; then
    echo "Backend is healthy"
else
    echo "Backend is down"
    exit 1
fi

echo "Checking frontend..."
if curl -f -s $FRONTEND_URL > /dev/null; then
    echo "Frontend is healthy"
else
    echo "Frontend is down"
    exit 1
fi

echo "Checking MongoDB..."
if mongosh --eval "db.stats()" $MONGODB_URL > /dev/null 2>&1; then
    echo "MongoDB is healthy"
else
    echo "MongoDB is down"
    exit 1
fi

echo "All services are healthy"