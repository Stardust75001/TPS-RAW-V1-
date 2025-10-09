#!/usr/bin/env bash
set -euo pipefail

echo "Cleaning up theme files..."

# helpers
remove_lines() { # remove_lines <pattern> <path>
  local pat="$1" file="$2"
  [[ -f "$file" ]] || return 0
  sed -i '' "/$pat/d" "$file"
  echo "✓ Cleaned $(basename "$file")"
}

remove_lines 'assign img_width'  ./sections/video-with-text.liquid
remove_lines 'assign img_height' ./sections/video-with-text.liquid

remove_lines 'assign img_width'  ./snippets/offcanvas-search.liquid
remove_lines 'assign img_height' ./snippets/offcanvas-search.liquid

remove_lines 'assign btn_shadow_sp' ./snippets/product-item.liquid
remove_lines '{{ content_for_header }}' ./snippets/shogun-content-handler.liquid

echo "Cleanup completed!"
