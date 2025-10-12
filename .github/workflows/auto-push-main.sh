#!/usr/bin/env bash
set -euo pipefail
MSG="${*:-chore: sync main}"

BRANCH="main"
REMOTE="${REMOTE:-origin}"

echo "➤ Pull $REMOTE/$BRANCH"
git checkout "$BRANCH"
git pull --rebase "$REMOTE" "$BRANCH" || true

echo "➤ Add & Commit"
git add -A
git commit -m "$MSG" || echo "ℹ️ Nothing to commit"

echo "➤ Push"
git push "$REMOTE" "$BRANCH"
echo "✅ Pushed to $BRANCH"
