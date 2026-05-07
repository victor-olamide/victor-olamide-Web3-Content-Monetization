#!/bin/bash

# Deploy script for backend

echo "Pulling latest Docker image"
docker pull ${{ secrets.DOCKER_USERNAME }}/my-backend:latest

echo "Stopping existing container"
docker stop my-backend || true
docker rm my-backend || true

echo "Running new container"
docker run -d --name my-backend -p 3000:3000 ${{ secrets.DOCKER_USERNAME }}/my-backend:latest

echo "Deployment completed"