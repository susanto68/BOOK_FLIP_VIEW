// app-optimized.js - Performance-optimized PDF flip viewer

class PDFFlipViewer {
    constructor(options = {}) {
        this.pdfUrl = options.pdfUrl || 'Introduction_to_Python_Programming_-_WEB.pdf';
        this.scale = options.scale || 1.2; // Reduced from 1.5 for better performance
        this.maxConcurrentRenders = options.maxConcurrentRenders || 3;
        this.preloadPages = options.preloadPages || 2;
        
        // DOM elements
        this.flipbookContainer = document.getElementById('flipbook');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.prevButton = document.getElementById('prevPage');
        this.nextButton = document.getElementById('nextPage');
        
        // State
        this.pdfDoc = null;
        this.pageCanvases = [];
        this.renderedPages = new Set();
        this.renderQueue = [];
        this.isRendering = false;
        this.currentPage = 1;
        
        this.init();
    }
    
    async init() {
        try {
            // Use dynamic import for PDF.js to reduce initial bundle size
            if (typeof pdfjsLib === 'undefined') {
                await this.loadPDFJS();
            }
            
            await this.loadPDF();
            this.setupEventListeners();
            this.hideLoading();
        } catch (error) {
            this.showError('Failed to initialize PDF viewer: ' + error.message);
        }
    }
    
