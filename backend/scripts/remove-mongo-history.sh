#!/bin/bash
set -euo pipefail

echo "This script helps rewrite git history to remove a leaked MongoDB URI pattern.
WARNING: This rewrites history and requires force-pushing. Coordinate with your team before running."

PATTERN_FILE=$(mktemp)
cat > "$PATTERN_FILE" <<'EOF'
mongodb+srv://user:password@cluster.mongodb.net/database
EOF

if ! command -v bfg >/dev/null 2>&1; then
  echo "BFG not found. Install it (macOS: brew install bfg; or see https://rtyley.github.io/bfg-repo-cleaner/)"
  exit 1
fi

echo "Fetching all refs..."
git fetch --all

echo "Running BFG to replace leaked MongoDB URI..."
bfg --replace-text "$PATTERN_FILE"

echo "Expiring reflog and garbage collecting..."
git reflog expire --expire=now --all
git gc --prune=now --aggressive

echo "BFG run complete. Review changes locally, then force-push all branches and tags when ready:" 
echo "  git push --force --all"
echo "  git push --force --tags"

rm -f "$PATTERN_FILE"
echo "Done. Remember to rotate the compromised credentials in MongoDB Atlas immediately."
