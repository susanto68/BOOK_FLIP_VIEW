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
let currentPageElement = null;
let nextPageElement = null;

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
            'background': 'linear-gradient(135deg, #f8fafc 0%, #e6f3ff 50%, #f0f8ff 100%)',
            'overflow': 'hidden'
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
        
        // Hide desktop navigation buttons on mobile but keep side nav buttons visible
        $('.flex.justify-center.space-x-4').hide();
        // Don't hide side nav buttons on mobile - they should be visible
        $('.side-nav-btn').show();
        
    } else {
        // Desktop optimizations
        $flipbookContainer.css({
            'position': 'relative',
            'width': '100%',
            'height': 'auto',
            'max-width': '100%',
            'max-height': '90vh',
            'border-radius': '0.5rem',
            'z-index': 'auto',
            'background-color': 'white'
        });
        
        $('.max-w-6xl').css({
            'position': 'relative',
            'width': 'auto',
            'height': 'auto',
            'max-width': '72rem',
            'max-height': 'none',
            'border-radius': '0',
            'z-index': 'auto'
        });
        
        // Show desktop navigation
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
    console.log('Adding side navigation support...');
    
    // Add click handlers for side navigation buttons
    $leftNavBtn.off('click').on('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('Left nav button clicked');
        goToPreviousPage();
    });
    
    $rightNavBtn.off('click').on('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('Right nav button clicked');
        goToNextPage();
    });
    
    // Add click handlers for clicking on the flipbook container sides
    $flipbookContainer.off('click').on('click', function(e) {
        if (isMobile()) return; // Don't use this on mobile
        
        const rect = this.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const containerWidth = rect.width;
        
        console.log(`Click detected at ${clickX}px in container of width ${containerWidth}px`);
        
        // If click is in the left third of the container, go to previous page
        if (clickX < containerWidth / 3) {
            console.log('Left third clicked - going to previous page');
            goToPreviousPage();
        }
        // If click is in the right third of the container, go to next page
        else if (clickX > (containerWidth * 2) / 3) {
            console.log('Right third clicked - going to next page');
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
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    });
    
    $('#mobilePrevBtn').off('click').on('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('Mobile prev button clicked');
        goToPreviousPage();
    });
    
    $('#mobileNextBtn').off('click').on('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('Mobile next button clicked');
        goToNextPage();
    });
    
    // Update mobile page counter
    updateMobilePageCounter();
    
    // Show controls initially
    showControls();
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
 * Create page flip animation (Kindle-like experience)
 */
