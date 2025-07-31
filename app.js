// app.js

// Set up PDF.js worker source
pdfjsLib.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js';

// Define the path to your PDF document
const pdfUrl = 'Introduction_to_Python_Programming_-_WEB.pdf';

// Get references to HTML elements
const $flipbookContainer = $('#flipbook');
const $prevPageButton = $('#prevPage');
const $nextPageButton = $('#nextPage');
const $leftNavBtn = $('#leftNavBtn');
const $rightNavBtn = $('#rightNavBtn');
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
let loadedPages = new Set();
let totalPages = 0;
let currentPageNumber = 1;
let isLoadingInBackground = false;
let isPageTransitioning = false;

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
        console.log('Mobile device detected - applying mobile optimizations');
        
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
        
        // Hide desktop navigation buttons on mobile
        $('.flex.justify-center.space-x-4').hide();
        $('.side-nav-btn').hide();
        
    } else {
        console.log('Desktop device detected - applying desktop optimizations');
        
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
        
        // Show desktop navigation buttons
        $('.flex.justify-center.space-x-4').show();
        $('.side-nav-btn').show();
    }
}

/**
 * Add touch support for mobile devices with improved performance
 */
function addTouchSupport() {
    let startX = 0;
    let startY = 0;
    let touchStartTime = 0;
    
    // Remove existing listeners to prevent duplicates
    $flipbookContainer.off('touchstart touchend touchmove');
    
    $flipbookContainer.on('touchstart', function(e) {
        console.log('Touch start detected');
        startX = e.originalEvent.touches[0].clientX;
        startY = e.originalEvent.touches[0].clientY;
        touchStartTime = Date.now();
        e.preventDefault(); // Prevent default to avoid conflicts
    });
    
    $flipbookContainer.on('touchmove', function(e) {
        e.preventDefault(); // Prevent scrolling while swiping
    });
    
    $flipbookContainer.on('touchend', function(e) {
        console.log('Touch end detected');
        if (!startX || !startY || isPageTransitioning) return;
        
        const touchEndTime = Date.now();
        const touchDuration = touchEndTime - touchStartTime;
        
        // Only process if touch duration is reasonable (not too long)
        if (touchDuration > 1000) return;
        
        const endX = e.originalEvent.changedTouches[0].clientX;
        const endY = e.originalEvent.changedTouches[0].clientY;
        const diffX = startX - endX;
        const diffY = startY - endY;
        
        console.log('Swipe detected:', { diffX, diffY, touchDuration });
        
        // Check if it's a horizontal swipe (more horizontal than vertical)
        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 30) {
            if (diffX > 0) {
                // Swipe left - next page
                console.log('Swipe left - going to next page');
                goToNextPage();
            } else {
                // Swipe right - previous page
                console.log('Swipe right - going to previous page');
                goToPreviousPage();
            }
        }
        
        startX = 0;
        startY = 0;
        e.preventDefault();
    });
}

/**
 * Add click support for desktop side navigation
 */
function addSideNavigationSupport() {
    // Add click handlers for side navigation buttons
    $leftNavBtn.on('click', function() {
        console.log('Left nav button clicked');
        goToPreviousPage();
    });
    
    $rightNavBtn.on('click', function() {
        console.log('Right nav button clicked');
        goToNextPage();
    });
    
    // Add click handlers for clicking on the flipbook container sides
    $flipbookContainer.on('click', function(e) {
        if (isMobile()) return; // Don't use this on mobile
        
        const rect = this.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const containerWidth = rect.width;
        
        // If click is in the left third of the container, go to previous page
        if (clickX < containerWidth / 3) {
            goToPreviousPage();
        }
        // If click is in the right third of the container, go to next page
        else if (clickX > (containerWidth * 2) / 3) {
            goToNextPage();
        }
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
        console.log('Exit fullscreen clicked');
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
        console.log('Mobile prev button clicked');
        goToPreviousPage();
    });
    
    $('#mobileNextBtn').on('click', function() {
        console.log('Mobile next button clicked');
        goToNextPage();
    });
    
    // Update mobile page counter
    updateMobilePageCounter();
}

/**
 * Update mobile page counter
 */
function updateMobilePageCounter() {
    if (pdfDoc) {
        $('#mobileCurrentPage').text(currentPageNumber);
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
        const scale = isMobile() ? 1.5 : 1.5;
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport }).promise;
        
        $(canvas).addClass('turn-page');
        canvas.setAttribute('data-page', pageNumber);
        
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
 * Load pages in background continuously
 */
