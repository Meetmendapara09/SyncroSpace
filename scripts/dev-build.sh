#!/bin/bash
# Script to build SyncroSpace in development mode with reduced memory usage

echo "Starting development build process..."

# Clean up previous build artifacts
echo "Cleaning up previous build artifacts..."
rm -rf .next
rm -rf node_modules/.cache

# Set Node.js memory limit to 4GB
export NODE_OPTIONS="--max_old_space_size=4096"
export NODE_ENV=development
export NEXT_TELEMETRY_DISABLED=1

# Run the build with reduced features
echo "Building in development mode for testing..."
npm run build

echo "Development build process completed."