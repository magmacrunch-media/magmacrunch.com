#!/usr/bin/env python3
"""Minimal HTTP server for status.json — serves on port 8784."""

import os
from http.server import HTTPServer, SimpleHTTPRequestHandler

STATUS_DIR = os.path.expanduser("~")

class StatusHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=STATUS_DIR, **kwargs)

    def do_GET(self):
        if self.path == "/status" or self.path == "/status.json":
            self.path = "/status.json"
            return super().do_GET()
        self.send_error(404)

    def log_message(self, format, *args):
        pass  # quiet

if __name__ == "__main__":
    server = HTTPServer(("0.0.0.0", 8784), StatusHandler)
    print("Status server on :8784")
    server.serve_forever()
