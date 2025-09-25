import type { NextConfig } from 'next';

const minimalConfig: NextConfig = {
  // Disable features that consume memory during build
  output: 'export', // Static export mode to bypass complex SSR builds
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config, { isServer }) => {
    // Handle the handlebars require.extensions issue
    config.resolve.alias = {
      ...config.resolve.alias,
      handlebars: 'handlebars/dist/handlebars.min.js',
    };
    return config;
  },
  productionBrowserSourceMaps: false,
  images: {
    unoptimized: true, // Skip image optimization
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

export default minimalConfig;