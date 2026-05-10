/** @type {import('next').NextConfig} */
const useStandaloneOutput =
  process.env.NEXT_OUTPUT_STANDALONE === 'true' || process.platform !== 'win32';

const nextConfig = {
  ...(useStandaloneOutput ? { output: 'standalone' } : {}),
  reactStrictMode: true,
  transpilePackages: ['@codepulse/config', '@codepulse/db', '@codepulse/types'],
  experimental: {
    serverComponentsExternalPackages: ['bullmq', 'ioredis'],
    outputFileTracingIncludes: {
      '/**': ['./node_modules/**/*.prisma', './node_modules/**/*.so.node'],
    },
  },
  images: {
    domains: ['avatars.githubusercontent.com', 'lh3.googleusercontent.com'],
  },
};

module.exports = nextConfig;
