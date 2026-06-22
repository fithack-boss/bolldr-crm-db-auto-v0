/** @type {import('next').NextConfig} */

// When the CRM is served under bolldr.com via a rewrite (Next.js Multi-Zones),
// set ASSET_PREFIX to the CRM's own public origin (e.g. https://crm.bolldr.com
// or the Vercel deployment URL). This makes the CRM load its /_next/* assets
// from its own origin so they don't collide with the marketing site's assets.
// Leave it unset for standalone / local use.
const assetPrefix = process.env.ASSET_PREFIX || undefined;

const nextConfig = {
  reactStrictMode: true,
  assetPrefix,
  eslint: {
    // Linting runs in CI/dev; don't block production builds on lint errors.
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
