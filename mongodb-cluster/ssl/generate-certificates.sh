#!/bin/bash

# MongoDB SSL Certificate Generation Script
# Generates self-signed certificates for MongoDB cluster authentication

set -e

echo "Generating MongoDB SSL certificates..."

# Create certificate directory
CERT_DIR="$(dirname "$0")"
cd "$CERT_DIR"

# Generate CA private key
echo "Generating CA private key..."
openssl genrsa -out ca.key 4096

# Generate CA certificate
echo "Generating CA certificate..."
openssl req -new -x509 -days 3650 -key ca.key -sha256 -out ca.crt -subj "/C=US/ST=State/L=City/O=Web3Content/OU=CA/CN=Web3Content-CA"

# Generate server private key
echo "Generating server private key..."
openssl genrsa -out server.key 4096

# Generate server certificate signing request
echo "Generating server certificate signing request..."
openssl req -subj "/C=US/ST=State/L=City/O=Web3Content/OU=Server/CN=localhost" -new -key server.key -out server.csr

# Create server certificate extensions
cat > server.ext << EOF
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = mongodb-primary
DNS.3 = mongodb-secondary1
DNS.4 = mongodb-secondary2
DNS.5 = mongodb-arbiter
DNS.6 = mongodb-config
IP.1 = 127.0.0.1
EOF

# Generate server certificate
echo "Generating server certificate..."
openssl x509 -req -days 3650 -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out server.crt -sha256 -extfile server.ext

# Combine server certificate and key
echo "Creating server PEM file..."
cat server.crt server.key > server.pem

# Generate client private key
echo "Generating client private key..."
openssl genrsa -out client.key 4096

# Generate client certificate signing request
echo "Generating client certificate signing request..."
openssl req -subj "/C=US/ST=State/L=City/O=Web3Content/OU=Client/CN=web3app" -new -key client.key -out client.csr

# Create client certificate extensions
cat > client.ext << EOF
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
extendedKeyUsage = clientAuth
EOF

# Generate client certificate
echo "Generating client certificate..."
openssl x509 -req -days 3650 -in client.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out client.crt -sha256 -extfile client.ext

# Combine client certificate and key
echo "Creating client PEM file..."
cat client.crt client.key > client.pem

# Generate MongoDB keyfile for cluster authentication
echo "Generating MongoDB keyfile..."
openssl rand -base64 756 > keyfile

# Set proper permissions
echo "Setting certificate permissions..."
chmod 600 *.key *.pem keyfile
chmod 644 *.crt *.csr ca.crt

# Clean up temporary files
echo "Cleaning up temporary files..."
rm -f *.csr *.ext ca.srl

echo "SSL certificate generation completed!"
echo ""
echo "Generated files:"
echo "  ca.crt, ca.key          - Certificate Authority"
echo "  server.crt, server.key  - Server certificates"
echo "  server.pem              - Combined server cert+key"
echo "  client.crt, client.key  - Client certificates"
echo "  client.pem              - Combined client cert+key"
echo "  keyfile                 - MongoDB cluster keyfile"
echo ""
echo "Next steps:"
echo "1. Copy certificates to MongoDB containers"
echo "2. Update MongoDB configuration with SSL paths"
echo "3. Restart MongoDB cluster"