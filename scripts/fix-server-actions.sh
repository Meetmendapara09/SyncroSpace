#!/bin/bash

# Script to fix server actions for static export

# Set of files to modify
SERVER_ACTION_FILES=(
  "/workspaces/SyncroSpace/src/ai/flows/contact.ts"
  "/workspaces/SyncroSpace/src/ai/flows/chatbot.ts"
  "/workspaces/SyncroSpace/src/ai/flows/suggest-channel.ts"
  "/workspaces/SyncroSpace/src/ai/flows/summarize-meeting.ts"
  "/workspaces/SyncroSpace/src/ai/flows/generate-avatar.ts"
)

# Remove 'use server' from each file
for file in "${SERVER_ACTION_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "Processing $file..."
    
    # Remove the 'use server' line
    sed -i "/'use server';/d" "$file"
    
    echo "Removed server action from $file"
  else
    echo "Warning: File not found - $file"
  fi
done

echo "All server actions processed!"

# Now create a static configuration file to inform users about static export limitations
cat > /workspaces/SyncroSpace/STATIC_EXPORT_LIMITATIONS.md << 'EOL'
# Static Export Limitations

This project is configured for static export (`output: 'export'` in Next.js config). This has the following limitations:

## Unsupported Features in Static Export

1. **Server Actions**: Server-side mutations are not available. Client-side alternatives should be used.

2. **Dynamic API Routes**: All API routes need to use `export const dynamic = 'force-static'` and provide static data.

3. **Dynamic Routes**: All dynamic routes require `generateStaticParams()` to pre-define paths at build time.

## Current Implementation

For the AI flows that previously used Server Actions, you need to:

1. Create client-side API wrappers that call external API endpoints
2. Move server logic to API routes with static export configuration
3. Update client components to use these APIs instead

For dynamic routes, we've added mock static paths for development. In production, you would:
1. Generate these paths from actual data during build
2. Consider moving to a different export strategy if you need truly dynamic paths

## Alternatives

If you need dynamic features like Server Actions, consider:
1. Using Next.js with a Node.js server
2. Moving to a traditional client/server architecture
3. Using edge functions or serverless providers

EOL

echo "Created STATIC_EXPORT_LIMITATIONS.md file with guidance"