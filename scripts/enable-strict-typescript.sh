#!/bin/bash
# Script to enable strict TypeScript checking for builds

echo "Enabling strict TypeScript checking for builds..."

# Backup the current config
cp next.config.ts next.config.backup.ts

# Use the strict config
cp next.config.strict.ts next.config.ts

echo "TypeScript strict checking is now enabled for builds."
echo "To revert to the previous configuration, run: cp next.config.backup.ts next.config.ts"