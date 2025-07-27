# PowerShell script to start the PDF Flip Viewer server
Write-Host "Starting PDF Flip Viewer Server..." -ForegroundColor Green
Write-Host "Server will be available at: http://localhost:8000" -ForegroundColor Yellow
Write-Host ""
Write-Host "Available pages:" -ForegroundColor Cyan
Write-Host "  - Main App: http://localhost:8000/index.html" -ForegroundColor White
Write-Host "  - Test App: http://localhost:8000/test.html" -ForegroundColor White
Write-Host "  - Status Check: http://localhost:8000/status_check.html" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Red
Write-Host ""

# Start the Python HTTP server
try {
    # Try to start the server
    python -m http.server 8000
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Server started successfully." -ForegroundColor Green
    } else {
        Write-Host "Server failed to start. Please check for errors above." -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "An error occurred while starting the server: $_" -ForegroundColor Red
    exit 1
}