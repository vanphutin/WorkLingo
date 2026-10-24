import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  distDir: process.env.WORKLINGO_E2E_MODE === 'true' ? '.next-e2e' : '.next',
  reactStrictMode: true,
  // Complete lessons have a shared 120-second provider/correction budget.
  experimental: { proxyTimeout: 150000 },
  async rewrites() {
    const apiOrigin = process.env.WORKLINGO_API_URL ?? 'http://127.0.0.1:4000';

    return [
      {
        destination: `${apiOrigin}/api/:path*`,
        source: '/api/:path*',
      },
    ];
  },
};

export default nextConfig;
