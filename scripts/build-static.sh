#!/bin/bash
# Script to build SyncroSpace in static export mode

echo "Starting static export build process..."

# Clean up previous build artifacts
echo "Cleaning up previous build artifacts..."
rm -rf .next out
rm -rf node_modules/.cache

# Backup current config
cp next.config.ts next.config.backup.ts

# Use the static config
cp next.config.static.ts next.config.ts

# Set memory limit
export NODE_OPTIONS="--max_old_space_size=4096"
export NEXT_TELEMETRY_DISABLED=1
export NODE_ENV=production

# Run the build
echo "Building static export..."
npx next build

echo "Static export build process completed."
echo "To start the static server, run: npm run start:static"

# Restore original config
cp next.config.backup.ts next.config.ts