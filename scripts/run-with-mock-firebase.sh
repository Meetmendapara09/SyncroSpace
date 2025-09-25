#!/bin/bash

# Script to run the Next.js app with the mock Firebase enabled

echo "🚀 Starting SyncroSpace with mock Firebase..."

# Set the environment variable for mock Firebase
export USE_FIREBASE_MOCK=true

# Start the Next.js development server
npm run dev