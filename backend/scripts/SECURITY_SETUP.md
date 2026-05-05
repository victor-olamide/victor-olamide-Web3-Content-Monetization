# Security Setup Instructions

## Quick Start

### 1. Install Pre-commit Hook (Recommended)
```bash
# Copy the pre-commit hook to git hooks directory
cp backend/scripts/pre-commit-hook.sh .git/hooks/pre-commit

# Make it executable
chmod +x .git/hooks/pre-commit

# Test it
git commit --allow-empty -m "Test pre-commit hook"
```

### 2. Install Git-Secrets
```bash
# macOS
brew install git-secrets

# Linux (manual installation)
git clone https://github.com/awslabs/git-secrets.git
cd git-secrets
sudo make install

# Initialize for this repository
cd /path/to/stacks-monetization
git secrets --install

# Add secret patterns
git secrets --add 'mongodb+srv://.*:.*@'
git secrets --add 'password\s*[:=]'
git secrets --add 'api[_-]?key\s*[:=]'
git secrets --add 'token\s*[:=]'
git secrets --add 'secret\s*[:=]'

# Scan existing repository
git secrets --scan
```

### 3. Environment Setup
```bash
# Backend
cd backend
cp .env.example .env
# Edit .env with your local settings (use localhost for dev)
nano .env

# Blockchain
cd ../blockchain  
cp .env.example .env
nano .env

# Frontend
cd ../frontend
cp .env.example .env
nano .env

# Integration Tests
cd ../integration-tests
cp .env.example .env
nano .env
```

## Verification

### Verify Pre-commit Hook
```bash
# Try to commit a file with a fake secret (should be blocked)
echo "MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>" > test.js
git add test.js
git commit -m "test"  # Should fail with security error
rm test.js
```

### Verify Git-Secrets
```bash
# Scan for existing secrets
git secrets --scan

# Should output something like:
# No secrets found
```

### Verify Environment Variables
```bash
# Check that all required env vars are set
node -e "
const required = ['MONGODB_URI', 'PORT', 'STACKS_API_URL'];
const missing = required.filter(k => !process.env[k]);
if (missing.length) {
  console.error('Missing env vars:', missing);
  process.exit(1);
}
console.log('✅ All required environment variables set');
"
```

## File Descriptions

### pre-commit-hook.sh
Automated security checks that run before each commit:
- Scans for MongoDB credentials in code
- Checks for AWS/Azure access keys
- Detects private keys and tokens
- Prevents .env files from being committed
- Allows documentation review with warnings

**Patterns blocked:**
- `mongodb+srv://.*:.*@` (detects any embedded credentials)
- `AKIA...` (AWS Access Keys)
- `api_key`, `secret_key`, `access_token`
- `password=...`, `password: ...`
- `BEGIN PRIVATE KEY`, `BEGIN RSA PRIVATE KEY`
- And 20+ other sensitive patterns

**Installation:**
```bash
cp backend/scripts/pre-commit-hook.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

**Bypass (NOT RECOMMENDED):**
```bash
git commit --no-verify  # Only if absolutely certain
```

## CI/CD Integration

### GitHub Actions
```yaml
# Add to .github/workflows/security.yml
name: Security Checks
on: [pull_request]

jobs:
  secrets:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0
      
      - name: TruffleHog Secret Scan
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: ${{ github.event.repository.default_branch }}
          head: HEAD
```

### GitLab CI
```yaml
# Add to .gitlab-ci.yml
security:scan:
  stage: test
  image: ubuntu:latest
  script:
    - apt-get update && apt-get install -y git-secrets
    - git secrets --install
    - git secrets --scan
```

## Troubleshooting

### "Pre-commit hook permission denied"
```bash
# Fix permissions
chmod +x .git/hooks/pre-commit
```

### "Git-secrets not found"
```bash
# Install git-secrets
brew install git-secrets  # macOS
sudo apt-get install git-secrets  # Ubuntu
```

### "False positive in pattern"
```bash
# Whitelist a specific pattern
git secrets --add --allow 'test_pattern_that_is_safe'

# Whitelist a file
git secrets --add --allow 'path/to/file.js'
```

### "Need to bypass for emergency commit"
```bash
# Use with EXTREME CAUTION
git commit --no-verify -m "Emergency: reason for bypass"

# Then immediately:
# 1. Create ticket for review
# 2. Add proper security fix
# 3. Rotate any exposed credentials
```

## Documentation

For detailed information, see:
- [SECURITY_CONFIGURATION_GUIDE.md](../../SECURITY_CONFIGURATION_GUIDE.md) - Setup and best practices
- [SECURITY_REMEDIATION.md](../../SECURITY_REMEDIATION.md) - Incident response details
- [SECURITY_INCIDENT_RESPONSE_SUMMARY.md](../../SECURITY_INCIDENT_RESPONSE_SUMMARY.md) - Status summary

## Support

If you encounter security issues:
1. Check [SECURITY_CONFIGURATION_GUIDE.md](../../SECURITY_CONFIGURATION_GUIDE.md)
2. Run the pre-commit hook manually: `.git/hooks/pre-commit`
3. Contact security team if you need to bypass checks
4. Never commit credentials - use environment variables instead

## Monthly Checklist

- [ ] Review git log for suspicious commits: `git log --all --grep="--no-verify"`
- [ ] Rotate database credentials
- [ ] Audit access logs in MongoDB Atlas
- [ ] Update git-secrets patterns if needed
- [ ] Review CI/CD security scanning logs
- [ ] Run full security scan: `git secrets --scan`

## Additional Resources

- [Git-Secrets Documentation](https://github.com/awslabs/git-secrets)
- [OWASP Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [MongoDB Security](https://docs.mongodb.com/manual/security/)
- [TruffleHog (Secret Scanning)](https://github.com/trufflesecurity/trufflehog)

---

**Last Updated:** February 8, 2026  
**Status:** Active - All developers must follow these guidelines
