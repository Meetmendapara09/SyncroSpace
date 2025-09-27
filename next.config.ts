import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: false, // Keep TypeScript checks enabled for quality
  },
  eslint: {
    ignoreDuringBuilds: false, // Keep ESLint checks enabled but with warnings
  },
  compress: true, // Enable gzip compression
  reactStrictMode: false, // Disable strict mode temporarily to allow deployment
  poweredByHeader: false, // Keep security header disabled
  serverExternalPackages: ['@google-cloud/bigquery'], // Updated from experimental
  experimental: {
    optimizeCss: true, // Enable CSS optimization
  },
  webpack: (config, { isServer, buildId, dev }) => {
    // Optimize memory usage and performance
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          default: {
            minChunks: 2,
            priority: -20,
            reuseExistingChunk: true,
          },
          vendors: {
            test: /[\\/]node_modules[\\/]/,
            priority: -10,
            reuseExistingChunk: true,
          },
        },
      },
    };

    // Limit memory usage
    config.parallelism = 1;
    config.cache = false;

    // Handle handlebars compatibility
    config.resolve.alias = {
      ...config.resolve.alias,
      handlebars: 'handlebars/dist/handlebars.min.js',
    };

    // Exclude Node.js modules from client-side bundling
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        path: false,
        os: false,
        stream: false,
        http: false,
        https: false,
        zlib: false,
        querystring: false,
        url: false,
        buffer: false,
        util: false,
        assert: false,
        events: false,
      };
    }

    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
      {
        protocol: 'https',
        hostname: 'i.pravatar.cc',
      },
      {
        protocol: 'https',
        hostname: 'github.com',
      },
      {
        protocol: 'https',
        hostname: 'scontent.xx.fbcdn.net',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
    ],
  },
};

export default nextConfig;