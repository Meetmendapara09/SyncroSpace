/** @type {import('next').NextConfig} */

const nextConfig = {
  // Use standalone output mode to support dynamic routes and server actions
  output: 'standalone',
  
  // Disable TypeScript and ESLint checks during build
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Disable source maps to save memory
  productionBrowserSourceMaps: false,
  
  // Image configuration
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: '*' },
    ],
  },
  
  // Webpack configuration to handle Node.js modules
  webpack: (config, { isServer }) => {
    // Handle handlebars require.extensions issue
    config.resolve.alias = {
      ...config.resolve.alias,
      handlebars: 'handlebars/dist/handlebars.min.js',
      // Use the static Firebase implementation for client builds
      ...(process.env.USE_FIREBASE_MOCK === 'true' && !isServer 
          ? { '@/lib/firebase': '/workspaces/SyncroSpace/src/lib/firebase-static.js' }
          : {}),
    };
    
    // Handle node modules that cause issues in client-side build
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        http2: false,
      };
    }
    
    return config;
  },
  
  // Experimental features
  experimental: {
    optimizeCss: true,
  },
};

module.exports = nextConfig;