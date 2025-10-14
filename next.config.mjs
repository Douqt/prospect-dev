import withBundleAnalyzer from '@next/bundle-analyzer'

const withAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable TypeScript checking during builds for faster compiles
  typescript: {
    ignoreBuildErrors: true,
  },

  // Configure Turbopack for development speed
  turbopack: {
    // Enable persistent caching
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },

  // Disable x-powered-by header to reduce middleware execution
  poweredByHeader: false,

  // Modern image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
  },

  // Enable compression
  compress: true,

  // Tree-shaking and bundle optimization features for Next.js 15
  experimental: {
    // Optimize package imports for better tree-shaking
    optimizePackageImports: [
      '@radix-ui/react-accordion',
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-aspect-ratio',
      '@radix-ui/react-avatar',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-collapsible',
      '@radix-ui/react-context-menu',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-hover-card',
      '@radix-ui/react-label',
      '@radix-ui/react-menubar',
      '@radix-ui/react-navigation-menu',
      '@radix-ui/react-popover',
      '@radix-ui/react-progress',
      '@radix-ui/react-radio-group',
      '@radix-ui/react-scroll-area',
      '@radix-ui/react-select',
      '@radix-ui/react-separator',
      '@radix-ui/react-slider',
      '@radix-ui/react-slot',
      '@radix-ui/react-switch',
      '@radix-ui/react-tabs',
      '@radix-ui/react-toast',
      '@radix-ui/react-toggle',
      '@radix-ui/react-toggle-group',
      '@radix-ui/react-tooltip',
      'react-icons',
      'recharts',
      '@heroicons/react',
      'lucide-react'
    ],

    // Optimize CSS for faster builds
    optimizeCss: false,
  },

  transpilePackages: ['@radix-ui/react-dropdown-menu', 'lucide-react', 'react-icons', 'recharts'],
};

export default withAnalyzer(nextConfig);
