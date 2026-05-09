/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  transpilePackages: ['@codepulse/config', '@codepulse/db', '@codepulse/types'],
  experimental: {
    serverComponentsExternalPackages: ['bullmq', 'ioredis'],
    outputFileTracingIncludes: {
      '/api/**/*': ['./node_modules/**/*.prisma', './node_modules/**/*.so.node'],
    },
  },
  images: {
    domains: ['avatars.githubusercontent.com', 'lh3.googleusercontent.com'],
  },
};

module.exports = nextConfig;
