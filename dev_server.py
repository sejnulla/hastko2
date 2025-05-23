import http.server
import socketserver
import os
import sys
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import threading
import time

PORT = 3000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class AutoReloadHandler(FileSystemEventHandler):
    def __init__(self, server):
        self.server = server
        self.last_reload = 0
        self.cooldown = 1  # Cooldown period in seconds

    def on_modified(self, event):
        if event.src_path.endswith(('.html', '.css', '.js')):
            current_time = time.time()
            if current_time - self.last_reload > self.cooldown:
                print(f"\nFile {os.path.basename(event.src_path)} changed. Reloading...")
                self.last_reload = current_time

class HttpHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # Inject live reload script
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

def run_server():
    with socketserver.TCPServer(("", PORT), HttpHandler) as httpd:
        print(f"\nServing at http://localhost:{PORT}")
        print("Press Ctrl+C to stop the server")
        
        # Set up file watcher
        event_handler = AutoReloadHandler(httpd)
        observer = Observer()
        observer.schedule(event_handler, DIRECTORY, recursive=False)
        observer.start()

        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            observer.stop()
            print("\nShutting down server...")
        observer.join()

if __name__ == "__main__":
    os.chdir(DIRECTORY)
    run_server() 