async function loadPagesInBackground() {
    if (isLoadingInBackground) return;
    
    isLoadingInBackground = true;
    
    try {
        // Load next 3 pages in background
        const pagesToLoad = [];
        for (let i = currentPageNumber + 1; i <= Math.min(currentPageNumber + 3, totalPages); i++) {
            if (!loadedPages.has(i)) {
                pagesToLoad.push(i);
            }
        }
        
        // Also load previous page if not loaded
        if (currentPageNumber > 1 && !loadedPages.has(currentPageNumber - 1)) {
            pagesToLoad.unshift(currentPageNumber - 1);
        }
        
        if (pagesToLoad.length > 0) {
            // Load pages in parallel
            const loadPromises = pagesToLoad.map(async (pageNum) => {
                await renderPage(pageNum);
            });
            
            await Promise.all(loadPromises);
        }
    } catch (error) {
        console.error('Error loading pages in background:', error);
    } finally {
        isLoadingInBackground = false;
    }
}

/**
 * Display a single page with smooth transition (Kindle-like experience)
 */
function displayPage(pageNumber) {
    if (pageNumber < 1 || pageNumber > totalPages || isPageTransitioning) return;
    
    console.log(`Displaying page ${pageNumber}`);
    isPageTransitioning = true;
    currentPageNumber = pageNumber;
    
    // Get or load the page
    if (loadedPages.has(pageNumber)) {
        const canvas = pageCanvases[pageNumber - 1];
        
        // Smooth transition effect
        $flipbookContainer.fadeOut(200, function() {
            $flipbookContainer.empty().append(canvas).fadeIn(200, function() {
                isPageTransitioning = false;
            });
        });
    } else {
        // Show loading indicator for current page
        $flipbookContainer.fadeOut(200, function() {
            $flipbookContainer.html(`
                <div class="page-loading">
                    <div class="spinner"></div>
                    <div>Loading page ${pageNumber}...</div>
                </div>
            `).fadeIn(200);
            
            // Load the page
            renderPage(pageNumber).then(canvas => {
                if (canvas) {
                    $flipbookContainer.fadeOut(200, function() {
                        $flipbookContainer.empty().append(canvas).fadeIn(200, function() {
                            isPageTransitioning = false;
                        });
                    });
                } else {
                    isPageTransitioning = false;
                }
            });
        });
    }
    
    // Update page counters
    $currentPage.text(pageNumber);
    $totalPages.text(totalPages);
    updateMobilePageCounter();
    
    // Start background loading
    setTimeout(() => {
        loadPagesInBackground();
    }, 100);
}

/**
 * Go to next page with smooth transition
 */
function goToNextPage() {
    console.log(`Attempting to go to next page. Current: ${currentPageNumber}, Total: ${totalPages}`);
    if (currentPageNumber < totalPages && !isPageTransitioning) {
        displayPage(currentPageNumber + 1);
    }
}

/**
 * Go to previous page with smooth transition
 */
function goToPreviousPage() {
    console.log(`Attempting to go to previous page. Current: ${currentPageNumber}`);
    if (currentPageNumber > 1 && !isPageTransitioning) {
        displayPage(currentPageNumber - 1);
    }
}

/**
 * Loads and renders PDF pages with single-page display
 */
async function renderPdfPages() {
    try {
        $loadingOverlay.removeClass('hidden');
        $flipbookContainer.hide();
        updateProgress(0, 100, 'Loading PDF document...');

        // Load PDF document
        pdfDoc = await pdfjsLib.getDocument(pdfUrl).promise;
        totalPages = pdfDoc.numPages;
        
        updateProgress(50, 100, `Processing ${totalPages} pages...`);
        
        // Clear existing content
        $flipbookContainer.empty();
        pageCanvases = new Array(totalPages);
        loadedPages.clear();
        
        // Load first page
        updateProgress(80, 100, 'Loading first page...');
        await renderPage(1);
        
        updateProgress(100, 100, 'Ready!');
        
        // Hide loading overlay after a brief delay
        setTimeout(() => {
            $loadingOverlay.addClass('hidden');
            $flipbookContainer.show();
            $pageCounter.removeClass('hidden');
            
            // Display first page
            displayPage(1);
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
 * Initialize the single-page reader
 */
function initializeReader() {
    console.log('Initializing reader...');
    
    // Mobile optimizations
    optimizeForMobile();
    
    // Add side navigation support
    addSideNavigationSupport();
    
    // Window resize handler
    $(window).on('resize', function() {
        setTimeout(() => {
            optimizeForMobile();
        }, 100);
    });

    // Navigation button handlers
    $prevPageButton.on('click', function() {
        console.log('Prev page button clicked');
        goToPreviousPage();
    });

    $nextPageButton.on('click', function() {
        console.log('Next page button clicked');
        goToNextPage();
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
            goToPreviousPage();
            e.preventDefault();
        } else if (e.keyCode === 39) { // Right arrow
            goToNextPage();
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
    console.log('Document ready - starting initialization');
    renderPdfPages();
    
    // Add loading animation to buttons
    $('.nav-btn, .side-nav-btn').on('click', function() {
        $(this).addClass('scale-95');
        setTimeout(() => {
            $(this).removeClass('scale-95');
        }, 150);
    });
});
