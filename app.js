// app.js

// Set up PDF.js worker source
pdfjsLib.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js';

// Define the path to your PDF document
const pdfUrl = 'Introduction_to_Python_Programming_-_WEB.pdf';

// Get references to HTML elements
const $flipbookContainer = $('#flipbook');
const $prevPageButton = $('#prevPage');
const $nextPageButton = $('#nextPage');
const $loadingOverlay = $('#loadingOverlay');
const $progressFill = $('#progressFill');
const $loadingText = $('#loadingText');
const $pageCounter = $('#pageCounter');
const $currentPage = $('#currentPage');
const $totalPages = $('#totalPages');
const $fullscreenBtn = $('#fullscreenBtn');
const $gestureIndicator = $('#gestureIndicator');

let pdfDoc = null;
let pageCanvases = [];
let isFullscreen = false;
let isInitialLoad = true;
let loadedPages = new Set(); // Track which pages are loaded
let totalPages = 0;
let initialLoadCount = 5; // Load only 5 pages initially

/**
 * Shows progress during PDF loading
 */
function updateProgress(current, total, message) {
    const percentage = (current / total) * 100;
    $progressFill.css('width', percentage + '%');
    $loadingText.text(message);
}

/**
 * Enhanced mobile detection and optimization
 */
function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
}

/**
 * Optimize flipbook for mobile devices
 */
function optimizeForMobile() {
    if (isMobile()) {
        // Make flipbook full screen on mobile for better readability
        $flipbookContainer.css({
            'position': 'fixed',
            'top': '0',
            'left': '0',
            'width': '100vw',
            'height': '100vh',
            'max-width': '100vw',
            'max-height': '100vh',
            'border-radius': '0',
            'z-index': '1000',
            'background-color': '#f8fafc'
        });
        
        // Hide the main container header and navigation on mobile fullscreen
        $('.max-w-6xl').css({
            'position': 'fixed',
            'top': '0',
            'left': '0',
            'width': '100vw',
            'height': '100vh',
            'max-width': '100vw',
            'max-height': '100vh',
            'border-radius': '0',
            'z-index': '999'
        });
        
        // Show gesture indicator briefly
        $gestureIndicator.addClass('show');
        setTimeout(() => {
            $gestureIndicator.removeClass('show');
        }, 3000);
        
        // Add touch event listeners for better mobile interaction
        addTouchSupport();
        
        // Add mobile navigation overlay
        addMobileNavigationOverlay();
    } else {
        // Reset to normal desktop layout
        $flipbookContainer.css({
            'position': 'relative',
            'width': '100%',
            'height': '100%',
            'max-width': 'none',
            'max-height': 'none',
            'border-radius': '12px',
            'z-index': 'auto'
        });
        
        $('.max-w-6xl').css({
            'position': 'relative',
            'width': 'auto',
            'height': 'auto',
            'max-width': '6xl',
            'max-height': 'none',
            'border-radius': '1rem'
        });
        
        // Remove mobile navigation overlay
        $('#mobileNavOverlay').remove();
    }
}

/**
 * Add touch support for mobile devices with improved performance
 */
function addTouchSupport() {
    let startX = 0;
    let startY = 0;
    let touchStartTime = 0;
    
    $flipbookContainer.off('touchstart touchend'); // Remove existing listeners
    
    $flipbookContainer.on('touchstart', function(e) {
        startX = e.originalEvent.touches[0].clientX;
        startY = e.originalEvent.touches[0].clientY;
        touchStartTime = Date.now();
    });
    
    $flipbookContainer.on('touchend', function(e) {
        if (!startX || !startY) return;
        
        const touchEndTime = Date.now();
        const touchDuration = touchEndTime - touchStartTime;
        
        // Only process if touch duration is reasonable (not too long)
        if (touchDuration > 1000) return;
        
        const endX = e.originalEvent.changedTouches[0].clientX;
        const endY = e.originalEvent.changedTouches[0].clientY;
        const diffX = startX - endX;
        const diffY = startY - endY;
        
        // Check if it's a horizontal swipe (more horizontal than vertical)
        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 30) {
            if (diffX > 0) {
                // Swipe left - next page
                $flipbookContainer.turn('next');
            } else {
                // Swipe right - previous page
                $flipbookContainer.turn('previous');
            }
        }
        
        startX = 0;
        startY = 0;
    });
}

/**
 * Toggle fullscreen mode
 */
function toggleFullscreen() {
    if (!isFullscreen) {
        if ($flipbookContainer[0].requestFullscreen) {
            $flipbookContainer[0].requestFullscreen();
        } else if ($flipbookContainer[0].webkitRequestFullscreen) {
            $flipbookContainer[0].webkitRequestFullscreen();
        } else if ($flipbookContainer[0].msRequestFullscreen) {
            $flipbookContainer[0].msRequestFullscreen();
        }
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    }
}

