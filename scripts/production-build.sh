#!/bin/bash
# Script to create a production-ready build of SyncroSpace

echo "Starting production build optimization process..."

# Step 1: Clean up
echo "Cleaning up previous build artifacts..."
rm -rf .next
rm -rf node_modules/.cache

# Step 2: Optimize Node.js settings
echo "Configuring Node.js with optimized settings..."
export NODE_OPTIONS="--max_old_space_size=6144"
export NODE_ENV=production

# Step 3: Run production build with chunks
echo "Running production build with chunking..."

# Turn off TypeScript checking during build to reduce memory usage
echo "Building with TypeScript checking disabled..."
npm run build

echo "Build process completed."