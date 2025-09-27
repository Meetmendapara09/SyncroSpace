const nextConfig = {
  images: {
    domains: ['picsum.photos'],
  },
  typescript: {
    ignoreBuildErrors: true, // Temporarily ignore TypeScript errors
  },
  eslint: {
    ignoreDuringBuilds: true, // Temporarily ignore ESLint errors
  },
  // Add webpack configuration to handle Node.js modules
  transpilePackages: ['@google-cloud/bigquery'],
  experimental: {
    optimizeCss: true,
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-icons',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-dialog'
    ],
    serverComponentsExternalPackages: ['@google-cloud/bigquery'],
  },
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...config.optimization.splitChunks,
          cacheGroups: {
            ...config.optimization.splitChunks.cacheGroups,
            default: false,
            vendors: false,
            framework: {
              chunks: 'all',
              name: 'framework',
              test: /(?<!node_modules.*)[\\/]node_modules[\\/](react|react-dom|scheduler|prop-types|use-subscription)[\\/]/,
              priority: 40,
              enforce: true
            },
            lib: {
              test: /[\\/]node_modules[\\/]/,
              name: 'lib',
              priority: 30,
              chunks: 'initial'
            },
            commons: {
              name: 'commons',
              minChunks: 2,
              chunks: 'initial',
              priority: 20
            }
          }
        }
      }
    }
    
    // Handle Node.js modules in browser environment
    if (!isServer) {
      // Replace Node.js modules with empty modules
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        child_process: false,
        net: false,
        tls: false,
        http2: false,
        zlib: false,
        path: false,
        os: false,
        crypto: false,
      };
    }
    
    return config;
  }
}

module.exports = nextConfig