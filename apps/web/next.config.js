/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  transpilePackages: ['@codepulse/config', '@codepulse/db', '@codepulse/types'],
  experimental: {
    serverComponentsExternalPackages: ['bullmq', 'ioredis'],
  },
  images: {
    domains: ['avatars.githubusercontent.com', 'lh3.googleusercontent.com'],
  },
};

module.exports = nextConfig;
