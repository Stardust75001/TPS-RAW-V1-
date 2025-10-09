#!/bin/bash
echo "Cleaning up theme files..."

# Remove assignments from video-with-text
if [ -f "./sections/video-with-text.liquid" ]; then
    sed -i '' '/assign img_width/d' ./sections/video-with-text.liquid
    sed -i '' '/assign img_height/d' ./sections/video-with-text.liquid
    echo "✓ Cleaned video-with-text.liquid"
fi

# Remove assignments from offcanvas-search
if [ -f "./snippets/offcanvas-search.liquid" ]; then
    sed -i '' '/assign img_width/d' ./snippets/offcanvas-search.liquid
    sed -i '' '/assign img_height/d' ./snippets/offcanvas-search.liquid
    echo "✓ Cleaned offcanvas-search.liquid"
fi

# Remove btn_shadow_sp assignment
if [ -f "./snippets/product-item.liquid" ]; then
    sed -i '' '/assign btn_shadow_sp/d' ./snippets/product-item.liquid
    echo "✓ Cleaned product-item.liquid"
fi

# Remove content_for_header from shogun handler
if [ -f "./snippets/shogun-content-handler.liquid" ]; then
    sed -i '' '/{{ content_for_header }}/d' ./snippets/shogun-content-handler.liquid
    echo "✓ Cleaned shogun-content-handler.liquid"
fi

echo "Cleanup completed!"
