#!/bin/bash

# Static build script for Next.js static export

echo "📦 Building for static export..."

# Copy the static config
cp /workspaces/SyncroSpace/next.config.static.js /workspaces/SyncroSpace/next.config.js
echo "✅ Using static export configuration"

# Run the build
echo "🏗️ Building project..."
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
  echo "🎉 Build successful! Output is in the 'out' directory"
else
  echo "❌ Build failed. See error messages above."
fi
