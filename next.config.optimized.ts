import type { NextConfig } from 'next';

const optimizedConfig: NextConfig = {
  // Build output configuration
  output: 'standalone', // 'standalone' for optimal server-side support, but can use 'export' for static sites
  
  // Compress responses for better delivery
  compress: true,
  
  // Disable source maps in production for smaller files
  productionBrowserSourceMaps: false,
  
  // Disable runtime JavaScript for better performance
  reactStrictMode: true,
  
  // Optimize image handling
  images: {
    // When using 'export' mode, images must be unoptimized
    // But for 'standalone' mode, set this to false for better image optimization
    unoptimized: process.env.NEXT_PUBLIC_EXPORT_MODE === 'true',
    formats: ['image/webp'], // Prefer WebP format for better compression
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048], // Common screen sizes
    imageSizes: [16, 32, 48, 64, 96, 128, 256], // Common icon and thumbnail sizes
    minimumCacheTTL: 60 * 60 * 24, // 24 hours cache for images
    remotePatterns: [
      { protocol: 'https', hostname: 'placehold.co' },
      { protocol: 'https', hostname: 'i.pravatar.cc' },
      { protocol: 'https', hostname: 'github.com' },
      { protocol: 'https', hostname: 'scontent.xx.fbcdn.net' },
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  
  // Experimental features for better performance
  experimental: {
    // Optimize CSS for faster loading
    optimizeCss: true,
    
    // Server Components optimizations
    serverActions: {
      bodySizeLimit: '2mb', // Limit request size
    },
    
    // Memory optimizations
    memoryBasedWorkersCount: true, // Adjust workers based on available memory
  },
  
  // Module resolution optimizations
  transpilePackages: [],
  
  // Skip type checking in production builds to speed up build time
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Skip linting in production builds
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    // Only apply these optimizations in production
    if (!dev) {
      // Handle require.extensions issue with handlebars
      config.resolve.alias = {
        ...config.resolve.alias,
        handlebars: 'handlebars/dist/handlebars.min.js',
      };

      // Add polyfill fallbacks for browser-only code
      if (!isServer) {
        config.resolve.fallback = {
          ...config.resolve.fallback,
          fs: false,
          net: false,
          tls: false,
          http2: false,
        };
      }

      // Enable module concatenation for better tree shaking
      config.optimization.concatenateModules = true;
      
      // Optimize chunk splitting
      if (!isServer) {
        config.optimization.splitChunks = {
          chunks: 'all',
          minSize: 20000,
          maxSize: 244000,
          minChunks: 1,
          maxAsyncRequests: 30,
          maxInitialRequests: 25,
          enforceSizeThreshold: 50000,
          cacheGroups: {
            defaultVendors: {
              test: /[\\/]node_modules[\\/]/,
              priority: -10,
              reuseExistingChunk: true,
            },
            default: {
              minChunks: 2,
              priority: -20,
              reuseExistingChunk: true,
            },
          },
        };
      }
    }
    
    return config;
  },
  
  // HTTP header optimization
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400',
        },
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff',
        },
        {
          key: 'Permissions-Policy',
          value: 'camera=(), microphone=(), geolocation=()',
        },
      ],
    },
    {
      source: '/(.*).(jpg|jpeg|png|webp|avif|ico|svg)',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=31536000, immutable',
        },
      ],
    },
    {
      source: '/(.*).(js|css)',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=31536000, immutable',
        },
      ],
    },
  ],
  
  // Enable response compression
  poweredByHeader: false,
  
  // Add gzip compression for better delivery
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
};

export default optimizedConfig;