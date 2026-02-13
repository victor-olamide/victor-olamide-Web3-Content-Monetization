# Security Configuration Guide

## Overview
This guide ensures all sensitive credentials are properly managed using environment variables and secrets managers, preventing accidental exposure.

## Quick Start

### 1. Local Development Setup

```bash
# Backend
cd backend
cp .env.example .env
# Edit .env with your LOCAL credentials (never use production credentials locally)
nano .env

# Add to .env:
# MONGODB_URI=mongodb://localhost:27017/stacks_monetization
# (other development values)
```

**Important:** Never use production credentials in local development.

### 2. .env File Structure

```bash
# Database
MONGODB_URI=mongodb://[user]:[password]@[host]:[port]/[database]

# API Configuration
PORT=5000
NODE_ENV=development

# Blockchain
STACKS_API_URL=https://stacks-node-api.testnet.stacks.co
STACKS_NETWORK=testnet
CONTRACT_ADDRESS=ST1234567890123456789012345678

# Storage (IPFS/Pinata)
PINATA_API_KEY=pk_xxxxxxxxxx
PINATA_SECRET_API_KEY=sk_xxxxxxxxxx

# Admin Settings
ADMIN_ADDRESS=SP1234567890123456789012345678
ADMIN_PRIVATE_KEY=only_for_dev_never_production

# Security
JWT_SECRET=your_jwt_secret_here
SESSION_SECRET=your_session_secret_here
```

### 3. Verify .gitignore Configuration

```bash
# Confirm .env is ignored
cat .gitignore | grep "^\.env$"

# Should output:
# .env
# .env.local
# .env.*.local
```

## Production Setup

### AWS Secrets Manager

```bash
# Create secret
aws secretsmanager create-secret \
  --name stacks-monetization/mongodb \
  --secret-string '{"MONGODB_URI":"mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>"}'

# Retrieve in application
const AWS = require('aws-sdk');
const client = new AWS.SecretsManager({region: 'us-east-1'});

async function getSecrets() {
  try {
    const data = await client.getSecretValue({
      SecretId: 'stacks-monetization/mongodb'
    }).promise();
    
    const secrets = JSON.parse(data.SecretString);
    process.env.MONGODB_URI = secrets.MONGODB_URI;
  } catch (error) {
    console.error('Failed to retrieve secrets:', error);
    process.exit(1);
  }
}

getSecrets();
```

### Azure Key Vault

```bash
# Create secret
az keyvault secret set \
  --vault-name "stacks-vault" \
  --name "mongodb-uri" \
  --value "mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>"

# Retrieve in application
const { DefaultAzureCredential } = require("@azure/identity");
const { SecretClient } = require("@azure/keyvault-secrets");

const credential = new DefaultAzureCredential();
const client = new SecretClient(
  "https://stacks-vault.vault.azure.net/",
  credential
);

async function getSecrets() {
  try {
    const mongoSecret = await client.getSecret("mongodb-uri");
    process.env.MONGODB_URI = mongoSecret.value;
  } catch (error) {
    console.error('Failed to retrieve secrets:', error);
    process.exit(1);
  }
}

getSecrets();
```

### HashiCorp Vault

```bash
# Write secret
vault kv put secret/stacks-monetization/mongodb \
  MONGODB_URI="mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>"

# Retrieve in application
const vault = require('node-vault')({
  endpoint: 'https://vault.example.com',
  token: process.env.VAULT_TOKEN
});

async function getSecrets() {
  try {
    const secret = await vault.read('secret/stacks-monetization/mongodb');
    process.env.MONGODB_URI = secret.data.data.MONGODB_URI;
  } catch (error) {
    console.error('Failed to retrieve secrets:', error);
    process.exit(1);
  }
}

getSecrets();
```

## Credential Rotation Schedule

### Development
- Local credentials can be changed as needed
- No rotation required for non-production databases

### Staging
- Rotate credentials monthly
- Use separate MongoDB user from production
- Document rotation dates

### Production
- **Database credentials:** Rotate quarterly (90 days)
- **API keys:** Rotate quarterly (90 days)  
- **Private keys:** Rotate annually (365 days)
- **After security incident:** Immediately

## Security Checklist

### Before Deployment
- [ ] No `.env` file in git history
- [ ] All credentials moved to secrets manager
- [ ] `.env.example` uses only placeholders
- [ ] `git secrets` installed and configured
- [ ] CI/CD has secret scanning enabled
- [ ] Code review completed for credential usage

### After Deployment
- [ ] Verify application connects to database
- [ ] Check application logs for credential errors
- [ ] Monitor access logs for unauthorized attempts
- [ ] Confirm no credentials in application logs
- [ ] Test credential rotation process
- [ ] Notify team of new credential locations

### Ongoing
- [ ] Weekly: Review access logs
- [ ] Monthly: Check for hardcoded secrets
- [ ] Quarterly: Rotate all credentials
- [ ] Annually: Security audit of secrets management
- [ ] After incidents: Immediate rotation and review

