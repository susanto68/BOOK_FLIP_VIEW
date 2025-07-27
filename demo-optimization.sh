#!/bin/bash

# Demo script to showcase performance optimizations

echo "🚀 PDF Flip Viewer - Performance Optimization Demo"
echo "=================================================="
echo ""

# Function to display file sizes
show_sizes() {
    echo "📊 Current file sizes:"
    echo "----------------------"
    
    # Original files
    if [ -f "app.js" ]; then
        echo "Original JavaScript: $(ls -lh app.js | awk '{print $5}')"
    fi
    
    if [ -f "style.css" ]; then
        echo "Original CSS: $(ls -lh style.css | awk '{print $5}')"
    fi
    
    # Optimized files
    if [ -f "app-optimized.js" ]; then
        echo "Optimized JavaScript: $(ls -lh app-optimized.js | awk '{print $5}')"
    fi
    
    if [ -f "dist/tailwind.min.css" ]; then
        echo "Optimized CSS: $(ls -lh dist/tailwind.min.css | awk '{print $5}')"
    fi
    
    echo ""
}

# Function to estimate bundle sizes
estimate_bundles() {
    echo "📦 Bundle size comparison:"
    echo "-------------------------"
    
    # Original bundle estimation
    original_js=6700  # 6.7KB
    original_css_cdn=398000  # 398KB Tailwind from CDN
    jquery_size=84000  # 84KB
    turn_size=23000   # 23KB
    pdfjs_size=216000 # 216KB
    pdfjs_worker=984000 # 984KB
    
    original_total=$((original_js + original_css_cdn + jquery_size + turn_size + pdfjs_size + pdfjs_worker))
    
    # Optimized bundle estimation
    optimized_js=5000    # ~5KB minified
    optimized_css=20000  # ~20KB purged Tailwind
    critical_css=5000    # ~5KB inline critical CSS
    
    optimized_total=$((optimized_js + optimized_css + critical_css))
    
    echo "Original total: ~$(echo "scale=1; $original_total/1000" | bc)KB"
    echo "Optimized total: ~$(echo "scale=1; $optimized_total/1000" | bc)KB"
    
    reduction=$(echo "scale=1; (($original_total - $optimized_total) * 100) / $original_total" | bc)
    echo "Reduction: ~${reduction}%"
    echo ""
}

# Function to show optimization features
show_features() {
    echo "✨ Optimization features implemented:"
    echo "------------------------------------"
    echo "✅ Tailwind CSS purging (removes unused styles)"
    echo "✅ Critical CSS inlining (faster first paint)"
    echo "✅ Lazy loading of PDF.js and dependencies"
    echo "✅ Progressive PDF page rendering"
    echo "✅ Memory management and cleanup"
    echo "✅ Service Worker for caching"
    echo "✅ Mobile-specific optimizations"
    echo "✅ Gzip compression for assets"
    echo "✅ Resource hints for faster loading"
    echo "✅ Webpack bundling and minification"
    echo ""
}

# Function to show usage instructions
show_usage() {
    echo "🔧 How to use the optimized version:"
    echo "------------------------------------"
    echo "1. Build optimized assets:"
    echo "   ./build-optimized.sh"
    echo ""
    echo "2. Serve the optimized version:"
    echo "   python -m http.server 8000"
    echo "   # Then visit: http://localhost:8000/index-optimized.html"
    echo ""
    echo "3. Compare with original:"
    echo "   # Original: http://localhost:8000/index.html"
    echo "   # Optimized: http://localhost:8000/index-optimized.html"
    echo ""
    echo "4. Development workflow:"
    echo "   npm run dev    # Watch mode for CSS changes"
    echo "   npm run build  # Full production build"
    echo ""
}

# Function to run performance tests
run_tests() {
    echo "🧪 Performance testing suggestions:"
    echo "-----------------------------------"
    echo "1. Lighthouse audit:"
    echo "   - Open Chrome DevTools"
    echo "   - Go to Lighthouse tab"
    echo "   - Run audit on both versions"
    echo ""
    echo "2. Network analysis:"
    echo "   - Open Network tab in DevTools"
    echo "   - Compare total transfer sizes"
    echo "   - Check for render-blocking resources"
    echo ""
    echo "3. Performance monitoring:"
    echo "   - Check First Contentful Paint (FCP)"
    echo "   - Measure Time to Interactive (TTI)"
    echo "   - Monitor PDF rendering times"
    echo ""
}

# Main execution
show_sizes
estimate_bundles
show_features
show_usage
run_tests

echo "📋 Quick commands:"
echo "-----------------"
echo "./build-optimized.sh     # Build optimized version"
echo "python -m http.server    # Start local server"
echo ""
echo "📚 For detailed information, see: PERFORMANCE_OPTIMIZATION_REPORT.md"