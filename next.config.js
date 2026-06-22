/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Linting runs in CI/dev; don't block production builds on lint errors.
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