/**
 * Add mobile navigation overlay for fullscreen mode
 */
function addMobileNavigationOverlay() {
    // Remove existing overlay if any
    $('#mobileNavOverlay').remove();
    
    const overlay = $(`
        <div id="mobileNavOverlay" class="mobile-nav-overlay">
            <div class="mobile-nav-header">
                <button id="exitFullscreenBtn" class="mobile-nav-btn">
                    <span>✕</span>
                </button>
                <div class="mobile-page-counter">
                    Page <span id="mobileCurrentPage">1</span> of <span id="mobileTotalPages">1</span>
                </div>
            </div>
            <div class="mobile-nav-controls">
                <button id="mobilePrevBtn" class="mobile-nav-btn large">
                    <span>←</span>
                </button>
                <button id="mobileNextBtn" class="mobile-nav-btn large">
                    <span>→</span>
                </button>
            </div>
        </div>
    `);
    
    $('body').append(overlay);
    
    // Add auto-hide functionality for mobile controls
    let hideTimeout;
    
    function showControls() {
        $('#mobileNavOverlay').removeClass('hidden').addClass('show');
        clearTimeout(hideTimeout);
        hideTimeout = setTimeout(() => {
            $('#mobileNavOverlay').removeClass('show').addClass('hidden');
        }, 3000);
    }
    
    // Show controls on touch
    $flipbookContainer.on('touchstart', showControls);
    
    // Add event listeners for mobile navigation
    $('#exitFullscreenBtn').on('click', function() {
        // Exit mobile fullscreen mode
        $flipbookContainer.css({
            'position': 'relative',
            'width': '100%',
            'height': '100%',
            'max-width': 'none',
            'max-height': 'none',
            'border-radius': '12px',
            'z-index': 'auto'
        });
        
        $('.max-w-6xl').css({
            'position': 'relative',
            'width': 'auto',
            'height': 'auto',
            'max-width': '6xl',
            'max-height': 'none',
            'border-radius': '1rem'
        });
        
        $('#mobileNavOverlay').remove();
        
        // Trigger window resize to reinitialize
        $(window).trigger('resize');
    });
    
    $('#mobilePrevBtn').on('click', function() {
        $flipbookContainer.turn('previous');
    });
    
    $('#mobileNextBtn').on('click', function() {
        $flipbookContainer.turn('next');
    });
    
    // Update mobile page counter
    updateMobilePageCounter();
}

/**
 * Update mobile page counter
 */
function updateMobilePageCounter() {
    if (pdfDoc) {
        $('#mobileCurrentPage').text($currentPage.text());
        $('#mobileTotalPages').text(pdfDoc.numPages);
    }
}

/**
 * Render a single page with optimized settings
 */
async function renderPage(pageNumber) {
    if (loadedPages.has(pageNumber)) {
        return pageCanvases[pageNumber - 1];
    }
    
    try {
        const page = await pdfDoc.getPage(pageNumber);
        
        // Optimized scale for mobile performance
        const scale = isMobile() ? 1.5 : 1.5; // Reduced from 2.0 for better performance
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport }).promise;
        
        $(canvas).addClass('turn-page');
        
        // Store canvas at correct index
        pageCanvases[pageNumber - 1] = canvas;
        loadedPages.add(pageNumber);
        
        return canvas;
    } catch (error) {
        console.error(`Error rendering page ${pageNumber}:`, error);
        return null;
    }
}

/**
 * Load pages progressively
 */
async function loadPagesProgressively(startPage, endPage) {
    const pagesToLoad = [];
    for (let i = startPage; i <= endPage; i++) {
        if (!loadedPages.has(i)) {
            pagesToLoad.push(i);
        }
    }
    
    if (pagesToLoad.length === 0) return;
    
    // Load pages in parallel for better performance
    const loadPromises = pagesToLoad.map(async (pageNum) => {
        const canvas = await renderPage(pageNum);
        if (canvas) {
            // Insert canvas at correct position
            const existingCanvas = $flipbookContainer.find(`canvas[data-page="${pageNum}"]`);
            if (existingCanvas.length === 0) {
                canvas.setAttribute('data-page', pageNum);
                $flipbookContainer.append(canvas);
            }
        }
    });
    
    await Promise.all(loadPromises);
}

/**
 * Loads and renders PDF pages with progressive loading
 */
