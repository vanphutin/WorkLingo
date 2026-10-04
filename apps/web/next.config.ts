import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
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
