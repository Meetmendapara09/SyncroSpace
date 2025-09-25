# Static Export Mode

This project has been configured for static export using Next.js. This configuration allows the app to be deployed to static hosting services that don't support server-side rendering or API routes.

## How to Build for Static Export

```bash
# Use the optimized static export config
cp next.config.static.js next.config.js

# Build the project
npm run build
```

## Limitations in Static Export Mode

The static export has the following limitations:

1. **No Server-side Rendering**: All pages are pre-rendered at build time.
2. **No API Routes**: Server-side API functionality is not available.
3. **No Dynamic Routes**: Routes with parameters must be pre-defined using `generateStaticParams()`.
4. **No Server Actions**: Server-side mutations are not supported.

## Placeholder Implementations

To support static export, we've created placeholder implementations for:

- AI flows (chatbot, avatar generation, etc.)
- Dynamic API endpoints
- Authentication flows

These placeholders return static data and may not provide full functionality.

## Alternative Deployment Options

For full functionality, consider deploying to:

1. **Vercel**: Supports all Next.js features including API routes and server actions.
2. **Self-hosted Node.js server**: Run the app with a Node.js server.
3. **Containerized deployment**: Use Docker to deploy the application.

## Debugging Static Export Issues

If you encounter issues with the static export:

1. Check for server-side only code in client components
2. Look for missing `generateStaticParams()` in dynamic routes
3. Verify all API routes have `dynamic = 'force-static'` and `revalidate = false`