## Common Mistakes to Avoid

### ❌ WRONG - Hardcoded Credentials
```javascript
// const mongoUri = 'mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>'; // ❌ WRONG
// mongoose.connect(mongoUri);
```

### ✅ CORRECT - Environment Variable
```javascript
const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  throw new Error('MONGODB_URI environment variable not set');
}
mongoose.connect(mongoUri);
```

### ❌ WRONG - Credentials in Git
```bash
git add .env          # NEVER DO THIS
git commit -m "Add credentials"
```

### ✅ CORRECT - Credentials in Secrets Manager
```bash
git add .env.example  # OK - only placeholders
git commit -m "Add environment template"
# Actual secrets go to AWS Secrets Manager, Azure Key Vault, etc.
```

### ❌ WRONG - Logging Credentials
```javascript
console.log('Connecting to:', process.env.MONGODB_URI); // Exposes credentials!
```

### ✅ CORRECT - Safe Logging
```javascript
console.log('Connecting to MongoDB at:', process.env.MONGODB_URI.split('@')[1]); // Shows only host part
```

## Git Secrets Setup

### Installation
```bash
# macOS
brew install git-secrets

# Linux (manual)
git clone https://github.com/awslabs/git-secrets.git
cd git-secrets
sudo make install
```

### Configuration
```bash
# Install hook for current repository
cd /path/to/repository
git secrets --install

# Add patterns to scan for
git secrets --add 'mongodb+srv://.*:.*@'
git secrets --add 'password\s*[:=]'
git secrets --add 'secret\s*[:=]'
git secrets --add 'token\s*[:=]'
git secrets --add 'api[_-]?key\s*[:=]'
git secrets --add 'private[_-]?key\s*[:=]'
git secrets --add '[0-9a-f]{64}'  # 256-bit hex (common for secrets)

# Scan existing repository
git secrets --scan
```

## Monitoring and Alerts

### MongoDB Atlas - Enable Activity Log Alerts
```bash
# In MongoDB Atlas UI:
# 1. Go to Organization Settings > Activity Stream
# 2. Monitor failed authentication attempts
# 3. Set up alerts for:
#    - Multiple failed login attempts
#    - Unexpected database access
#    - User permission changes
```

### Application Logging
```javascript
// Safe credential handling
const connectMongoDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      // Don't log the full URI
      ssl: true,
      authSource: 'admin'
    });
    
    // Log only safe information
    console.log('MongoDB connected successfully');
  } catch (error) {
    // Don't log credentials in error messages
    console.error('MongoDB connection failed:', error.message);
    
    // Alert: Invalid credentials (don't show what they are)
    if (error.message.includes('authentication failed')) {
      console.error('ALERT: Database authentication failed');
      // Trigger alert to security team
    }
  }
};
```

## Emergency Procedures

### If Credentials Are Accidentally Committed

```bash
# 1. STOP: Do not push to remote
# 2. Find the commit
git log --oneline -n 20

# 3. Remove from git history (use BFG or git-filter-branch)
# Install BFG: brew install bfg

# Create file with secrets to remove (use redacted placeholder)
echo "mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>" > /tmp/secrets.txt

# Remove from history
bfg --replace-text /tmp/secrets.txt

# 4. Force push (only if not yet on shared branch)
git reflog expire --expire=now --all
git gc --prune=now
git push --force-with-lease

# 5. IMMEDIATELY rotate credentials in MongoDB Atlas
```

### If Production Credentials Are Exposed

1. **Immediate (within 5 minutes):**
   - [ ] Notify security team immediately
   - [ ] Revoke compromised credentials in MongoDB Atlas
   - [ ] Begin credential rotation process

2. **Short-term (within 30 minutes):**
   - [ ] Create new MongoDB user with strong password
   - [ ] Update application with new credentials
   - [ ] Deploy updated application
   - [ ] Verify all services working correctly

3. **Medium-term (within 24 hours):**
   - [ ] Review MongoDB access logs for unauthorized access
   - [ ] Check application logs for unusual activity
   - [ ] Review database backups
   - [ ] File security incident report

4. **Long-term (within 1 week):**
   - [ ] Conduct security audit
   - [ ] Update security procedures
   - [ ] Team training on credential management
   - [ ] Implement enhanced monitoring

## Additional Resources

- [OWASP: Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [MongoDB Security Checklist](https://docs.mongodb.com/manual/security/security-checklist/)
- [AWS Secrets Manager Best Practices](https://docs.aws.amazon.com/secretsmanager/latest/userguide/best-practices.html)
- [Azure Key Vault Best Practices](https://docs.microsoft.com/en-us/azure/key-vault/general/best-practices/)
- [Git Secrets Documentation](https://github.com/awslabs/git-secrets)

## Contact

For security concerns or questions about credential management:
- **Security Team:** security@example.com
- **On-Call:** [Pagerduty link]
- **Documentation:** See SECURITY_REMEDIATION.md
