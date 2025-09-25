#!/bin/bash

# Script to switch between different Next.js configurations

# Usage information
usage() {
  echo "Usage: $0 [development|production|static]"
  echo ""
  echo "Options:"
  echo "  development - Use minimal config for faster development builds"
  echo "  production  - Use optimized config for production deployments"
  echo "  static      - Use static export config for static hosting"
  exit 1
}

# Check for argument
if [ $# -ne 1 ]; then
  usage
fi

# Set the config file based on argument
case "$1" in
  development)
    CONFIG_FILE="next.config.ts"
    echo "🔧 Using minimal development config"
    ;;
  production)
    CONFIG_FILE="next.config.optimized.ts"
    echo "🚀 Using optimized production config"
    ;;
  static)
    CONFIG_FILE="next.config.static.ts"
    echo "📦 Using static export config"
    ;;
  *)
    usage
    ;;
esac

# Create a copy of the config file
cp "/workspaces/SyncroSpace/$CONFIG_FILE" "/workspaces/SyncroSpace/next.config.js"
echo "✅ Configuration switched to $1 mode"