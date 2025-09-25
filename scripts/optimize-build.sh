#!/bin/bash
# Script to optimize and run Next.js build with increased memory allocation

# Clear node_modules/.cache to ensure fresh build
echo "Clearing build cache..."
rm -rf .next
rm -rf node_modules/.cache

# Increase Node.js memory allocation to 6GB
export NODE_OPTIONS="--max_old_space_size=6144"

# Use production environment for real build conditions
export NODE_ENV=production

# Run build with memory usage monitoring
echo "Starting optimized build with increased memory..."
/usr/bin/time -v npm run build

# Print results
echo "Build complete. Check output for any errors."