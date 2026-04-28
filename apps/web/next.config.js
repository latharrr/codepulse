/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@codepulse/config',
    '@codepulse/db',
    '@codepulse/types',
  ],
  experimental: {
    // Server Actions are stable in Next 14
  },
  images: {
    domains: [
      'avatars.githubusercontent.com',
      'lh3.googleusercontent.com',
    ],
  },
};

module.exports = nextConfig;
