#!/bin/bash
# Script to run SyncroSpace in development mode

echo "Starting Next.js in development mode..."

# Set Node.js memory limit to 4GB
export NODE_OPTIONS="--max_old_space_size=4096"
export NEXT_TELEMETRY_DISABLED=1

# Run Next.js development server
echo "Starting development server..."
npm run dev

echo "Development server stopped."