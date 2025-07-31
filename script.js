// PDF Book Reader with Simple Page Navigation
class PDFBookReader {
    constructor() {
        this.currentBook = null;
        this.pdfDoc = null;
        this.currentPage = 1;
        this.totalPages = 1;
        this.isFullscreen = false;
        this.pdfFiles = [];
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadBooks();
    }

    setupEventListeners() {
        // Book selection
        document.getElementById('back-button').addEventListener('click', () => {
            this.showBookSelection();
        });

        document.getElementById('fullscreen-btn').addEventListener('click', () => {
            this.toggleFullscreen();
        });

        // Navigation controls
        document.getElementById('prev-page').addEventListener('click', () => {
            this.previousPage();
        });

        document.getElementById('next-page').addEventListener('click', () => {
            this.nextPage();
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                this.previousPage();
            } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                this.nextPage();
            } else if (e.key === 'Escape') {
                if (this.isFullscreen) {
                    this.toggleFullscreen();
                } else {
                    this.showBookSelection();
                }
            }
        });

        // Fullscreen change events
        document.addEventListener('fullscreenchange', () => {
            this.isFullscreen = !!document.fullscreenElement;
        });

        document.addEventListener('webkitfullscreenchange', () => {
            this.isFullscreen = !!document.webkitFullscreenElement;
        });

        // Refresh button for detecting new PDFs
        const refreshBtn = document.createElement('button');
        refreshBtn.innerHTML = '🔄 Refresh Books';
        refreshBtn.className = 'refresh-btn';
        refreshBtn.addEventListener('click', () => {
            this.loadBooks();
        });
        document.querySelector('.header').appendChild(refreshBtn);
    }

    async loadBooks() {
        try {
            const books = await this.getBooksFromFolder();
            this.renderBooks(books);
        } catch (error) {
            console.error('Error loading books:', error);
            this.showNoBooks();
        }
    }

    async getBooksFromFolder() {
        // Try to fetch PDF list from server
        try {
            const response = await fetch('/api/pdfs');
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.log('Server API not available, using static list');
        }

        // Fallback to static list
        const pdfFiles = [
            {
                filename: 'my_book.pdf',
                title: 'My Book',
                size: '11 MB',
                path: '/pdf/my_book.pdf'
            },
            {
                filename: 'CLASS 10 CH-1.pdf',
                title: 'Class 10 - Chapter 1',
                size: '1.8 MB',
                path: '/pdf/CLASS 10 CH-1.pdf'
            },
            {
                filename: 'CLASS 10 CH-2.pdf',
                title: 'Class 10 - Chapter 2',
                size: '1.8 MB',
                path: '/pdf/CLASS 10 CH-2.pdf'
            },
            {
                filename: 'CLASS 10 CH-3.pdf',
                title: 'Class 10 - Chapter 3',
                size: '1.1 MB',
                path: '/pdf/CLASS 10 CH-3.pdf'
            },
            {
                filename: 'CLASS 10 CH-4.pdf',
                title: 'Class 10 - Chapter 4',
                size: '2.3 MB',
                path: '/pdf/CLASS 10 CH-4.pdf'
            }
        ];

        return pdfFiles;
    }

    // Helper function to generate a nice title from filename
    generateTitle(filename) {
        // Remove .pdf extension
        let title = filename.replace(/\.pdf$/i, '');
        
        // Convert underscores and dashes to spaces
        title = title.replace(/[_-]/g, ' ');
        
        // Capitalize first letter of each word
        title = title.replace(/\b\w/g, l => l.toUpperCase());
        
        // Handle special cases
        if (title.includes('CLASS 10 CH-')) {
            title = title.replace('CLASS 10 CH-', 'Class 10 - Chapter ');
        }
        
        return title;
    }

    renderBooks(books) {
        const booksGrid = document.getElementById('books-grid');
        const loadingBooks = document.getElementById('loading-books');
        const noBooks = document.getElementById('no-books');

        if (books.length === 0) {
            loadingBooks.classList.add('hidden');
            noBooks.classList.remove('hidden');
            return;
        }

        loadingBooks.classList.add('hidden');
        noBooks.classList.add('hidden');

        booksGrid.innerHTML = books.map(book => `
            <div class="book-card" data-filename="${book.filename}" data-path="${book.path}">
                <div class="book-cover">
                    <div class="book-icon">📖</div>
                </div>
                <div class="book-info">
                    <h3 class="book-title">${book.title}</h3>
                    <div class="book-meta">
                        <span class="book-size">${book.size}</span>
                    </div>
                </div>
            </div>
        `).join('');

        // Add click listeners to book cards
        booksGrid.querySelectorAll('.book-card').forEach(card => {
            card.addEventListener('click', () => {
                const filename = card.dataset.filename;
                const path = card.dataset.path;
                const title = card.querySelector('.book-title').textContent;
                this.openBook(filename, path, title);
            });
        });
    }

    showNoBooks() {
        document.getElementById('loading-books').classList.add('hidden');
        document.getElementById('no-books').classList.remove('hidden');
    }

    async openBook(filename, path, title) {
        this.currentBook = { filename, path, title };
        
        // Show reader screen
        this.showBookReader();
        
        // Update book title
        document.getElementById('book-title').textContent = title;
        
        // Show loading
        document.getElementById('loading-reader').classList.remove('hidden');
        
        try {
            await this.loadPDF(path);
            await this.initializeSimpleViewer();
            document.getElementById('loading-reader').classList.add('hidden');
        } catch (error) {
            console.error('Error opening book:', error);
            alert('Error loading PDF. Please try again.');
            this.showBookSelection();
        }
    }

    async loadPDF(path) {
        try {
            // Load PDF using pdf.js
            const loadingTask = pdfjsLib.getDocument(path);
            this.pdfDoc = await loadingTask.promise;
            this.totalPages = this.pdfDoc.numPages;
            
            // Update page counter
            document.getElementById('total-pages').textContent = this.totalPages;
            
            console.log(`PDF loaded: ${this.totalPages} pages`);
        } catch (error) {
            console.error('Error loading PDF:', error);
            throw error;
        }
    }

    async initializeSimpleViewer() {
        const container = document.getElementById('stf-parent');
        container.innerHTML = '';

        // Create simple viewer
        const viewer = document.createElement('div');
        viewer.className = 'pdf-viewer';
        viewer.innerHTML = `
            <div class="page-container">
                <canvas id="pdf-canvas"></canvas>
            </div>
        `;
        container.appendChild(viewer);

        // Load first page
        await this.renderCurrentPage();
    }

    async renderCurrentPage() {
        try {
            const page = await this.pdfDoc.getPage(this.currentPage);
            const canvas = document.getElementById('pdf-canvas');
            const context = canvas.getContext('2d');
            
            // Calculate scale to fit the page
            const container = canvas.parentElement;
            const containerWidth = container.clientWidth - 40; // Padding
            const containerHeight = container.clientHeight - 40;
            
            const viewport = page.getViewport({ scale: 1.0 });
            const scaleX = containerWidth / viewport.width;
            const scaleY = containerHeight / viewport.height;
            const scale = Math.min(scaleX, scaleY, 2.0); // Max scale of 2.0
            
            const scaledViewport = page.getViewport({ scale });
            
            canvas.height = scaledViewport.height;
            canvas.width = scaledViewport.width;
            
            const renderContext = {
                canvasContext: context,
                viewport: scaledViewport
            };
            
            await page.render(renderContext).promise;
            
            console.log(`Page ${this.currentPage} rendered`);
        } catch (error) {
            console.error(`Error rendering page ${this.currentPage}:`, error);
        }
    }

    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.renderCurrentPage();
            this.updatePageCounter();
        }
    }

    nextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            this.renderCurrentPage();
            this.updatePageCounter();
        }
    }

    updatePageCounter() {
        document.getElementById('current-page').textContent = this.currentPage;
        
        // Update button states
        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');
        
        prevBtn.disabled = this.currentPage <= 1;
        nextBtn.disabled = this.currentPage >= this.totalPages;
    }

    showBookSelection() {
        document.getElementById('book-selection').classList.add('active');
        document.getElementById('book-reader').classList.remove('active');
        
        // Clean up
        this.pdfDoc = null;
        this.currentBook = null;
    }

    showBookReader() {
        document.getElementById('book-selection').classList.remove('active');
        document.getElementById('book-reader').classList.add('active');
    }

    toggleFullscreen() {
        const reader = document.getElementById('book-reader');
        
        if (!this.isFullscreen) {
            if (reader.requestFullscreen) {
                reader.requestFullscreen();
            } else if (reader.webkitRequestFullscreen) {
                reader.webkitRequestFullscreen();
            } else if (reader.msRequestFullscreen) {
                reader.msRequestFullscreen();
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
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Set PDF.js worker path
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    
    // Initialize the PDF Book Reader
    new PDFBookReader();
});

// Add touch/swipe support for mobile
let touchStartX = 0;
let touchEndX = 0;

document.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
});

document.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
});

function handleSwipe() {
    const swipeThreshold = 50;
    const diff = touchStartX - touchEndX;
    
    if (Math.abs(diff) > swipeThreshold) {
        if (diff > 0) {
            // Swipe left - next page
            window.pdfReader?.nextPage();
        } else {
            // Swipe right - previous page
            window.pdfReader?.previousPage();
        }
    }
} 