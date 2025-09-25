#!/bin/bash

# Script to fix dynamic routes for static export

# Function to update layout file
update_layout_file() {
  local layout_file=$1
  local route_param=$2
  local sample_values=$3
  
  # Create or update layout file with proper content
  cat > "$layout_file" << EOL
// Required for static export with dynamic routes
export const dynamic = 'error';

export default function DynamicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
EOL

  echo "Updated $layout_file"
}

# Create dummy paramPage.js file next to each dynamic route to provide static params
create_param_file() {
  local param_file=$1
  local route_param=$2
  local sample_values=$3
  
  # Create paramPage.js file with generateStaticParams
  cat > "$param_file" << EOL
// This file exists solely to provide static parameters for Next.js static export
// It's separate from the page component to avoid conflicts with 'use client'

export function generateStaticParams() {
  return [
    { $route_param: $sample_values },
  ];
}
EOL

  echo "Created $param_file"
}

# Dynamic routes to fix
declare -A DYNAMIC_ROUTES
DYNAMIC_ROUTES["/workspaces/SyncroSpace/src/app/(app)/chat/[id]"]="id"
DYNAMIC_ROUTES["/workspaces/SyncroSpace/src/app/(app)/meeting/[id]"]="id"
DYNAMIC_ROUTES["/workspaces/SyncroSpace/src/app/(app)/space/[id]"]="id"
DYNAMIC_ROUTES["/workspaces/SyncroSpace/src/app/(app)/users/[userId]"]="userId"

# Process each route
for route_path in "${!DYNAMIC_ROUTES[@]}"; do
  route_param=${DYNAMIC_ROUTES[$route_path]}
  layout_file="$route_path/layout.tsx"
  param_file="$route_path/paramPage.js"
  
  case "$route_param" in
    "id")
      sample_values="['demo-1', 'demo-2', 'demo-3']"
      ;;
    "userId")
      sample_values="['user1', 'user2', 'user3', 'user4', 'user5']"
      ;;
    *)
      sample_values="['sample-1', 'sample-2', 'sample-3']"
      ;;
  esac
  
  # Update layout file
  update_layout_file "$layout_file" "$route_param" "$sample_values"
  
  # Create paramPage.js file
  create_param_file "$param_file" "$route_param" "$sample_values"
done

echo "All dynamic routes processed!"