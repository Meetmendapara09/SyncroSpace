import type { NextConfig } from 'next';

const staticConfig: NextConfig = {
  output: 'export', // Use static export mode
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true, // Skip image optimization to reduce memory usage
  },
};

export default staticConfig;