    async loadPDFJS() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.min.js';
            script.onload = () => {
                pdfjsLib.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js';
                resolve();
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    
    async loadPDF() {
        try {
            this.showLoading('Loading PDF...');
            
            // Load PDF with optimized settings
            const loadingTask = pdfjsLib.getDocument({
                url: this.pdfUrl,
                cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/cmaps/',
                cMapPacked: true,
                // Optimize memory usage
                disableAutoFetch: true,
                disableStream: false,
                disableRange: false
            });
            
            this.pdfDoc = await loadingTask.promise;
            
            this.showLoading('Preparing pages...');
            await this.initializePages();
            await this.initializeFlipbook();
            
        } catch (error) {
            throw new Error('PDF loading failed: ' + error.message);
        }
    }
    
    async initializePages() {
        const numPages = this.pdfDoc.numPages;
        
        // Create placeholder canvases for all pages
        for (let i = 1; i <= numPages; i++) {
            const canvas = document.createElement('canvas');
            canvas.className = 'turn-page';
            canvas.dataset.pageNumber = i;
            this.pageCanvases.push(canvas);
            this.flipbookContainer.appendChild(canvas);
        }
        
        // Render first few pages immediately, rest lazily
        await this.renderInitialPages();
    }
    
    async renderInitialPages() {
        const initialPages = Math.min(4, this.pdfDoc.numPages);
        const renderPromises = [];
        
        for (let i = 1; i <= initialPages; i++) {
            renderPromises.push(this.renderPage(i));
        }
        
        await Promise.all(renderPromises);
    }
    
    async renderPage(pageNum) {
        if (this.renderedPages.has(pageNum)) {
            return;
        }
        
        try {
            const page = await this.pdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale: this.scale });
            
            const canvas = this.pageCanvases[pageNum - 1];
            const context = canvas.getContext('2d');
            
            // Set canvas dimensions
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            // Render with optimized settings
            await page.render({
                canvasContext: context,
                viewport: viewport,
                // Optimize rendering
                renderInteractiveForms: false,
                intent: 'display'
            }).promise;
            
            this.renderedPages.add(pageNum);
            
            // Clean up page object to free memory
            page.cleanup();
            
        } catch (error) {
            console.error(`Error rendering page ${pageNum}:`, error);
        }
    }
    
    async initializeFlipbook() {
        // Wait for jQuery and Turn.js to be available
        if (typeof $ === 'undefined') {
            await this.loadjQuery();
        }
        
        if (typeof $.fn.turn === 'undefined') {
            await this.loadTurnJS();
        }
        
        const $container = $(this.flipbookContainer);
        
        // Calculate optimal dimensions
        const firstCanvas = this.pageCanvases[0];
        const containerWidth = Math.min(
            this.flipbookContainer.parentElement.clientWidth * 0.95,
            firstCanvas.width,
            window.innerWidth * 0.95
        );
        const containerHeight = containerWidth * (firstCanvas.height / firstCanvas.width);
        
        // Initialize Turn.js with optimized settings
        $container.turn({
            width: containerWidth,
            height: containerHeight,
            autoCenter: true,
            acceleration: true,
            display: 'single',
            duration: 600, // Reduced from 800ms for snappier feel
            gradients: true,
            elevation: 50,
            // Performance optimizations
            when: {
                turning: (event, page, view) => {
                    this.onPageTurning(page);
                },
                turned: (event, page, view) => {
                    this.onPageTurned(page);
                }
            }
        });
        
        this.adjustForMobile();
    }
    
    onPageTurning(page) {
        this.currentPage = page;
        // Preload nearby pages
        this.preloadNearbyPages(page);
    }
    
    onPageTurned(page) {
        // Update page counter if exists
        const pageCounter = document.getElementById('currentPage');
        if (pageCounter) {
            pageCounter.textContent = page;
        }
    }
    
    preloadNearbyPages(currentPage) {
        const pagesToPreload = [];
        const start = Math.max(1, currentPage - this.preloadPages);
        const end = Math.min(this.pdfDoc.numPages, currentPage + this.preloadPages);
        
        for (let i = start; i <= end; i++) {
            if (!this.renderedPages.has(i)) {
                pagesToPreload.push(i);
            }
        }
        
        // Render pages with throttling
        this.throttledRender(pagesToPreload);
    }
    
    throttledRender(pages) {
        pages.forEach(pageNum => {
            if (this.renderQueue.length < 10) { // Limit queue size
                this.renderQueue.push(pageNum);
            }
        });
        
        if (!this.isRendering) {
            this.processRenderQueue();
        }
    }
    
    async processRenderQueue() {
        this.isRendering = true;
        
        while (this.renderQueue.length > 0) {
            const batch = this.renderQueue.splice(0, this.maxConcurrentRenders);
            const renderPromises = batch.map(pageNum => this.renderPage(pageNum));
            
            try {
                await Promise.all(renderPromises);
            } catch (error) {
                console.error('Batch render error:', error);
            }
            
            // Small delay to prevent blocking UI
            await new Promise(resolve => setTimeout(resolve, 10));
        }
        
        this.isRendering = false;
    }
    
    adjustForMobile() {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (isMobile) {
            const $container = $(this.flipbookContainer);
            $container.css({
                width: '100vw',
                height: '100vh',
                maxWidth: '100vw',
                maxHeight: '100vh',
                borderRadius: 0,
                padding: 0
            });
            
            // Show mobile indicator
            const indicator = document.getElementById('flip-indicator');
            if (indicator) {
                indicator.classList.remove('hidden');
            }
        }
    }
    
    setupEventListeners() {
        // Navigation buttons
        if (this.prevButton) {
            this.prevButton.addEventListener('click', () => {
                $(this.flipbookContainer).turn('previous');
            });
        }
        
        if (this.nextButton) {
            this.nextButton.addEventListener('click', () => {
                $(this.flipbookContainer).turn('next');
            });
        }
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') {
                $(this.flipbookContainer).turn('previous');
                e.preventDefault();
            } else if (e.key === 'ArrowRight') {
                $(this.flipbookContainer).turn('next');
                e.preventDefault();
            }
        });
        
        // Responsive handling
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.adjustForMobile();
            }, 250);
        });
    }
    
    async loadjQuery() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'page-flip/jquery.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    
    async loadTurnJS() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'page-flip/turn.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    
    showLoading(message = 'Loading...') {
        const messageElement = this.loadingOverlay.querySelector('.loading-message span');
        if (messageElement) {
            messageElement.textContent = message;
        }
        this.loadingOverlay.classList.remove('hidden');
        this.flipbookContainer.style.display = 'none';
    }
    
    hideLoading() {
        this.loadingOverlay.classList.add('hidden');
        this.flipbookContainer.style.display = 'block';
    }
    
    showError(message) {
        const messageElement = this.loadingOverlay.querySelector('.loading-message');
        if (messageElement) {
            messageElement.innerHTML = `<div class="text-red-500">${message}</div>`;
        }
        this.loadingOverlay.classList.remove('hidden');
    }
    
    // Memory cleanup
    destroy() {
        if (this.pdfDoc) {
            this.pdfDoc.destroy();
        }
        this.pageCanvases.forEach(canvas => {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        });
        this.pageCanvases = [];
        this.renderedPages.clear();
        this.renderQueue = [];
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.pdfViewer = new PDFFlipViewer({
        pdfUrl: 'Introduction_to_Python_Programming_-_WEB.pdf',
        scale: 1.2,
        maxConcurrentRenders: 2,
        preloadPages: 2
    });
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.pdfViewer) {
        window.pdfViewer.destroy();
    }
});