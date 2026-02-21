# Deployment Smoke Test Dockerfile

FROM node:18-alpine

# Install dependencies
RUN apk add --no-cache \
    bash \
    curl \
    jq \
    && npm install -g axios chai js-yaml

# Set working directory
WORKDIR /app

# Copy package files
COPY integration-tests/package*.json ./integration-tests/
COPY integration-tests/smoke/ ./integration-tests/smoke/

# Install dependencies
RUN cd integration-tests && npm ci --only=production

# Copy test files
COPY integration-tests/smoke/deployment-smoke-test.js ./integration-tests/smoke/
COPY integration-tests/smoke/deployment-config.yml ./integration-tests/smoke/
COPY integration-tests/smoke/run-deployment-smoke-tests.sh ./integration-tests/smoke/

# Make scripts executable
RUN chmod +x ./integration-tests/smoke/run-deployment-smoke-tests.sh

# Set environment variables
ENV NODE_ENV=production
ENV SMOKE_TIMEOUT=60000
ENV SMOKE_RETRIES=3

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "console.log('Smoke test container is healthy')"

# Default command
CMD ["./integration-tests/smoke/run-deployment-smoke-tests.sh"]