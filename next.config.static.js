/** @type {import('next').NextConfig} */

const nextConfig = {
  // Static export mode
  output: 'export',
  
  // Disable TypeScript and ESLint errors during build
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Optimize memory usage
  productionBrowserSourceMaps: false,
  swcMinify: true,
  
  // Configure image optimization
  images: {
    unoptimized: true, // Skip image optimization for static export
    remotePatterns: [
      { protocol: 'https', hostname: '*.placeholder.com' },
      { protocol: 'https', hostname: '*.pravatar.cc' },
      { protocol: 'https', hostname: '*.unsplash.com' },
      { protocol: 'https', hostname: 'github.com' },
      { protocol: 'https', hostname: 'picsum.photos' },
    ],
  },
  
  // Webpack configuration to handle Node.js modules
  webpack: (config, { isServer }) => {
    // Handle node modules that don't work in browser
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        http2: false,
        perf_hooks: false,
        child_process: false,
        os: false,
        path: false,
      };
    }
    
    // Handle handlebars require.extensions issue
    config.resolve.alias = {
      ...config.resolve.alias,
      handlebars: 'handlebars/dist/handlebars.min.js',
    };
    
    return config;
  },
  
  // Ignore build errors from specific packages
  transpilePackages: [
    '@genkit-ai',
    '@google',
    'genkit',
  ],
  
  // Experimental features
  experimental: {
    optimizeCss: true, // Extract and optimize CSS
    webVitalsAttribution: ['CLS', 'LCP', 'FCP', 'FID', 'TTFB', 'INP'],
  },
};

module.exports = nextConfig;
