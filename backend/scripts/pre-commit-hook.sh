#!/bin/bash
# Pre-commit hook to prevent credential leaks
# Install: cp pre-commit .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Running security checks...${NC}"

# Check for common secret patterns
PATTERNS=(
    # MongoDB credentials
    'mongodb+srv://.*:.*@'
    'mongodb://.*:.*@'
    
    # AWS/Azure credentials
    'AKIA[0-9A-Z]{16}'  # AWS Access Key ID
    'aws_secret_access_key\s*[:=]'
    'azure.*secret\s*[:=]'
    
    # API Keys and Tokens
    'api[_-]?key\s*[:=]'
    'apikey\s*[:=]'
    'api[_-]?secret\s*[:=]'
    'secret[_-]?key\s*[:=]'
    'access[_-]?token\s*[:=]'
    'bearer\s+[a-zA-Z0-9._-]{20,}'
    
    # Database credentials
    'password\s*[:=]\s*['\''"][^'\''\"]+['\''"]'
    'passwd\s*[:=]'
    'pwd\s*[:=]'
    'db[_-]?pass\s*[:=]'
    
    # Private keys
    'private[_-]?key\s*[:=]'
    'BEGIN PRIVATE KEY'
    'BEGIN RSA PRIVATE KEY'
    'BEGIN OPENSSH PRIVATE KEY'
    
    # JWT tokens
    'jwt\s*[:=]'
    'token\s*[:=]'
    
    # Wallet/Blockchain keys
    'mnemonic\s*[:=]'
    'seed[_-]?phrase\s*[:=]'
    '[0-9a-f]{64}.*private'  # 256-bit hex key pattern
)

FOUND_SECRETS=0
STAGED_FILES=$(git diff --cached --name-only)

for file in $STAGED_FILES; do
    # Skip certain file types
    if [[ $file == *.md ]] || [[ $file == *.png ]] || [[ $file == *.jpg ]] || [[ $file == .gitignore ]]; then
        # For markdown files, check but warn instead of blocking
        if [[ $file == *.md ]]; then
            for pattern in "${PATTERNS[@]}"; do
                if grep -i -E "$pattern" "$file" > /dev/null 2>&1; then
                    echo -e "${YELLOW}⚠️  WARNING: Potential secret pattern in documentation: $file${NC}"
                    echo "  Pattern: $pattern"
                    echo "  Please review and ensure this is not a real credential"
                fi
            done
        fi
        continue
    fi
    
    # Check for secrets in code files
    for pattern in "${PATTERNS[@]}"; do
        if grep -i -E "$pattern" "$file" > /dev/null 2>&1; then
            echo -e "${RED}❌ SECURITY VIOLATION: Potential secret found in $file${NC}"
            echo "   Pattern: $pattern"
            echo ""
            echo "   Content (first 3 matches):"
            grep -i -E "$pattern" "$file" | head -3 | sed 's/^/     /'
            echo ""
            FOUND_SECRETS=$((FOUND_SECRETS + 1))
        fi
    done
done

if [ $FOUND_SECRETS -gt 0 ]; then
    echo -e "${RED}❌ COMMIT BLOCKED: $FOUND_SECRETS file(s) with potential secrets found${NC}"
    echo ""
    echo "To bypass (NOT RECOMMENDED):"
    echo "  git commit --no-verify"
    echo ""
    echo "If this is a false positive:"
    echo "  1. Add pattern to .gitignore"
    echo "  2. Use git secrets --add to whitelist"
    echo "  3. Or use --no-verify if you're absolutely sure"
    echo ""
    exit 1
fi

# Check .env files are not committed
if git diff --cached --name-only | grep -E "^\.env($|\.)" > /dev/null; then
    # Allow .env.example but not .env
    if git diff --cached --name-only | grep -E "^\.env$|^\.env\.[^e]|^\.env\..*[^e]$" > /dev/null; then
        echo -e "${RED}❌ SECURITY VIOLATION: .env file with credentials cannot be committed${NC}"
        echo "   Only .env.example files are allowed in the repository"
        echo "   Add .env to .gitignore and use secrets manager for production"
        exit 1
    fi
fi

# Success
echo -e "${GREEN}✅ Security checks passed!${NC}"
exit 0