function createPageFlipAnimation(currentCanvas, nextCanvas, direction) {
    return new Promise((resolve) => {
        console.log(`Starting ${direction} page flip animation`);
        
        // Create page flip container with enhanced 3D perspective
        const flipContainer = document.createElement('div');
        flipContainer.className = 'page-flip-container';
        flipContainer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            perspective: 1500px;
            transform-style: preserve-3d;
            z-index: 1000;
            background: linear-gradient(135deg, #87CEEB 0%, #B0E0E6 50%, #ADD8E6 100%);
            border-radius: 8px;
        `;
        
        // Create current page element (the page being turned) with realistic corner effect
        const currentPage = document.createElement('div');
        currentPage.className = 'page-flip-current';
        const currentCanvasClone = currentCanvas.cloneNode(true);
        currentCanvasClone.style.cssText = `
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 0;
            box-shadow: none;
            background-color: white;
            transform: scale(1.1);
        `;
        currentPage.appendChild(currentCanvasClone);
        currentPage.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            transform-origin: ${direction === 'next' ? 'left' : 'right'} center;
            transform: rotateY(0deg) translateZ(0);
            transition: transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            backface-visibility: hidden;
            transform-style: preserve-3d;
            z-index: 2;
            filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1));
        `;
        
        // Add realistic page corner curl effect
        const pageCorner = document.createElement('div');
        pageCorner.style.cssText = `
            position: absolute;
            top: 0;
            ${direction === 'next' ? 'left: 0;' : 'right: 0;'}
            width: 20px;
            height: 100%;
            background: linear-gradient(${direction === 'next' ? 'to right' : 'to left'}, 
                rgba(0,0,0,0.1) 0%, 
                rgba(0,0,0,0.05) 50%, 
                transparent 100%);
            transform-origin: ${direction === 'next' ? 'left' : 'right'} center;
            transform: rotateY(${direction === 'next' ? '0deg' : '0deg'});
            transition: transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            z-index: 3;
            pointer-events: none;
        `;
        currentPage.appendChild(pageCorner);
        
        // Create next page element (the page being revealed) with realistic curl
        const nextPage = document.createElement('div');
        nextPage.className = 'page-flip-next';
        const nextCanvasClone = nextCanvas.cloneNode(true);
        nextCanvasClone.style.cssText = `
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 0;
            box-shadow: none;
            background-color: white;
            transform: scale(1.1);
        `;
        nextPage.appendChild(nextCanvasClone);
        nextPage.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            transform-origin: ${direction === 'next' ? 'left' : 'right'} center;
            transform: rotateY(${direction === 'next' ? '-90deg' : '90deg'}) translateZ(0);
            transition: transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            backface-visibility: hidden;
            transform-style: preserve-3d;
            z-index: 1;
            filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1));
        `;
        
        // Add subtle curl effect to the next page
        const nextPageCurl = document.createElement('div');
        nextPageCurl.style.cssText = `
            position: absolute;
            top: 0;
            ${direction === 'next' ? 'left: 0;' : 'right: 0;'}
            width: 15px;
            height: 100%;
            background: linear-gradient(${direction === 'next' ? 'to right' : 'to left'}, 
                rgba(0,0,0,0.08) 0%, 
                rgba(0,0,0,0.03) 50%, 
                transparent 100%);
            transform-origin: ${direction === 'next' ? 'left' : 'right'} center;
            transform: rotateY(${direction === 'next' ? '-90deg' : '90deg'});
            transition: transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            z-index: 2;
            pointer-events: none;
        `;
        nextPage.appendChild(nextPageCurl);
        
        // Add pages to flip container
        flipContainer.appendChild(currentPage);
        flipContainer.appendChild(nextPage);
        
        // Clear container and add flip container
        $flipbookContainer.empty().append(flipContainer);
        
        // Add flipping class for background color
        $flipbookContainer.addClass('flipping');
        
        // Force reflow to ensure initial state is applied
        flipContainer.offsetHeight;
        
        // Start the flip animation with realistic corner curl
        setTimeout(() => {
            console.log(`Executing ${direction} flip animation with corner curl`);
            currentPage.style.transform = `rotateY(${direction === 'next' ? '90deg' : '-90deg'}) translateZ(0)`;
            nextPage.style.transform = 'rotateY(0deg) translateZ(0)';
            
            // Animate the page corner curl effect
            const pageCorner = currentPage.querySelector('div');
            if (pageCorner) {
                pageCorner.style.transform = `rotateY(${direction === 'next' ? '90deg' : '-90deg'})`;
            }
            
            // Animate the next page curl effect
            const nextPageCurl = nextPage.querySelector('div');
            if (nextPageCurl) {
                nextPageCurl.style.transform = 'rotateY(0deg)';
            }
        }, 50);
        
        // Clean up after animation completes
        setTimeout(() => {
            console.log('Animation complete, cleaning up');
            $flipbookContainer.empty().append(nextCanvas);
            $flipbookContainer.removeClass('flipping');
            resolve();
        }, 650); // Slightly longer than transition to ensure completion
    });
}

/**
 * Display a single page with Kindle-like flip animation
 */
async function displayPage(pageNumber) {
    console.log(`Displaying page ${pageNumber}`);
    
    if (pageNumber < 1 || pageNumber > totalPages) {
        console.log(`Page ${pageNumber} is out of range (1-${totalPages})`);
        return;
    }
    
    if (isPageTransitioning) {
        console.log('Page transition in progress, ignoring request');
        return;
    }
    
    // Set transition flag
    isPageTransitioning = true;
    
    // Store previous page for animation
    const previousPage = currentPageNumber;
    
    // Update current page number
    currentPageNumber = pageNumber;
    
    // Check if the page is loaded
    if (!loadedPages.has(pageNumber)) {
        console.log(`Page ${pageNumber} not loaded, showing loading spinner`);
        $flipbookContainer.html('<div class="page-loading"><div class="spinner"></div></div>');
        
        // Load the page
        await renderPage(pageNumber);
    }
    
    // Get the canvas for the current page
    const nextCanvas = pageCanvases[pageNumber - 1];
    if (!nextCanvas) {
        console.error(`Canvas for page ${pageNumber} not found`);
        isPageTransitioning = false;
        return;
    }
    
    // Get current canvas if it exists
    const currentCanvas = currentPageElement;
    
    // Determine animation direction
    const direction = pageNumber > previousPage ? 'next' : 'prev';
    
    if (currentCanvas && previousPage !== pageNumber) {
        // Create flip animation
        console.log(`Creating flip animation from page ${previousPage} to ${pageNumber} (${direction})`);
        await createPageFlipAnimation(currentCanvas, nextCanvas, direction);
    } else {
        // First page load or no current page - no animation
        console.log('First page load - no animation');
        $flipbookContainer.empty().append(nextCanvas);
    }
    
    // Update current page element
    currentPageElement = nextCanvas;
    
    // Update page counters
    $currentPage.text(pageNumber);
    $totalPages.text(totalPages);
    
    // Update mobile page counter if it exists
    if ($('#mobileCurrentPage').length) {
        $('#mobileCurrentPage').text(pageNumber);
        $('#mobileTotalPages').text(totalPages);
    }
    
    // Start background loading
    if (!isLoadingInBackground) {
        loadPagesInBackground();
    }
    
    // Reset transition flag
    isPageTransitioning = false;
    
    console.log(`Page ${pageNumber} displayed successfully with flip animation`);
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
            
            // Initialize reader functionality
            initializeReader();
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
    $prevPageButton.off('click').on('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('Prev page button clicked');
        goToPreviousPage();
    });

    $nextPageButton.off('click').on('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
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
