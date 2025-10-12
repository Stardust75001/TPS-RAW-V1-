#!/usr/bin/env bash
set -euo pipefail

# Load .env if present (local only)
if [[ -f ".env" ]]; then
  set -a
  source .env
  set +a
fi

missing=0
for key in GOOGLE_API_KEY SHOPIFY_API_KEY SHOPIFY_ADMIN_TOKEN SHOPIFY_STORE; do
  val="${!key-}"
  if [[ -z "$val" ]]; then
    echo "::error::Secret $key is missing"
    missing=1
  else
    echo "$key is set."
  fi
done

exit "$missing"
