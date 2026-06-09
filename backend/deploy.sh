#!/bin/bash
set -e

# Deploy script for backend

DOCKER_REGISTRY="${DOCKER_REGISTRY:-docker.io}"
DOCKER_IMAGE_NAME="${DOCKER_IMAGE_NAME:-my-backend}"
CONTAINER_NAME="${STAGING_CONTAINER_NAME:-my-backend}"
IMAGE="${DOCKER_REGISTRY}/${DOCKER_IMAGE_NAME}:latest"

: "${DOCKER_USERNAME:?DOCKER_USERNAME is required}"
: "${DOCKER_PASSWORD:?DOCKER_PASSWORD is required}"

echo "Logging in to Docker registry ${DOCKER_REGISTRY}"
docker login "${DOCKER_REGISTRY}" -u "${DOCKER_USERNAME}" -p "${DOCKER_PASSWORD}"

echo "Pulling latest Docker image"
docker pull "${IMAGE}"

echo "Stopping existing container"
docker stop "${CONTAINER_NAME}" || true
docker rm "${CONTAINER_NAME}" || true

echo "Running new container"
docker run -d --name "${CONTAINER_NAME}" -p 5000:5000 "${IMAGE}"

echo "Deployment completed"