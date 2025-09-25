#!/bin/bash
# Script to start a simple HTTP server for the placeholder app

echo "Starting simple HTTP server for placeholder app..."

# Find a suitable HTTP server command
if command -v npx &> /dev/null; then
  echo "Using npx serve..."
  npx serve -s .
elif command -v python3 &> /dev/null; then
  echo "Using Python HTTP server..."
  python3 -m http.server 3000
elif command -v python &> /dev/null; then
  echo "Using Python HTTP server..."
  python -m SimpleHTTPServer 3000
else
  echo "No suitable HTTP server found. Please install one of: npx, python3, python"
  exit 1
fi