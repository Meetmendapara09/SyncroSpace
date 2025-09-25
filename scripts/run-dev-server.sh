#!/bin/bash
# Run Next.js in development mode with custom server

echo "Starting Next.js in development mode with custom server..."

# Set Node.js memory limit to 4GB
export NODE_OPTIONS="--max_old_space_size=4096"
export NEXT_TELEMETRY_DISABLED=1
export NODE_ENV=development
export PORT=3000

# Run Next.js development server with custom server.js
echo "Starting development server..."
node server.js