#!/bin/bash

# Script to build with mock Firebase for static export

echo "📦 Building with mock Firebase for static export..."

# Set the environment variable for mock Firebase
export USE_FIREBASE_MOCK=true

# Run the build
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
  echo "✅ Static build with mock Firebase completed successfully!"
  echo "   Output is in the .next/standalone directory"
else
  echo "❌ Build failed. See error messages above."
fi