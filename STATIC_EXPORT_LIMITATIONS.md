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