async function renderPdfPages() {
    try {
        $loadingOverlay.removeClass('hidden');
        $flipbookContainer.hide();
        updateProgress(0, 100, 'Loading PDF document...');

        // Load PDF document
        pdfDoc = await pdfjsLib.getDocument(pdfUrl).promise;
        totalPages = pdfDoc.numPages;
        
        updateProgress(20, 100, `Processing ${totalPages} pages...`);
        
        // Clear existing content
        $flipbookContainer.empty();
        pageCanvases = new Array(totalPages);
        loadedPages.clear();
        
        // Load initial pages (first 5 pages)
        updateProgress(30, 100, 'Loading initial pages...');
        await loadPagesProgressively(1, Math.min(initialLoadCount, totalPages));
        
        updateProgress(60, 100, 'Initializing flipbook...');
        
        // Initialize flipbook with initial pages
        initializeFlipbook();
        
        updateProgress(100, 100, 'Ready!');
        
        // Hide loading overlay after a brief delay
        setTimeout(() => {
            $loadingOverlay.addClass('hidden');
            $flipbookContainer.show();
            $pageCounter.removeClass('hidden');
        }, 500);

    } catch (error) {
        console.error('Error loading or rendering PDF:', error);
        $loadingOverlay.find('.loading-message').html(`
            <div class="text-red-500 text-center">
                <div class="text-2xl mb-2">⚠️</div>
                <div class="font-medium">Error loading PDF</div>
                <div class="text-sm mt-2">${error.message}</div>
                <button onclick="location.reload()" class="mt-4 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">
                    Try Again
                </button>
            </div>
        `);
        $loadingOverlay.removeClass('hidden');
        $flipbookContainer.hide();
    }
}

/**
 * Initialize Turn.js flipbook with enhanced features
 */
function initializeFlipbook() {
    // Calculate dimensions based on first loaded page
    const firstLoadedPage = pageCanvases.find(canvas => canvas);
    if (!firstLoadedPage) return;
    
    const pageWidth = firstLoadedPage.width;
    const pageHeight = firstLoadedPage.height;

    // Responsive sizing
    const maxFlipbookWidth = Math.min(
        $flipbookContainer.parent().width() * 0.95, 
        pageWidth, 
        window.innerWidth * 0.95
    );
    const calculatedFlipbookHeight = maxFlipbookWidth / (pageWidth / pageHeight);

    // Initialize Turn.js with optimized settings
    $flipbookContainer.turn({
        width: maxFlipbookWidth,
        height: calculatedFlipbookHeight,
        autoCenter: true,
        acceleration: true,
        display: isMobile() ? 'single' : 'double',
        duration: 400, // Faster animation for better responsiveness
        gradients: true,
        elevation: 30, // Reduced for better performance
        when: {
            turning: function(event, page, view) {
                // Update page counter
                $currentPage.text(page);
                $totalPages.text(totalPages);
                updateMobilePageCounter();
                
                // Preload nearby pages
                const preloadRange = 3;
                const startPage = Math.max(1, page - preloadRange);
                const endPage = Math.min(totalPages, page + preloadRange);
                loadPagesProgressively(startPage, endPage);
            },
            turned: function(event, page, view) {
                // Page turned successfully
            }
        }
    });

    // Mobile optimizations
    optimizeForMobile();
    
    // Window resize handler
    $(window).on('resize', function() {
        setTimeout(() => {
            optimizeForMobile();
        }, 100);
    });

    // Navigation button handlers
    $prevPageButton.on('click', function() {
        $flipbookContainer.turn('previous');
    });

    $nextPageButton.on('click', function() {
        $flipbookContainer.turn('next');
    });

    // Fullscreen button handler
    $fullscreenBtn.on('click', toggleFullscreen);

    // Fullscreen change event
    $(document).on('fullscreenchange webkitfullscreenchange mozfullscreenchange MSFullscreenChange', function() {
        isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement || 
                         document.mozFullScreenElement || document.msFullscreenElement);
        
        if (isFullscreen) {
            $fullscreenBtn.html('<span class="hidden sm:inline">Exit Fullscreen</span><span class="sm:hidden">⛶</span>');
        } else {
            $fullscreenBtn.html('<span class="hidden sm:inline">Fullscreen</span><span class="sm:hidden">⛶</span>');
        }
    });

    // Enhanced keyboard navigation
    $(document).keydown(function(e) {
        if (e.keyCode === 37) { // Left arrow
            $flipbookContainer.turn('previous');
            e.preventDefault();
        } else if (e.keyCode === 39) { // Right arrow
            $flipbookContainer.turn('next');
            e.preventDefault();
        } else if (e.keyCode === 70) { // F key for fullscreen
            toggleFullscreen();
            e.preventDefault();
        }
    });

    // Update page counter initially
    $currentPage.text(1);
    $totalPages.text(totalPages);
}

// Initialize when document is ready
$(document).ready(function() {
    renderPdfPages();
    
    // Add loading animation to buttons
    $('.nav-btn').on('click', function() {
        $(this).addClass('scale-95');
        setTimeout(() => {
            $(this).removeClass('scale-95');
        }, 150);
    });
});
