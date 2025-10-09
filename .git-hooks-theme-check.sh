#!/usr/bin/env bash
set -euo pipefail
fail=0
for f in locales/*.json; do
  python3 -m json.tool < "$f" > /dev/null || { echo "Invalid JSON: $f"; fail=1; }
done
exit $fail
