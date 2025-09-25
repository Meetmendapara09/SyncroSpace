// This file is intended to replace next.config.ts once all TypeScript errors are fixed
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  webpack: (config, { dev, isServer }) => {
    // Add handlebars loader
    config.module.rules.push({
      test: /\.handlebars$/,
      loader: 'handlebars-loader',
    });

    // Optimize production builds
    if (!dev) {
      // Enable terser minification for better performance
      config.optimization = {
        ...config.optimization,
        minimize: true,
      };
      
      // Increase performance budget to avoid warnings on large files
      if (config.performance) {
        config.performance.maxEntrypointSize = 512000;
        config.performance.maxAssetSize = 512000;
      }
    }

    return config;
  },
  // Enable TypeScript error checking during builds
  typescript: {
    // Change to false to enable TypeScript error checking during builds
    ignoreBuildErrors: false,
  },
  eslint: {
    // Consider enabling ESLint during builds in the future
    ignoreDuringBuilds: true,
  },
  // Add compression for improved performance
  compress: true,
  // Add production source maps for better debugging
  productionBrowserSourceMaps: false,
  // Increase serverless function timeout
  serverRuntimeConfig: {
    timeout: 15000, // 15 seconds
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.pravatar.cc',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'github.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'scontent.xx.fbcdn.net',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;