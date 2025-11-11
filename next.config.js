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
    serverComponentsExternalPackages: ['@prisma/client', 'bcryptjs'],
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
    }
    return config
  },
}

module.exports = nextConfig

