/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    domains: ['skillyy.com', 'www.skillyy.com', 'codeforce.s3.amazonaws.com'],
  },
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'https://skillyy.com',
  },
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'bcryptjs', 'isomorphic-dompurify'],
  },
  webpack: (config, { isServer }) => {
    // Alias openid-client to false for server builds to prevent Edge runtime errors in middleware
    // This prevents openid-client from being bundled in middleware (Edge runtime)
    // Note: OAuth providers will still work in API routes (Node.js runtime) as they're loaded dynamically
    if (isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'openid-client': false,
      }
      // Mark isomorphic-dompurify and its dependencies as external to avoid ESM/CommonJS issues
      config.externals = config.externals || []
      if (Array.isArray(config.externals)) {
        config.externals.push('isomorphic-dompurify', 'jsdom', 'parse5')
      } else if (typeof config.externals === 'object') {
        config.externals['isomorphic-dompurify'] = 'commonjs isomorphic-dompurify'
        config.externals['jsdom'] = 'commonjs jsdom'
        config.externals['parse5'] = 'commonjs parse5'
      }
    }
    return config
  },
}

module.exports = nextConfig

