#!/bin/bash

# Script to find components that use standard Image or img tags
# This helps identify areas where we can apply our OptimizedImage component

echo "🔍 Scanning for Image and img components..."

# Find all files that contain Next.js Image imports
echo "Next.js Image component usage:"
grep -r "import.*Image.*from 'next/image'" --include="*.tsx" --include="*.jsx" /workspaces/SyncroSpace/src

# Find all files that contain direct img tags
echo -e "\nDirect img tag usage:"
grep -r "<img " --include="*.tsx" --include="*.jsx" /workspaces/SyncroSpace/src

echo -e "\n✅ Scan complete. Review these files to replace with OptimizedImage component."
echo "Example replacement pattern:"
echo "1. Import: import { OptimizedImage } from '@/components/ui/optimized-image';"
echo "2. Replace: <Image src=\"...\" /> -> <OptimizedImage src=\"...\" />"