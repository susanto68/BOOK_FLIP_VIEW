# PDF Flip Page Viewer

A modern, responsive PDF viewer with realistic page-flipping animations using PDF.js and Turn.js.

## Features

- 📖 **Realistic Page Flipping**: Smooth page turn animations with Turn.js
- 📱 **Responsive Design**: Works on desktop, tablet, and mobile devices
- 🎨 **Modern UI**: Clean, modern interface with Tailwind CSS
- ⌨️ **Keyboard Navigation**: Use arrow keys to navigate pages
- 🔄 **Loading Animation**: Beautiful spinner while PDF loads
- 📄 **PDF.js Integration**: Renders PDF pages to canvas for optimal performance

## Project Structure

```
book_flip_view/
├── index.html          # Main application file
├── app.js             # JavaScript logic for PDF rendering and page flipping
├── style.css          # Custom CSS styles
├── test.html          # Simple test file for debugging
├── README.md          # This file
├── Introduction_to_Python_Programming_-_WEB.pdf  # Sample PDF
└── pdfs/              # Directory for additional PDF files
    ├── my_book.pdf
    └── your_document.pdf
```

## How to Use

### 1. Start the Local Server

```bash
# Navigate to the project directory
cd book_flip_view

# Start a local HTTP server (Python 3)
python -m http.server 8000

# Or using Python 2
python -m SimpleHTTPServer 8000

# Or using Node.js (if you have http-server installed)
npx http-server
```

### 2. Open in Browser

Open your browser and navigate to:
- Main application: `http://localhost:8000/index.html``
- Test file: `http://localhost:8000/test.html`

### 3. Navigation

- **Mouse**: Click and drag pages to flip
- **Buttons**: Use "Previous Page" and "Next Page" buttons
- **Keyboard**: Use left/right arrow keys

## Configuration

### Changing the PDF File

Edit `app.js` and modify the `pdfUrl` variable:

```javascript
// Change this line to point to your PDF file
const pdfUrl = 'your_pdf_file.pdf';
```

### Adjusting Page Quality

In `app.js`, modify the scale factor in the `getViewport` call:

```javascript
// Higher scale = better quality but more memory usage
const viewport = page.getViewport({ scale: 1.5 }); // Default: 1.5
```

### Customizing Turn.js Options

In `app.js`, modify the Turn.js initialization options:

```javascript
$flipbookContainer.turn({
    width: maxFlipbookWidth,
    height: calculatedFlipbookHeight,
    autoCenter: true,
    acceleration: true,
    display: 'double',        // 'single' for one page, 'double' for two pages
    duration: 800,            // Animation duration in milliseconds
    // Add more options as needed
});
```

## Dependencies

- **jQuery 2.2.4**: Required by Turn.js
- **PDF.js 2.10.377**: For PDF rendering
- **Turn.js 0.8.0**: For page flipping animations
- **Tailwind CSS**: For styling (loaded via CDN)

## Browser Compatibility

- ✅ Chrome 60+
- ✅ Firefox 55+
- ✅ Safari 12+
- ✅ Edge 79+

## Troubleshooting

### PDF Not Loading

1. **Check file path**: Ensure the PDF file exists and the path is correct
2. **CORS issues**: Make sure you're running from a local server, not opening the HTML file directly
3. **File size**: Large PDFs may take longer to load

### Page Flipping Not Working

1. **Check console errors**: Open browser developer tools and check for JavaScript errors
2. **Library loading**: Ensure all CDN libraries are loading correctly
3. **jQuery dependency**: Turn.js requires jQuery to be loaded first

### Performance Issues

1. **Reduce scale**: Lower the scale factor in `getViewport` for better performance
2. **Limit pages**: For very large PDFs, consider loading only a subset of pages
3. **Browser memory**: Close other tabs to free up memory

## Customization

### Adding Page Numbers

Add this to your HTML:

```html
<div id="pageInfo" class="text-center mt-4">
    Page <span id="currentPage">1</span> of <span id="totalPages">1</span>
</div>
```

And update the JavaScript:

```javascript
$flipbookContainer.bind('turned', function(event, page, view) {
    $('#currentPage').text(page);
    $('#totalPages').text(pdfDoc.numPages);
});
```

### Custom Styling

Modify `style.css` to customize the appearance:

```css
/* Custom page styling */
.turn-page {
    background-color: #fafafa;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* Custom button styling */
.nav-button {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 25px;
    padding: 12px 24px;
}
```

## License

This project is open source and available under the MIT License.

## Contributing

Feel free to submit issues and enhancement requests! 