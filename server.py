#!/usr/bin/env python3
import http.server
import socketserver
import json
import os
from urllib.parse import urlparse, parse_qs
import mimetypes

PORT = 8000

class PDFHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Handle API request for PDF list
        if self.path == '/api/pdfs':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            pdfs = self.get_pdf_list()
            self.wfile.write(json.dumps(pdfs).encode())
            return
        
        # Handle regular file requests
        super().do_GET()
    
    def get_pdf_list(self):
        pdf_folder = 'pdf'
        pdfs = []
        
        if os.path.exists(pdf_folder):
            for filename in os.listdir(pdf_folder):
                if filename.lower().endswith('.pdf'):
                    filepath = os.path.join(pdf_folder, filename)
                    size = self.get_file_size(filepath)
                    title = self.generate_title(filename)
                    
                    pdfs.append({
                        'filename': filename,
                        'title': title,
                        'size': size,
                        'path': f'/pdf/{filename}'
                    })
        
        # Sort by filename
        pdfs.sort(key=lambda x: x['filename'])
        return pdfs
    
    def get_file_size(self, filepath):
        try:
            size_bytes = os.path.getsize(filepath)
            if size_bytes < 1024 * 1024:
                return f"{size_bytes / 1024:.1f} KB"
            else:
                return f"{size_bytes / (1024 * 1024):.1f} MB"
        except:
            return "Unknown"
    
    def generate_title(self, filename):
        # Remove .pdf extension
        title = filename.replace('.pdf', '').replace('.PDF', '')
        
        # Convert underscores and dashes to spaces
        title = title.replace('_', ' ').replace('-', ' ')
        
        # Handle special cases
        if 'CLASS 10 CH-' in title:
            title = title.replace('CLASS 10 CH-', 'Class 10 - Chapter ')
        
        # Capitalize first letter of each word
        title = ' '.join(word.capitalize() for word in title.split())
        
        return title

if __name__ == "__main__":
    with socketserver.TCPServer(("", PORT), PDFHandler) as httpd:
        print(f"Server running at http://localhost:{PORT}")
        print("Press Ctrl+C to stop the server")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.") 