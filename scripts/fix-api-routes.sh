#!/bin/bash

# Script to add static export configuration to all API routes

# Set of API routes to modify
API_ROUTES=(
  "/workspaces/SyncroSpace/src/app/api/bigquery/meeting-analytics/route.ts"
  "/workspaces/SyncroSpace/src/app/api/bigquery/personalized-content/route.ts"
  "/workspaces/SyncroSpace/src/app/api/bigquery/user-forecast/route.ts"
  "/workspaces/SyncroSpace/src/app/api/send-email/route.ts"
)

# We've already fixed these routes manually
# /workspaces/SyncroSpace/src/app/api/bigquery/data-sync/route.ts
# /workspaces/SyncroSpace/src/app/api/bigquery/executive-insights/route.ts

# Add the export statements to each file if they don't already exist
for route in "${API_ROUTES[@]}"; do
  if [ -f "$route" ]; then
    echo "Processing $route..."
    
    # Check if the file already contains the export statements
    if ! grep -q "export const dynamic = 'force-static';" "$route"; then
      # Find the line with the first import statement
      first_import=$(grep -n "import " "$route" | head -1 | cut -d: -f1)
      
      # Find the first blank line after imports
      blank_after_imports=$(tail -n +$first_import "$route" | grep -n "^$" | head -1 | cut -d: -f1)
      blank_after_imports=$((first_import + blank_after_imports - 1))
      
      # Insert the export statements
      sed -i "${blank_after_imports}i\\
// Required for static export\\
export const dynamic = 'force-static';\\
export const revalidate = false;\\
" "$route"
      
      echo "Added static export configuration to $route"
    else
      echo "Static export configuration already exists in $route"
    fi
  else
    echo "Warning: File not found - $route"
  fi
done

echo "All routes processed!"