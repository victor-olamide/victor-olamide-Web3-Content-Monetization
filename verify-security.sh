#!/bin/bash
# Security Verification Script
# Run this to verify all security fixes are in place

echo "🔒 Security Verification Script"
echo "==============================="
echo ""

PASSED=0
FAILED=0
WARNINGS=0

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check 1: Leaked credentials removed
echo "Checking: Leaked credentials removed from documentation..."
if grep -r "mongodb+srv://user:pass@cluster.mongodb.net/database" . --include="*.md" --include="*.js" --include="*.json" > /dev/null 2>&1; then
    echo -e "${RED}❌ FAILED${NC} - Leaked credentials still found"
    grep -r "mongodb+srv://user:pass@cluster.mongodb.net/database" . --include="*.md"
    FAILED=$((FAILED + 1))
else
    echo -e "${GREEN}✅ PASSED${NC} - No leaked credentials found"
    PASSED=$((PASSED + 1))
fi
echo ""

# Check 2: .env file not in git
echo "Checking: .env files are ignored in git..."
if grep "^\.env$" .gitignore > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PASSED${NC} - .env is in .gitignore"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌ FAILED${NC} - .env not in .gitignore"
    FAILED=$((FAILED + 1))
fi
echo ""

# Check 3: .env file doesn't exist in repo
echo "Checking: No .env file committed to repository..."
if git ls-files | grep "^\.env$" > /dev/null 2>&1; then
    echo -e "${RED}❌ FAILED${NC} - .env file found in git"
    FAILED=$((FAILED + 1))
else
    echo -e "${GREEN}✅ PASSED${NC} - .env file not in git"
    PASSED=$((PASSED + 1))
fi
echo ""

# Check 4: .env.example has only placeholders
echo "Checking: .env.example files have only placeholders..."
if grep -r "password\|secret\|key" backend/.env.example | grep -v "=" | grep -v "your_\|example\|placeholder\|localhost" > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  WARNING${NC} - .env.example may contain real values"
    grep -r "password\|secret\|key" backend/.env.example
    WARNINGS=$((WARNINGS + 1))
else
    echo -e "${GREEN}✅ PASSED${NC} - .env.example uses only placeholders"
    PASSED=$((PASSED + 1))
fi
echo ""

# Check 5: Security documentation created
echo "Checking: Security documentation created..."
SECURITY_FILES=(
    "SECURITY_FIX_SUMMARY.md"
    "SECURITY_REMEDIATION.md"
    "SECURITY_CONFIGURATION_GUIDE.md"
    "SECURITY_INCIDENT_RESPONSE_SUMMARY.md"
    "backend/scripts/SECURITY_SETUP.md"
)

DOCS_FOUND=0
for file in "${SECURITY_FILES[@]}"; do
    if [ -f "$file" ]; then
        DOCS_FOUND=$((DOCS_FOUND + 1))
        echo "  ✅ Found: $file"
    else
        echo "  ❌ Missing: $file"
    fi
done

if [ $DOCS_FOUND -eq ${#SECURITY_FILES[@]} ]; then
    echo -e "${GREEN}✅ PASSED${NC} - All security documentation created"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌ FAILED${NC} - Some documentation missing"
    FAILED=$((FAILED + 1))
fi
echo ""

# Check 6: Pre-commit hook created
echo "Checking: Pre-commit hook script created..."
if [ -f "backend/scripts/pre-commit-hook.sh" ]; then
    echo -e "${GREEN}✅ PASSED${NC} - Pre-commit hook script exists"
    if [ -x "backend/scripts/pre-commit-hook.sh" ]; then
        echo "  ℹ️  Script is executable"
    else
        echo "  ℹ️  Script not executable - run: chmod +x backend/scripts/pre-commit-hook.sh"
    fi
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌ FAILED${NC} - Pre-commit hook script not found"
    FAILED=$((FAILED + 1))
fi
echo ""

# Check 7: Pre-commit hook is installed
echo "Checking: Pre-commit hook is installed in .git/hooks..."
if [ -f ".git/hooks/pre-commit" ]; then
    if grep -q "pre-commit-hook.sh\|secret\|password\|mongodb" .git/hooks/pre-commit > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PASSED${NC} - Pre-commit hook is installed"
        PASSED=$((PASSED + 1))
    else
        echo -e "${YELLOW}⚠️  WARNING${NC} - .git/hooks/pre-commit exists but may not be our script"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${YELLOW}⚠️  OPTIONAL${NC} - Pre-commit hook not installed (run: cp backend/scripts/pre-commit-hook.sh .git/hooks/pre-commit)"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

# Check 8: Git-secrets installed
echo "Checking: Git-secrets is installed..."
if command -v git-secrets &> /dev/null; then
    echo -e "${GREEN}✅ PASSED${NC} - git-secrets is installed"
    PASSED=$((PASSED + 1))
else
    echo -e "${YELLOW}⚠️  OPTIONAL${NC} - git-secrets not installed (run: brew install git-secrets)"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

# Check 9: No hardcoded MongoDB URIs in code
echo "Checking: No hardcoded MongoDB URIs in application code..."
if grep -r "mongodb://" backend/services backend/routes backend/models backend/middleware --include="*.js" | grep -v "process.env\|mongodb://localhost\|example\|comment\|test" > /dev/null 2>&1; then
    echo -e "${RED}❌ FAILED${NC} - Hardcoded MongoDB URI found in code"
    grep -r "mongodb://" backend/services backend/routes backend/models --include="*.js" | grep -v "process.env"
    FAILED=$((FAILED + 1))
else
    echo -e "${GREEN}✅ PASSED${NC} - No hardcoded MongoDB URIs in code"
    PASSED=$((PASSED + 1))
fi
echo ""

# Check 10: No hardcoded passwords in code
echo "Checking: No hardcoded passwords in application code..."
if grep -r "password\s*[:=]\s*['\"]" backend/services backend/routes backend/models --include="*.js" | grep -v "process.env\|password:\|// password\|# password" > /dev/null 2>&1; then
    echo -e "${RED}❌ FAILED${NC} - Hardcoded password found in code"
    grep -r "password\s*[:=]" backend/services backend/routes backend/models --include="*.js" | head -5
    FAILED=$((FAILED + 1))
else
    echo -e "${GREEN}✅ PASSED${NC} - No hardcoded passwords in code"
    PASSED=$((PASSED + 1))
fi
echo ""

# Summary
echo "==============================="
echo "Verification Summary"
echo "==============================="
echo -e "${GREEN}Passed:${NC}  $PASSED"
echo -e "${RED}Failed:${NC}  $FAILED"
echo -e "${YELLOW}Warnings:${NC} $WARNINGS"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All critical security checks passed!${NC}"
    echo ""
    echo "Recommended next steps:"
    echo "1. Install pre-commit hook:     cp backend/scripts/pre-commit-hook.sh .git/hooks/pre-commit"
    echo "2. Install git-secrets:         brew install git-secrets && git secrets --install"
    echo "3. Rotate MongoDB credentials:  Follow SECURITY_REMEDIATION.md"
    echo "4. Review SECURITY_CONFIGURATION_GUIDE.md for best practices"
    echo ""
    exit 0
else
    echo -e "${RED}❌ Some security checks failed!${NC}"
    echo ""
    echo "Please fix the failed checks above before proceeding."
    echo "See SECURITY_REMEDIATION.md for help."
    echo ""
    exit 1
fi
