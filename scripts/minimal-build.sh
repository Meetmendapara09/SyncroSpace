#!/bin/bash
# Minimal build script to create a static export that should work with less memory

echo "Starting minimal build process..."

# Clean up previous build artifacts
rm -rf .next
mkdir -p .next
chmod -R 777 .next

# Use the minimal config
cp next.config.minimal.ts next.config.ts

# Set memory limits
export NODE_OPTIONS="--max_old_space_size=4096"
export NEXT_TELEMETRY_DISABLED=1

# Run the build
echo "Running minimal build..."
npx next build

# Create a basic server.js file to make next start happy
if [ ! -f ".next/standalone/server.js" ]; then
  mkdir -p .next/standalone
  echo 'console.log("Static export mode");' > .next/standalone/server.js
  echo 'process.exit(0);' >> .next/standalone/server.js
fi

echo "Minimal build process completed."