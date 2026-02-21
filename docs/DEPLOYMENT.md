# Deployment Guide

This document outlines the automated deployment pipeline for the Web3 Content Platform.

## CI/CD Pipeline

The project uses GitHub Actions for continuous integration and deployment.

### Workflows

- **ci-backend.yml**: Runs tests and builds for the backend on pushes to main/develop.
- **ci-frontend.yml**: Runs tests and builds for the frontend on pushes to main/develop.
- **ci-blockchain.yml**: Compiles and tests blockchain contracts.
- **deploy.yml**: Deploys to production on pushes to main.

### Production Deployment

On push to main branch:
1. Contracts are deployed to mainnet using Clarinet.
2. Backend is built into a Docker image, pushed to registry, and deployed.
3. Frontend is deployed to Vercel.

### Secrets Required

- `DEPLOYER_MNEMONIC`: For contract deployment.
- `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`: For frontend deployment.
- `DOCKER_USERNAME`, `DOCKER_PASSWORD`: For Docker registry.

### Manual Deployment

For manual deployments, use the workflow_dispatch on deploy.yml (currently disabled for automation).