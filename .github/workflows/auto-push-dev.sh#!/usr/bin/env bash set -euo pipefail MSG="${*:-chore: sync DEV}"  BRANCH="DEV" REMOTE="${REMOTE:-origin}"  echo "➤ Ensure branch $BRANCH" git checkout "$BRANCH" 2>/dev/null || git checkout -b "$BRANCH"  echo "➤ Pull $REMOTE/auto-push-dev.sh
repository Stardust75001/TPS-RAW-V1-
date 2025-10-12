#!/usr/bin/env bash
set -euo pipefail
MSG="${*:-chore: sync DEV}"

BRANCH="DEV"
REMOTE="${REMOTE:-origin}"

echo "➤ Ensure branch $BRANCH"
git checkout "$BRANCH" 2>/dev/null || git checkout -b "$BRANCH"

echo "➤ Pull $REMOTE/$BRANCH"
git pull --rebase "$REMOTE" "$BRANCH" || true

echo "➤ Add & Commit"
git add -A
git commit -m "$MSG" || echo "ℹ️ Nothing to commit"

echo "➤ Push"
git push "$REMOTE" "$BRANCH"
echo "✅ Pushed to $BRANCH"
