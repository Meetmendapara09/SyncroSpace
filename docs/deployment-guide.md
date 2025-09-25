# SyncroSpace Deployment Guide

## Table of Contents
1. [Overview](#overview)
2. [Deployment Options](#deployment-options)
3. [Vercel Deployment](#vercel-deployment)
4. [Docker Deployment](#docker-deployment)
5. [Self-Hosted Deployment](#self-hosted-deployment)
6. [Environment Variables](#environment-variables)
7. [Static Export](#static-export)
8. [Build Optimization](#build-optimization)
9. [Post-Deployment Verification](#post-deployment-verification)
10. [Continuous Integration/Continuous Deployment](#continuous-integrationcontinuous-deployment)
11. [Rollback Procedures](#rollback-procedures)

## Overview

This guide covers the deployment process for SyncroSpace. As a Next.js application with Firebase services, there are several deployment options available, each with different considerations for performance, scalability, and cost.

## Deployment Options

SyncroSpace can be deployed using several approaches:

1. **Vercel**: The recommended deployment platform for Next.js applications
2. **Docker**: For containerized deployments
3. **Self-hosted**: On your own infrastructure or cloud VMs
4. **Static Export**: For static site hosting with limited functionality

## Vercel Deployment

### 1. Set Up Vercel Account

1. Create an account on [Vercel](https://vercel.com/)
2. Connect your GitHub account

### 2. Import the Project

1. Click "Add New" > "Project"
2. Select the SyncroSpace repository
3. Configure project settings:
   - Framework Preset: Next.js
   - Root Directory: ./
   - Build Command: `npm run build`
   - Output Directory: .next

### 3. Environment Variables

Add all required environment variables from your `.env.local` file to the Vercel project settings.

### 4. Deploy

Click "Deploy" to start the deployment process. Vercel will build and deploy your application.

### 5. Custom Domain (Optional)

1. Go to Project Settings > Domains
2. Add your custom domain and configure DNS settings

## Docker Deployment

### 1. Build the Docker Image

```bash
docker build -t syncrospace:latest .
```

### 2. Run the Container

```bash
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key \
  -e NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain \
  # Add all required environment variables here
  syncrospace:latest
```

### 3. Docker Compose (Optional)

Create a `docker-compose.yml` file:

```yaml
version: '3'
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    env_file:
      - .env.production
```

Run with:

```bash
docker-compose up
```

## Self-Hosted Deployment

### 1. Build the Application

```bash
npm run build
```

### 2. Start the Production Server

```bash
npm run start
```

### 3. Process Management

For long-running processes, use a process manager like PM2:

```bash
npm install -g pm2
pm2 start npm --name "syncrospace" -- start
pm2 save
```

### 4. Reverse Proxy (Nginx)

Configure Nginx as a reverse proxy:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Environment Variables

Ensure these environment variables are set in your deployment environment:

```
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_FIREBASE_DATABASE_URL

# BigQuery Configuration (for AI features)
GOOGLE_APPLICATION_CREDENTIALS
NEXT_PUBLIC_BIGQUERY_PROJECT_ID
NEXT_PUBLIC_BIGQUERY_DATASET

# App Configuration
NEXT_PUBLIC_APP_URL
```

## Static Export

For static site hosting with limited functionality:

### 1. Update `next.config.js`

```js
module.exports = {
  output: 'export',
  // other config...
}
```

### 2. Build the Static Export

```bash
npm run build
```

This generates the static site in the `out` directory, which can be deployed to any static hosting service like Netlify, GitHub Pages, or S3.

**Note**: Static exports have limitations. See [STATIC_EXPORT_LIMITATIONS.md](../STATIC_EXPORT_LIMITATIONS.md) for details.

## Build Optimization

To optimize the build size and performance:

### 1. Use the Optimized Build Script

```bash
npm run build:optimized
```

This script uses enhanced settings for improved build performance and smaller bundle size.

### 2. Memory-Optimized Build

For large applications that may run into memory issues during build:

```bash
npm run build:memory-optimized
```

See [MEMORY_OPTIMIZED_DEPLOYMENT.md](../MEMORY_OPTIMIZED_DEPLOYMENT.md) for more details.

## Post-Deployment Verification

After deployment, verify the following:

1. **Authentication**: Test login with different methods
2. **Real-time Features**: Verify chat and virtual spaces function correctly
3. **File Uploads**: Test file upload functionality
4. **API Endpoints**: Verify API endpoints are accessible and functioning
5. **Mobile Responsiveness**: Test on various device sizes
6. **AI Features**: Verify BigQuery AI integration is working

## Continuous Integration/Continuous Deployment

### GitHub Actions

A sample GitHub Actions workflow for CI/CD:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Use Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm test
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

## Rollback Procedures

If issues are discovered after deployment:

### 1. Vercel Rollback

1. Go to the Vercel dashboard
2. Select your project
3. Go to Deployments
4. Find the last working deployment
5. Click the three dots (⋯) and select "Promote to Production"

### 2. Manual Rollback

1. Revert to the previous Git commit:
   ```bash
   git revert HEAD
   git push
   ```
2. Redeploy using your standard deployment process

### 3. Docker Rollback

1. Pull the previous working image:
   ```bash
   docker pull syncrospace:previous
   ```
2. Stop the current container and start the previous one:
   ```bash
   docker stop syncrospace-current
   docker run -d --name syncrospace-rollback syncrospace:previous
   ```

## Troubleshooting Common Deployment Issues

- **Firebase Connection Issues**: Verify Firebase environment variables and credentials
- **API Routes Not Working**: Check API routes configuration in Next.js
- **BigQuery Integration Fails**: Verify BigQuery credentials and permissions
- **Static Assets Missing**: Ensure proper asset configuration in Next.js
- **Memory Errors During Build**: Try the memory-optimized build process

For more detailed troubleshooting, refer to [Troubleshooting Guide](./troubleshooting-guide.md).